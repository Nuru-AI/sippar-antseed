---
name: sippar-antseed-buyer
description: Buy live onchain data from Sippar's listings on the AntSeed peer-to-peer inference network, without losing the arguments you sent. Use this when an agent needs current public chain facts (block height, gas, native balances, token supplies) or the largest onchain tokens by fully diluted value, and is paying per call in USDC on Base. Triggers on - buy chain state from AntSeed, pin the Sippar peer, sippar-chain-state, onchain-token-rankings, my network parameter was ignored, I was served the wrong chain, x-antseed-required-parameters.
---

# Buying from Sippar Onchain Data on AntSeed

Sippar serves two data listings on AntSeed. This skill carries the three things that decide whether a call returns what was asked for: the pin, the request shape, and the header that fails closed.

## The two listings

| Model string | Returns | Accepts parameters |
|---|---|---|
| `sippar-chain-state` | live public chain facts, read at request time | `network`, `fields` |
| `onchain-token-rankings` | largest onchain tokens by fully diluted value | none, always the full page |

Seller peer: `706fca9c0d0684c30f86209aae0c3565ce1aa69f`. Settlement is USDC on Base mainnet.

## Step 1, pin the peer

Buyer auto-selection will not necessarily route to this seller, so pin it.

```bash
antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

If a buyer proxy is already running, switch the pin without restarting:

```bash
antseed buyer connection set --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Free preflight, calls no model:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
antseed buyer balance
```

## Step 2, use the chat-completions shape, always

This seller advertises one API protocol, `openai-chat-completions`. Post to `/v1/chat/completions`.

**Do NOT use `/v1/messages` or `/v1/responses` for a parameterised call.** The AntSeed buyer proxy translates between shapes by rebuilding the request body from a fixed key list, and a top-level `network` or `fields` is not on that list. It is dropped silently, you are served the default chain in full, and you pay the full page price. Nothing errors.

## Step 3, send the parameters at the top level

```bash
curl http://127.0.0.1:8377/v1/chat/completions \
  -H 'content-type: application/json' \
  -H 'x-antseed-required-parameters: network,fields' \
  -d '{
    "model": "sippar-chain-state",
    "network": "base",
    "fields": ["blockNumber", "gasPrice"],
    "messages": [{"role": "user", "content": "chain state"}]
  }'
```

`network` and `fields` are siblings of `model` and `messages`, never nested inside a message.

## Step 4, send the header on `sippar-chain-state`, and NOT on `onchain-token-rankings`

```
x-antseed-required-parameters: network,fields
```

It makes the proxy refuse any call that would need a translation, before routing and before payment. A correct call on `sippar-chain-state` is unaffected. It is the difference between paying full price for the wrong chain and paying nothing.

**Do not send it for `onchain-token-rankings`.** That service takes no parameters and announces none, and the proxy treats a service with no announced parameters as supporting none of them: every parameter you require counts as missing, so the peer is filtered out of selection or a pinned call returns `422 required_capability_unavailable` every time. The refusal is free, but it is permanent and it does not explain itself.

The rule in one line: **require only parameters the service announces.** `antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f` prints what each one announces.

## Step 5, check the answer agreed with you

Every served page carries a routing line:

```
routing: mode=declared  network=base  confidence=n/a  source=network-field
```

- `mode=declared` with `source=network-field` means the `network` argument arrived and drove the selection.
- `mode=default` with `source=product-name` means nothing arrived. Do not treat that page as an answer about the chain you asked for.
- The `confidence` slot carries a number only when a value was inferred from your message text rather than taken from a field you set, which the published terms describe; on a declared or default serve it reads `n/a`.

## Reading the answer

Both listings return a markdown table with the same rows fenced as JSON beneath it. **Pass the table through as it arrives rather than rebuilding it**, keep every field, and keep the explanatory notes and attribution.

The notes are load-bearing. A correct value can look wrong to a model that does not know the chain it came from: one chain's genuine gas limit reads as absurd, and a verified page handed to a weak model came back with four confident accusations of corrupt data, all four false. The notes are what prevent that.

A row carrying a failure reason is already marked failed. Keep it rather than dropping it.

## Cost

Per call, metered on output tokens, settled in USDC on Base through an AntSeed payment channel. Rates are published on the peer record and change, so read them rather than assuming:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Using `fields` to ask for fewer columns lowers what a call costs, which is the point of the parameter.

## Verify the shape rule yourself, free

```bash
node tools/check-argument-survival.mjs
```

Runs against the `@antseed/api-adapter` package already installed with your buyer, prints which protocol pairs preserve a top-level argument, and exits non-zero if the behaviour has moved. No network call, no spend.

## More

`BUYING.md` in this repository has the full detail. The wider Sippar catalog is at <https://sippar.network/marketplace>, machine-readable at <https://sippar.network/llms.txt>.
