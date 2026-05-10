"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import type { ProtocolState, EpochState, UserPositionState } from "./useProtocol";

const MOCK_PUBKEY = new PublicKey("11111111111111111111111111111111");
const MOCK_PROTOCOL_PDA = new PublicKey("22222222222222222222222222222222222222222222");

function createMockProtocol(): ProtocolState {
  return {
    authority: MOCK_PUBKEY,
    treasury: MOCK_PUBKEY,
    usdcMint: MOCK_PUBKEY,
    srMint: MOCK_PUBKEY,
    jrMint: MOCK_PUBKEY,
    tokenProgramId: MOCK_PUBKEY,
    performanceFeeBps: 500,
    earlyWithdrawalFeeBps: 100,
    insuranceFeeBps: 200,
    insuranceFund: new BN(50000 * 1e6),
    epochCount: new BN(5),
    totalTvl: new BN(2840000 * 1e6),
    paused: false,
    bump: 255,
  };
}

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

type MockStatus = { matured: Record<string, never> } | { active: Record<string, never> } | { open: Record<string, never> };
type MockDuration = { sevenDays: Record<string, never> } | { fourteenDays: Record<string, never> } | { thirtyDays: Record<string, never> };

function createMockEpochs(): EpochState[] {
  const statuses: MockStatus[] = [
    { matured: {} },
    { matured: {} },
    { active: {} },
    { open: {} },
    { open: {} },
  ];

  const seniorRates = [850, 900, 820, 780, 950];
  const seniorTotals = [500000, 750000, 320000, 180000, 95000];
  const juniorTotals = [250000, 350000, 180000, 120000, 55000];
  const yields = [42000, 58000, 12000, 0, 0];

  return Array.from({ length: 5 }, (_, i) => {
    const durationOptions: MockDuration[] = [
      { sevenDays: {} },
      { fourteenDays: {} },
      { thirtyDays: {} },
    ];
    const duration = durationOptions[i % 3];
    const epochNumber = i + 1;
    const createdAt = NOW - (5 - i) * DAY * 10;
    const startedAt = createdAt + DAY;
    const seconds = [7 * DAY, 14 * DAY, 30 * DAY][i % 3];
    const maturesAt = createdAt + seconds;
    const [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), MOCK_PROTOCOL_PDA.toBuffer(), new BN(epochNumber).toArrayLike(Buffer, "le", 8)],
      MOCK_PUBKEY,
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch_vault"), epochPda.toBuffer()],
      MOCK_PUBKEY,
    );

    return {
      publicKey: epochPda,
      protocol: MOCK_PROTOCOL_PDA,
      epochNumber: new BN(epochNumber),
      duration: duration as EpochState["duration"],
      status: statuses[i] as EpochState["status"],
      seniorFixedRateBps: seniorRates[i],
      seniorTotal: new BN(seniorTotals[i] * 1e6),
      juniorTotal: new BN(juniorTotals[i] * 1e6),
      seniorCap: new BN(seniorTotals[i] * 2 * 1e6),
      juniorCap: new BN(juniorTotals[i] * 2 * 1e6),
      totalYieldHarvested: new BN(yields[i] * 1e6),
      seniorYieldDistributed: new BN(Math.floor(yields[i] * 0.7 * 1e6)),
      juniorYieldDistributed: new BN(Math.floor(yields[i] * 0.3 * 1e6)),
      feesCollected: new BN(Math.floor(yields[i] * 0.1 * 1e6)),
      insuranceContribution: new BN(Math.floor(yields[i] * 0.05 * 1e6)),
      createdAt: new BN(createdAt),
      startedAt: new BN(startedAt),
      maturesAt: new BN(maturesAt),
      vaultAddress: vaultPda,
      bump: 254 - i,
    };
  });
}

function createMockPositions(walletPubkey: PublicKey): UserPositionState[] {
  const epochs = createMockEpochs();
  return epochs.slice(0, 3).flatMap((epoch, ei) =>
    [0, 1].map((trancheByte) => {
      const [posPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          epoch.publicKey.toBuffer(),
          walletPubkey.toBuffer(),
          Buffer.from([trancheByte]),
        ],
        MOCK_PUBKEY,
      );
      const isSenior = trancheByte === 0;
      const depositAmount = isSenior ? 5000 + ei * 1000 : 2500 + ei * 500;
      return {
        publicKey: posPda,
        owner: walletPubkey,
        epoch: epoch.publicKey,
        trancheType: (isSenior ? { senior: {} } : { junior: {} }) as UserPositionState["trancheType"],
        depositedAmount: new BN(depositAmount * 1e6),
        depositCiphertext: PublicKey.default,
        claimableCiphertext: PublicKey.default,
        pendingDecryptionDigest: [],
        pendingDecryptionRequest: PublicKey.default,
        trancheTokensMinted: new BN(depositAmount * 1e6),
        yieldClaimed: new BN(Math.floor(depositAmount * 0.08 * 1e6)),
        withdrawn: false,
        depositedAt: new BN(NOW - (5 - ei) * DAY * 10),
        decryptionPending: false,
        bump: 200,
      };
    }),
  );
}

function useLoadOnMount<T>(loader: () => T): {
  data: T;
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<T>(loader());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setData(loader());
      setLoading(false);
    }, 600);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh() }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refresh };
}

export function useMockProtocol(): {
  protocol: ProtocolState | null;
  loading: boolean;
  error: null;
  refresh: () => void;
} {
  const { data, loading, refresh } = useLoadOnMount(() => createMockProtocol());
  return { protocol: data, loading, error: null, refresh };
}

export function useMockEpochs(): {
  epochs: EpochState[];
  loading: boolean;
  error: null;
  refresh: () => void;
} {
  const { data, loading, refresh } = useLoadOnMount(() => createMockEpochs());
  return { epochs: data, loading, error: null, refresh };
}

export function useMockPositions(walletPubkey?: PublicKey | null): {
  positions: UserPositionState[];
  loading: boolean;
  error: null;
  refresh: () => void;
} {
  const { data, loading, refresh } = useLoadOnMount(() =>
    walletPubkey ? createMockPositions(walletPubkey) : [],
  );
  return { positions: data, loading, error: null, refresh };
}

export function useDemoMode() {
  const [enabled, setEnabled] = useState(true);
  return { demoMode: enabled, setDemoMode: setEnabled };
}
