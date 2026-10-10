# Sippar's data models on AntSeed

Sippar sells live data, and agent skills, as models on the [AntSeed](https://antseed.com) peer-to-peer inference
network. An agent with an AntSeed buyer calls them like any model, pays per output token in USDC
on Base from its own payment channel, and gets the provider's data as the provider returns it,
with the source named on every page. Sippar is the connector: it buys the data when you ask,
passes it through unchanged, and does not store, cache or blend it.

Eleven models, one seller peer:

| Model string | What it answers | Source |
|---|---|---|
| `quicknode-blockchain-data` | live facts about one of 20 EVM chains: block, gas and fees, balances, one account's balances and transactions, any ERC-20 balance, transfer logs for a token or a wallet, a block and its transaction hashes, a transaction and its receipt, a native balance at any block | QuickNode |
| `nansen-crypto-screener` | the top token contracts on Solana, Ethereum, Base, BNB and Arbitrum, ranked the way you choose, or only the tickers you name, such as tokenized stocks; and Nansen's perpetuals screener | Nansen |
| `tavily-web-search` | a live web search with sources and an answer | Tavily |
| `crypto-skills` | agent skills: Sippar's own for these models, and CryptoSkill's registry of crypto skills, by id, by search and file by file | Sippar; CryptoSkill and each skill's author |
| `sippar-skills` | the aggregator: agent skills from skills.sh (every domain) and CryptoSkill (crypto), by id, by a search of both and file by file, plus Sippar's own skills and the adapter that runs any of them on AntSeed | Sippar; skills.sh, CryptoSkill and each skill's author |
| `sippar-x-social` | public X (Twitter) posts on any subject matching a search, with X's search operators | glim.sh |
| `sippar-flight-search` | Google Flights fares for one route and date, one way or round trip, for one to nine adults, with Google's price insights | Google Flights, via stabletravel.dev |
| `sippar-linkedin-social` | public LinkedIn posts on any subject matching a search: each post's link, date, author (name, profile link, followers) and reaction and comment counts, not the post text; up to 50 posts a call | Social Fetch |
| `sippar-github` | public GitHub: a repository's README and metadata, a folder's file list, one file, an issue, a PR with comments and changed files, commits, releases, and code search with snippets and line numbers | glim.sh |
| `sippar-reddit-social` | public Reddit posts on any subject matching a search: each post's title, thread link, subreddit, author, date, score and comment count, not the post text or comments; up to 10 posts a call | glim.sh |
| `sippar-hotel-search` | hotels, hostels and other places to stay for one search: type, star class, guest rating, amenities, address and the current nightly price Google shows, and on request each booking site's price; up to 10 places a call | Google Maps, via OpenWeb Ninja |

Two models also answer under their earlier ids, with the same data and rate: `sippar-chain-state`
and `onchain-token-rankings`. Use the new ids above. `sippar-skills` and `crypto-skills` are two
models: the aggregator over both indexes, and the CryptoSkill-only one.

## Where to look

| You want to | Read |
|---|---|
| reach the seller, send a request that keeps its arguments, stay under the call limit, read the routing line | [skills/sippar-antseed-buyer/SKILL.md](./skills/sippar-antseed-buyer/SKILL.md) |
| chain facts: the six arguments, the page, transfer logs for a token or a wallet, a block, a transaction and its receipt | [skills/quicknode-blockchain-data/SKILL.md](./skills/quicknode-blockchain-data/SKILL.md) |
| token rankings, named tickers and the perpetuals screener: the six arguments, the two page shapes | [skills/nansen-crypto-screener/SKILL.md](./skills/nansen-crypto-screener/SKILL.md) |
| web search: how to ask, the page | [skills/tavily-web-search/SKILL.md](./skills/tavily-web-search/SKILL.md) |
| agent skills: how to ask for one or search, what the page carries | [skills/crypto-skills/SKILL.md](./skills/crypto-skills/SKILL.md) |
| the aggregator: skills.sh ids and files, a search of both indexes, the license line and audit verdicts | [skills/sippar-skills/SKILL.md](./skills/sippar-skills/SKILL.md) |
| run a public skill on AntSeed: keep its process, swap its tooling for Sippar's models and AntSeed's catalog | [skills/sippar-skill-adapter/SKILL.md](./skills/sippar-skill-adapter/SKILL.md) |
| X posts: how to search, which operators work, the page | [skills/sippar-x-social/SKILL.md](./skills/sippar-x-social/SKILL.md) |
| flight fares: the one-line request, reading the page, round trips | [skills/sippar-flight-search/SKILL.md](./skills/sippar-flight-search/SKILL.md) |
| LinkedIn posts: how to search, more posts per call, the next page, reading the page | [skills/sippar-linkedin-social/SKILL.md](./skills/sippar-linkedin-social/SKILL.md) |
| GitHub: refs, code search, the options, reading the page, keeping pages small | [skills/sippar-github/SKILL.md](./skills/sippar-github/SKILL.md) |
| Reddit posts: how to search, the date window, the next page, reading the page | [skills/sippar-reddit-social/SKILL.md](./skills/sippar-reddit-social/SKILL.md) |
| places to stay: the one-line search, the default-night price, booking-site offers, reading the page | [skills/sippar-hotel-search/SKILL.md](./skills/sippar-hotel-search/SKILL.md) |
| ideas: what each model is for, options per model, and how to combine them | [use-cases.md](./use-cases.md) |
| copy a working call | [examples/curl.sh](./examples/curl.sh), [examples/python.py](./examples/python.py) |
| check, offline and free, which request shapes keep your arguments | [tools/check-argument-survival.mjs](./tools/check-argument-survival.mjs) |

The thirteen files under `skills/` are agent skills (a `SKILL.md` with frontmatter) and they are
also the documentation. Give your agent the folder, or read them yourself; they say the same
thing either way.

## One call

You need the AntSeed buyer proxy, from the desktop app or `npm i -g @antseed/cli`. Pin the
peer on the request, send the chat-completions shape, name what you want:

```bash
curl http://127.0.0.1:8377/v1/chat/completions \
  -H 'content-type: application/json' \
  -H 'x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f' \
  -d '{
    "model": "quicknode-blockchain-data",
    "network": "base",
    "fields": ["blockNumber", "gasPrice"],
    "messages": [{"role": "user", "content": "chain state"}]
  }'
```

Two things decide whether you get what you asked for, and both are in the main skill: post to
`/v1/chat/completions` (a translated shape drops your arguments and you are served the default
page), and read the routing line on the answer. If your client cannot change shape, the
arguments also travel under `metadata.sippar` or as `x-sippar-*` headers, and every model reads
both.

## Identity and proofs

| | |
|---|---|
| Seller peer | `706fca9c0d0684c30f86209aae0c3565ce1aa69f` |
| Onchain agent | `84918` |
| Settlement | USDC on Base mainnet |
| Domain proof | <https://sippar.network/.well-known/antseed.json> |
| GitHub proof | [`antseed.json`](./antseed.json) in this repository |

[`provider.json`](./provider.json) carries the same facts, and each model's announced
parameters, in machine-readable form. Prices are on the peer record and change, so this
repository does not print them:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

## About the data

Every page is the provider's data. `quicknode-blockchain-data` is QuickNode's answer to documented
JSON-RPC reads, with QuickNode's own integer beside each readable value. `nansen-crypto-screener`
is Nansen's screener data with the attribution Nansen requires. `tavily-web-search` is Tavily's
response, whole. `crypto-skills` serves CryptoSkill's files as their authors published them, with the
author and license named in each skill's `SOURCE.md` and CryptoSkill's risk flags beside it; `sippar-skills`
adds skills.sh's skills, each with its repository's license line and skills.sh's audit verdicts; Sippar
does not review, rank or filter them. `sippar-x-social` is glim.sh's X search response, whole, including
glim.sh's own page totals; posts belong to their authors and some results are spam or off-topic.
What you compute from a page is yours; Sippar adds no derived figures.

## More from Sippar

The wider Sippar catalog of payable services: <https://sippar.network/marketplace>, machine-readable
at <https://sippar.network/llms.txt>.

## License

MIT, see [LICENSE](./LICENSE).
