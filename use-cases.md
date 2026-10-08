# What to do with Sippar's models on AntSeed

Ideas, not recipes. Each model answers one kind of question; the options are the arguments it
takes; the combinations are calls you chain, feeding one answer into the next request. Every
page is the provider's data as returned, so what you make of it is yours. Transport is in
[skills/sippar-antseed-buyer/SKILL.md](./skills/sippar-antseed-buyer/SKILL.md); each model's
arguments are in its own skill.

## sippar-chain-state

**One chain right now.** How busy and how expensive a chain is at this moment: ask for
`blockNumber`, `blockTimestamp`, `blockTransactionCount`, `blockGasUsed`, `blockGasLimit`,
`gasPrice`, `baseFeePerGas`, `maxPriorityFeePerGas` on one `network`.

**Many chains at once.** The same `fields` on each of the 20 chains, in batches of 8 or fewer,
gives one consistent sample across the network for a dashboard, a health check or a "where is it
cheap right now" question. Keep each page's `asOf` and `routing.network`.

**One account across chains.** `address` plus the three `address*` fields on each chain the
account uses: where it holds native coin, which listed tokens it holds, and how active it is.
Name the three fields so you do not pay for the protocol rows.

**Any token, one account.** `address` plus `tokens` with the contract addresses you care about:
the balance in the token's smallest unit and the contract's decimals, both from the contract.

**Where protocol liquidity sits.** With no `address`, the balance rows are a fixed set of
published protocol contracts (lending pools, bridges, routers, wrapped native), labelled in
`targetLabel`.

**A token's transfers over a block range.** `rpc` with `eth_getLogs`, the token's contract as
`address`, the Transfer topic, and absolute `fromBlock` and `toBlock`. Narrow ranges; a busy
token fills a page in one block, and the page tells you where to resume.

**Over time.** The pages hold a single moment. Sample the same request on a schedule and keep
the pages; `asOf` and a row's `id` identify each sample.

## onchain-token-rankings

**What is big.** The default page: the top 25 by fully diluted value across all five chains.

**What is moving.** `sort: volume`, `netflow`, `priceChange`, `buyVolume` or `sellVolume` over
`timeframe` of five minutes to thirty days. `netflow` over `1h` reads differently from `fdv` over
`30d`; pick the pair that matches the question.

**One chain.** `chains: ["base"]` with `rows: 10` for a short, cheap list.

**Perpetuals.** `view: perp-screener` alone: Nansen's Hyperliquid perpetuals screener over the
last 24 hours, as Nansen returns it.

## tavily-web-search

**Current information with sources.** Ask the question as the last user message; the page is
Tavily's five results and its answer, with the URL of each result.

**Finding an identifier to use elsewhere.** A contract address, a token's chain, a protocol's
official page: search first, then verify on chain with `sippar-chain-state`.

## Combinations

Each is a sequence of calls. The value named in one page goes into the next request.

1. **From a name to its transfers.** `tavily-web-search` for the token's contract address on
   Ethereum; then `sippar-chain-state` with `rpc` `eth_getLogs` on that address over a recent
   block range.
2. **From a ranking to a holder.** `onchain-token-rankings` with `chains: ["base"]`, `sort:
   volume`, `rows: 10`; take a contract from the page; then `sippar-chain-state` on Base with
   `address` (an account you watch) and `tokens: [that contract]`.
3. **Market context for a chain read.** `sippar-chain-state` on one chain for fees and
   activity, beside `onchain-token-rankings` for the same chain over `24h`: what the chain is
   doing and what is trading on it, from two providers, at the same moment.
4. **Two angles on the same market.** `onchain-token-rankings` ranked by `netflow` over `1h`,
   and `view: perp-screener` in a second call. Spot flows and perpetuals side by side.
5. **A watchlist sweep.** For each address you follow, one `sippar-chain-state` call per chain
   it uses with the three `address*` fields; at most 8 calls in flight; the pages are the
   record.
6. **News plus the chain.** `tavily-web-search` for what is being said about a protocol, then
   `sippar-chain-state` with no `address` on its chain to see what its published contracts
   hold now.

## What the pages are not

No prices on the chain-state page, no history on any page, no derived figures anywhere. A
balance is the contract's ledger entry at the `latest` block, which is not finalized. A page
with `ok: false` rows is a page with gaps; `counts.rowsFailed` says how many. If a figure looks
wrong, read the page's notes before deciding it is: one chain's real gas limit looks absurd
until you know that chain.
