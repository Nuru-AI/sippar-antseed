---
name: sippar-chain-state
description: Buy live facts about one EVM chain from Sippar's sippar-chain-state model on AntSeed, served as QuickNode returns them. Use it for the current block, gas and fees, how full the last block was, native and ERC-20 balances, one account's balances and transaction count, any ERC-20 balance by contract, and a token's transfer logs over a block range. Triggers on - chain state, block number, gas price on Base, balance of an address on Arbitrum, token balance by contract, eth_getLogs, transfer logs, rpc on AntSeed, which chains does sippar-chain-state serve.
metadata:
  version: "2.0.0"
  updated: "2026-10-08"
---

# sippar-chain-state

Live facts about one chain, bought from QuickNode at the moment you ask and passed through
unchanged. Every page names QuickNode as the source. Transport (pin, request shape, the two
surviving channels, the 8-in-flight limit) is in `skills/sippar-antseed-buyer/SKILL.md`; read
it first. Model string: `sippar-chain-state`.

## What it answers

| Ask about | Fields on the page |
|---|---|
| Network fees | `gasPrice`, `baseFeePerGas`, `maxPriorityFeePerGas` |
| Network activity | `blockNumber`, `blockTimestamp`, `blockTransactionCount`, `blockGasUsed`, `blockGasLimit`, `chainId` |
| Balances held by well-known protocol contracts | `nativeBalance`, `erc20Balance`, `transactionCount` |
| One account you name | `addressNativeBalance`, `addressErc20Balance`, `addressTransactionCount` |
| That account's transactions in the newest block | `addressBlocksScanned`, `addressTxCount`, `addressTxSent`, `addressTxReceived`, `addressTxRowsWithheld` |
| That account's balance of any ERC-20 you name | `addressTokenBalance`, `addressTokenDecimals` |
| A token's transfer logs | the `rpc` answer, QuickNode's reply to `eth_getLogs` |

20 chains on 2026-10-08: ethereum, base, arbitrum, bnb, polygon, optimism, blast, celo, mantle,
unichain, ink, soneium, world chain, gnosis, scroll, linea, fantom, sonic, berachain, monad. A
chain the model does not serve is refused with a free 400 that lists the current set.

## The six arguments

All six are optional top-level keys, all announced in `supportedParameters`.

| Argument | What it does |
|---|---|
| `network` | Which chain. **Omit it and you get Ethereum**, in full, billed in full, with no error. |
| `fields` | Which rows you pay for. Omit it and you get every row. The legal names are on every narrowed page as `selection.fieldsAvailable`. |
| `address` | A `0x` + 40 hex account. Adds that account's three rows beside the chain's. Makes the page wider, so name `fields` to keep it narrow. Mixed case is checked as an EIP-55 checksum before anything is bought. |
| `blocks` | With `address`: scan that account's transactions in the newest block. Capped at 1; older blocks are not served by this field. |
| `tokens` | With `address`: up to 10 ERC-20 contracts, as a list or a comma string. Two rows per contract, the balance in the token's smallest unit and the contract's own `decimals()`. A contract that does not answer shows as failed, never as zero. A contract already on the chain's own token list is not read here: sent alone it is refused free with a note; sent beside other contracts it is silently left out. For those, ask for `addressErc20Balance` in `fields` instead. |
| `rpc` | One read-only QuickNode command, answered as QuickNode returns it. Today `eth_getLogs` only. Send it alone, with `network` for a chain other than Ethereum. |

Example, two fields on Base:

```json
{"model": "sippar-chain-state", "network": "base", "fields": ["blockNumber", "gasPrice"],
 "messages": [{"role": "user", "content": "chain state"}]}
```

Example, one account on Arbitrum, only its own rows:

```json
{"model": "sippar-chain-state", "network": "arbitrum",
 "address": "0x…", "fields": ["addressNativeBalance", "addressErc20Balance", "addressTransactionCount"],
 "messages": [{"role": "user", "content": "chain state"}]}
```

Through a translating client, the same arguments go under `metadata.sippar` or as
`x-sippar-network`, `x-sippar-fields`, `x-sippar-address`, `x-sippar-blocks`, `x-sippar-tokens`,
`x-sippar-rpc` (the main skill, section 3).

## `rpc`: a token's transfer logs

```json
{"model": "sippar-chain-state", "network": "ethereum",
 "rpc": {"method": "eth_getLogs",
         "params": [{"address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                     "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
                     "fromBlock": "0x15f9000", "toBlock": "0x15f9010"}]},
 "messages": [{"role": "user", "content": "chain state"}]}
```

- `params` is one filter object with the keys `address`, `topics`, `fromBlock`, `toBlock`,
  `blockHash`. The filter must name a contract `address` (one, or a list). Any other method,
  any other key, and every command that writes, is refused free before anything is bought. The
  `rpc` object may be at most 1,000 bytes.
- The answer is QuickNode's JSON-RPC reply, unchanged, under a line saying what was read and
  when. You are billed for the tokens you receive, and each log is about 160 of them. One block
  of a busy token can run past ten thousand, so name a narrow range by absolute block number
  rather than `latest`.
- **When the answer is wider than one page**, the page serves the first logs that fit, unchanged
  and in QuickNode's order, cut on a block boundary. Two lines above the JSON say how many logs
  QuickNode returned, how many this page serves, and the exact `fromBlock` to send next, so no
  log is repeated. When one block alone is wider than a page, the lines say so and ask for a
  narrower `topics` filter with `fromBlock` and `toBlock` both set to that block.

## Reading the page

The page is a markdown table for a person with the same rows fenced as JSON beneath it for a
program, then the source line and notes. Parse the JSON; pass the table through as it arrives;
keep the notes and the attribution.

- `routing.mode` must be `declared` before you trust which chain you got (main skill, section 6).
- Rows are keyed by `(metric, target, asset)`. `addressErc20Balance` and `erc20Balance` are one
  row per token. There is no `address` key on a row; the subject is `target`.
- `value` is already human-readable. `valueRaw` is QuickNode's unscaled integer and `decimals`
  is what `value` was scaled by. Gas rows are in wei; `unit` says so.
- `ok: false` with a `reason` (`no-response`, `no-result`, `provider-error`) marks a row that
  could not be answered. It keeps its slot. The page is billed for the output tokens it carries,
  so read `counts.rowsFailed` before you treat a page as complete.
- `coverage` states what the page does not claim: balances only, no prices, no history, the
  `latest` block (not finalized), and a token balance is the contract's ledger entry, not proof
  of who controls the address.
- `addressTransactionCount` counts transactions the account sent, so it is lower than a block
  explorer's count.
- With no `address`, the balance rows are a fixed set of published protocol contracts, labelled
  in `targetLabel`. They are not a wallet.
- The notes stop a model from reading a correct outlier as corrupt data. One chain's real gas
  limit looks absurd if you do not know that chain.

## Cost

Per output token at the rate on the peer record. Naming `fields` is what makes a call cheap:
measured 2026-09-24, a dropped `fields` costs about 7.6 times what the same call costs with two
rows named, and one row still costs about 13% of the full page because the envelope and notes
are most of a small answer. An `address` makes the page wider; `fields` narrows it again. A
refusal bills nothing on an open channel.

## Changes

- 2.0.0 (2026-10-08): own skill. Added `rpc` and its served-in-part page, `tokens`, the partial
  page rule, and the wei note.
