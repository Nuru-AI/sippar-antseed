---
name: sippar-antseed-buyer
description: Buy live onchain data from Sippar's listings on the AntSeed peer-to-peer inference network, without losing the arguments you sent. Use this when an agent needs current public chain facts (block height, gas, native balances, token supplies) or the largest onchain tokens by fully diluted value, and is paying per call in USDC on Base. Triggers on - buy chain state from AntSeed, pin the Sippar peer, sippar-chain-state, onchain-token-rankings, my network parameter was ignored, I was served the wrong chain, my arguments were dropped in translation, metadata.sippar, x-sippar-network, x-antseed-required-parameters.
---

# Buying from Sippar Onchain Data on AntSeed

Sippar serves two data listings on AntSeed. This skill carries the three things that decide whether a call returns what was asked for: the pin, the request shape, and — when the shape cannot be changed — the two channels that survive a translation and are still served.

## The two listings

| Model string | Returns | Accepts parameters |
|---|---|---|
| `sippar-chain-state` | live public chain facts, read at request time | `network`, `fields` |
| `onchain-token-rankings` | largest onchain tokens by fully diluted value | none, always the full page |

**The default `network` is `ethereum`.** Every example below uses `base` because it is a choice; if
nothing reaches the seller you are served ethereum-mainnet and billed in full. 20 chains were served
on 2026-09-24 — ethereum, base, arbitrum, bnb, polygon, optimism, blast, celo, mantle, unichain, ink,
soneium, world chain, gnosis, scroll, linea, fantom, sonic, berachain, monad — and a value the
listing does not serve is refused with an HTTP 400 that lists the current set, at zero on the ledger.
The 12 `fields` names are on every payload as `selection.fieldsAvailable`: `blockNumber`, `gasPrice`,
`maxPriorityFeePerGas`, `chainId`, `blockTimestamp`, `baseFeePerGas`, `blockGasUsed`,
`blockGasLimit`, `blockTransactionCount`, `nativeBalance`, `transactionCount`, `erc20Balance`.

Seller peer: `706fca9c0d0684c30f86209aae0c3565ce1aa69f`. Settlement is USDC on Base mainnet.

## Step 1, pin the peer

Buyer auto-selection will not necessarily route to this seller, so pin it.

**An agent or script should pin per request**, which needs no CLI and no shared state:

```
x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

The other three routes: `"model": "0x706FCA9C0d0684C30F86209AAe0c3565cE1aa69F@sippar-chain-state"`,
or a session pin, or the desktop app's Discover screen. The session pin needs the **bare** id,
without `0x`; the other three take either form.

```bash
antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f      # CLI wallets only
antseed buyer connection set --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f   # mutates a shared pin
```

**If the wallet belongs to the VPR desktop app, `antseed buyer start|balance|status` will not run** —
the CLI cannot decrypt an Electron safeStorage identity. Pin from the app, or use the per-request
header, or give the CLI its own `--data-dir`.

Free preflight, calls no model, works in both setups:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
antseed buyer connection get
```

## Step 2, use the chat-completions shape, always

This seller advertises one API protocol, `openai-chat-completions`. Post to `/v1/chat/completions` on the local buyer proxy. `127.0.0.1:8377` is the default address only — `antseed buyer start --port <number>` moves it, so read the port from the proxy you are actually running.

**Do NOT use `/v1/messages` or `/v1/responses` for a parameterised call.** The AntSeed buyer proxy translates between shapes by rebuilding the request body from a fixed key list, and a top-level `network` or `fields` is not on that list. It is dropped silently, you are served the default chain in full, and you pay the full page price. Nothing errors.

**If you cannot change the shape, you still have two channels** — `metadata.sippar.*` and the `x-sippar-*` headers — which cross every translation and are read by this listing. Step 4 has them. They are strictly better than being refused.

## Step 3, send the parameters at the top level

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

`network` and `fields` are siblings of `model` and `messages`, never nested inside a message. From
the OpenAI Python SDK that is `extra_body={"network": "base", "fields": [...]}` on
`chat.completions.create` — and never the SDK's `responses` path, which posts to `/v1/responses` and
is translated. (A human at a chat box has one alternative: sending a bare chain name as the entire
message also selects the chain. A message longer than four words that merely mentions a chain does
not — it silently returns ethereum, and bills you. That message-text path is the only case where the
`confidence` slot in Step 5 carries a number.)

## Step 4, if your shape is translated, use a channel that survives

Two channels cross every translation the proxy performs, and this listing reads both. Unlike the
header in Step 4b, these get you **the page you asked for** rather than no page.

```bash
curl http://127.0.0.1:8377/v1/messages \
  -H 'content-type: application/json' \
  -H 'x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f' \
  -H 'x-sippar-network: base' \
  -H 'x-sippar-fields: blockNumber,gasPrice' \
  -d '{
    "model": "sippar-chain-state",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "chain state"}]
  }'
```

The same four arguments also ride the request body under `metadata.sippar`, which survives the
rebuild whole:

```json
"metadata": {"sippar": {"network": "base", "fields": ["blockNumber", "gasPrice"]}}
```

`network`, `fields`, `address` and `blocks` are all readable from either channel. A header can only
carry text, so `fields` is comma-separated there; under `metadata` it may be a list or the same
comma string. A top-level field still wins when it reaches us — these are the fallback for a shape
that cannot deliver one, not a second way to override it.

**Confirm it arrived** on the routing line (Step 5): `source=network-meta` or `source=network-hdr`.

**The bound.** Neither channel is documented by this marketplace. Both are **measured to survive,
not promised to**. The measurement is free, offline, reproducible, and fails loudly if the proxy
moves — see the verification section of [BUYING.md](../../BUYING.md).

## Step 4b, or fail closed instead — on `sippar-chain-state`, and NOT on `onchain-token-rankings`

Prefer Step 4. This header buys you a refusal, not an answer; take it only if you would rather be
refused than served the wrong chain.


```
x-antseed-required-parameters: network,fields
```

It makes the proxy refuse any call that would need a translation, before routing and before payment.
A correct call on `sippar-chain-state` is unaffected. It is the difference between paying full price
for the wrong chain and paying nothing — measured at zero on the ledger on a channel that was
already open. On a channel's very first request we cannot measure it for you: your own client may
already have pre-signed this seller's minimum before the refusal happens.

**It does not check your request body.** The proxy compares your header against what the seller
announces, so a misspelled key on an untranslated route sails through: measured 2026-09-24,
`{"netwrok": "base", ...}` with the header set returned HTTP 200, ethereum-mainnet, `mode=default`,
billed as a normal served page. Step 5 is the only detector for that, so parse the routing line
before you use the answer, not after.

A translated call is refused with *"Pinned seller does not advertise required parameter(s)"*. It does
advertise them — the wording is the proxy's, and it means your request was about to be translated.

**Do not send it for `onchain-token-rankings`.** That service takes no parameters and announces none, and the proxy treats a service with no announced parameters as supporting none of them: every parameter you require counts as missing, so the peer is filtered out of selection or a pinned call returns `422 required_capability_unavailable` every time. The refusal does not explain itself. It is not a lockout: stop sending the header for
that listing and calls resume immediately.

The rule in one line: **require only parameters the service announces.** The human-readable peer
record does not print them; `--json` does:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f --json \
  | jq '.peer.providerServiceCapabilities.openai.services | map_values(.supportedParameters)'
# {"onchain-token-rankings": null, "sippar-chain-state": ["network","fields"]}
```

## Step 5, check the answer agreed with you

Every served page carries a routing line:

```
routing: mode=declared  network=base  confidence=n/a  source=network-field
```

- `mode=declared` with `source=network-field` means the `network` argument arrived and drove the selection.
- `mode=default` with `source=product-name` means nothing arrived. Do not treat that page as an
  answer about the chain you asked for. **Check this in code before consuming the answer** — it is
  the one signal that catches both a translated request and your own typo, and by the time you read
  it you have already paid.
- The `confidence` slot carries a number only when a value was inferred from your message text rather than taken from a field you set, which the published terms describe; on a declared or default serve it reads `n/a`.

## Reading the answer

Both listings return a markdown table with the same rows fenced as JSON beneath it. **Pass the table through as it arrives rather than rebuilding it**, keep every field, and keep the explanatory notes and attribution.

The notes are load-bearing. A correct value can look wrong to a model that does not know the chain it came from: one chain's genuine gas limit reads as absurd, and a verified page handed to a weak model came back with four confident accusations of corrupt data, all four false. The notes are what prevent that.

A row carrying a failure reason is already marked failed. Keep it rather than dropping it.

## Cost

Per call, metered on output tokens, settled in USDC on Base through an AntSeed payment channel. You
are billed per output token at the rate on the peer record, not per page — and rates change, so read
them rather than assuming. A refused call moved **nothing** on the ledger even where
`x-antseed-estimated-cost-usd` claimed otherwise: one 400 reported a cost roughly twice that of a
real answer against a ledger delta of zero. Cost a call from the ledger, never from the header.

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Using `fields` lowers what a call costs, which is the point of the parameter. Measured 2026-09-24: a
dropped `fields` costs **7.6x** what the same call costs with two rows named. But one row still
costs about **13%** of the full page — the notes, attribution and JSON envelope are most of a small
answer — so narrowing past a couple of rows saves little.

## Verify the shape rule yourself, free

```bash
node tools/check-argument-survival.mjs
```

Runs against the `@antseed/api-adapter` package already installed with your buyer, prints which protocol pairs preserve a top-level argument, and exits non-zero if the behaviour has moved. No network call, no spend.

## More

`BUYING.md` in this repository has the full detail. The wider Sippar catalog is at <https://sippar.network/marketplace>, machine-readable at <https://sippar.network/llms.txt>.
