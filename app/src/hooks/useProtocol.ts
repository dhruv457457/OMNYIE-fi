"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  AccountMeta,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idl from "@/lib/idl/strata_core.json";
import tokenIdl from "@/lib/idl/strata_token.json";
import {
  STRATA_CORE_PROGRAM_ID,
  STRATA_TOKEN_PROGRAM_ID,
  USDC_MINT,
} from "@/lib/constants";
import {
  buildCreateEncryptDepositIx,
  deriveEncryptAccounts,
  ENCRYPT_PROGRAM_ID,
} from "@/lib/encrypt";

export interface ProtocolState {
  authority: PublicKey;
  treasury: PublicKey;
  usdcMint: PublicKey;
  srMint: PublicKey;
  jrMint: PublicKey;
  tokenProgramId: PublicKey;
  performanceFeeBps: number;
  earlyWithdrawalFeeBps: number;
  insuranceFeeBps: number;
  insuranceFund: BN;
  epochCount: BN;
  totalTvl: BN;
  paused: boolean;
  bump: number;
}

export interface EpochState {
  publicKey: PublicKey;
  protocol: PublicKey;
  epochNumber: BN;
  duration: { sevenDays?: {}; fourteenDays?: {}; thirtyDays?: {} };
  status: { open?: {}; active?: {}; matured?: {}; halted?: {} };
  seniorFixedRateBps: number;
  seniorTotal: BN;
  juniorTotal: BN;
  seniorCap: BN;
  juniorCap: BN;
  totalYieldHarvested: BN;
  seniorYieldDistributed: BN;
  juniorYieldDistributed: BN;
  feesCollected: BN;
  insuranceContribution: BN;
  createdAt: BN;
  startedAt: BN;
  maturesAt: BN;
  vaultAddress: PublicKey;
  bump: number;
}

export interface UserPositionState {
  publicKey: PublicKey;
  owner: PublicKey;
  epoch: PublicKey;
  trancheType: { senior?: {}; junior?: {} };
  depositedAmount: BN;
  depositCiphertext: PublicKey;
  claimableCiphertext: PublicKey;
  pendingDecryptionDigest: number[];
  pendingDecryptionRequest: PublicKey;
  trancheTokensMinted: BN;
  yieldClaimed: BN;
  withdrawn: boolean;
  depositedAt: BN;
  decryptionPending: boolean;
  bump: number;
}

export function getEpochDurationLabel(d: EpochState["duration"]): string {
  if ("sevenDays" in d) return "7 Days";
  if ("fourteenDays" in d) return "14 Days";
  if ("thirtyDays" in d) return "30 Days";
  return "Unknown";
}

export function getEpochDurationDays(d: EpochState["duration"]): number {
  if ("sevenDays" in d) return 7;
  if ("fourteenDays" in d) return 14;
  if ("thirtyDays" in d) return 30;
  return 0;
}

export function getEpochStatusLabel(s: EpochState["status"]): string {
  if ("open" in s) return "Open";
  if ("active" in s) return "Active";
  if ("matured" in s) return "Matured";
  if ("halted" in s) return "Halted";
  return "Unknown";
}

export function getTrancheLabel(t: UserPositionState["trancheType"]): string {
  return "senior" in t ? "Senior" : "Junior";
}

function getProtocolPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    STRATA_CORE_PROGRAM_ID,
  );
  return pda;
}

function getEpochPDA(protocolPDA: PublicKey, epochNumber: BN): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("epoch"),
      protocolPDA.toBuffer(),
      epochNumber.toArrayLike(Buffer, "le", 8),
    ],
    STRATA_CORE_PROGRAM_ID,
  );
  return pda;
}

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  if (!wallet.publicKey) return null;

  const provider = new AnchorProvider(connection, wallet as never, {
    commitment: "confirmed",
  });

  return new Program(idl as never, provider);
}

export function useProtocol() {
  const [protocol, setProtocol] = useState<ProtocolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useConnection();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const protocolPDA = getProtocolPDA();
      const accountInfo = await connection.getAccountInfo(protocolPDA);

      if (!accountInfo) {
        setProtocol(null);
        return;
      }

      const provider = new AnchorProvider(connection, {} as never, {
        commitment: "confirmed",
      });
      const program = new Program(idl as never, provider);
      const data = await (program.account as any).protocol.fetch(protocolPDA);
      setProtocol(data as ProtocolState);
    } catch (e: any) {
      setError(e.message);
      setProtocol(null);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { protocol, loading, error, refresh };
}

export function useEpochs() {
  const [epochs, setEpochs] = useState<EpochState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useConnection();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(connection, {} as never, {
        commitment: "confirmed",
      });
      const program = new Program(idl as never, provider);

      const protocolPDA = getProtocolPDA();
      let protocolData: any;
      try {
        protocolData = await (program.account as any).protocol.fetch(
          protocolPDA,
        );
      } catch {
        setEpochs([]);
        return;
      }

      const epochCount = (protocolData.epochCount as BN).toNumber();
      if (epochCount === 0) {
        setEpochs([]);
        return;
      }

      const epochPromises = [];
      for (let i = 0; i < epochCount; i++) {
        const epochPDA = getEpochPDA(protocolPDA, new BN(i));
        epochPromises.push(
          (program.account as any).epoch
            .fetch(epochPDA)
            .then((data: any) => ({
              ...data,
              publicKey: epochPDA,
            }))
            .catch(() => null),
        );
      }

      const results = await Promise.all(epochPromises);
      setEpochs(results.filter((r): r is EpochState => r !== null).reverse());
    } catch (e: any) {
      setError(e.message);
      setEpochs([]);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { epochs, loading, error, refresh };
}

export function useUserPositions() {
  const [positions, setPositions] = useState<UserPositionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(connection, {} as never, {
        commitment: "confirmed",
      });
      const program = new Program(idl as never, provider);

      const protocolPDA = getProtocolPDA();
      let protocolData: any;
      try {
        protocolData = await (program.account as any).protocol.fetch(
          protocolPDA,
        );
      } catch {
        setPositions([]);
        return;
      }

      const epochCount = (protocolData.epochCount as BN).toNumber();
      const positionFetches: Promise<UserPositionState | null>[] = [];

      for (let i = 0; i < epochCount; i++) {
        const epochPDA = getEpochPDA(protocolPDA, new BN(i));
        for (const trancheByte of [0, 1]) {
          const [positionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("position"),
              epochPDA.toBuffer(),
              publicKey.toBuffer(),
              Buffer.from([trancheByte]),
            ],
            STRATA_CORE_PROGRAM_ID,
          );

          positionFetches.push(
            (program.account as any).userPosition
              .fetch(positionPDA)
              .then((account: any) => ({
                ...account,
                publicKey: positionPDA,
              }))
              .catch(() => null),
          );
        }
      }

      const results = await Promise.all(positionFetches);
      setPositions(results.filter((p): p is UserPositionState => p !== null));
    } catch (e: any) {
      setError(e.message);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { positions, loading, error, refresh };
}

export function useWithdraw() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const [withdrawing, setWithdrawing] = useState(false);
  const [stage, setStage] = useState<
    "idle" | "requesting" | "withdrawing" | "finalizing"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const requestPrivateClaim = useCallback(
    async (position: UserPositionState, epoch: EpochState) => {
      if (!publicKey) return;

      setWithdrawing(true);
      setStage("idle");
      setError(null);
      setTxSig(null);

      try {
        const provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
        const coreProgram = new Program(idl as never, provider);

        const protocolPDA = getProtocolPDA();
        const [epochPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("epoch"),
            protocolPDA.toBuffer(),
            epoch.epochNumber.toArrayLike(Buffer, "le", 8),
          ],
          STRATA_CORE_PROGRAM_ID,
        );
        const isSenior = "senior" in position.trancheType;
        const trancheByte = isSenior ? 0 : 1;
        const [positionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("position"),
            epochPDA.toBuffer(),
            publicKey.toBuffer(),
            Buffer.from([trancheByte]),
          ],
          STRATA_CORE_PROGRAM_ID,
        );

        const encrypt = deriveEncryptAccounts(
          publicKey,
          STRATA_CORE_PROGRAM_ID,
        );
        const ensureDepositIx = await buildCreateEncryptDepositIx(
          connection,
          publicKey,
          STRATA_CORE_PROGRAM_ID,
        );
        const sendPartiallySignedTransaction = async (
          transaction: Transaction,
          signers: Keypair[],
        ) => {
          if (!wallet.signTransaction) {
            throw new Error(
              "Connected wallet does not support signTransaction",
            );
          }

          let lastError: unknown;
          for (let attempt = 0; attempt < 2; attempt++) {
            const latestBlockhash = await connection.getLatestBlockhash();
            const retryTx = new Transaction();
            retryTx.add(...transaction.instructions);
            retryTx.feePayer = publicKey;
            retryTx.recentBlockhash = latestBlockhash.blockhash;
            retryTx.partialSign(...signers);

            const signed = await wallet.signTransaction(retryTx);
            try {
              const signature = await connection.sendRawTransaction(
                signed.serialize(),
                { skipPreflight: false },
              );
              await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                "confirmed",
              );
              return signature;
            } catch (sendError: any) {
              lastError = sendError;
              if (
                !String(sendError?.message || sendError).includes(
                  "already been processed",
                )
              ) {
                throw sendError;
              }
            }
          }
          throw lastError;
        };

        if (position.decryptionPending) {
          throw new Error(
            "Private claim is already in progress. Use safe withdraw if you want to exit now.",
          );
        }

        const tx = new Transaction();
        if (ensureDepositIx) {
          tx.add(ensureDepositIx);
        }

        setStage("requesting");
        const decryptionRequest = Keypair.generate();
        console.info("Requesting Encrypt decryption", {
          decryptionRequest: decryptionRequest.publicKey.toBase58(),
          encryptCpiAuthority: encrypt.cpiAuthority.toBase58(),
          encryptCpiAuthorityBump: encrypt.cpiAuthorityBump,
        });
        const requestIx = await (coreProgram.methods as any)
          .requestWithdrawDecryption(encrypt.cpiAuthorityBump)
          .accounts({
            user: publicKey,
            protocol: protocolPDA,
            epoch: epochPDA,
            position: positionPDA,
            decryptionRequest: decryptionRequest.publicKey,
            balanceCiphertext: position.claimableCiphertext,
            encryptProgram: ENCRYPT_PROGRAM_ID,
            encryptConfig: encrypt.configPda,
            encryptDeposit: encrypt.depositPda,
            encryptCpiAuthority: encrypt.cpiAuthority,
            callerProgram: STRATA_CORE_PROGRAM_ID,
            networkEncryptionKey: encrypt.networkKeyPda,
            encryptEventAuthority: encrypt.eventAuthority,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        requestIx.keys = requestIx.keys.map((meta: AccountMeta) =>
          meta.pubkey.equals(decryptionRequest.publicKey)
            ? { ...meta, isSigner: true, isWritable: true }
            : meta,
        );
        tx.add(requestIx);

        const sig = await sendPartiallySignedTransaction(tx, [
          decryptionRequest,
        ]);
        setTxSig(sig);
      } catch (e: any) {
        console.error("Withdrawal failed:", e, e?.error, e?.logs);
        setError(e?.error?.message || e?.message || "Withdrawal failed");
      } finally {
        setWithdrawing(false);
        setStage("idle");
      }
    },
    [connection, publicKey, wallet],
  );

  const fallbackWithdraw = useCallback(
    async (position: UserPositionState, epoch: EpochState) => {
      if (!publicKey) return;

      setWithdrawing(true);
      setStage("withdrawing");
      setError(null);
      setTxSig(null);

      try {
        const provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
        const coreProgram = new Program(idl as never, provider);
        const tokenProgram = new Program(tokenIdl as never, provider);

        const protocolPDA = getProtocolPDA();
        const [epochPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("epoch"),
            protocolPDA.toBuffer(),
            epoch.epochNumber.toArrayLike(Buffer, "le", 8),
          ],
          STRATA_CORE_PROGRAM_ID,
        );
        const [epochVault] = PublicKey.findProgramAddressSync(
          [Buffer.from("epoch_vault"), epochPDA.toBuffer()],
          STRATA_CORE_PROGRAM_ID,
        );

        const isSenior = "senior" in position.trancheType;
        const trancheByte = isSenior ? 0 : 1;
        const [positionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("position"),
            epochPDA.toBuffer(),
            publicKey.toBuffer(),
            Buffer.from([trancheByte]),
          ],
          STRATA_CORE_PROGRAM_ID,
        );

        const userUSDC = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
        const [configPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("tranche_config")],
          STRATA_TOKEN_PROGRAM_ID,
        );
        const [srMintPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("sr_mint")],
          STRATA_TOKEN_PROGRAM_ID,
        );
        const [jrMintPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("jr_mint")],
          STRATA_TOKEN_PROGRAM_ID,
        );
        const trancheMint = isSenior ? srMintPDA : jrMintPDA;
        const userTrancheAta = getAssociatedTokenAddressSync(
          trancheMint,
          publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
        );
        const trancheArg = isSenior ? { senior: {} } : { junior: {} };
        const burnAmount = position.trancheTokensMinted;

        const tx = new Transaction();
        const withdrawIx = await (coreProgram.methods as any)
          .withdraw()
          .accounts({
            user: publicKey,
            protocol: protocolPDA,
            epoch: epochPDA,
            position: positionPDA,
            owner: publicKey,
            userUsdc: userUSDC,
            epochVault: epochVault,
            usdcMint: USDC_MINT,
            tokenProgram: new PublicKey(
              "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            ),
          })
          .instruction();
        tx.add(withdrawIx);

        console.log("Transaction accounts:", {
          user: publicKey?.toBase58(),
          protocol: protocolPDA?.toBase58(),
          epoch: epochPDA?.toBase58(),
          position: positionPDA?.toBase58(),
          userUsdc: userUSDC?.toBase58(),
          epochVault: epochVault?.toBase58(),
        });

        const ataInfo = await connection.getAccountInfo(userTrancheAta);
        if (ataInfo && burnAmount.gtn(0)) {
          const burnIx = await (tokenProgram.methods as any)
            .burnTranche(trancheArg, burnAmount)
            .accounts({
              user: publicKey,
              config: configPDA,
              trancheMint: trancheMint,
              userTrancheAccount: userTrancheAta,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .instruction();
          tx.add(burnIx);
        }

        let sig;
        try {
          // Try without prefllight check first as it's faster
          sig = await sendTransaction(tx, connection);
        } catch (err1: any) {
          console.log(
            "First send attempt failed, trying again with skipPreflight=false:",
            err1.message,
          );
          // Retry with explicit settings
          try {
            sig = await sendTransaction(tx, connection, {
              skipPreflight: false,
            });
          } catch (err2: any) {
            console.error("Both send attempts failed:", {
              attempt1: err1.message,
              attempt2: err2.message,
            });
            throw err2;
          }
        }
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          { signature: sig, ...latestBlockhash },
          "confirmed",
        );
        setTxSig(sig);
      } catch (e: any) {
        console.error("Withdrawal failed:", e, e?.error, e?.logs);
        setError(e?.error?.message || e?.message || "Withdrawal failed");
      } finally {
        setWithdrawing(false);
        setStage("idle");
      }
    },
    [connection, publicKey, sendTransaction, wallet],
  );

  return {
    requestPrivateClaim,
    fallbackWithdraw,
    withdrawing,
    stage,
    error,
    txSig,
  };
}
