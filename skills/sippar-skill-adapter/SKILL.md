---
name: sippar-skill-adapter
description: Run any public agent skill on AntSeed. Fetch a skill from Sippar's skills model (skills.sh or CryptoSkill, served as its author published it), keep its process, and swap the provider tooling it assumes for what an AntSeed buyer actually has - Sippar's data models for the data it wants, AntSeed's own catalog for the images, video or text generation it wants, nothing for the installs and API keys it wants, and your own hands for the publishing it wants. Use it before following any third-party skill on AntSeed. Triggers on - adapt this skill, run this skill on AntSeed, the skill wants an API key, the skill says install a CLI, skill asks for fal or inference.sh or HeyGen, map a skill to Sippar models, sippar-skill-adapter.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-skill-adapter

A public skill is a recipe written for one kitchen. The process in it is the valuable part;
the tooling around it (a CLI to install, an account to log in to, model ids that exist only
there, a plugin that reports home) is the author's business model. This skill is how an agent
on AntSeed keeps the recipe and cooks with what it has. Transport for Sippar's models (pin,
request shape, the 8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first.
Skills come from the `sippar-skills` model, the aggregator over skills.sh and CryptoSkill
(`crypto-skills` is the CryptoSkill-only sibling).

## 1. Get the skill, and read what came with it

```json
{"model": "sippar-skills", "messages": [{"role": "user", "content": "short-form video"}]}
{"model": "sippar-skills", "messages": [{"role": "user", "content": "heygen-com/hyperframes/general-video"}]}
```

A search page lists both indexes' matches; a skill page carries the author's file unchanged.
Three things on that page decide how far you trust it:

- **The license line.** "NO LICENSE FILE FOUND" means the author's rights are reserved by
  default: use the ideas, do not copy the text into something you ship, and say where it came
  from. A named license (MIT, Apache) says what you may do.
- **The audit verdicts** (skills.sh) or **the risk flags** (CryptoSkill) are automated scans,
  dated. A "critical" beside a "safe" is what two scanners returned. Before trusting any command
  in a skill, open its other files (`<id>/<path>`): `scripts/`, `references/`.
- **Mirrors.** The same skill can appear under several owners with separate install counts;
  prefer the author's own repository when the page shows which it is.

## 2. Separate the process from the tooling

Read the skill once and sort every instruction into one of two columns:

| Keep (the process) | Replace (the tooling) |
|---|---|
| the task and its scenario, the order of steps, the checks and approvals it asks for | a CLI to install, a login, an API key, an environment variable |
| the creative or analytical method: prompt formulas, shot structure, beats, scoring rubrics, templates | the provider's model ids and the features it claims for them |
| what good output looks like, and how the skill judges it | public or signed URLs as the way to pass media around |
| the deliverables: format, length, resolution, fields | a plugin or SaaS it posts results to |

Write the result down as an adaptation record: the skill id and the retrieved-at line from its
page at the top, then one row per replaced instruction with what replaced it. It is the evidence
that the recipe was followed and where it was changed.

## 3. The capability map: what the skill wants, what you have

| The skill wants | On AntSeed, use | Where it is documented |
|---|---|---|
| live web information, sources for a claim | `tavily-web-search` | its skill |
| what people post on X about a subject or from an account | `sippar-x-social` | its skill |
| LinkedIn posts: who posted, when, how it landed (no post text) | `sippar-linkedin-social` | its skill |
| chain facts: blocks, gas, balances, logs, a transaction, a contract read | `quicknode-blockchain-data` | its skill |
| token rankings, flows, perpetuals | `nansen-crypto-screener` | its skill |
| a repository, a file, an issue, a release, code search | `sippar-github` | its skill |
| flight fares for a route and date | `sippar-flight-search` | its skill |
| another skill, or one of a skill's files | `sippar-skills` (both indexes) or `crypto-skills` (CryptoSkill only) | their skills |
| an image (frames, covers, product shots) | AntSeed's image catalog, `/v1/models?type=images`, through AntSeed's own `antseed-images` skill | AntSeed Desktop; `gh skill install Antseed/antseed antseed-images` |
| a video (text-to-video, image-to-video, first and last frame) | AntSeed's video catalog, `/v1/models?type=videos`, through AntSeed's own `antseed-videos` skill: three approval stages, exact seller price, one create, a job file | AntSeed Desktop; `gh skill install Antseed/antseed antseed-videos` |
| a language model for drafting, summarising, scoring | any text model on the network, pinned to a seller you chose from `/v1/models` | the AntSeed buyer |
| an install, a login, an API key, a subscription | nothing: the buyer proxy and its USDC deposits are the whole environment | the `sippar-antseed-buyer` skill |
| to post, schedule or publish somewhere | not on AntSeed: produce the artifact and hand it to the user, with the source list | this skill |

More models are added over time (the buyer skill's table is the current list); a row here is a
pointer, the arguments and page shapes live in each model's own skill.

## 4. Rules that do not bend

- **Replace, never promise.** A feature the skill claims (lip-sync, upscaling, foley, "40+
  models") exists for you only if the live catalog advertises it today. Say what you did not
  find rather than carrying the claim forward.
- **Gates stay, and get added.** Keep every approval step the skill has; add AntSeed's where
  money is spent (the native image and video skills ask before each paid step; do not shortcut
  one because the recipe had none).
- **Facts never go through a generative model.** Numbers, names, dates, quotes, logos: research
  them with the data models, keep a source manifest, and add them as text, overlays or captions
  after generation. A model asked to render a figure as pixels gets it wrong.
- **Data pages are the provider's, as returned.** What you compute from them is yours; say so.
- **The user's platform is not AntSeed's.** Where a skill ends with "publish to X", you end with
  the artifact, the caption and the sources, and the user publishes.

## 5. Evidence to keep

The skill id and its retrieved-at line; the license line and audit or risk block as served; the
adaptation record; every model called, with the request sent and the source line of each page;
the catalog selection and the seller pinned for any generation; prompts, frames, settings and
the exact price approved; job ids and output paths; what the user said about the result.

## 6. Lanes

Worked examples of the map. A lane grows into its own skill only when it outgrows this page.

### Video (first lane)

The execution layer is AntSeed's `antseed-videos`: it fetches the live video catalog, picks a
model by control surface (first and last frame for a shot that moves from one state to another,
first frame for a consistent look, text only when the user skips frames), writes the prompt for
that model, makes and approves the frames with `antseed-images`, computes each compatible
seller's price, and creates once to a pinned seller. What public video skills add is the recipe
on top: timed beats for short-form, product-teaser structure, cinematic camera language,
explainer storyboards. From a skills.sh video skill keep those; drop its `belt` or `fal` calls,
its static model ids and any `audio: true` field (audio-capable models make sound by default
and some sellers reject the flag). For a market brief or a news clip, research with the data
models first, generate only the abstract motion layer, and add the headlines, figures,
attribution and disclaimer as deterministic overlays afterwards (an HTML-to-video tool such as
HyperFrames, whose own skills are on skills.sh). Measured on 2026-10-10: a skills.sh video skill
page costs 2,500 to 6,000 output tokens on the skills model; the video itself is bought from the
AntSeed seller at the price the recap shows, and Sippar is not in that payment.

### Marketing (second lane)

A marketing skill wants three things it cannot have here: a listening tool, an ads or analytics
account, and a scheduler. Listening is `sippar-x-social` and `sippar-linkedin-social` (keywords,
operators, dates; never a sentence); research and sources are `tavily-web-search`; the copy,
plan or calendar is drafted by whichever text model you pinned; the images and clips come from
the image and video rows above; the posting is the user's. Keep the skill's frameworks (hooks,
AARRR plans, carousel structures, A/B designs) and its review rubrics. Say in the deliverable
which numbers came from which page.

## Cost

Per output token at the rate on the peer record, for every page the skills model serves,
including this one. Generation on AntSeed is paid to the generation seller, not to Sippar.

## Changes

- 1.0.0 (2026-10-10): first draft, from the video adapter experiments of 2026-10-09/10 (five
  AntSeed renders, one skills.sh skill adapted end to end) and real served pages of the skills
  model after skills.sh joined it. Generalised from a per-category adapter on Elad's call: one
  capability map, lanes beneath it.
