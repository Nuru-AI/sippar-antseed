---
name: sippar-github
description: Read and search public GitHub through Sippar's sippar-github model on AntSeed, from glim.sh - a repository's README and metadata, a folder's file list, one file, an issue, a pull request with its comments and changed files, a discussion, commits, releases, and code search with snippets and line numbers across public repositories. Use it when an agent on AntSeed needs to understand a library or a codebase, find where something is defined, read a project's docs or changelog, or check what an issue or PR says, without leaving AntSeed. Triggers on - read a GitHub repo, GitHub code search on AntSeed, where is X defined, read this file on GitHub, what does this repo do, issues about, release notes, sippar-github.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-github

Public GitHub, served as glim.sh returns it. One message is one call. Transport (pin, request
shape, the 8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first. Model string:
`sippar-github`.

## How to ask

The last user message is the request, matched literally: no assistant reads it. Send a GitHub ref
to fetch one thing, or a GitHub search to find things.

| Send as the message | You get |
|---|---|
| `owner/repo` (or its github.com URL) | metadata and the README |
| `owner/repo/tree/<branch>/<folder>` | the file list of that folder |
| `owner/repo/blob/<branch>/<path>` | one file, whole |
| `owner/repo/issues/N`, `/pull/N`, `/discussions/N` | the issue; the PR with comments and changed files; the discussion with replies |
| `owner/repo/commit/<sha>` | one commit with its diff |
| `owner/repo/commits/<branch>` or `/commits/<branch>/<path>` | history, of one file if a path is given |
| `owner/repo/releases`, `/releases/latest`, `/releases/tag/<tag>`, `/branches` | releases, the latest one, one tag, branches |
| `topics/<name>` | the top repositories with that topic |
| anything else | a GitHub search in GitHub's own syntax |

github.com URLs (including `/blame/` links), `raw.githubusercontent.com` URLs and
`git@github.com:owner/repo.git` addresses all work as refs. Branch names with a slash work.

```json
{"model": "sippar-github", "messages": [{"role": "user", "content": "x402-foundation/x402"}]}
```

### Searching

Use GitHub search syntax. A sentence finds nothing, because every word must match.

- **Repositories:** the project's name and qualifiers: `x402 language:typescript`, `payment protocol stars:>500`, `created:>2026-09-01 sort:stars`.
- **Code:** one literal pattern as it appears in files (`useState(`), an `"exact string"`, a `/regex/`, or `symbol:name` for where a function or class is defined. Narrow it with `language:`, `path:` (`path:src/*.ts`, `path:docs/**`) and the repository. `symbol:` cannot be mixed with other words. Matching ignores case and hits longer words too: `"paymentRequirements"` found `findMatchingPaymentRequirements`. For a case-sensitive match, put `(?-i)` inside a `/regex/`. Only each repository's default branch is searched.
- **Issues and PRs:** keywords with `is:issue`, `is:pr`, `label:bug`, `is:open`; at most 5 AND/OR/NOT operators. An exact error message in quotes beats a paraphrase.
- **Discussions** are a separate index from issues and PRs: `is:answered`, `category:Q&A` (with a repository).
- `sort:` replaces best-match ranking. Leave it out when you want the best matches.

### Options: inside the message text, as JSON

Four optional fields go **inside the message text, as a JSON string**: the `content` itself
becomes `{"query": …, …}`. Fields placed anywhere else (beside `content`, or at the top level of the
body) do not reach the seller and are silently lost.

| Field | What it does |
|---|---|
| `repo` | `owner/name`: scope a search to one repository. Makes the line a search, whatever it looks like |
| `kind` | `repos`, `conversations` (issues and PRs), `discussions` or `code`. Optional: glim.sh infers it from the query. Makes the line a search |
| `per_page` | how many results: up to 30 for a search (a discussions search returns at most 10), up to 100 entries for a list of commits, releases or branches. A smaller page bills less. A file list is not paged (see below) |
| `page` | the next page: up to 10 for a search, 100 for a list of commits, releases or branches |

Numbers or strings both work (`10` or `"10"`). `repo` and a `repo:` written in the query must name the same repository.

Where `useRouter` is defined in Next.js, ten hits:

```json
{"model": "sippar-github",
 "messages": [{"role": "user", "content": "{\"query\": \"symbol:useRouter\", \"repo\": \"vercel/next.js\", \"kind\": \"code\", \"per_page\": 10}"}]}
```

The second page of a commit history:

```json
{"model": "sippar-github",
 "messages": [{"role": "user", "content": "{\"query\": \"vercel/next.js/commits/canary\", \"page\": 2}"}]}
```

In Python: `content=json.dumps({"query": "symbol:useRouter", "repo": "vercel/next.js", "kind": "code"})`.

A bad value (a `kind` that does not exist, a malformed `repo`, `per_page` over 100) is refused with
an error and bills nothing on an open channel. A combination that can only be checked later (31 per page on a search,
page 11 of a search) comes back as a short `Not sent to glim.sh` page. Do not send
`x-antseed-required-parameters` on this model: it announces no parameters, so requiring any name
refuses every call.

### A good order for understanding a repository

1. `owner/repo`: what it is, its default branch (`default_branch` inside the JSON's `data`), its README.
2. `owner/repo/tree/<default branch>/<folder>` for the folder that matters. **A file list is
   recursive**: it carries every file under the folder. On a large repository the root, and even a big
   folder, is far more than one page (Next.js's root: 50,947 entries), and `per_page` did not shorten a
   file list in our test. To learn the folder names, read the README, or run a code search with `repo`
   and look at the `path` values. Then ask for the deepest folder you need.
3. `owner/repo/blob/<branch>/llms.txt` or the docs folder's files, if the list shows them.
4. Code search scoped with `repo`, then the files it points to.

**Open `owner/repo` before searching code in it.** A repository that was renamed or moved finds
nothing under its old name: measured on 2026-10-09, the same search returned 0 results under
`coinbase/x402` and 10 under `x402-foundation/x402`. The repo page shows the current `full_name`.

## Reading the page

The page is the `content` of the reply's message (`choices[0].message.content`). Its first line
says where the page came from, and decides how to read the rest:

| The first line | The page |
|---|---|
| `Source: glim.sh (GitHub), POST …` and ends `The JSON below is glim.sh's response, unchanged.` | one JSON object follows, on one line |
| `… glim.sh answered HTTP 404; the JSON below is its response, unchanged.` | one JSON object with glim.sh's `error` and `detail` (a file or path that does not exist) |
| `… more than one page carries (96000 bytes), so it is not served.` | no JSON: the size, and the narrower request to send |
| `Not sent to glim.sh: …` | no JSON: why the request was refused. Nothing was bought from glim.sh; the page itself is billed by its width, like any page |

Then a closing line (how to ask) and a disclaimer. Parsing in Python:

```python
import json
lines = page.split("\n\n")
data = json.loads(lines[1]) if lines[0].endswith("unchanged.") else None
if data and "error" in data:   # glim.sh's 404: read data["error"] and data["detail"]
    ...
```

What the JSON carries:

- **A ref:** `kind` (`repo`, `tree`, `file`, `issue`, `pr`, `discussion`, `commit`, `commits`, `release`, `branches`, `topic`) and `data`. A file is `data` as one string, whole. A file list (`kind: tree`) is `data` as a list of entries (`path`, `type`, `sha`); `path_missing: true` means the folder is not there. `truncated: true` means glim.sh clipped the payload.
- **A search:** `kind`, `results`, `total_count`, `has_more`. Code results carry `repo`, `path`, `url`, `branch`, `license` and `snippets` (`line`, `text`); `line` is the line the snippet starts on, not necessarily the match. A `symbol:` hit's snippet is the definition line only, so open the file for the body: its `url` works as the next message.
- **glim.sh's hints:** `notice` (limited coverage, an empty result, how the ref was resolved) and, on a 404, `detail`. Read them. A ref they name, as `glim_github_get(ref: '…')` or in quotes, is the next message to send. "Coverage was limited … re-run" means the same request again may return more; it is a new call, billed again.
- A file over 96 KB has no partial read on this model: the page gives its github.com link instead.

Repository content belongs to its authors and stays under each repository's own license. Public
repositories only: glim.sh reads GitHub without signing in.

## Cost

Per output token at the rate on the peer record (18.70 USD per million output tokens on 2026-10-10).
Every served page is billed by its width. That includes the short ones: glim.sh's 404 reason (about
450 tokens), the too-big description (about 435), a `Not sent` page (about 370), an empty file list
(323) and an empty search (385).

Measured through the listing on 2026-10-09, before the options were added: a repo page 1,293 to 2,120
tokens, an issue 843, a PR 2,097, a folder's file list 8,444, a whole 70 KB source file 18,587, a
release note 16,216, a code search 598 to 3,036, a repo search 3,624. No page exceeds the 96 KB
ceiling plus the page's own lines (about 24,400 tokens); a bigger answer is described instead.
`per_page` and narrow folders keep pages small.

## Changes

- 1.0.0 (2026-10-10): first publish.
