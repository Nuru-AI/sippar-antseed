---
name: onchain-token-rankings
description: Buy the top onchain token contracts on Solana, Ethereum, Base, BNB and Arbitrum from Sippar's onchain-token-rankings model on AntSeed, ranked by fully diluted value, volume, net flow, liquidity, price change, buy or sell volume over a window you choose, served with Nansen's attribution. Also Nansen's Hyperliquid perpetuals screener through the view argument. Triggers on - top tokens, biggest tokens on Base, token rankings, FDV ranking, volume leaders on Solana, net flow, perp screener, perpetuals on Hyperliquid, view perp-screener.
metadata:
  version: "2.0.0"
  updated: "2026-10-08"
---

# onchain-token-rankings

The top token contracts across five chains, from Nansen, with the attribution Nansen requires
on every page. Transport (pin, request shape, the two surviving channels, the 8-in-flight
limit) is in `skills/sippar-antseed-buyer/SKILL.md`; read it first. Model string:
`onchain-token-rankings`.

## What it answers

The ranked page: one row per token with `priceUsd`, `marketCapUsd`, `fdvUsd`, `volume24hUsd`,
`netflowUsd24h`, `liquidityUsd`, `change24hPct`, the chain and the contract. Default: all five
chains together, the last 24 hours, ranked by fully diluted value, 25 rows.

The perpetuals page: Nansen's Hyperliquid perpetuals screener over the last 24 hours, served as
Nansen returns it.

## The five arguments

All optional, all top-level, all announced in `supportedParameters`.

| Argument | Legal values | Default |
|---|---|---|
| `chains` | any of `solana`, `ethereum`, `base`, `bnb`, `arbitrum`; a list or a comma string | all five |
| `timeframe` | `5m`, `10m`, `1h`, `6h`, `24h`, `7d`, `30d` | `24h` |
| `sort` | `fdv`, `volume`, `netflow`, `liquidity`, `priceChange`, `buyVolume`, `sellVolume`; largest first; case does not matter | `fdv` |
| `rows` | a whole number from 5 to 50 | 25 |
| `view` | `perp-screener` | none |

`timeframe` is the window that volume, buy and sell volume, net flow and price change cover.
Fully diluted value, market cap and liquidity are read at the moment you ask whichever window
you pick. A value outside these is refused with a free 400 that says what is accepted.

Example, ten rows by volume on Base and Solana over a week:

```json
{"model": "onchain-token-rankings", "chains": ["base", "solana"], "timeframe": "7d",
 "sort": "volume", "rows": 10, "messages": [{"role": "user", "content": "top tokens"}]}
```

Example, the perpetuals screener:

```json
{"model": "onchain-token-rankings", "view": "perp-screener",
 "messages": [{"role": "user", "content": "perps"}]}
```

**Send `view` alone.** It is its own page and takes none of the other four; any of them beside it
is refused free with a 400 that says so.

Through a translating client, the same arguments go under `metadata.sippar` or as
`x-sippar-chains`, `x-sippar-timeframe`, `x-sippar-sort`, `x-sippar-rows`, `x-sippar-view`.
With `x-antseed-required-parameters`, require only names this model announces: requiring
`network` or `fields` here refuses every call.

## Reading the pages

**The ranked page** is a markdown table with the same rows fenced as JSON beneath it, then
Nansen's attribution, a guide line and a disclaimer. Parse the JSON; keep the lines. What you
were served is named in the JSON: `chainsCovered`, `timeframe`, `slots` (the number of rows you
asked for) and `ranking.requestedSort`, which uses Nansen's own column name (`priceChange` reads
`price_change DESC`). `pageRowsReturned` and `pageSize` describe the page bought upstream, so
they can read 25 on a page you narrowed to 10; `slots` is your count.

**The perpetuals page** is different: one source line, then Nansen's JSON exactly as it arrived,
unfenced, then a closing line and a disclaimer. No table. A parser written for the ranked page
does not fit it.

Both pages are Nansen's data as returned, with the wash-trading and other notes Nansen attaches
kept in place. Keep them.

## Cost

Per output token at the rate on the peer record. Fewer `rows` bill fewer tokens. A refusal
bills nothing on an open channel.

## Changes

- 2.0.0 (2026-10-08): own skill. Added `view: perp-screener` and its page shape, and the
  page-count keys.
