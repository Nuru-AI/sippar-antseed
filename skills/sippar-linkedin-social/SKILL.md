---
name: sippar-linkedin-social
description: Find public LinkedIn posts on any subject through Sippar's sippar-linkedin-social model on AntSeed, from Social Fetch. Each post comes back as its link, publish date, author (name, profile link, followers) and reaction and comment counts; the post text is not included. Use it when an agent on AntSeed needs who is posting on LinkedIn about a company, a product, a market, a job topic or a trend, how much engagement those posts get, and links to read them. Triggers on - LinkedIn search on AntSeed, LinkedIn posts about, who is talking about X on LinkedIn, B2B social listening, thought leaders on a topic, sippar-linkedin-social.
metadata:
  version: "1.0.0"
  updated: "2026-10-09"
---

# sippar-linkedin-social

Public LinkedIn posts matching your search, from Social Fetch. For each post: the link, the
publish date, the author (name, profile link, follower count) and the reaction and comment
counts. **The post text is not included**: open the link to read a post. Transport (pin, request
shape, the 8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first. Model
string: `sippar-linkedin-social`.

## How to ask

The last user message is the search. Send keywords or names, not a question:

```json
{"model": "sippar-linkedin-social",
 "messages": [{"role": "user", "content": "remote work burnout"}]}
```

One call returns up to 10 posts. Two optional fields go **inside the message text, as a JSON
string**: the `content` itself becomes `{"query": …, "posts": …}`. Fields placed anywhere else (beside
`content`, or at the top level of the body) do not reach the seller and are silently lost.

| Field | What it does |
|---|---|
| `posts` | collect up to 50 posts in one call. Each ten posts is one more provider call; the answer is longer and billed by its width |
| `cursor` | the next ten posts after an earlier answer: the `next.cursor` value it carried |

Thirty posts in one call:

```json
{"model": "sippar-linkedin-social",
 "messages": [{"role": "user", "content": "{\"query\": \"climate tech funding\", \"posts\": 30}"}]}
```

The next ten after an answer whose `next.cursor` was `eyJjIjoiMiJ9`:

```json
{"model": "sippar-linkedin-social",
 "messages": [{"role": "user", "content": "{\"query\": \"remote work burnout\", \"cursor\": \"eyJjIjoiMiJ9\"}"}]}
```

In Python: `content=json.dumps({"query": "climate tech funding", "posts": 30})`.

A bad `posts` or `cursor` value is refused before anything is bought.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

The page opens with one source line naming Social Fetch, the endpoint, when it was retrieved and
the request that was sent (`Request sent: {"query": …}`), and says the post text is not
included. Then one JSON object, unfenced. Then a closing line (how many posts, how to get more)
and a disclaimer. Parse the first JSON value after the source line:

```python
import json
start = page.index("{", page.index("open the link to read a post."))
data, _ = json.JSONDecoder().raw_decode(page, start)
```

The JSON carries:

- `query`: the search as sent.
- `posts`: each one is exactly `url`, `publishedAt`, `author` (`name`, `profileUrl`,
  `followers`) and `metrics` (`reactions`, `comments`). A value the provider did not return is
  `null`, never invented.
- `next`: `{"cursor": "…", "hasMore": true}` when more posts exist, else `hasMore: false`.

Posts come in the provider's relevance order, not by date: a page can span a year or more. Sort
by `publishedAt` yourself when recency matters. The search runs over posts a logged-out visitor
can open; the links work without a LinkedIn account.

**Some results are not accurate.** A post can match a word without being about your subject.
Check a post at its `url` before relying on it. Posts belong to their authors. Not affiliated
with LinkedIn.

## Cost

Per output token at the rate on the peer record. A ten-post answer measured 971 to 1,079 tokens
on 2026-10-09; a thirty-post answer (`"posts": 30`) 2,627 to 2,716. A failed search is refused and
bills nothing on an open channel.

## Changes

- 1.0.0 (2026-10-09): first publish.
