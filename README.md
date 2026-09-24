# Sippar Onchain Data on AntSeed

**Sippar is a payment relay for the agent economy.** This repository is the public record for Sippar's data listings on the [AntSeed](https://antseed.com) peer-to-peer inference network, plus everything a buyer needs to reach them and get the answer they actually asked for.

Two listings, served from one seller peer, settled in USDC on Base:

| Listing | What it returns |
|---|---|
| `sippar-chain-state` | Live public chain facts, read at request time: block headers, gas, native balances, token supplies |
| `onchain-token-rankings` | The largest onchain token contracts by fully diluted value, as fixed-schema rows |

Both answer over the OpenAI chat-completions shape, so any OpenAI-compatible client works. Both return structured data, not prose.

## See it work

Pin the peer and ask for one chain:

```bash
antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

```bash
curl http://127.0.0.1:8377/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "sippar-chain-state",
    "network": "base",
    "fields": ["blockNumber", "gasPrice"],
    "messages": [{"role": "user", "content": "chain state"}]
  }'
```

The answer comes back as a markdown table with the same rows fenced as JSON beneath it, and a routing line stating which chain was selected and why.

## Read this before you pay: one request shape, and why

**Send the chat-completions shape.** Our peer advertises exactly one API protocol, `openai-chat-completions`. That is a deliberate declaration and it is machine-readable on our peer record.

If your client speaks a different shape, the AntSeed buyer proxy translates it before the request reaches us, and translation rebuilds the request body from a fixed list of keys. **Your `network` and `fields` arguments do not survive that rebuild.** You would be served the default chain, in full, at full price, with no error.

**There is a free defence and you should use it.** Send the parameters you depend on in a header:

```
x-antseed-required-parameters: network,fields
```

The proxy then refuses any call that would need a translation, in milliseconds, before routing and before payment. A matching call is unaffected.

Full detail, including which shapes translate and what each one drops, is in [BUYING.md](./BUYING.md). The check is reproducible offline and costs nothing:

```bash
node tools/check-argument-survival.mjs
```

## Use it with an AI coding assistant

Add `https://gitmcp.io/Nuru-AI/sippar-antseed` as an MCP server so your assistant reads these docs while you integrate.

There is also a buyer skill for Claude Code in [`skills/sippar-antseed-buyer/`](./skills/sippar-antseed-buyer/SKILL.md). It carries the pin command, the request shape, the parameter contract and the header defence, so an agent gets them right without being told twice.

## Identity and proofs

| | |
|---|---|
| Seller peer | `706fca9c0d0684c30f86209aae0c3565ce1aa69f` |
| Onchain agent | `84918` |
| Settlement | USDC on Base mainnet |
| Domain proof | <https://sippar.network/.well-known/antseed.json> |
| GitHub proof | [`antseed.json`](./antseed.json) in this repository |

[`provider.json`](./provider.json) carries the same facts in machine-readable form. Neither proof file is signed: each states that this domain, and this GitHub account, claim that peer. AntSeed's clients fetch them and compare.

Prices are published on the peer record and change, so this repository does not print them. Read the current rates before you buy:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

## About the data

The data is read from public sources at request time and passed through. Sippar does not store, cache, blend or reconcile it, because a cached price is a wrong price with a timestamp.

## Discover more Sippar services

These two listings are one surface. The full Sippar catalog of payable services across many chains, with prices and inputs, is discoverable here:

- Machine-readable: <https://sippar.network/llms.txt> and <https://sippar.network/api/sippar/marketplace>
- Web: <https://sippar.network/marketplace>
- For AI agents over MCP: <https://sippar.network/mcp>
- For Solana Agent Kit agents: <https://github.com/Nuru-AI/sippar-sak-x402>, our public x402 relay client

## License

MIT, see [LICENSE](./LICENSE).
