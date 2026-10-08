---
name: crypto-skills
description: Get agent skills from Sippar's crypto-skills model on AntSeed. It serves Sippar's own skills for its data models, and CryptoSkill's registry of crypto agent skills by id, by search, and file by file, each served as its author published it with the author named. Use it when an agent on AntSeed needs instructions for a crypto protocol or task, or wants Sippar's skill for one of its data models without leaving AntSeed. Triggers on - get a skill, skill for aave, find a skill for, crypto agent skills, cryptoskill, SKILL.md from AntSeed, crypto-skills, sippar-skills.
metadata:
  version: "2.0.0"
  updated: "2026-10-08"
---

# crypto-skills

Agent skills, served as their authors published them. Transport (pin, request shape, the
8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first. Model string:
`crypto-skills`.
The earlier id `sippar-skills` still answers the same way.

Two sources, both read fresh on every call:

- **Sippar's own skills** for its models, from this repository: `sippar-antseed-buyer`,
  `quicknode-blockchain-data`, `nansen-crypto-screener`, `tavily-web-search`, `crypto-skills`.
  The earlier names `sippar-chain-state`, `onchain-token-rankings` and `sippar-skills` fetch the
  same files.
- **CryptoSkill's registry** of crypto agent skills (cryptoskill.org, github.com/jiayaoqijia/cryptoskill),
  thousands of skills across chains, DeFi, exchanges, wallets, trading and more.

Sippar is the connector here. It does not write, review, rank or filter the third-party skills:
each file arrives exactly as its author published it, with the author and license named in that
skill's own `SOURCE.md`, and CryptoSkill's own risk flags passed through unchanged.

## How to ask

The last user message is the request, and it is matched literally: there is no assistant reading it.
Send a skill name, a skill id, a file path, or two or three keywords. **Do not send a sentence.** A
search needs every word to appear in a skill's entry, so "find me a skill for bridging USDC from Base
to Arbitrum" matches nothing and is still billed as a page. There are no arguments.

| Send as the whole message | You get |
|---|---|
| one of our skill names, e.g. `quicknode-blockchain-data` | that skill's `SKILL.md` from this repository |
| a CryptoSkill id, `category/name`, e.g. `chains/aave` | that skill's `SKILL.md` and `SOURCE.md`, its risk-index entry, its quality-score entry, and the list of its other files |
| a file path inside a skill, `category/name/<path>`, e.g. `analytics/fomo-research/references/api.md` | that one file, unchanged, with whether it matches the checksum CryptoSkill recorded |
| two or three keywords, e.g. `uniswap swap` or `aave` | a search, 10 entries per page: the registry entries whose own text contains every word (each word matched at the start of a word), in CryptoSkill's order, and on page 1 any of Sippar's own skills that match |
| `{"query": "uniswap swap", "page": "2"}` | the next 10 entries of the same search |
| a greeting | a short page saying what the model serves |

A single word is a search, even when it is a skill's name: `aave` lists 28 entries; `chains/aave`
opens the skill. To open an entry from a search, build its id from the entry's own `category` and
`name` fields: `category/name`.

```json
{"model": "crypto-skills", "messages": [{"role": "user", "content": "uniswap swap"}]}
```

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

Every page opens with a source line naming where the text came from, when it was retrieved and the
request. Every page ends with a short line on what the model is for, a line on how to ask, and, on a
third-party page, a disclaimer.

**One skill.** Each file opens with a line `----- path (url) -----` and follows exactly as published:
`SKILL.md`, then `SOURCE.md` (the original author, the source and the license). Then CryptoSkill's
risk-index entry for the skill (flags such as `can_move_funds`, `requires_private_key`), then its
entry in CryptoSkill's index with its quality `score`, then the list of every file CryptoSkill
recorded for the skill, each with its SHA-256, and how to fetch one. A file the registry does not
have is named on a line "Not found when this page was fetched".

**One file.** The file exactly as published, with whether its SHA-256 matches the record. A binary
file, or one over 48 KB, is described with its link instead of served.

**A search.** A source line with how many entries matched and which are shown ("27 matched, entries 1
to 10 shown (page 1)"), then the entries as CryptoSkill publishes them, as JSON. When there are more,
the page says exactly what to send for the next page. Sippar's own matching skills follow under
their own heading on page 1.

**No match.** A short page saying no entry contains every word asked; try fewer or different words.

**The score and the risk flags are CryptoSkill's automated heuristics, not audits.** A capability
shown as false is weak evidence, not proof. A skill is instructions your agent will follow; review
it before your agent acts on it, and read the risk flags first. The disclaimer on every third-party
page says the same.

**Some skills are thin.** A SKILL.md can be a header and a link, with the substance in the skill's
other files. Open the file list on the skill's page and fetch the files you need by path. If a
skill has nothing usable, say so to the user rather than presenting it as guidance.

## Pairing a skill with Sippar's data

A skill is know-how; it carries no live data. Many CryptoSkill skills tell the agent to fetch data
with their own tools (curl against a public RPC, a vendor plugin). On AntSeed the same facts are one
call away: chain facts from `quicknode-blockchain-data`, token rankings from `nansen-crypto-screener`,
current web information from `tavily-web-search`. Read the skill for how a protocol works and what
to check; get the numbers from the data model; read that model's own routing line before using them.
Example: the `chains/base` skill names gas prices and block numbers; `quicknode-blockchain-data` with
`"network": "base"` and `"fields": ["gasPrice", "baseFeePerGas", "blockNumber"]` returns them.

## Cost

Per output token at the rate on the peer record. A page's width is the files its author wrote.
Measured 2026-10-08 on the current listing (free, the listing's own token count): our skills about
1,800 to 2,300 tokens; `chains/aave` 2,165; a fetched file (`references/api.md` of
`analytics/fomo-research`) 2,253; a 10-entry search page about 3,700 to 3,800; a no-match page 204.
Some skills are much wider: one CryptoSkill skill page was over 17,000 tokens because its SKILL.md
alone is 66 KB. A search entry does not show a skill's size. Every page is billed, including
a greeting and a no-match page.

## Changes

- 2.0.0 (2026-10-08): the model is `crypto-skills` (the old id `sippar-skills` still answers). A
  single word is a search; search pages by `{"query": ..., "page": ...}`; skill pages carry the
  quality score and the file list; files fetch by path.
- 1.0.0 (2026-10-08): first publish.
