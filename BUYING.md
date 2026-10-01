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

## 3. The four arguments, and the one thing that destroys them

`sippar-chain-state` accepts four top-level request-body parameters, all declared on the peer record as `supportedParameters`:

| Parameter | Type | What it does |
|---|---|---|
| `network` | string | Selects which chain the page reports. **Omit it and you get ethereum-mainnet**, billed in full. |
| `fields` | array of strings | Selects which rows you pay for. Omit it and you get every one. |
| `address` | string, `0x` + 40 hex | Adds one account's rows: `addressNativeBalance`, `addressTransactionCount`, `addressErc20Balance`. Makes the page **wider**, so it bills more output tokens; `fields` narrows it again. |
| `blocks` | integer | Scans that account's transactions in the newest block. **Capped at 1, and needs `address`.** |

**The legal values are published by the listing itself, not frozen here.** Every sliced payload
carries `selection.fieldsAvailable`; read it rather than copying a list. On 2026-09-30 it held 20
names: the 12 chain-level ones (`blockNumber`, `gasPrice`, `maxPriorityFeePerGas`, `chainId`,
`blockTimestamp`, `baseFeePerGas`, `blockGasUsed`, `blockGasLimit`, `blockTransactionCount`,
`nativeBalance`, `transactionCount`, `erc20Balance`), the 3 account ones (`addressNativeBalance`,
`addressTransactionCount`, `addressErc20Balance`) and the 5 newest-block ones
(`addressBlocksScanned`, `addressTxCount`, `addressTxSent`, `addressTxReceived`,
`addressTxRowsWithheld`). Every one is a value QuickNode returns; the listing computes none.
A `network` value the listing does not serve is refused with **HTTP 400 that lists every chain it
does serve** — 20 of them on 2026-09-24, ethereum and base among them. That refusal buys nothing
upstream: measured at **zero on the ledger**, against a response header that claimed a cost roughly
twice what a real answer bills. Cost a call from your own ledger — `antseed buyer activity`, or the
app — never from `x-antseed-estimated-cost-usd`.

**`address` is checked before anything is bought.** All-lowercase and all-uppercase are accepted as
written; mixed case is an EIP-55 checksum and is verified, so a mistyped character is refused with
an HTTP 400 rather than answered about a different account. `blocks` above 1, or without an
`address`, is refused with a 400 that says why; to read further back, ask for blocks by absolute
number from the `blockNumber` the page returns. With `blocks`, the page carries
`addressBlocksScanned`, `addressTxCount`, `addressTxSent` and `addressTxReceived`; the matching
transaction list is withheld, and `addressTxRowsWithheld` says so, when more than 50 match. The
`address*` field names are refused in `fields` unless an `address` is sent.

All four are top-level keys in the request body, beside `model` and `messages`.

**They only arrive if your request shape matches ours.** The AntSeed buyer proxy translates between API shapes by normalising the body into a canonical request and rendering it again for the target. The canonical key list is fixed, and a parameter outside it is dropped. So:

| Your client posts to | What happens | the four arguments |
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

### `onchain-token-rankings` takes four arguments of its own

`onchain-token-rankings` accepts four top-level request-body parameters, all declared on
the peer record as `supportedParameters`. Every one is optional; omit all four and you get the default
page: all five chains, a 24-hour window, ranked by fully diluted value, 25 rows.

| Parameter | Type | Legal values | Default |
|---|---|---|---|
| `chains` | array of strings, or one comma-separated string | any of `solana`, `ethereum`, `base`, `bnb`, `arbitrum` | all five |
| `timeframe` | string | `5m`, `10m`, `1h`, `6h`, `24h`, `7d`, `30d` | `24h` |
| `sort` | string | `fdv`, `volume`, `netflow`, `liquidity`, `priceChange`, `buyVolume`, `sellVolume` | `fdv` |
| `rows` | integer, 5 to 50 | a whole number from 5 to 50 | 25 |

- `chains` narrows which chains are ranked together. Case and order do not matter, and a chain
  named twice counts once.
- `timeframe` is the window that volume, buy and sell volume, net flow and price change cover.
  Fully diluted value, market cap and liquidity are read at the moment you ask, whichever window
  you pick. The page names its window once, in `timeframe`.
- `sort` picks the column the rows are ranked by, always largest first. Case does not matter
  (`pricechange` is read as `priceChange`). Market cap is not a sort option.
- `rows` sets how many ranked rows the page publishes. You pay per output token, as with
  everything else here, so fewer rows cost less.

**A value outside these is refused before anything is bought**, with an HTTP 400 whose message
says what is accepted. To confirm what you were served, read `chainsCovered`, `timeframe`,
`slots` (the row count) and `ranking.requestedSort` in the JSON. `requestedSort` uses the
upstream's own column name, so `priceChange` reads `price_change DESC` there.

```bash
curl http://127.0.0.1:8377/v1/chat/completions \
  -H 'content-type: application/json' \
  -H 'x-antseed-pin-peer: 706fca9c0d0684c30f86209aae0c3565ce1aa69f' \
  -d '{
    "model": "onchain-token-rankings",
    "chains": ["base", "solana"],
    "timeframe": "7d",
    "sort": "volume",
    "rows": 10,
    "messages": [{"role": "user", "content": "top tokens"}]
  }'
```

These four obey the same rule as the chain-state arguments above: they arrive on
`/v1/chat/completions` and are dropped by a translation.

## 4. Two channels that survive a translation — and are SERVED

If your client cannot post the chat-completions shape, you do not have to give up the arguments.
Two channels cross every translation the proxy performs, and this listing reads both.

**In the request body, namespaced under `sippar`:**

```json
{"model": "sippar-chain-state",
 "messages": [{"role": "user", "content": "chain state"}],
 "metadata": {"sippar": {"network": "base", "fields": ["blockNumber", "gasPrice"]}}}
```

**Or as request headers:**

```
x-sippar-network: base
x-sippar-fields: blockNumber,gasPrice
x-sippar-address: 0x…
x-sippar-blocks: 1
```

`onchain-token-rankings` reads its four the same way: `metadata.sippar.chains`, `.timeframe`,
`.sort` and `.rows`, or the headers `x-sippar-chains`, `x-sippar-timeframe`, `x-sippar-sort` and
`x-sippar-rows`.

A header can only carry text, so `fields` and `chains` are comma-separated there; in `metadata` it may be a list
or the same comma string. A top-level field, when it reaches us, still wins over both — these are
the fallbacks for a shape that cannot deliver one, not a second way to override it.

**Confirm it arrived.** §3's routing line names the channel that answered: `source=network-meta`
for the `metadata` channel, `source=network-hdr` for the header, `source=network-field` for a
top-level field. `source=default` means none of them reached us.

**The bound, stated plainly.** Neither channel is documented by this marketplace. Both are
**measured to survive, not promised to** — the measurement is free, offline and reproducible
(§6), and it fails loudly if the proxy's behaviour moves. We watch it; you can run it yourself.

## 5. Or fail closed instead, for free

The channels in §4 get you the page you asked for. This one gets you no page at all, which is
worse for you unless you would genuinely rather be refused than served the wrong chain.

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

**Require only parameters the service announces.** The proxy counts a required parameter the
service does not announce as missing on every call, so requiring `network` on
`onchain-token-rankings`, which announces `chains`, `rows`, `sort` and `timeframe` but not
`network`, refuses *every* call rather than some of them, and the refusal does not explain itself.
It is not a lockout: **drop the parameter the listing does not announce and calls resume
immediately.** The wording is misleading in the other direction too — a translated call on
`sippar-chain-state` is refused with *"Pinned seller does not advertise required parameter(s)"*.
It does advertise them; the message is the proxy's, and what it means is that your request was about
to be translated.

Announced parameters are not in the human-readable peer record. Read them with `--json`:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f --json \
  | jq '.peer.providerServiceCapabilities.openai.services | map_values(.supportedParameters)'
# {"onchain-token-rankings": ["chains","rows","sort","timeframe"], "sippar-chain-state": ["address","blocks","fields","network"]}
```

Measured against the live listing on 2026-09-24, antseed CLI 0.1.157, api-adapter 0.1.48: the same
body and the same header returned `422` in **under 5 ms** on `/v1/messages` and on
`onchain-token-rankings`, both with **zero movement on the ledger**, and a served page with
`mode=declared network=base` on `/v1/chat/completions`.

**"Free" is measured on an open channel.** Both refusals above rode a payment channel that had
already served dozens of requests. On a channel you have just opened we cannot measure it for you:
your own client may already have pre-signed this seller's minimum for that channel's first request.
That commitment is between you and your buyer proxy, and is outside this listing's control.

## 6. Verify all of this yourself, offline

```bash
node tools/check-argument-survival.mjs
```

The script runs against the `@antseed/api-adapter` package your buyer already has, prints which
protocol pairs preserve a top-level argument, and exits non-zero if the behaviour has changed since
this document was written. It makes no network call and spends nothing. Last confirmed green on
api-adapter **0.1.48** with antseed CLI **0.1.157**; the script prints the version it actually
loaded, so compare that line with this one.

## 7. Reading the answer

Both listings answer with a markdown table, the same rows fenced as JSON beneath it, and a few
notes. Code should parse the JSON. The table is for people.

`sippar-chain-state` is **QuickNode's data**. We buy it per request, at the moment you ask, and pass
it through unchanged; every page says so in `attribution`. `onchain-token-rankings` carries the top
onchain token contracts, ranked by fully diluted value unless you chose another `sort`, with the
attribution and caveats its upstream source requires.

### The envelope

A `sippar-chain-state` page is one JSON object with these keys: `product`, `asOf`, `standing`,
`scope`, `rows`, `counts`, `coverage`, `attribution`, `sourceNote`, `disclaimer`, `routing`, and
`selection` on a page you narrowed with `fields`. Read these in code:

- `routing`: `{"mode": …, "network": …, "confidence": …, "source": …}`, the same facts as the
  routing line in §3. Check `routing.mode == "declared"` here rather than matching the prose line.
- `coverage`: what the page does and does not claim: `valuation` (balances only, no USD
  prices), `history`, `finality` and `ownership`. Read it before you draw a conclusion.
- `counts`: `rowsConfigured`, `rowsAnswered`, `rowsFailed`, a one-line health check.
- `selection`: `fields` you asked for, `fieldsAvailable`, and how many rows were not read.
- `scope.network` is the full network id (`base-mainnet`); `routing.network` is the name
  that selected it (`base`). World Chain is `world chain` in one and `worldchain-mainnet` in the
  other, so compare networks after lower-casing and removing spaces and the `-mainnet` suffix.

### One row

| Key | Meaning |
|---|---|
| `id` | Stable row id, e.g. `chain.blockNumber`, `address.usdc`. It can carry a unit suffix (`chain.gasPriceWei`), so read the metric from `metric`, never from `id`. |
| `metric` | The field name, one of `fieldsAvailable`. |
| `target` | The address the row is about. There is no `address` key on a row. |
| `targetLabel` | A label for a configured contract; `null` on an address you sent. |
| `asset`, `assetAddress` | Token symbol and contract, on token rows; `null` otherwise. |
| `unit`, `decimals` | Display unit, and the decimals `value` was scaled by (`null` when unscaled). |
| `value` | Already human-readable, as a string. Do not divide it again. It is the display form: for arithmetic, compute from `valueRaw` and `decimals` rather than parsing `value`. |
| `valueRaw` | QuickNode's own integer, unscaled, as a string. Divide by `10^decimals` to get `value`. |
| `ok`, `reason` | `ok: false` marks a row that could not be answered, and `reason` is a short code saying which absence it is. |

**Three mistakes break consumers.** Keying by `metric` alone collapses rows, because
`addressErc20Balance` and `erc20Balance` are one row per token; key by `(metric, target, asset)`.
Dividing `value` again corrupts every number; use `value` as served, or `valueRaw` with `decimals`.
Dropping failed rows hides part of the answer; keep them, since `ok: false` tells the reader which
value is missing and why.

`asOf` plus a row's `id` is the key to de-duplicate on when you sample the same page over time.

### What the account fields mean

- `addressTransactionCount` counts transactions the account sent, which is what QuickNode's
  `eth_getTransactionCount` returns. A block explorer also counts incoming and token transfers, so its
  number is higher (measured on Base: 520 here against 682 on the explorer). Label the source when you
  compare them.
- With no `address`, the page reads a fixed set of published protocol contracts (lending pools,
  bridges, routers and wrapped native, labelled in `targetLabel`). They show where protocol liquidity
  sits. Do not read them as a wallet; several routers hold zero by design.
- **With an `address` but no `fields`, your account is added to that fixed set, so you pay for every
  protocol row as well.** For a question about one account, name the fields:
  `"fields": ["addressNativeBalance", "addressTransactionCount", "addressErc20Balance"]`.

### What buyers build with it

Slow indicators, mostly. Balances, positions and what it costs to transact. There are no prices and
no history on the page.

The common one is an account across chains: ask for the three `address*` fields on each chain and you
see where the account holds native coin and tokens, and where it is active at all. Another is one
chain right now: block height, gas, base fee, and how full the last block was (`blockGasUsed` against
`blockGasLimit`). Run the same fields on all 20 chains in parallel and you can rank them by cost or
activity. For change over time, sample on a schedule and compare `valueRaw` between samples; the
page itself holds a single moment.

To find where it is cheapest to move money, compute the cost of a plain transfer yourself:
`21000 × (baseFeePerGas + maxPriorityFeePerGas)` in wei. Both inputs are on the page. The result is in
the chain's own coin, so comparing chains that pay fees in different coins (BNB, POL and others
against ETH) needs your own price source.

Two things not to do. Don't add native balances across chains, because ETH on Base and BNB on BNB
Chain are different assets. And don't expect a dollar total; you need your own price source for that.

The longer version, five ways to read the data, is [USING-THE-DATA.md](./USING-THE-DATA.md). Sippar's
own test agent drafted it while working through the listing; we edited it for accuracy.

### What `fields` saves

You are billed per output token at the rate on the peer record, not per page. Measured on ethereum
and base, 2026-09-24: a dropped `fields` costs **7.6x** what the same call costs with two rows named,
but one row still costs about **13%** of the full page, because the notes and the JSON envelope are
most of a small answer. Read the rates themselves off the peer record; they change, so this
repository does not print them.

### Keep the notes

They stop a downstream model from reading a correct outlier as corrupt data. We have watched that
happen: handed a page we had verified against independent nodes, a weak model came back with four
confident accusations that the data was broken. All four were wrong. One was a chain's real gas
limit, which looks absurd if you don't know that chain.

## 8. Support

Open an issue in this repository. For anything about the Sippar relay itself rather than these two listings, start at <https://sippar.network>.
