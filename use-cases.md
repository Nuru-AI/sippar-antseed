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

**A contract's answer at a past block.** `rpc` with `eth_call`, the contract as `to`, the encoded
function call as `data`, and a block number: for example a token's `balanceOf` for an account at
that block, as QuickNode returns it.

**Over time.** The pages hold a single moment. Sample the same request on a schedule and keep
the pages; `asOf` and a row's `id` identify each sample.

## nansen-crypto-screener

**What is big.** The default page: the top 25 by fully diluted value across all five chains.

**What is moving.** `sort: volume`, `netflow`, `priceChange`, `buyVolume` or `sellVolume` over
`timeframe` of five minutes to thirty days. `netflow` over `1h` reads differently from `fdv` over
`30d`; pick the pair that matches the question.

**One chain.** `chains: ["base"]` with `rows: 10` for a short, cheap list.

**Tokenized stocks.** `symbols: ["TSLAX", "NVDAX", "SPYX"]` with `chains: ["solana"]` and
`rows: 5`: the on-chain price, volume and liquidity of those stock tokens, and a line naming any
ticker with no row. The price is the token's own on-chain price: close to the share price while
US markets are open, and free to drift on nights and weekends.

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

## sippar-x-social

X search on any subject, not only crypto.

**Reactions to a launch, a brand or an event.** The name with `since:` a recent date (a product
launch, a match, an announcement): the popular posts about it, with links, likes and views per post.

**What an account posted.** `from:handle`, optionally with `since:`: a company's, a team's or a
person's own posts.

**Mentions of a phrase.** Quote it: `"best pizza"`, `"agent wallet"`, a slogan or a product name.

**One language or market.** Add `lang:de`, `lang:es` and so on.

Keywords and names work; plain questions and single generic words do not (a coin ticker on its
own returns giveaway spam).

## sippar-flight-search

Google Flights fares for one route and date. One call is one search; the page carries every
itinerary Google showed, with its price for the whole party.

**Is this fare good?** One way on the date you want: `price_insights` says whether the price is
low, typical or high for the route, with the typical range and about two months of daily lows.

**The cheapest day in a window.** One call per date across the window (at most 8 in flight),
then compare the cheapest `price` on each page.

**A round trip for a group.** `FROM TO DATE RETURN-DATE ADULTS`: round-trip totals for the party,
listed by outbound flight. For return-flight options, search the return as its own one-way line.

**Where can I go from here.** One call per candidate destination on the same date, then rank by
the cheapest fare.

## sippar-linkedin-social

Public LinkedIn posts matching a search: who posted, when, and how much engagement each post got,
with a link to read it. The post text is not on the page.

**Who is talking about a topic.** Search the topic with `"posts": 30` and rank the authors by
`followers`, or by `reactions` across their posts.

**A company's or product's LinkedIn reach.** Search its name; the authors are the people and pages
mentioning it, the counts show which mentions landed.

**Hiring, layoffs, funding: what the professional crowd posts.** Keyword searches such as
`hiring freeze`, `layoffs 2026` or `climate tech funding` return the posts, sorted by relevance;
sort by `publishedAt` yourself for the newest.

**Go deeper on one search.** Follow `next.cursor` for the following ten, or ask for up to 50 at
once with `posts`.

## sippar-reddit-social

Public Reddit posts matching a search: which threads discuss it, in which subreddits, and how much
attention each got, with a link to read it. The post text and comments are not on the page.

**Where a topic is discussed.** Search it and group the posts by `subreddit`: the communities
that talk about it most, and the threads in each.

**Which threads mattered.** Rank by `score` or `numComments` to find the threads worth opening.

**Reaction to something recent.** Set `"time": "week"` (or `day`) to see the threads a launch, an
outage or a news story started, then open the busiest ones.

**Go deeper on one search.** Follow `next.cursor` for the following ten.

## sippar-github

Public GitHub: read a repository, its code and its issues.

**Understand a library before using it.** `owner/repo` for the README and default branch, then the
docs folder's file list and its files (or `llms.txt` if the repository has one).

**Where is this defined?** `symbol:name` with `"repo": "owner/name"` and `"kind": "code"`: the files
and lines that define it; then fetch the file from a hit's `url` for the body.

**Has anyone hit this error?** The exact error message in quotes with `is:issue` and `"repo"`:
the issues that mention it, then the issue itself for the thread.

**What changed?** `owner/repo/releases/latest` for the release notes, or
`owner/repo/commits/<branch>/<path>` for one file's history and `/commit/<sha>` for a diff.

**Find projects.** A repository search with qualifiers: `x402 language:typescript`,
`created:>2026-09-01 sort:stars`, or `topics/<name>`.

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
10. **What is said, then what is so.** `sippar-x-social` for what X is saying about a story this
   week; then `tavily-web-search` for the sources behind it, or, for an onchain project,
   `quicknode-blockchain-data` or `nansen-crypto-screener` to check the claims against the data.
11. **A trip, then the news at the destination.** `sippar-flight-search` for the fares; then
   `tavily-web-search` for anything that could move the plan there (strikes, weather, events).
12. **Two networks on one subject.** `sippar-linkedin-social` for who is posting about it on
   LinkedIn and how it lands; `sippar-x-social` for the same subject on X.
13. **Read the code, then the chain.** `sippar-github` for a protocol's contract source or its
   deployment addresses in the repository; then `quicknode-blockchain-data` with `rpc` on those
   addresses to see what they hold and do now.
14. **The repository, then the conversation.** `sippar-github` for a library's latest release notes;
   then `sippar-x-social` or `tavily-web-search` for what people say about that release.
15. **Three networks on one subject.** `sippar-reddit-social` for the communities and threads
   discussing it; `sippar-x-social` for the live conversation on X; `sippar-linkedin-social` for
   who posts about it professionally.

## What the pages are not

No derived figures anywhere. The chain-state page itself holds no prices and no history: its
balances are the contract's ledger entry at the `latest` block, which is not finalized. Past
blocks come only through `rpc`, as QuickNode returns them. A page
with `ok: false` rows is a page with gaps; `counts.rowsFailed` says how many. If a figure looks
wrong, read the page's notes before deciding it is: one chain's real gas limit looks absurd
until you know that chain.
