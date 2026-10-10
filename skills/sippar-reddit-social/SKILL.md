---
name: sippar-reddit-social
description: Find public Reddit posts on any subject through Sippar's sippar-reddit-social model on AntSeed, from glim.sh. Each post comes back as its title, thread link, subreddit, author's username, publish date, score and comment count; the post text and comments are not included. Use it when an agent on AntSeed needs which Reddit threads discuss a product, a company, a tool, a hobby or a news story, where (which subreddits), how much attention each got, and links to read them. Triggers on - Reddit search on AntSeed, Reddit threads about, what subreddits discuss X, community reaction, sippar-reddit-social.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-reddit-social

Public Reddit posts matching your search, from glim.sh. For each post: the title, the thread
link, the subreddit, the author's username, the publish date, the score and the comment count.
**The post text and the comments are not included**: open the link to read a thread. Transport
(pin, request shape, the 8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it
first. Model string: `sippar-reddit-social`.

## How to ask

The last user message is the search:

```json
{"model": "sippar-reddit-social",
 "messages": [{"role": "user", "content": "home espresso machine"}]}
```

Keywords work best: Reddit's search matches the words you send, so a long question finds little.
A question is still accepted, and cut down before the search: small words such as `what`, `the`
or `do` are dropped, and if more than three words remain, three are kept, names and acronyms
first, then longer words. The page shows exactly what was searched (`Request sent: {"query": …}`).
"What do developers think of the x402 payment protocol?" was searched as `x402 payment protocol`.
To control the search, send the three or fewer words you want yourself. A generic extra word
(`features`, `opinions`) can narrow the results; leave it out.

The search always sorts by relevance; that cannot be changed.

One call returns up to 10 posts. Two optional fields go **inside the message text, as a JSON
string**: the `content` itself becomes `{"query": …, "time": …}`. Fields placed anywhere else
(beside `content`, or at the top level of the body) do not reach the seller and are silently lost.

| Field | What it does |
|---|---|
| `time` | only posts from the last `hour`, `day`, `week`, `month` or `year`; `all` is the default |
| `cursor` | the next ten posts after an earlier answer: the `next.cursor` value it carried |

Posts from the past week:

```json
{"model": "sippar-reddit-social",
 "messages": [{"role": "user", "content": "{\"query\": \"Formula 1\", \"time\": \"week\"}"}]}
```

The next ten after an answer whose `next.cursor` was `t3_1vwxol6`. Send the query exactly as the
earlier page's `query` shows it, with the same `time` if you set one; the page's closing line
gives this message ready to copy:

```json
{"model": "sippar-reddit-social",
 "messages": [{"role": "user", "content": "{\"query\": \"x402 payment protocol\", \"cursor\": \"t3_1vwxol6\"}"}]}
```

In Python: `content=json.dumps({"query": "Formula 1", "time": "week"})`.

A bad `time` or `cursor` value, or a search with no words in it, is refused before anything is
bought.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

The page opens with one source line naming glim.sh, the endpoint, when it was retrieved and the
request that was sent, and says the post text and comments are not included. Then one JSON
object, unfenced. Then a closing line (how many posts, the exact message for the next page, how
to narrow by date) and a disclaimer. Parse the first JSON value after the source line:

```python
import json
start = page.index("{", page.index("open the link to read a thread."))
data, _ = json.JSONDecoder().raw_decode(page, start)
```

The JSON carries:

- `query`: the search as sent.
- `posts`: each one is exactly `title`, `url` (the thread on reddit.com), `subreddit`, `author`
  (a username), `publishedAt`, `score` and `numComments`. A value the provider did not return is
  `null`, never invented; a deleted author is `null`.
- `next`: `{"cursor": "…", "hasMore": true}` when more posts exist, else `hasMore: false`.

Posts come in relevance order, not by date, and without `time` they can span years. Sort by
`publishedAt` yourself when recency matters, or set `time`.

**Some results are not accurate.** A post can match a word without being about your subject; a
title alone can mislead. Check a thread at its `url` before relying on it. Posts belong to their
authors. Not affiliated with Reddit.

## Cost

Per output token at the rate on the peer record. Thirty ten-post answers measured 947 to 1,271
tokens on 2026-10-10. A search that fails upstream is refused and bills nothing on an open
channel.

## Changes

- 1.0.0 (2026-10-10): first publish.
