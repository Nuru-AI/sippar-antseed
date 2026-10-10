---
name: sippar-skills
description: Get agent skills from Sippar's sippar-skills model on AntSeed, the aggregator over two public indexes. It serves two public indexes as their authors published them - skills.sh, the open Agent Skills directory across every domain, and CryptoSkill's registry of crypto skills - by id, by a search of both, and file by file, with the author, license and audit or risk verdicts named on every page, plus Sippar's own skills for its data models and the adapter that runs any skill on AntSeed. Use it when an agent on AntSeed needs a skill for a task (video, marketing, code, research, a crypto protocol) or wants Sippar's skill for one of its data models without leaving AntSeed. Triggers on - get a skill, find a skill for, video skill, marketing skill, skills.sh, skill for aave, SKILL.md from AntSeed, sippar-skills.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-skills

Agent skills, served as their authors published them. Transport (pin, request shape, the
8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first. Model string:
`sippar-skills`. Its sibling `crypto-skills` serves CryptoSkill and Sippar's own skills only;
this model is the aggregator: skills.sh as well.

Three sources, all read fresh on every call:

- **skills.sh** (skills.sh, Vercel's Agent Skills Directory): tens of thousands of agent skills
  across every domain, indexed from their authors' public GitHub repositories. Each skill is
  served from its own repository, with the repository's license line and skills.sh's three
  audit verdicts (Gen Agent Trust Hub, Socket, Snyk) beside it.
- **CryptoSkill's registry** (cryptoskill.org, github.com/jiayaoqijia/cryptoskill): thousands of
  crypto skills across chains, DeFi, exchanges, wallets, trading and more, each with its
  `SOURCE.md`, quality score and risk flags.
- **Sippar's own skills** for its models, from this repository: `sippar-antseed-buyer`,
  `quicknode-blockchain-data`, `nansen-crypto-screener`, `tavily-web-search`, `crypto-skills`,
  `sippar-skills`, and `sippar-skill-adapter`, which is how a skill from either index runs on AntSeed. The
  earlier names `sippar-chain-state`, `onchain-token-rankings` and `sippar-skills` fetch the
  same files.

Sippar is the connector here. It does not write, review, rank or filter the third-party skills:
each file arrives exactly as its author published it, with the author and license named, and the
indexes' own verdicts passed through unchanged.

## How to ask

The last user message is the request, and it is matched literally: there is no assistant reading
it. Send a skill name, a skill id, a file path, or two or three keywords. **Do not send a
sentence.** A search needs every word to appear in a CryptoSkill entry, and skills.sh matches
names and descriptions; "find me a skill for bridging USDC from Base to Arbitrum" matches little
and is still billed as a page. There are no arguments.

| Send as the whole message | You get |
|---|---|
| one of our skill names, e.g. `sippar-skill-adapter` | that skill's `SKILL.md` from this repository |
| a skills.sh id, `owner/repo/skill`, e.g. `heygen-com/hyperframes/general-video` | that skill's `SKILL.md` from its author's repository, the repository's license line, skills.sh's audit verdicts, and how to fetch its other files |
| a file inside a skills.sh skill, `owner/repo/skill/<path>`, e.g. `heygen-com/hyperframes/general-video/references/x.md` | that one file, unchanged |
| a CryptoSkill id, `category/name`, e.g. `chains/aave` | that skill's `SKILL.md` and `SOURCE.md`, its risk-index entry, its quality-score entry, and the list of its other files |
| a file inside a CryptoSkill skill, `category/name/<path>` | that one file, unchanged, with whether it matches the checksum CryptoSkill recorded |
| two or three keywords, e.g. `video generation` or `aave lending` | a search of both indexes, 10 entries each per page: CryptoSkill's entries whose own text contains every word, in CryptoSkill's order, and skills.sh's results as returned, each with the skill's own description where its file was found; on page 1 any of Sippar's own skills that match |
| `{"query": "video generation", "page": "2"}` | the next 10 of each |
| a greeting | a short page saying what the model serves |

A single word is a search, even when it is a skill's name: `aave` lists entries; `chains/aave`
opens the skill. To open an entry from a search, use its id as printed: skills.sh's `id`
(`owner/repo/skill`), or CryptoSkill's `category/name` built from the entry's own fields. When
an `owner/repo` happens to be a CryptoSkill category and name that its source lock lists, the
CryptoSkill reading wins.

```json
{"model": "sippar-skills", "messages": [{"role": "user", "content": "video generation"}]}
```

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

Every page opens with a source line naming where the text came from, when it was retrieved and
the request. Every page ends with a short line on what the model is for, a line on how to ask,
and, on a third-party page, a disclaimer.

**One skills.sh skill.** The source line names skills.sh, the skill id, its author's repository,
the branch and folder the file was found in, and the skill's skills.sh page. Then the `SKILL.md`
under a `----- path (url) -----` line, exactly as published. Then `License: "<first line of the
repository's license file>" (file, url)`, or `License: NO LICENSE FILE FOUND in github.com/<repo>`
when the repository has none, which means the author's rights are reserved by default. Then
skills.sh's audit verdicts for the skill as JSON (`ath`, `socket`, `snyk`, each with a `risk` and a
date), or `null` when skills.sh has none. Then how to fetch the whole repository from the
`sippar-github` model, or one of the skill's files by path. A skill whose file could not be found
at the usual folders or in the repository tree is said so, with the repository and the skills.sh
page linked, and nothing else served.

**One CryptoSkill skill.** Each file opens with a line `----- path (url) -----` and follows exactly
as published: `SKILL.md`, then `SOURCE.md` (the original author, the source and the license). Then
CryptoSkill's risk-index entry for the skill (flags such as `can_move_funds`,
`requires_private_key`), then its entry in CryptoSkill's index with its quality `score`, then the
list of every file CryptoSkill recorded for the skill, each with its SHA-256, and how to fetch one.
A file the registry does not have is named on a line "Not found when this page was fetched".

**One file.** The file exactly as published. A CryptoSkill file carries whether its SHA-256
matches the record; a skills.sh file carries the repository's license line. A binary file, or one
over 48 KB, is described with its link instead of served.

**A search.** A source line with how many CryptoSkill entries matched and which are shown ("27
matched, entries 1 to 10 shown (page 1)"), then those entries as CryptoSkill publishes them, as
JSON. Then skills.sh's block: how many it returned and how many are on this page, then its results
as JSON (`id`, `source`, `skillId`, `name`, `installs`, and `description` from the skill's own
frontmatter where its file was found, `null` where it was not). When either index has more, the
page says exactly what to send for the next page. Sippar's own matching skills follow under their
own heading on page 1. When skills.sh could not be searched, one line says so and the CryptoSkill
half still answers.

**No match.** A short page saying no CryptoSkill entry contains every word asked, with skills.sh's
block if it returned anything; try fewer or different words.

**Verdicts are automated, not reviews.** CryptoSkill's score and risk flags are its own heuristics;
skills.sh's audits are three partners' scanners, each dated. A capability shown as false, or a
"safe" beside a "critical", is what the tools returned. A skill is instructions your agent will
follow; review it before your agent acts on it. Many public skills exist to route you to their
author's platform or plugin: keep the procedure, swap the tooling, and read `sippar-skill-adapter`
for how.

**Some skills are thin.** A `SKILL.md` can be a header and a link, with the substance in the
skill's other files. Fetch the files you need by path. The same skill can appear under several
owners on skills.sh (mirrors) with separate install counts; prefer the author's own repository.
If a skill has nothing usable, say so to the user rather than presenting it as guidance.

## Running a skill on AntSeed

A skill is know-how; it carries no live data and no model. Public skills assume their author's
tools: a CLI, an API key, a provider's model ids, a plugin that posts results. On AntSeed the
same facts are one call away from Sippar's data models, and the same images, videos and text
come from AntSeed's own catalog. `sippar-skill-adapter` is the method: keep the skill's process,
map what it wants onto what you have, keep every approval gate, and never let a generative model
render a fact. Example: the `chains/base` skill names gas prices and block numbers;
`quicknode-blockchain-data` with `"network": "base"` and `"fields": ["gasPrice", "baseFeePerGas",
"blockNumber"]` returns them. A skills.sh video skill names a provider's video models; AntSeed's
own `antseed-videos` skill runs the same recipe on the live video catalog.

## Cost

Per output token at the rate on the peer record. A page's width is the files its author wrote.
Measured 2026-10-10 on this build (free, the listing's own token count): our skills about 2,300
to 2,800 tokens; `chains/aave` 2,255; a skills.sh skill page 2,500 to 6,000
(`heygen-com/hyperframes/general-video` 6,016, a mirror's `ai-video-generation` 2,517); a 10-entry
search page of both indexes about 4,400 to 4,500; a no-match page about 260. Some skills are much
wider: one CryptoSkill skill page was over 17,000 tokens because its `SKILL.md` alone is 66 KB. A
search entry does not show a skill's size. Every page is billed, including a greeting and a
no-match page.

## Changes

- 1.0.0 (2026-10-10): the aggregator model: skills.sh and CryptoSkill together, `owner/repo/skill`
  ids, files by path, a search of both indexes paged together, the repository's license line and
  skills.sh's audit verdicts on every skills.sh page. `crypto-skills` keeps serving CryptoSkill and
  Sippar's own skills only. The `sippar-skill-adapter` skill.
