---
name: sippar-skills
description: Get agent skills from Sippar's sippar-skills model on AntSeed. It serves Sippar's own skills for its data models, and CryptoSkill's registry of crypto agent skills by id, by exact name or by search, each served as its author published it with the author named. Use it when an agent on AntSeed needs instructions for a crypto protocol or task, or wants Sippar's skill for one of its data models without leaving AntSeed. Triggers on - get a skill, skill for aave, find a skill for, crypto agent skills, cryptoskill, SKILL.md from AntSeed, sippar-skills.
metadata:
  version: "1.0.0"
  updated: "2026-10-08"
---

# sippar-skills

Agent skills, served as their authors published them. Transport (pin, request shape, the
8-in-flight limit) is in `skills/sippar-antseed-buyer/SKILL.md`; read it first. Model string:
`sippar-skills`.

Two sources, both read fresh on every call:

- **Sippar's own skills** for its data models, from this repository: `sippar-antseed-buyer`,
  `sippar-chain-state`, `onchain-token-rankings`, `tavily-web-search`.
- **CryptoSkill's registry** of crypto agent skills (cryptoskill.org, github.com/jiayaoqijia/cryptoskill),
  thousands of skills across chains, DeFi, exchanges, wallets, trading and more.

Sippar is the connector here. It does not write, review, rank or filter the third-party skills:
each file arrives exactly as its author published it, with the author and license named in that
skill's own `SOURCE.md`, and CryptoSkill's own risk flags passed through unchanged.

## How to ask

The last user message is the request, and it is matched literally: there is no assistant reading it.
Send a name, an id, or two or three keywords. **Do not send a sentence.** A search needs every word to
appear in a skill's entry, so "find me a skill for bridging USDC from Base to Arbitrum" matches nothing
and is still billed as a page. There are no arguments.

| Send as the whole message | You get |
|---|---|
| one of our skill names, e.g. `sippar-chain-state` | that skill's `SKILL.md` from this repository |
| a CryptoSkill id, `category/name`, e.g. `chains/aave` | that skill's `SKILL.md` and `SOURCE.md`, and its entry in CryptoSkill's risk index |
| one word that is exactly one skill's name, e.g. `aave` | that skill, the same as by its id |
| two or three keywords, e.g. `aave lending` | a search: the registry entries whose own text contains every word, each word matched at the start of a word, in CryptoSkill's order. At most 10 are shown and the rest cannot be reached, so narrow with another keyword when the count is high |
| a greeting | a short page saying what the model serves |

```json
{"model": "sippar-skills", "messages": [{"role": "user", "content": "uniswap swap"}]}
```

A good sequence for a task you have no id for: search with two or three keywords; pick an entry; ask
for it by its `name` (a bare name works when it is unique) or by `category/name`, built from the
entry's own `category` and `name` fields, which is exactly how this model builds an id (every entry
carries both).

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

**One skill.** A source line naming the source, the skill, when it was retrieved and the request;
then each file, opened by a line `----- path (url) -----` and followed by the file exactly as
published; for a CryptoSkill skill, then CryptoSkill's risk-index entry for it, under
`----- CryptoSkill risk index entry -----`; then a line on how to ask for more; then a disclaimer.
A file the registry does not have is named on a line "Not found when this page was fetched"; a
skill with no risk entry shows `null` there.

**A search.** A source line with how many entries matched and how many are shown; then the
matching index entries as CryptoSkill publishes them, as JSON; then the how-to line and the
disclaimer. Ask for one entry by its id to get its files.

**No match.** A short page saying no entry contains every word asked; try fewer or different
words.

**Some skills are nearly empty.** A skill is a folder in CryptoSkill's repository, and this model
serves its `SKILL.md` and `SOURCE.md` only. Some authors put the substance in other files (`scripts/`,
`references/`), and some SKILL.md files hold only a header (`chains/base` does). When the SKILL.md
body is empty or only links elsewhere, say so to the user rather than presenting it as guidance, and
follow the source link in `SOURCE.md` if you need the rest.

**What a skill is.** Instructions your agent will follow. Some CryptoSkill skills move funds or
ask for a private key, and the risk index says which: read it, and review a skill before your
agent acts on it. The disclaimer on every third-party page says the same.

## Pairing a skill with Sippar's data

A skill is know-how; it carries no live data. Many CryptoSkill skills tell the agent to fetch data
with their own tools (curl against a public RPC, a vendor plugin). On AntSeed the same facts are one
call away: chain facts from `sippar-chain-state`, token rankings from `onchain-token-rankings`,
current web information from `tavily-web-search`. Read the skill for how a protocol works and what
to check; get the numbers from the data model; read that model's own routing line before using them.
Example: the `chains/base` skill names gas prices and block numbers; `sippar-chain-state` with
`"network": "base"` and `"fields": ["gasPrice", "baseFeePerGas", "blockNumber"]` returns them.

## Cost

Per output token at the rate on the peer record. A page's width is the files its author wrote.
Billed on the live listing, 2026-10-08 (the seller's own usage): our `sippar-antseed-buyer` and
`sippar-chain-state` skills about 2,150 tokens each; CryptoSkill skills from 680 (`chains/base`) to
4,044 (Circle's bridge skill); a 7-entry search 3,084; a no-match page 189. Every page is billed,
including a greeting and a no-match page.

## Changes

- 1.0.0 (2026-10-08): first publish.
