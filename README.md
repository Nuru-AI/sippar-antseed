# Sippar Onchain Data on AntSeed

**Sippar is a payment relay for the agent economy.** This repository is the public record for Sippar's data listings on the [AntSeed](https://antseed.com) peer-to-peer inference network, plus everything a buyer needs to reach them and get the answer they actually asked for.

Two listings, served from one seller peer, settled in USDC on Base:

| Listing | What it returns |
|---|---|
| `sippar-chain-state` | Live public chain facts, read at request time: block headers, gas, native balances, token supplies |
| `onchain-token-rankings` | The largest onchain token contracts by fully diluted value, as fixed-schema rows |

Both answer over the OpenAI chat-completions shape. Both return fixed-schema rows — a markdown
table with the same rows fenced as JSON beneath it, plus notes you are meant to keep.

An OpenAI-compatible client works **only on its chat-completions path**. The same SDK's
`responses` path posts to `/v1/responses`, which is translated, and translation is what destroys
your arguments. In the Python SDK, a top-level argument goes in `extra_body`:

```python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8377/v1", api_key="not-used")

client.chat.completions.create(
    model="sippar-chain-state",
    messages=[{"role": "user", "content": "chain state"}],
    extra_body={"network": "base", "fields": ["blockNumber", "gasPrice"]},
    extra_headers={"x-antseed-required-parameters": "network,fields"},
)
```

Run verbatim on `openai` 3.19.2, that posts to `/v1/chat/completions` with `network` and `fields`
as top-level siblings of `model` and `messages`, and the header on the request — which is exactly
the shape the rest of this page asks for.

If you are stuck on a path that translates — the same SDK's `client.responses.create`, or an
Anthropic-shape client posting to `/v1/messages` — put the arguments under `metadata` instead:
`{"metadata": {"sippar": {"network": "base", "fields": ["blockNumber", "gasPrice"]}}}`, or send
them as the `x-sippar-network` / `x-sippar-fields` headers. Both cross the translation, and both
are served rather than refused. See *Read this before you pay* below.

## See it work

You need the AntSeed buyer proxy, from either [the VPR desktop app](https://antseed.com) or
`npm i -g @antseed/cli`. The desktop app runs the proxy for you; with the CLI, `antseed buyer start`
brings it up. The two are not interchangeable for every command — see
[BUYING.md](./BUYING.md#1-reach-the-peer). `127.0.0.1:8377` is its default address, not a fixed
one: `antseed buyer start --port <number>` moves it.

Pin the peer and ask for one chain. The pin can ride the request itself, which needs no CLI and
changes nothing shared:

```bash
curl http://127.0.0.1:8377/v1/chat/completions \
  -H 'content-type: application/json' \
  -H 'x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f' \
  -H 'x-antseed-required-parameters: network,fields' \
  -d '{
    "model": "sippar-chain-state",
    "network": "base",
    "fields": ["blockNumber", "gasPrice"],
    "messages": [{"role": "user", "content": "chain state"}]
  }'
```

`base` is a choice, not the default. **Omit `network` and you are served ethereum-mainnet** — in
full, at full price, with no error. That is what the rest of this page is about.

A session pin is the alternative, and it is the one that depends on which wallet you have:
`antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f` does not run against a
desktop-app wallet. [BUYING.md](./BUYING.md#1-reach-the-peer) has all four ways to pin.

The answer comes back as a markdown table with the same rows fenced as JSON beneath it, and a routing line stating which chain was selected and why.

## Read this before you pay: one request shape, and why

**Send the chat-completions shape.** Our peer advertises exactly one API protocol, `openai-chat-completions`. That is a deliberate declaration and it is machine-readable on our peer record.

If your client speaks a different shape, the AntSeed buyer proxy translates it before the request reaches us, and translation rebuilds the request body from a fixed list of keys. **Your `network` and `fields` arguments do not survive that rebuild.** You would be served the default chain, in full, at full price, with no error.

**Two channels survive that rebuild, and this listing reads both.** They are the better answer,
because they get you the page you asked for instead of no page at all. Put the arguments in
`metadata`, under a `sippar` key:

```json
{"model": "sippar-chain-state",
 "messages": [{"role": "user", "content": "chain state"}],
 "metadata": {"sippar": {"network": "base", "fields": ["blockNumber", "gasPrice"]}}}
```

or send them as headers, which cross every translation too:

```
x-sippar-network: base
x-sippar-fields: blockNumber,gasPrice
```

A header can only carry text, so `fields` is comma-separated there; in `metadata` it may be either
a list or the same comma string. The served page's routing line names the channel that answered —
`source=network-meta` or `source=network-hdr` — so you can confirm it arrived.

Neither channel is documented by this marketplace. Both are **measured to survive, not promised
to**, and the check is free, offline and reproducible — it is the same one linked at the end of
this section, and it fails loudly if the proxy's behaviour ever moves.

**If you would rather be refused than served the wrong page**, there is also a header that fails
closed:

```
x-antseed-required-parameters: network,fields
```

The proxy then refuses any call that would need a translation, in milliseconds, before routing and
before payment. A matching call is unaffected. On a channel you already have open we measured that
refusal at zero on the ledger; [BUYING.md](./BUYING.md#5-or-fail-closed-instead-for-free) states the one
case we cannot measure for you. Prefer the two channels above: this one costs you the answer.

**Know what it does not cover.** It is checked against what the *seller announces*, never against
what *your body contains*. Misspell a key — `netwrok` — and the header passes, the call is served,
and you are billed for the default chain. Measured 2026-09-24: HTTP 200, ethereum-mainnet,
`mode=default`, billed in full. Read the routing line on every answer; it is the only thing that catches
your own typo. Do not send this header on `onchain-token-rankings`, which announces no
parameters — see [BUYING.md](./BUYING.md#5-or-fail-closed-instead-for-free).

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
