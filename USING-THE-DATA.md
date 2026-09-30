# What you can do with `sippar-chain-state`

*Written by Hermes Agent, an AI agent running DeepSeek through AntSeed, after it bought this
listing using only the public guides, with no help from us. Lightly edited by Sippar for accuracy;
every edit is listed at the end. The data itself is QuickNode's, bought per request and passed
through unchanged; everything below is something you compute on your side.*

A companion to [BUYING.md](./BUYING.md). Where that page is *how to reach the listing correctly*,
this one is *what the data can be read as*: the analytical moves a consumer can make on
`sippar-chain-state` responses. It is intentionally consumer-side and tool-agnostic.

> These are **slow liquidity and position indicators**, not price or arbitrage signals. Read
> them as positioning, not as market timing.
>
> `coverage` on the page states the constraints that shape every lens below: **balances only, no
> USD prices and no valuation, and a single observation at the stated block, with no history and
> no deltas.** Any "over time" analysis (lens 4) is something *you* build by sampling on a schedule
> and diffing; Sippar does not serve history. `asOf` + row `id` is the dedupe key when you do.
>
> Two more from `coverage`: reads are at the **`latest` block, which is not finalized and can be
> reorganised** (fine for slow indicators, just don't hard-depend on an exact figure); and an
> ERC-20 balance is the **token contract's ledger entry for an address. It says nothing about
> beneficial ownership, custody or control**, so label wallet reads as *balances*, not as
> *holdings you've verified are owned or controlled*.

---

## Five analytical lenses

The listing returns per-chain facts (scalar) and, when an `address` is supplied, per-account facts
(`addressNativeBalance`, `addressTransactionCount`, `addressErc20Balance`). Those two shapes
support five distinct analyses:

### 1. Wallet / address profile (per address)
Repeat `addressErc20Balance` + `addressNativeBalance` + `addressTransactionCount` across the
chains the address is active on. Parse the ERC-20 result as a **list keyed by `asset`**, one row
per token the chain's page lists. Cross-chain you get: native balance per chain, balances of the
listed tokens per chain, and a chain-preference ranking by transaction count. Any label you put on
the address (exchange, treasury, active wallet) is your hypothesis from that profile, not a fact
the data states; see the ownership note above.

> Sending an `address` adds it to a fixed watchlist of protocol contracts, so the page also
> carries those alongside your address's rows (several are routers that hold zero by
> design). Filter to your `target`, don't read the protocols as a wallet, and name the three
> `address*` fields in `fields` so you don't pay for the protocol rows at all.

### 2. Chain snapshot (per chain)
One call per chain for the chain-level fields: block height, `gasPrice`, `baseFeePerGas`,
`blockGasUsed` / `blockGasLimit` (→ congestion %, which you compute),
`blockTransactionCount`. This is a point-in-time read of how busy and how full a chain is.

### 3. All-chain dashboard (cross-section, one point in time)
The same fields on every chain the listing serves, called in parallel at the same nominal time.
Rank chains by gas, by activity, by congestion. This answers "where is activity /
cost cheapest right now" with one consistent sample, rather than browsing sites. Fees are paid in
each chain's own coin, so a cost ranking is direct only among chains whose fee coin is the same
(ETH on 11 of the 20 on 2026-09-30); ranking across the rest needs your own price source.

### 4. Temporal delta (a chain or address over time)
Sample the same address/chain on a schedule and diff consecutive snapshots, using `valueRaw`.
Native-balance and ERC-20 deltas are **flow** signals: inflows/outflows to an address, or net
change in the liquidity the watched contracts hold. This converts a balance snapshot into a
movement signal.

### 5. Cross-address portfolio watch
Keep a small watchlist of addresses (exchange hot wallets, treasuries), sweep each across the
chains they're active on, and track relative position sizes and movement that would indicate a
transfer, accumulation, or drawdown.

## Three rules that come from the data shape

- **`addressErc20Balance` is a list, not a scalar.** One row per asset for the chain's listed
  token set. Key by `(metric, target, asset)`. Summing into a dollar figure requires a price
  source Sippar does not provide, so keep per-chain native and per-asset figures separate.
- **Native balances across different chains are not commensurable.** A single "total native"
  across chains mixes units (1 BNB ≠ 1 ETH). Treat cross-chain aggregates as rankings and
  per-chain figures as amounts, never a summed cross-chain total.
- **`addressTransactionCount` is sender-based** (transactions the address sent), so it undercounts
  vs block explorers, which also count incoming and token-transfer transactions. Use it for
  *relative* activity across that address's own chains, never as an explorer-equivalent total.

## Audience note
These lenses assume the reader already has the request shape right (BUYING.md). If a routed call
was served `mode=default` rather than `mode=declared`, you are looking at ethereum-mainnet, not the
chain you asked for. Check the routing line before treating any derived signal as being about the
intended chain.

---

## What Sippar changed from Hermes's draft

- Removed "drop `asset == null` rows" for token balances: every `addressErc20Balance` row names
  its asset. The null-asset row on an address page is `addressTransactionCount`, a different
  metric.
- "Stablecoin holdings" became "balances of the listed tokens": the per-chain token set also holds
  wrapped BTC and ETH and some chain tokens, not only stablecoins.
- "Classify the address (exchange hot wallet, issuer treasury, whale…)" became a hypothesis you
  label yourself, because the page makes no claim about who controls an address.
- "Slow liquidity / TVL / position indicators" lost "TVL", which implies a dollar value the page
  does not carry.
- "One scalar batch per chain" became "one call per chain"; "all 20 chains" became "every chain the
  listing serves", since that set can change.
- Added to lens 3: fees are in each chain's own coin, so ranking cost across coins needs a price
  source.
- Lens 4's "a chain's held liquidity" became "the liquidity the watched contracts hold", which is
  what the page reads.
- Added: use `valueRaw` for deltas, key token rows by `(metric, target, asset)`, and name the
  `address*` fields to avoid paying for the protocol rows.
- The italic header above is ours, including its sentence about QuickNode. We also removed one
  word describing the routers to match our other guides, fixed the links for this folder, spelled
  out "txns"/"txs", and replaced dashes with commas and full stops.
