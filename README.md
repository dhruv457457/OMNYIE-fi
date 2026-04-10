# OMNYIE Finance

**Yield Tranching Protocol on Solana**

OMNYIE Finance splits DeFi yield by **risk**, not by time. Depositors choose between a **Senior tranche** (fixed yield, protected principal) and a **Junior tranche** (leveraged variable yield, higher risk). Built on Solana using Anchor Framework, Token-2022, and Encrypt for private position settlement.

> Name origin: Omni-Man from *Invincible* + **YIE** = Yield

---

## How It Works

```
Depositors
    |
    +--- Senior Tranche (srUSDC) ---> Fixed APY (e.g. 8-10%)
    |                                  Principal protected
    |                                  Paid first from yield
    |
    +--- Junior Tranche (jrUSDC) ---> Variable APY (leveraged)
                                       Absorbs losses first
                                       Gets all excess yield
```

1. **Choose Your Risk** - Senior = fixed yield, Junior = leveraged variable yield
2. **Deposit USDC** - Into an epoch (7/14/30 day periods). USDC is deployed to yield sources (Kamino vaults)
3. **Settle Privately** - Deposit size is mirrored into an Encrypt ciphertext account for private withdrawal settlement
4. **Collect Returns** - When the epoch matures, Senior gets paid first at the fixed rate, Junior gets everything remaining

---

## Architecture

### Smart Contracts (Anchor / Rust)

| Program | Address | Description |
|---------|---------|-------------|
| `strata_core` | `Gu9BtKAQ7dHZhig9Z3aESR9hR7xcWTjjGeAN6bHZCBvX` | Core protocol: epochs, deposits, withdrawals, yield distribution |
| `strata_token` | `BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn` | Tranche token manager: srUSDC/jrUSDC mints via Token-2022 |
| `Encrypt` | `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8` | Confidential settlement layer for private position balances |

#### strata_core Instructions
- `initialize` - Initialize the protocol with fee config, treasury, USDC mint
- `create_epoch` - Create yield periods (7d/14d/30d) with configurable senior APY and caps
- `deposit` - Deposit USDC into senior/junior tranche and create an Encrypt ciphertext for the private position amount
- `start_epoch` - Close deposits, begin yield generation
- `harvest_yield` - Cranker harvests yield from underlying vaults (mock Kamino on devnet)
- `distribute_yield` - Split harvested yield: senior gets fixed rate, junior gets remainder
- `withdraw` - Withdraw principal + earned yield after maturity
- `request_withdraw_decryption` - Request Encrypt decryption for the private claim amount
- `finalize_withdraw_decryption` - Verify the decrypted digest and settle the withdrawal

#### strata_token Instructions
- `initialize_mints` - Create srUSDC and jrUSDC mints (Token-2022 with extensions)
- `mint_tranche` - Mint tranche tokens to depositors (1:1 with USDC deposited)
- `burn_tranche` - Burn tranche tokens on withdrawal

### On-Chain Account Structure

```
Protocol (PDA: "protocol")
├── authority, treasury, fee config
├── sr_mint, jr_mint references
├── total_tvl, epoch_count
│
├── Epoch (PDA: "epoch" + protocol + epoch_number)
│   ├── duration (7d/14d/30d), status (Open/Active/Matured/Halted)
│   ├── senior_fixed_rate_bps, senior_total, junior_total
│   ├── senior_cap, junior_cap
│   ├── total_yield_harvested, senior/junior_yield_distributed
│   └── Epoch Vault (PDA: "epoch_vault" + epoch) - holds USDC
│
└── UserPosition (PDA: "position" + epoch + user + tranche_type)
    ├── deposited_amount, tranche_tokens_minted
    ├── yield_claimed, withdrawn
    └── deposited_at timestamp
```

### Frontend (Next.js 16 / React 19)

- **Next.js 16.2.2** with App Router and Turbopack
- **@solana/wallet-adapter** - Phantom + Solflare support
- **@coral-xyz/anchor** - On-chain account deserialization and transaction building
- **Tailwind CSS v4** - OMNYIE red brand theme (#C62828)
- **Real on-chain data** - All pages read live from deployed devnet program accounts
- **Network guard** - Detects wrong network and prompts wallet switching
- **Server-side token minting** - API route uses authority keypair to mint srUSDC/jrUSDC after deposit
- **Encrypt integration** - Private position ciphertexts plus request/finalize flow for confidential withdrawals

---

## Deployed on Devnet

| Account | Address |
|---------|---------|
| Protocol PDA | `cgQrWUvyz4BHWdtWTfyBh3aUwvPU7A77SeWaGSn2aD6` |
| Test USDC Mint | `8a6jsDxNAm51EL1DBZbVwt96VLKnVZWd8ama6TDsMoEk` |
| srUSDC Mint (Token-2022) | `Etc1f9WRhLVzT6t8XEWwTebEmw58AGE31nNW7xxnHPaH` |
| jrUSDC Mint (Token-2022) | `8uFbF7mp2TGxwwtW4Ez75MLzoNVBvJ65xEvbuaxU6Lb9` |
| Token Config PDA | `5sxSDSPC62atoPjoCb9VrynUz5QCqfZAmXQc8w4ABMXX` |
| Encrypt Program | `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8` |

### Active Epochs

| Epoch | Duration | Senior APY | Status |
|-------|----------|------------|--------|
| #0 | 7 Days | 8.00% | Open |
| #1 | 14 Days | 9.00% | Open |
| #2 | 30 Days | 10.00% | Open |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust, Anchor Framework 0.32.1 |
| Token Standard | SPL Token-2022 (Token Extensions) |
| Blockchain | Solana (Devnet → Mainnet) |
| Frontend | Next.js 16.2.2, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Wallet | @solana/wallet-adapter (Phantom, Solflare) |
| RPC | Helius (WebSocket support for tx confirmations) |
| Yield Source | Mock Kamino adapter (devnet), Real Kamino (mainnet) |
| Confidentiality | Encrypt (devnet pre-alpha, vendored SDK patch) |

---

## Project Structure

```
my-project/
├── programs/
│   ├── strata-core/          # Core yield tranching protocol
│   │   └── src/
│   │       ├── instructions/  # initialize, deposit, withdraw, etc.
│   │       ├── state/         # Protocol, Epoch, UserPosition accounts
│   │       ├── adapters/      # Mock Kamino vault adapter
│   │       └── errors.rs      # Custom error codes
│   └── strata-token/          # Token-2022 tranche token manager
│       └── src/
│           └── instructions/  # initialize_mints, mint_tranche, burn_tranche
├── app/                       # Next.js frontend
│   └── src/
│       ├── app/               # Pages (dashboard, pools, deposit, portfolio, epochs)
│       │   └── api/           # Server-side API routes (mint-tranche)
│       ├── components/        # Navbar, NetworkGuard, AddTokenBanner, UI components
│       ├── hooks/             # useProtocol, useEpochs, useUserPositions
│       ├── lib/               # Constants, utils, IDL files
│       └── providers/         # WalletProvider
├── scripts/                   # Protocol initialization & admin scripts
├── target/idl/                # Generated Anchor IDL files
└── Anchor.toml                # Anchor config (devnet)
```

---

## Getting Started

### Prerequisites

- Rust + Cargo (1.89+)
- Solana CLI (1.18+)
- Anchor CLI (0.32.1)
- Node.js (20+)
- Yarn or npm

### Build Contracts

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Initialize Protocol

```bash
cd my-project
npx tsx scripts/initialize-protocol.ts
```

This creates test USDC, initializes both programs, and creates 3 sample epochs.

### Devnet Demo: Mature an Epoch

Create a fresh open epoch without reinitializing the protocol:

```bash
npx tsx scripts/create-epoch.ts 7 800
```

The arguments are duration (`7`, `14`, or `30`) and senior APY in basis points (`800` = 8%).

For same-day Encrypt withdrawal testing, the repo includes an authority-only devnet helper:

```bash
npx tsx scripts/force-mature-epoch.ts 2 0
```

The first argument is the epoch number. The second argument is optional mock yield in USDC. Use `0` for the first withdrawal test so the vault only returns deposited principal.

### Run Frontend

```bash
cd app
cp .env.example .env.local  # Add your Helius API key
npm install
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_HELIUS_KEY=your_helius_api_key
NEXT_PUBLIC_ENCRYPT_PROGRAM_ID=4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
AUTHORITY_KEYPAIR=[...your deploy keypair array...]
```

---

## Encrypt Settlement Flow

1. User deposits into a tranche.
2. `strata_core.deposit` creates a plaintext-backed Encrypt ciphertext mirroring the private position amount.
3. When the epoch is ready to settle, the user calls `request_withdraw_decryption`.
4. Encrypt writes the decryption response asynchronously to the request account.
5. The user then calls `finalize_withdraw_decryption`, which verifies the stored digest and settles the withdrawal on-chain.

This keeps the settlement flow compatible with Encrypt's async request/response model while preserving OMNYIE's tranche logic.

---

## Yield Math

Senior tranche yield is calculated as:
```
senior_yield = senior_total * senior_fixed_rate_bps / 10000 * (epoch_days / 365)
```

Junior tranche gets everything remaining:
```
junior_yield = total_yield_harvested - senior_yield - platform_fees - insurance_contribution
```

If total yield < senior entitlement, junior tranche absorbs the loss (senior is still paid from junior's principal if needed).

---

## Fee Structure

| Fee | Rate | Description |
|-----|------|-------------|
| Performance Fee | 5% | On total yield harvested |
| Early Withdrawal | 1% | On principal if withdrawn before maturity |
| Insurance Fund | 0.5% | Builds reserve for senior tranche protection |

---

## Hackathon Tracks

Built for the **Solana Frontier Hackathon** (deadline: May 12, 2026)

- **Main DeFi Track** - Novel yield structuring primitive on Solana
- **Encrypt & Ika** ($15K) - Confidential capital markets first, Ika bridgeless collateral next
- **100xDevs** ($10K) - Built by developers, for the DeFi community

---

## Team

- **Dhruv** - Protocol Engineer / Full-Stack Builder
- **Co-founder** - Communications & Strategy
- **Co-founder** - Social Media & Community (40M+ Instagram reach)

---

## Roadmap

- [x] Core smart contracts (strata_core + strata_token)
- [x] Devnet deployment with test epochs
- [x] Frontend with real on-chain data
- [x] Deposit flow with tranche token minting
- [x] Portfolio tracking from on-chain positions
- [x] Encrypt-backed private withdrawal settlement flow
- [ ] Real Kamino vault integration (mainnet)
- [ ] Epoch lifecycle automation (cranker service)
- [ ] Ika-based bridgeless capital controls
- [ ] Governance token & DAO
- [ ] Mainnet launch

---

## License

MIT
