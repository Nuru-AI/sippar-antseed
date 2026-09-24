# Buying from Sippar Onchain Data on AntSeed

Everything here is free to verify. No call in this document costs money unless you send one.

## 1. Reach the peer

AntSeed buyer auto-selection will not route a default-configured buyer to every seller, so pin the peer explicitly.

CLI:

```bash
antseed buyer start --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Already running:

```bash
antseed buyer connection set --peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Desktop app: open Discover and search the provider name `Sippar Onchain Data`. Selecting the result pins both the provider and the service.

Read-only preflight, which calls no model:

```bash
antseed --version
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
antseed buyer balance
```

## 2. Send the chat-completions shape

Our peer advertises one API protocol:

```json
"serviceApiProtocols": { "openai-chat-completions": true }
```

Post to `/v1/chat/completions` on your local buyer proxy. Any OpenAI-compatible client works, including the OpenAI SDKs.

## 3. The two arguments, and the one thing that destroys them

`sippar-chain-state` accepts two top-level request-body parameters, both declared on the peer record as `supportedParameters`:

| Parameter | Type | What it does |
|---|---|---|
| `network` | string | Selects which chain the page reports. Omit it and you get the default chain, billed in full. |
| `fields` | array of strings | Selects which columns you pay for. Omit it and you get every column. |

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

When a route would need a translation, every declared parameter counts as missing: the peer is filtered out of candidate selection, or a pinned peer returns `422 required_capability_unavailable`. That happens before routing and before payment, so a call that would have been served the wrong page costs nothing instead.

**Require only parameters the service announces.** The proxy treats a service with no announced parameters as supporting none of them, so requiring `network` on `onchain-token-rankings`, which takes no parameters and announces none, refuses every call rather than some of them. The refusal is free and permanent, and it does not explain itself. Read what each service announces before you require anything:

```bash
antseed network peer 706fca9c0d0684c30f86209aae0c3565ce1aa69f
```

Measured against the live listing on 2026-09-24: the same body and the same header returned `422` in 4 ms on `/v1/messages`, and a served page with `mode=declared network=base` on `/v1/chat/completions`.

## 5. Verify all of this yourself, offline

```bash
node tools/check-argument-survival.mjs
```

The script runs against the `@antseed/api-adapter` package your buyer already has, prints which protocol pairs preserve a top-level argument, and exits non-zero if the behaviour has changed since this document was written. It makes no network call and spends nothing.

## 6. What the answers contain

Both listings return structured data, never composed prose.

`sippar-chain-state` returns a markdown table of public chain facts read at request time, with the same rows fenced as JSON beneath it, plus explanatory notes.

`onchain-token-rankings` returns fixed-schema rows for the largest onchain token contracts by fully diluted value, with the attribution and caveats the upstream source requires.

**Keep the notes.** They are part of the product. They are what stops a downstream model reading a correct outlier as corrupt data, which is a failure we have measured: handed a page verified against independent nodes, a weak model returned four confident accusations that the data was broken, and all four were wrong. One of them was a chain's genuine gas limit that simply looks absurd to anything that does not know that chain.

`onchain-token-rankings` ignores request parameters by design and always returns the full page.

## 7. Support

Open an issue in this repository. For anything about the Sippar relay itself rather than these two listings, start at <https://sippar.network>.
