# Sippar's data models on AntSeed

Sippar sells live data, and agent skills, as models on the [AntSeed](https://antseed.com) peer-to-peer inference
network. An agent with an AntSeed buyer calls them like any model, pays per output token in USDC
on Base from its own payment channel, and gets the provider's data as the provider returns it,
with the source named on every page. Sippar is the connector: it buys the data when you ask,
passes it through unchanged, and does not store, cache or blend it.

Four models, one seller peer:

| Model string | What it answers | Source |
|---|---|---|
| `sippar-chain-state` | live facts about one of 20 EVM chains: block, gas and fees, balances, one account's balances and transactions, any ERC-20 balance, a token's transfer logs | QuickNode |
| `onchain-token-rankings` | the top token contracts on Solana, Ethereum, Base, BNB and Arbitrum, ranked the way you choose; and Nansen's perpetuals screener | Nansen |
| `tavily-web-search` | a live web search with sources and an answer | Tavily |
| `sippar-skills` | agent skills: Sippar's own for these models, and CryptoSkill's registry of crypto skills, by id, by name or by search | Sippar; CryptoSkill and each skill's author |

## Where to look

| You want to | Read |
|---|---|
| reach the seller, send a request that keeps its arguments, stay under the call limit, read the routing line | [skills/sippar-antseed-buyer/SKILL.md](./skills/sippar-antseed-buyer/SKILL.md) |
| chain facts: the six arguments, the page, transfer logs over a block range | [skills/sippar-chain-state/SKILL.md](./skills/sippar-chain-state/SKILL.md) |
| token rankings and the perpetuals screener: the five arguments, the two page shapes | [skills/onchain-token-rankings/SKILL.md](./skills/onchain-token-rankings/SKILL.md) |
| web search: how to ask, the page | [skills/tavily-web-search/SKILL.md](./skills/tavily-web-search/SKILL.md) |
| agent skills: how to ask for one or search, what the page carries | [skills/sippar-skills/SKILL.md](./skills/sippar-skills/SKILL.md) |
| ideas: what each model is for, options per model, and how to combine them | [use-cases.md](./use-cases.md) |
| copy a working call | [examples/curl.sh](./examples/curl.sh), [examples/python.py](./examples/python.py) |
| check, offline and free, which request shapes keep your arguments | [tools/check-argument-survival.mjs](./tools/check-argument-survival.mjs) |

The five files under `skills/` are agent skills (a `SKILL.md` with frontmatter) and they are
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
    "model": "sippar-chain-state",
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

Every page is the provider's data. `sippar-chain-state` is QuickNode's answer to documented
JSON-RPC reads, with QuickNode's own integer beside each readable value. `onchain-token-rankings`
is Nansen's screener data with the attribution Nansen requires. `tavily-web-search` is Tavily's
response, whole. `sippar-skills` serves CryptoSkill's files as their authors published them, with the
author and license named in each skill's `SOURCE.md` and CryptoSkill's risk flags beside it; Sippar
does not review or filter them. What you compute from a page is yours; the pages carry no derived figures.

## More from Sippar

The wider Sippar catalog of payable services: <https://sippar.network/marketplace>, machine-readable
at <https://sippar.network/llms.txt>.

## License

MIT, see [LICENSE](./LICENSE).
