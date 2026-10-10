---
name: nansen-crypto-screener
description: Buy the top onchain token contracts on Solana, Ethereum, Base, BNB and Arbitrum from Sippar's nansen-crypto-screener model on AntSeed, ranked by fully diluted value, volume, net flow, liquidity, price change, buy or sell volume over a window you choose, served with Nansen's attribution. Also named tickers through the symbols argument, such as tokenized stocks (TSLAX, NVDAX, SPYX), and Nansen's Hyperliquid perpetuals screener through the view argument. Triggers on - top tokens, tokenized stocks, xStocks, stock tokens, TSLAX price, biggest tokens on Base, token rankings, FDV ranking, volume leaders on Solana, net flow, perp screener, perpetuals on Hyperliquid, view perp-screener, onchain-token-rankings.
metadata:
  version: "3.1.0"
  updated: "2026-10-10"
---

# nansen-crypto-screener

The top token contracts across five chains, from Nansen, with the attribution Nansen requires
on every page. Transport (pin, request shape, the two surviving channels, the 8-in-flight
limit) is in the `sippar-antseed-buyer` skill; read it first. Model string:
`nansen-crypto-screener`.
The earlier id `onchain-token-rankings` still answers with the same data, arguments and rate.

## What it answers

The ranked page: one row per token with `priceUsd`, `marketCapUsd`, `fdvUsd`, `volume24hUsd`,
`netflowUsd24h`, `liquidityUsd`, `change24hPct`, the chain and the contract. Default: all five
chains together, the last 24 hours, ranked by fully diluted value, 25 rows. With `symbols`, the
same page holds only the tickers you named.

The perpetuals page: Nansen's Hyperliquid perpetuals screener over the last 24 hours, served as
Nansen returns it.

## The six arguments

All optional, all top-level, all announced in `supportedParameters`.

| Argument | Legal values | Default |
|---|---|---|
| `chains` | any of `solana`, `ethereum`, `base`, `bnb`, `arbitrum`; a list or a comma string | all five |
| `timeframe` | `5m`, `10m`, `1h`, `6h`, `24h`, `7d`, `30d` | `24h` |
| `sort` | `fdv`, `volume`, `netflow`, `liquidity`, `priceChange`, `buyVolume`, `sellVolume`; largest first; case does not matter | `fdv` |
| `rows` | a whole number from 5 to 50 | 25 |
| `symbols` | up to 25 token symbols, such as `TSLAX` or `NVDAX`; a list or a comma string; a leading `$` is fine; case does not matter | none |
| `view` | `perp-screener` | none |

`timeframe` is the window that volume, buy and sell volume, net flow and price change cover.
Fully diluted value, market cap and liquidity are read at the moment you ask whichever window
you pick. A value outside these is refused with a free 400 that says what is accepted.

Example, ten rows by volume on Base and Solana over a week:

```json
{"model": "nansen-crypto-screener", "chains": ["base", "solana"], "timeframe": "7d",
 "sort": "volume", "rows": 10, "messages": [{"role": "user", "content": "top tokens"}]}
```

Example, five tokenized stocks on Solana, ranked by volume:

```json
{"model": "nansen-crypto-screener", "symbols": ["TSLAX", "NVDAX", "SPYX", "GOOGLX", "CRCLX"],
 "chains": ["solana"], "sort": "volume", "rows": 5, "messages": [{"role": "user", "content": "stocks"}]}
```

**`symbols` narrows which rows can appear; it does not change the order.** Rows stay ranked by
`sort`, and `rows` still sets the length of the page. A ticker with no row on the page is named
in a line under the table and in `symbolsNotFound`. The match is on the token's symbol, so check the `address` of what you get: two
contracts can share a symbol. The page's floors still apply: a token with less than $1M of
trading-pool liquidity does not appear, which is why Ondo's tokens on Ethereum and BNB came back
as not found when we tried them. A tokenized stock's price is the token's on-chain price, not an
exchange quote. Issuers that reinvest dividends make one token stand for slightly more than one
share, so its price is the share price times that ratio; the page says so in its disclaimer.

Example, the perpetuals screener:

```json
{"model": "nansen-crypto-screener", "view": "perp-screener",
 "messages": [{"role": "user", "content": "perps"}]}
```

**Send `view` alone.** It is its own page and takes none of the other five; any of them beside it
is refused free with a 400 that says so.

Through a translating client, the same arguments go under `metadata.sippar` or as
`x-sippar-chains`, `x-sippar-timeframe`, `x-sippar-sort`, `x-sippar-rows`, `x-sippar-symbols`,
`x-sippar-view`.
With `x-antseed-required-parameters`, require only names this model announces: requiring
`network` or `fields` here refuses every call.

## Reading the pages

**The ranked page** is a markdown table with the same rows fenced as JSON beneath it, then
Nansen's attribution, a guide line and a disclaimer. Parse the JSON; keep the lines. What you
were served is named in the JSON: `chainsCovered`, `timeframe`, `slots` (the number of rows you
asked for) and `ranking.requestedSort`, which uses Nansen's own column name (`priceChange` reads
`price_change DESC`). `pageRowsReturned` and `pageSize` describe the page bought upstream, so
they can read 25 on a page you narrowed to 10; `slots` is your count. A `symbols` page adds
`symbolsRequested` (what you named, upper case) and `symbolsNotFound`.

**The perpetuals page** is different: one source line, then Nansen's JSON exactly as it arrived,
unfenced, then a closing line and a disclaimer. No table. A parser written for the ranked page
does not fit it.

Both pages are Nansen's data as returned, with the wash-trading and other notes Nansen attaches
kept in place. Keep them.

## Cost

Per output token at the rate on the peer record. Fewer `rows` bill fewer tokens. A refusal
bills nothing on an open channel.

## Changes

- 3.1.0 (2026-10-10): added `symbols`, named tickers such as tokenized stocks, and the two
  keys it adds to the page.
- 3.0.0 (2026-10-08): the model is `nansen-crypto-screener` (the old id `onchain-token-rankings`
  still answers).
- 2.0.0 (2026-10-08): own skill. Added `view: perp-screener` and its page shape, and the
  page-count keys.
