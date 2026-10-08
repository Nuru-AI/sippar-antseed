# What to do with Sippar's models on AntSeed

Ideas, not recipes. Each model answers one kind of question; the options are the arguments it
takes; the combinations are calls you chain, feeding one answer into the next request. Every
page is the provider's data as returned, so what you make of it is yours. Transport is in
[skills/sippar-antseed-buyer/SKILL.md](./skills/sippar-antseed-buyer/SKILL.md); each model's
arguments are in its own skill.

## quicknode-blockchain-data

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

**Every token a wallet moved.** `rpc` with `eth_getLogs`, the Transfer topic, and the wallet in
topic 2 (received) or 1 (sent) instead of a contract, over a block range: each token the wallet
received or sent, from whichever contract, as QuickNode returns the logs. Pair it with the three
`address*` fields for the wallet's current balances.

**A block itself.** `rpc` with `eth_getBlockByNumber` and `false`: the block's header (number, hash,
timestamp, gas) and its transaction hashes, for `latest`, `finalized` or any block number.

**One transaction, settled.** `rpc` with `eth_getTransactionReceipt` and the hash: whether it
succeeded, the gas it used, the price paid per gas, and the logs it emitted, as QuickNode returns them.
A hash from a wallet's transfer logs above is the natural input. `eth_getTransactionByHash` with
the same hash returns the transaction itself: who sent it, to what, with what value and input.

**A native balance at a past moment.** `rpc` with `eth_getBalance`, an account and a block number:
the account's native coin balance at that block, old blocks included, in wei as QuickNode returns it.

**Native coin a contract moved.** `rpc` with `trace_filter`, the wallet in `toAddress` (received) or
`fromAddress` (sent), a block range and a `count`: the calls and internal transfers that touched the
wallet, including ETH a router or bridge paid it, which no token log records. Wide answers resume
with `after`.

**Over time.** The pages hold a single moment. Sample the same request on a schedule and keep
the pages; `asOf` and a row's `id` identify each sample.

## nansen-crypto-screener

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
official page: search first, then verify on chain with `quicknode-blockchain-data`.

## crypto-skills

**Before acting on a protocol.** Ask for its skill by its id (`chains/aave`; a single word such as
`aave` is a search): the author's instructions, the source and license, and CryptoSkill's risk flags, in one
page. Read the flags before your agent follows the skill.

**Finding a skill for a task.** Two or three keywords, not a sentence (`aave lending`, `USDC bridge`),
return the matching registry entries; ask for the one you want by its id, built as
`category/name` from the entry's own fields.

**Onboarding an agent without GitHub.** Ask for `sippar-antseed-buyer` and then the skill for the
model you need (`quicknode-blockchain-data`, `nansen-crypto-screener`, `tavily-web-search`), all through
AntSeed itself.

## Combinations

Each is a sequence of calls. The value named in one page goes into the next request.

1. **From a name to its transfers.** `tavily-web-search` for the token's contract address on
   Ethereum; then `quicknode-blockchain-data` with `rpc` `eth_getLogs` on that address over a recent
   block range.
2. **From a ranking to a holder.** `nansen-crypto-screener` with `chains: ["base"]`, `sort:
   volume`, `rows: 10`; take a contract from the page; then `quicknode-blockchain-data` on Base with
   `address` (an account you watch) and `tokens: [that contract]`.
3. **Market context for a chain read.** `quicknode-blockchain-data` on one chain for fees and
   activity, beside `nansen-crypto-screener` for the same chain over `24h`: what the chain is
   doing and what is trading on it, from two providers, at the same moment.
4. **Two angles on the same market.** `nansen-crypto-screener` ranked by `netflow` over `1h`,
   and `view: perp-screener` in a second call. Spot flows and perpetuals side by side.
5. **A watchlist sweep.** For each address you follow, one `quicknode-blockchain-data` call per chain
   it uses with the three `address*` fields; at most 8 calls in flight; the pages are the
   record.
6. **News plus the chain.** `tavily-web-search` for what is being said about a protocol, then
   `quicknode-blockchain-data` with no `address` on its chain to see what its published contracts
   hold now.
7. **A protocol's skill, then its chain.** `crypto-skills` with the protocol's id for how it
   works and which contracts it names; then `quicknode-blockchain-data` on that chain with no
   `address`, or with `rpc` on one of those contracts.
8. **A task's skills, then the market.** `crypto-skills` with two or three keywords for the task; then
   `nansen-crypto-screener` for the chain the chosen skill works on.
9. **Learn the call, then make it.** `crypto-skills` with `quicknode-blockchain-data` for the
   arguments; then the `quicknode-blockchain-data` call it describes.

## What the pages are not

No prices on the chain-state page, no history on any page, no derived figures anywhere. A
balance is the contract's ledger entry at the `latest` block, which is not finalized. A page
with `ok: false` rows is a page with gaps; `counts.rowsFailed` says how many. If a figure looks
wrong, read the page's notes before deciding it is: one chain's real gas limit looks absurd
until you know that chain.
