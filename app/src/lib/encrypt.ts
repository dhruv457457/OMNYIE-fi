import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { ENCRYPT_NETWORK_KEY, ENCRYPT_PROGRAM_ID } from "@/lib/constants";

export { ENCRYPT_NETWORK_KEY, ENCRYPT_PROGRAM_ID } from "@/lib/constants";

export type EncryptAccounts = {
  configPda: PublicKey;
  eventAuthority: PublicKey;
  depositPda: PublicKey;
  depositBump: number;
  networkKeyPda: PublicKey;
  cpiAuthority: PublicKey;
  cpiAuthorityBump: number;
};

export function deriveEncryptAccounts(
  payer: PublicKey,
  callerProgram: PublicKey
): EncryptAccounts {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("encrypt_config")],
    ENCRYPT_PROGRAM_ID
  );
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    ENCRYPT_PROGRAM_ID
  );
  const [depositPda, depositBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("encrypt_deposit"), payer.toBuffer()],
    ENCRYPT_PROGRAM_ID
  );
  const [networkKeyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("network_encryption_key"), ENCRYPT_NETWORK_KEY],
    ENCRYPT_PROGRAM_ID
  );
  const [cpiAuthority, cpiAuthorityBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("__encrypt_cpi_authority")],
    callerProgram
  );

  return {
    configPda,
    eventAuthority,
    depositPda,
    depositBump,
    networkKeyPda,
    cpiAuthority,
    cpiAuthorityBump,
  };
}

export async function buildCreateEncryptDepositIx(
  connection: Connection,
  payer: PublicKey,
  callerProgram: PublicKey
) {
  const encrypt = deriveEncryptAccounts(payer, callerProgram);
  const existing = await connection.getAccountInfo(encrypt.depositPda);
  if (existing) {
    return null;
  }

  const configInfo = await connection.getAccountInfo(encrypt.configPda);
  if (!configInfo) {
    throw new Error("Encrypt config not found on devnet");
  }

  const encVault = new PublicKey(configInfo.data.subarray(100, 132));
  const vaultPk = encVault.equals(SystemProgram.programId) ? payer : encVault;

  const depositData = Buffer.alloc(18);
  depositData[0] = 14;
  depositData[1] = encrypt.depositBump;

  return new TransactionInstruction({
    programId: ENCRYPT_PROGRAM_ID,
    data: depositData,
    keys: [
      { pubkey: encrypt.depositPda, isSigner: false, isWritable: true },
      { pubkey: encrypt.configPda, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      {
        pubkey: vaultPk,
        isSigner: vaultPk.equals(payer),
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}
