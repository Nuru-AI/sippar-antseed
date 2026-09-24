# Buying from Sippar Onchain Data on AntSeed

Everything here is free to verify. No call in this document costs money unless you send one.

## 1. Reach the peer

AntSeed buyer auto-selection will not route a default-configured buyer to every seller, so pin the peer explicitly. There are four ways, and a script or an agent should prefer the first, which holds no state and needs no CLI at all:

Per request, as a header:

```
x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Per request, in the model string:

```
"model": "0x706FCA9C0d0684C30F86209AAe0c3565cE1aa69F@sippar-chain-state"
```

CLI, as a session pin that every later request on this proxy inherits. **Give these two the bare 40-character id, without the `0x` prefix.** They accept either form and then store what you typed, and the pin is matched against the bare id, so a `0x`-prefixed session pin never matches and the proxy reports the peer as unreachable. The header and the model string above strip the prefix for you; the session pin does not:

```bash
antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Already running:

```bash
antseed buyer connection set --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Desktop app: open Discover and search the provider name `Sippar Onchain Data`. Selecting the result pins both the provider and the service.

Get the CLI with `npm i -g @antseed/cli`, or run the VPR desktop app, which serves the same proxy.

**If your wallet belongs to the desktop app, most `antseed buyer` commands will not run.** The CLI
cannot decrypt an Electron safeStorage identity, so `antseed buyer start`, `balance` and `status`
exit with *"An app-encrypted identity already exists at ~/.antseed/identity.enc"*. That is an AntSeed
constraint, not a Sippar one. In that setup, pin from the app's Discover screen, or pass
`--data-dir` to give the CLI its own wallet.

Read-only preflight, which calls no model and works in both setups:

```bash
antseed --version
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
antseed buyer connection get
```

## 2. Send the chat-completions shape

Our peer advertises one API protocol:

```json
"serviceApiProtocols": { "openai-chat-completions": true }
```

Post to `/v1/chat/completions` on your local buyer proxy. Any OpenAI-compatible client works, including the OpenAI SDKs — on their chat-completions path. `127.0.0.1:8377` is the default, not a fixed address: `antseed buyer start --port <number>` moves it, so read your own proxy's port rather than copying ours.

## 3. The two arguments, and the one thing that destroys them

`sippar-chain-state` accepts two top-level request-body parameters, both declared on the peer record as `supportedParameters`:

| Parameter | Type | What it does |
|---|---|---|
| `network` | string | Selects which chain the page reports. **Omit it and you get ethereum-mainnet**, billed in full. |
| `fields` | array of strings | Selects which rows you pay for. Omit it and you get every one. |

**The legal values are published by the listing itself, not frozen here.** Every served payload
carries `selection.fieldsAvailable` — 12 names on 2026-09-24: `blockNumber`, `gasPrice`,
`maxPriorityFeePerGas`, `chainId`, `blockTimestamp`, `baseFeePerGas`, `blockGasUsed`,
`blockGasLimit`, `blockTransactionCount`, `nativeBalance`, `transactionCount`, `erc20Balance`.
A `network` value the listing does not serve is refused with **HTTP 400 that lists every chain it
does serve** — 20 of them on 2026-09-24, ethereum and base among them. That refusal buys nothing
upstream: measured at **zero on the ledger**, against a response header that claimed a cost roughly
twice what a real answer bills. Cost a call from your own ledger — `antseed buyer activity`, or the
app — never from `x-antseed-estimated-cost-usd`.

Both are top-level keys in the request body, beside `model` and `messages`.

**They only arrive if your request shape matches ours.** The AntSeed buyer proxy translates between API shapes by normalising the body into a canonical request and rendering it again for the target. The canonical key list is fixed, and a parameter outside it is dropped. So:

| Your client posts to | What happens | `network` and `fields` |
|---|---|---|
| `/v1/chat/completions` | delivered untouched | **arrive** |
| `/v1/messages` (Anthropic shape) | translated to ours | **dropped** |
| `/v1/responses` | translated to ours | **dropped** |

A dropped `network` is the expensive case: you asked for one chain, you are served the default chain, and you pay the full page price. Nothing errors, because from our side a dropped parameter and an unsent parameter are the same silence.

**Our answer tells you which happened.** Every served page carries a routing line:

```
routing: mode=declared  network=base  confidence=n/a  source=network-field
```

`mode=default` with `source=product-name` means no `network` reached us.

The `confidence` slot carries a number only when a value was inferred from your message text rather than taken from a field you set, which the published terms describe; on a declared or default serve it reads `n/a`.

## 4. Fail closed instead, for free

Send the parameters you depend on as a header:

```
x-antseed-required-parameters: network,fields
```

When a route would need a translation, every declared parameter counts as missing: the peer is filtered out of candidate selection, or a pinned peer returns `422 required_capability_unavailable`. That happens before routing and before payment, so a call that would have been served the wrong page is refused instead. On a payment channel you already have open, we measured that refusal at zero — see the caution at the end of this section about a channel's very first request.

**It checks the seller's announcement, not your request body.** Misspell a key on a call that needs
no translation and the header passes it through: measured 2026-09-24, body `{"netwrok": "base",
"fields": [...]}` with `x-antseed-required-parameters: network,fields` returned **HTTP 200,
ethereum-mainnet, `mode=default`, and billed as a normal served page**. The proxy does notice an unannounced key, and
writes it only to its own log. §3's routing line is the only thing that catches your own typo, so
read it on every answer.

**Require only parameters the service announces.** The proxy treats a service with no announced
parameters as supporting none of them, so requiring `network` on `onchain-token-rankings`, which
announces none, refuses *every* call rather than some of them, and the refusal does not explain
itself. It is not a lockout: **stop sending the header for that listing and calls resume
immediately.** The wording is misleading in the other direction too — a translated call on
`sippar-chain-state` is refused with *"Pinned seller does not advertise required parameter(s)"*.
It does advertise them; the message is the proxy's, and what it means is that your request was about
to be translated.

Announced parameters are not in the human-readable peer record. Read them with `--json`:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f --json \
  | jq '.peer.providerServiceCapabilities.openai.services | map_values(.supportedParameters)'
# {"onchain-token-rankings": null, "sippar-chain-state": ["network","fields"]}
```

Measured against the live listing on 2026-09-24, antseed CLI 0.1.157, api-adapter 0.1.48: the same
body and the same header returned `422` in **under 5 ms** on `/v1/messages` and on
`onchain-token-rankings`, both with **zero movement on the ledger**, and a served page with
`mode=declared network=base` on `/v1/chat/completions`.

**"Free" is measured on an open channel.** Both refusals above rode a payment channel that had
already served dozens of requests. On a channel you have just opened we cannot measure it for you:
your own client may already have pre-signed this seller's minimum for that channel's first request.
That commitment is between you and your buyer proxy, and is outside this listing's control.

## 5. Verify all of this yourself, offline

```bash
node tools/check-argument-survival.mjs
```

The script runs against the `@antseed/api-adapter` package your buyer already has, prints which
protocol pairs preserve a top-level argument, and exits non-zero if the behaviour has changed since
this document was written. It makes no network call and spends nothing. Last confirmed green on
api-adapter **0.1.48** with antseed CLI **0.1.157**; the script prints the version it actually
loaded, so compare that line with this one.

## 6. What the answers contain

Both listings return structured data, never composed prose.

Both return a markdown table with the same rows fenced as JSON beneath it, plus explanatory notes.
`sippar-chain-state` carries public chain facts read at request time; `onchain-token-rankings`
carries the largest onchain token contracts by fully diluted value, with the attribution and caveats
the upstream source requires.

**What `fields` actually saves.** You are billed per output token at the rate on the peer record, not
per page, so what `fields` saves is measured in output tokens and not in pages. Measured on ethereum
and base, 2026-09-24: a dropped `fields` costs **7.6x** what the same call costs with two rows
named — but one row still costs about **13%** of the full page, because the notes, attribution and
JSON envelope are most of a small answer. Narrowing saves a lot against the full page and very little
against another narrow call. Read the rates themselves off the peer record; they change, so this
repository does not print them.

**Keep the notes.** They are part of the product. They are what stops a downstream model reading a correct outlier as corrupt data, which is a failure we have measured: handed a page verified against independent nodes, a weak model returned four confident accusations that the data was broken, and all four were wrong. One of them was a chain's genuine gas limit that simply looks absurd to anything that does not know that chain.

`onchain-token-rankings` ignores request parameters by design and always returns the full page.

## 7. Support

Open an issue in this repository. For anything about the Sippar relay itself rather than these two listings, start at <https://sippar.network>.
