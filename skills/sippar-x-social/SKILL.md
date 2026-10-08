---
name: sippar-x-social
description: Search public X (Twitter) posts through Sippar's sippar-x-social model on AntSeed, served as glim.sh returns them. Use it when an agent on AntSeed needs what people are posting on X about anything - a brand, a product, a person, a sports event, the news, a technology - or what one account posted. Triggers on - X search on AntSeed, Twitter search, what is X saying about, reactions to, posts about, tweets from, brand mentions on X, social listening, sippar-x-social.
metadata:
  version: "1.0.0"
  updated: "2026-10-09"
---

# sippar-x-social

Public X posts on any subject matching your search, from glim.sh, served as glim.sh returns them. Transport
(pin, request shape, the 8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it
first. Model string: `sippar-x-social`.

## How to ask

The last user message is the search. There are no arguments.

```json
{"model": "sippar-x-social",
 "messages": [{"role": "user", "content": "Formula 1 since:2026-10-01"}]}
```

Send keywords or names, not a question. A plain question is matched word by word and returns
loosely related posts. X's search operators go inside the message:

| Operator | Seen working |
|---|---|
| `from:handle` | yes: only that account's posts (`from:F1`) |
| `"exact phrase"` | yes (`"best pizza"`) |
| `lang:en` | yes |
| `since:YYYY-MM-DD` | yes |
| `min_faves:N` | **no**: posts under the threshold still come back |
| `-word` (exclude) | **no**: posts with the word still come back |

Posts come in X's "Top" order, popular first, so older posts mix in. Add `since:` when you want
recent ones.

**Short generic terms pull in noise.** Named things (a brand, a product, a team, a person, an
event) return focused pages; a single generic word does not. The worst case measured is a coin
ticker: `USDC` came back as mostly giveaway posts, with or without `since:` and `lang:`, and there
is no exclusion filter that removes them. Narrow with an account's own posts (`from:handle`), an
exact phrase or more words, and treat engagement bait as noise.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

The page opens with one source line naming glim.sh, the endpoint, when it was retrieved and the
request that was sent (`Request sent: {"query": …}`), ending "glim.sh's response, unchanged."
Then glim.sh's JSON exactly as it arrived, unfenced. Then a closing line on how to search, and a
disclaimer. Text follows the JSON, so parse the first JSON value after the marker rather than
the rest of the page:

```python
import json
start = page.index("{", page.index("response, unchanged."))
data, _ = json.JSONDecoder().raw_decode(page, start)
```

A parser that grabs the first `{` on the page gets the request echo instead. The JSON carries:

- `tweets`: usually 13 to 20 posts. Each has `id`, `url`, `text`, `created_at`, `lang`,
  `author` (`username`, `name`, and follower counts under `author.public_metrics`),
  `public_metrics` (`like_count`, `retweet_count`, `reply_count`, `quote_count`,
  `impression_count`, `bookmark_count`), `engagement_rate`, and `media`, `entities` or
  `quoted_tweet` when the post has them. Sort them yourself if order matters.
- `count`, `summary` (glim.sh's totals for the page) and `topics` (top hashtags, domains and
  mentioned accounts).
- `has_more` and `next_cursor`: you cannot send the cursor back, so one call is one page. For
  different posts, change the search (a `since:` date, an account, other words).

A post can be only a link (an article, a video) with `lang` `zxx`; its text tells you nothing.

**Some results are not accurate.** Off-topic posts, spam and giveaway bait can appear. Check a
post at its `url` before relying on it. Posts belong to their authors.

## Cost

Per output token at the rate on the peer record. Most of a page's width is the post text and
the author blocks. Measured 2026-10-08 (the listing's own token count): pages between about
5,500 and 17,500 tokens, typically 6,000 to 11,000. A failed search is refused and bills
nothing on an open channel.

## Changes

- 1.0.0 (2026-10-09): first publish.
