---
name: tavily-web-search
description: Buy a live web search with sources from Sippar's tavily-web-search model on AntSeed, served as Tavily returns it. Use it when an agent on AntSeed needs current information from the web with the pages it came from. Triggers on - web search on AntSeed, search the web, find sources for, what does the web say about, tavily-web-search.
metadata:
  version: "1.1.0"
  updated: "2026-10-10"
---

# tavily-web-search

A live web search from Tavily, served as Tavily returns it. Transport (pin, request shape, the
8-in-flight limit) is in the `sippar-antseed-buyer` skill; read it first. Model string:
`tavily-web-search`.

## How to ask

The last user message is the query. With nothing else, the search runs at advanced depth and
returns five results with the answer Tavily generated from them.

```json
{"model": "tavily-web-search",
 "messages": [{"role": "user", "content": "what changed in the x402 protocol in 2026"}]}
```

Three optional arguments, as top-level keys beside `messages` (or in `metadata.sippar`, or as
`x-sippar-max-results`, `x-sippar-include-raw-content`, `x-sippar-include-images` headers):

| argument | values | what you get |
|---|---|---|
| `max_results` | a whole number, 5 to 50 | that many results instead of five |
| `include_raw_content` | `true` / `false` | each result's full page text; only with 5 results |
| `include_images` | `true` / `false` | image URLs from the search |

```json
{"model": "tavily-web-search",
 "messages": [{"role": "user", "content": "stablecoin regulation"}],
 "max_results": 20}
```

A value outside these rules is refused before anything is bought, and the refusal says which
rule. Full page text is long: five pages measured 65,153 tokens, so it is served for five results
only. `x-antseed-required-parameters` may name these three; any other name refuses every call.

## Reading the page

Four parts, in this order: a source line naming Tavily, the endpoint, the search depth, when it
was retrieved, and the request that was sent (`Request sent: {"query": …}`); then Tavily's
JSON exactly as it arrived, unfenced; then a closing line; then a disclaimer.

Take the JSON after the line that ends "Tavily's response, unchanged." A parser that grabs the
first `{` on the page gets the request echo instead. Tavily's JSON carries `query`, `answer`, and
`results` with `url`, `title`, `content` and `score` per result. Verify at the linked sources;
the content is third-party web material as Tavily returned it.

## Cost

Per output token at the rate on the peer record. A page is Tavily's results and answer, so its
width is Tavily's: five results measured 1,800 to 6,000 tokens, twenty results 11,274, and five
results with full page text 65,153. A refusal bills nothing on an open channel.

## Changes

- 1.1.0 (2026-10-10): `max_results`, `include_raw_content` and `include_images`.
- 1.0.1 (2026-10-08): skills referred to by name.
- 1.0.0 (2026-10-08): first publish.
