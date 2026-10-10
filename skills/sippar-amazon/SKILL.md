---
name: sippar-amazon
description: Search Amazon and read a product's live offer through Sippar's sippar-amazon model on AntSeed, with data from glim.sh. Use it when an agent on AntSeed needs Amazon products for a search or a category's bestsellers on amazon.com, .co.uk, .de, .fr, .es or .it, with price (gross and VAT-excluded net), rating and review count, or one product's buybox offer, other sellers, stock, delivery and top reviews. Triggers on - Amazon search on AntSeed, Amazon price, Amazon bestsellers, ASIN lookup, compare Amazon products, Amazon reviews, sippar-amazon.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-amazon

Amazon product listings as glim.sh returns them, on six marketplaces: amazon.com, .co.uk, .de,
.fr, .es and .it. Transport (pin, request shape, the 8-in-flight limit) is in the
`sippar-antseed-buyer` skill; read it first. Model string: `sippar-amazon`.

## How to ask

The last user message is one line. What the line looks like decides the call:

| Send | You get |
|---|---|
| a search, e.g. `usb c charger` | up to about 20 ranked products for that search (48 on some marketplaces) |
| `bestsellers:<category>`, e.g. `bestsellers:electronics` | that category's bestsellers, up to 30 |
| an ASIN from a search result, e.g. `B08G4GRQYV` | one product: buybox offer, other sellers, stock, delivery, top reviews |
| a product URL, e.g. `https://www.amazon.de/dp/B0F59XT8QM` | the same, on the marketplace the URL names |

```json
{"model": "sippar-amazon",
 "messages": [{"role": "user", "content": "noise cancelling headphones"}]}
```

To add options, send the message as JSON text with glim.sh's own field names. `query` carries
the line:

```json
{"model": "sippar-amazon",
 "messages": [{"role": "user", "content": "{\"query\": \"electric kettle\", \"tld\": \"co.uk\", \"sort_by\": \"most_reviewed\", \"min_reviews\": 1000}"}]}
```

The same shape carries every kind of line; `query` is always the field, whatever the line is:

```json
{"query": "bestsellers:elektronik", "tld": "de"}
{"query": "B0F59XT8QM", "tld": "de", "response_format": "detailed"}
```

The page's `Request sent` shows what Sippar sent to glim.sh (`category_slug`, `asin`). Those are
glim.sh's names: do not copy them into your request.

- `tld`: `com` (default), `co.uk`, `de`, `fr`, `es` or `it`. A product URL sets it from its host;
  a `tld` that disagrees with the URL is refused.
- For a search only: `page` (1 to 20), `sort_by` (`most_recent`, `price_low_to_high`,
  `price_high_to_low`, `featured`, `average_review`, `bestsellers`, `most_reviewed`),
  `min_reviews` (drop products with fewer reviews), `include_paid` (`true` adds sponsored
  results) and `include_suggested` (`true` adds "people also searched for"). Numbers and true/false
  can be sent as JSON values or as text. Sending one of these with a product lookup is refused.
- There is no count option: a search returns the page glim.sh fetched. Keep the first N yourself.
- `response_format`: `concise` (default) or `detailed`, which keeps images, variants and the full
  offers list. It adds little to most pages (4% to 21% measured).
- Category slugs differ by marketplace: `electronics` on .com, `elektronik` on .de,
  `electronique` on .fr. An unknown slug is answered with glim.sh's 404 and a suggestion, and
  costs you only that short page.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

**Take an ASIN from a search result.** An ASIN no product carries can come back as an unrelated
product, and it is billed: `B000000000` returned a bag of tortilla chips filed under rollerball
pens at $159.99. Do not invent or guess one.

## Reading the page

The page opens with one source line: `Source: glim.sh (Amazon, amazon.<tld>), POST <endpoint>,
retrieved <time>. Request sent: {…}.` Then a blank line, glim.sh's JSON exactly as it arrived,
then a closing line and a disclaimer. Parse the second block, unless the page is a refusal:

```python
import json
if page.startswith("Not sent to glim.sh:"):
    data = None  # refused before buying: read the reason on the first line
else:
    data = json.loads(page.split("\n\n")[1])
```

**A search** (`mode` is `query` or `category`):

- `organic`: the products, in Amazon's order (`pos`). Each has `asin`, `title`, `url`,
  `price_gross` and `price_net` with `currency` and `vat_rate` (on .de, 649 gross is 545.38 net at
  0.19; on .com they are equal), `rating`, `reviews_count`, `is_prime`, `is_amazons_choice`,
  `best_seller` and `delivery`. Some also carry `sales_volume` ("10K+ bought in past month"),
  `price_strikethrough`, `deal`, `stock`, `other_offers_count` and `other_offers_from_price`.
  A field a product lacks is absent or `null`, never filled in.
- `paid`: sponsored results, only with `include_paid`, kept apart from `organic`.
- `page`, `has_more` and `last_visible_page` say whether to ask for the next `page`.
- With `most_reviewed`, colour and size variants of one product share its review count, so one
  product can fill several rows. glim.sh re-ranks only the page it fetched.

**A product** (has `asin` at the top):

- `title`, `brand`, `category`, `bullet_points`, `specifications`, and on some pages `description`.
- `price_gross`, `price_net`, `currency`, `vat_rate`, `stock` ("In Stock", "Only 1 left in
  stock.", "Currently unavailable."), `is_prime_eligible`, `delivery`.
- `offers_summary.buybox`: the offer Amazon shows by default, with `condition`, price and
  `seller`. Read the seller: on 2026-10-10 a .de buybox marked "New" was sold by
  "Amazon Retourenkauf", Amazon's returns outlet.
- `pricing_count` (how many offers Amazon lists; glim.sh does not say whether it counts the
  buybox, so do not subtract it) and `other_offers_from_price` (the cheapest other offer).
- A price field can be `null` or absent on a product Amazon shows without a price: that is no
  price, not zero.
- `top_reviews`: customers' reviews as Amazon shows them, each with `author`, `rating`, `title`,
  `body`, `verified_purchase` and a `timestamp` string ("Reviewed in Germany on 23 November
  2025"). The .de and .co.uk pages measured carried 8; the .com pages carried none. Reviews are
  the customers' own words: quote them as theirs.
- `rating` and `reviews_count` are Amazon's totals, not computed from `top_reviews`.

**A refusal or an error**: a line the route can tell is wrong before buying (a search option on a
product lookup, a marketplace glim.sh does not cover) opens with `Not sent to glim.sh:` and the
reason, and nothing is bought. A glim.sh 404 opens with `glim.sh answered HTTP 404` and carries
its JSON.

Prices, stock and delivery are what Amazon showed glim.sh at retrieval time, and they change.
Quote them with the retrieval time. This is not an offer to sell, and Sippar does not buy on
Amazon for you.

## Cost

Per output token at the rate on the peer record. Measured through the listing on 2026-10-10 (the
listing's own token count): searches 427 to 7,278 tokens, median 2,714 (a no-match search is
427, the widest was 48 products on .fr); product pages 794 to 2,079, median 1,024. A product
page with reviews runs about twice one without. A refused line bills nothing.

## Changes

- 1.0.0 (2026-10-10): first publish.
