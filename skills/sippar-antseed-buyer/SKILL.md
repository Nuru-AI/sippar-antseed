---
name: sippar-antseed-buyer
description: Reach Sippar's data models on the AntSeed network and get the answer you asked for. Use this before calling sippar-chain-state, onchain-token-rankings or tavily-web-search from an AntSeed buyer. It carries the peer pin, the one request shape that keeps your arguments, the two channels that survive a translating client, the fail-closed header, the 8-calls-in-flight limit, and how to read the routing line. Triggers on - buy data from Sippar on AntSeed, pin the Sippar peer, my network parameter was ignored, I was served the wrong chain, 429 buyer_concurrency_limit, metadata.sippar, x-sippar headers, x-antseed-required-parameters.
metadata:
  version: "2.0.0"
  updated: "2026-10-08"
---

# Reaching Sippar's models on AntSeed

Sippar sells three data models on AntSeed. Each one is a provider's data served as the
provider returns it, with the source named on every page. This skill is about the transport:
how a request reaches the right seller with its arguments intact, and how to tell from the
answer that it did. What each model answers, and what you can do with it, is in its own skill:

| Model string | What it answers | Skill |
|---|---|---|
| `sippar-chain-state` | live facts about one of 20 EVM chains, bought from QuickNode when you ask | `skills/sippar-chain-state/SKILL.md` |
| `onchain-token-rankings` | the top token contracts on Solana, Ethereum, Base, BNB and Arbitrum, from Nansen, plus Nansen's perpetuals screener | `skills/onchain-token-rankings/SKILL.md` |
| `tavily-web-search` | a live web search with sources, from Tavily | `skills/tavily-web-search/SKILL.md` |

Seller peer `706fca9c0d0684c30f86209aae0c3565ce1aa69f`, onchain agent 84918, settled in USDC on
Base through your AntSeed payment channel. You pay per output token at the rate on the peer
record. Rates change, so read them rather than copying a number:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

## 1. Pin the peer

Buyer auto-selection does not necessarily route to this seller, so name it. A script or an
agent should pin per request, which needs no CLI and changes nothing shared:

```
x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

The other ways: put the seller address in the model string
(`"model": "0x706FCA9C0d0684C30F86209AAe0c3565cE1aa69F@sippar-chain-state"`), set a session pin
with the CLI (`antseed buyer connection set --peer 706fca9c…`, bare id without `0x`), or pick
`Sippar Onchain Data` on the desktop app's Discover screen. If your wallet belongs to the desktop
app, most `antseed buyer` commands will not run against it; pin from the app or per request.

Free preflight, which calls no model:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
antseed buyer connection get
```

## 2. Send the chat-completions shape

This seller advertises one API protocol, `openai-chat-completions`. Post to
`/v1/chat/completions` on your local buyer proxy (`127.0.0.1:8377` by default; `antseed buyer
start --port` moves it). Any OpenAI-compatible client works on its chat-completions path.

Arguments are top-level keys in the request body, beside `model` and `messages`:

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

From the OpenAI Python SDK that is `extra_body={"network": "base", "fields": [...]}` on
`chat.completions.create`. The SDK flattens `extra_body` into the body. If you write the JSON
yourself, put the arguments at the top level: a literal `"extra_body": {...}` key is refused
with a free 400 that says so.

**Do not post to `/v1/messages` or `/v1/responses` with arguments.** The buyer proxy translates
those shapes by rebuilding the body from a fixed key list, and your arguments are not on it.
They are dropped silently, you are served the default page, and you pay for it.

## 3. If your client translates, use a channel that survives

Two channels cross every translation the proxy performs, and every Sippar model reads both.
Under `metadata`, namespaced:

```json
"metadata": {"sippar": {"network": "base", "fields": ["blockNumber", "gasPrice"]}}
```

Or as headers, one per argument, `x-sippar-<argument>`:

```
x-sippar-network: base
x-sippar-fields: blockNumber,gasPrice
```

A header carries text, so a list is comma-separated there and an object (`rpc`) is its JSON as a
string. Under `metadata` a list may be a list. A top-level argument, when it reaches the seller,
wins over both. Every argument of every model rides these channels under its own name.

Neither channel is documented by the marketplace. Both are measured to survive, not promised
to; the check is free and offline (section 7).

## 4. Or fail closed, for free

```
x-antseed-required-parameters: network,fields
```

With this header the proxy refuses any call that would need a translation, before routing and
before payment, with `422 required_capability_unavailable`. A call that needs no translation is
unaffected. It buys you a refusal, not an answer, so prefer section 3.

Two rules. It checks what the seller announces, not what your body contains, so a misspelled
key still gets served and billed. And require only what the model announces:
`sippar-chain-state` announces `address, blocks, fields, network, rpc, tokens`;
`onchain-token-rankings` announces `chains, rows, sort, timeframe, view`; `tavily-web-search`
announces nothing, so requiring any name on it refuses every call. Read the current lists:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f --json \
  | jq '.peer.providerServiceCapabilities.openai.services | map_values(.supportedParameters)'
```

## 5. At most 8 calls in flight

The seller serves at most 8 calls at once per buyer, across all three models together. The
ninth is refused with `429 buyer_concurrency_limit` and `retry-after: 1`; nothing is served and
nothing is billed. The peer record's `maxConcurrency` is the node's ceiling, not this number. A
sweep over many chains runs in batches of 8 or fewer, with a retry on 429.

## 6. Read the routing line before you use the answer

Every `sippar-chain-state` page carries a routing line, and the same facts under `routing` in
its JSON:

```
routing: mode=declared  network=base  confidence=n/a  source=network-field
```

`mode=declared` means your `network` arrived and selected the chain; `source` names the channel
(`network-field`, `network-meta`, `network-hdr`). `mode=default` means nothing arrived and you
are looking at Ethereum, billed in full. Check this in code before consuming the page. It is the
one signal that catches both a translated request and your own typo.

A refusal from the listing is an HTTP 400 whose message says what is accepted. On an open
channel it bills nothing: measured at zero on the ledger, against a response header that claimed
otherwise. Cost a call from your ledger (`antseed buyer activity`), never from
`x-antseed-estimated-cost-usd`.

## 7. Verify the shape rule yourself, free

```bash
node tools/check-argument-survival.mjs
```

Runs offline against the `@antseed/api-adapter` package your buyer already has, prints which
protocol pairs keep a top-level argument and which channels cross a translation, and exits
non-zero if the behaviour has moved.

## Changes

- 2.0.0 (2026-10-08): transport only; the per-model content moved to its own skills. Added the
  8-in-flight limit, the `extra_body` refusal, and the three announced parameter lists.
- 1.0.0 (2026-09-24): first publish, one skill for two models.
