---
name: sippar-hotel-search
description: Find hotels, hostels and other places to stay in a city or area through Sippar's sippar-hotel-search model on AntSeed, with Google Maps data from OpenWeb Ninja. Use it when an agent on AntSeed needs places to stay with star class, guest rating, amenities, address and a current nightly price, and, on request, each booking site's price for that night. Triggers on - hotel search on AntSeed, hotels in X, hostels in X, vacation apartments, where to stay, hotel prices, compare booking sites, sippar-hotel-search.
metadata:
  version: "1.0.0"
  updated: "2026-10-10"
---

# sippar-hotel-search

Places to stay that Google Maps finds for one search, from OpenWeb Ninja's Local Business Data
API. Hotels, hostels, aparthotels, guest houses and vacation rentals all come through the same
search. Transport (pin, request shape, the 8-in-flight limit) is in the `sippar-antseed-buyer`
skill; read it first. Model string: `sippar-hotel-search`.

## How to ask

The last user message is one plain line: the kind of stay and the place. There are no arguments.

```json
{"model": "sippar-hotel-search",
 "messages": [{"role": "user", "content": "hostels in Lisbon, Portugal"}]}
```

- Name the place, and add the country when a city name exists in more than one country
  (`hotels in Paris, France`). The search runs from a US region by default, so a bare name can
  land on the American town.
- The kind of stay shapes the list: `hotels in`, `hostels in`, `boutique hotels in`,
  `vacation apartments in`, `bed and breakfast in`, `hotels near Times Square, New York`.
- You get up to 10 places. End the line with the word `offers` to get up to 5 places with
  every booking site's price for each (`hotels in Athens, Greece offers`). Sippar reads that word
  itself, so the page's `Request sent` shows the search without it and `"limit":"5"`.
- **There are no dates, guest counts or price filters.** The search takes none (see the next
  section). Filter by price, stars or rating from the list yourself.
- A line with fewer than three letters is refused for free. Up to 120 characters.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## The price is for Google's default night

`hotel_price_for_dates` is the price Google Maps showed for **its own default stay**, not for
dates you choose. The page has no date field. The stay shows only inside some booking-site links
(`checkIn=`/`checkOut=` and the like, in each site's own format): on 2026-10-10 they carried a
one-night stay nine days out, for two guests. Treat it as the hotel's current price level. For
real dates, open the place's `website` or a booking site from the offers list and check there. Prices change by
the hour: quote a price with the retrieval time on the page.

## Reading the page

The page opens with one source line: `Source: Google Maps, via OpenWeb Ninja (Local Business
Data), retrieved <time>. Request sent: {…}`. It ends with "values unchanged:" and the list of
fields kept for each place. Then comes the JSON, unfenced, then a closing line and a disclaimer.
Text follows the JSON, so parse the first JSON value after the marker:

```python
import json
start = page.index("{", page.index("values unchanged:"))
data, _ = json.JSONDecoder().raw_decode(page, start)
```

A parser that grabs the first `{` on the page gets the request echo instead.

The JSON is OpenWeb Ninja's response. Each place is cut to the fields named on the source line,
and no value is changed:

- `data`: the places, in Google's order. Each has `name`, `type` and `subtypes` (for example
  "Hotel", "Hostel", "Youth hostel", "Serviced accommodation", "Holiday apartment rental"),
  `hotel_stars` (star class, when Google has one), `rating` and `review_count` (Google reviews),
  `hotel_price_for_dates` (a string with the currency, such as `"$178"`), `hotel_amenities` (for
  example `{"Free Wi-Fi": true, "Free breakfast": true}`), `full_address`, `latitude`,
  `longitude`, `place_link` (the Google Maps page), `website`, `phone_number` and
  `business_status`.
- A field a place does not have is absent, never filled in. `hotel_location_rating` and
  `hotel_review_summary` are usually `null`. A place without `hotel_price_for_dates` came
  back with no price: check its website.
- With `offers`, each place also has `hotel_booking_options`: one entry per booking site, with
  `source` (Booking.com, Agoda, Expedia, Hotels.com, Trip.com, Priceline, KAYAK and others),
  `price`, `link` and `source_favicon`. The list is **not sorted by price**; sort it yourself.
  A site's price can sit above `hotel_price_for_dates`, which is Google's own figure.
- `parameters` echoes what the search ran with, including the default `region` and coordinates.
  `status` is `"OK"` on success.

**An empty search exists.** A place Google cannot match returns `"data": []`. It is still billed,
at the width of the short page. Try a nearby town or a broader kind of stay.

This is not a booking or a quote from any hotel or site.

## Cost

Per output token at the rate on the peer record. Measured 2026-10-10 (the listing's own token
count): answers of ten places 1,992 to 2,366 tokens; answers with `offers` (five places) 19,024 to
31,370, because every booking site's tracking link is long. Ask for `offers` only when you need
the site-by-site prices. A refused line bills nothing.

## Changes

- 1.0.0 (2026-10-10): first publish.
