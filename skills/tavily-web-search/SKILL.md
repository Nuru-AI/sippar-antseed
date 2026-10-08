---
name: tavily-web-search
description: Buy a live web search with sources from Sippar's tavily-web-search model on AntSeed, served as Tavily returns it. Use it when an agent on AntSeed needs current information from the web with the pages it came from. Triggers on - web search on AntSeed, search the web, find sources for, what does the web say about, tavily-web-search.
metadata:
  version: "1.0.0"
  updated: "2026-10-08"
---

# tavily-web-search

A live web search from Tavily, served as Tavily returns it. Transport (pin, request shape, the
8-in-flight limit) is in `skills/sippar-antseed-buyer/SKILL.md`; read it first. Model string:
`tavily-web-search`.

## How to ask

The last user message is the query. There are no arguments: the search runs at advanced depth
and returns five results with the answer Tavily generated from them, every time.

```json
{"model": "tavily-web-search",
 "messages": [{"role": "user", "content": "what changed in the x402 protocol in 2026"}]}
```

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

Four parts, in this order: a source line naming Tavily, the endpoint, the search depth, when it
was retrieved, and the request that was sent (`Request sent: {"query": …}`); then Tavily's
JSON exactly as it arrived, unfenced; then a closing line; then a disclaimer.

Take the JSON after the line that ends "Tavily's response, unchanged." A parser that grabs the
first `{` on the page gets the request echo instead. Tavily's JSON carries `query`, `answer`, and
`results` with `url`, `title`, `content` and `score` per result. Verify at the linked sources;
the content is third-party web material as Tavily returned it.

## Cost

Per output token at the rate on the peer record. A page is Tavily's five results and answer, so
its width is Tavily's. A refusal bills nothing on an open channel.

## Changes

- 1.0.0 (2026-10-08): first publish.
