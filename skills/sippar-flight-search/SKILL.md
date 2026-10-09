---
name: sippar-flight-search
description: Search Google Flights fares for one route and date through Sippar's sippar-flight-search model on AntSeed, served as the search returns them. Use it when an agent on AntSeed needs live flight options and prices between two airports - one way or round trip, for one to nine adults - with airlines, times, stops and Google's price insights. Triggers on - flight search on AntSeed, flight prices, airfare, cheapest flight, fares from X to Y, round trip price, is this fare low, sippar-flight-search.
metadata:
  version: "1.1.0"
  updated: "2026-10-09"
---

# sippar-flight-search

Google Flights results for one route and one date (or date pair), served unchanged. Sippar buys
each search from stabletravel.dev. Transport (pin, request shape, the 8-in-flight limit) is in the
`sippar-antseed-buyer` skill; read it first. Model string: `sippar-flight-search`.

## How to ask

The last user message is one line in a fixed format. There are no arguments.

```
FROM TO DATE [RETURN-DATE] [ADULTS] [OPTIONS]
```

```json
{"model": "sippar-flight-search",
 "messages": [{"role": "user", "content": "JFK LHR 2026-11-12 2026-11-19 2"}]}
```

- `FROM` and `TO` are **airport** IATA codes with scheduled passenger flights: `LHR`, not the city
  code `LON`; `JFK`, not `NYC`. Any other code is refused before anything is bought.
- `DATE` is `YYYY-MM-DD`, today or later, up to about 11 months out.
- A second date makes it a round trip. Without one it is one way.
- `ADULTS` is 1 to 9 (default 1). Prices are for the whole party, so ask for the party you are
  pricing; seat availability differs at two seats, and doubling a one-seat price can name the wrong
  airline.
- Options, any order, after the rest: `class:economy|premium|business|first`, `children:N`,
  `infants:N` (own seat), `lap:N` (infant on a lap; one per adult), `currency:EUR` (any
  three-letter code; default USD). Nine travellers at most. Example:
  `JFK LHR 2026-11-12 2026-11-19 2 class:business children:1`.
- There is **no stops, price or airline filter**. Every itinerary on the page carries its stops,
  price and airline, so filter the list yourself. Such a filter could empty a search, and an empty
  search is still billed. `stops:`, `max:` and `airlines:` are refused, free, and the refusal says so.
- The words `to`, `adults` and `pax` are ignored, so `TLV to ATH 2026-10-26 2 adults` works.
  A sentence ("cheap flights to Athens next week") is refused, free, and the refusal shows the format.

One call is one route and one date. For several dates or destinations, send one call per pair.

Do not send `x-antseed-required-parameters` on this model. It announces no parameters, so
requiring any name refuses every call.

## Reading the page

The page opens with one source line, `Source: Google Flights, retrieved <time>. Request sent: {…}`,
ending "the search response, unchanged." Then the JSON exactly as it arrived, unfenced. Then a
closing line (which also names stabletravel.dev and the exact request URL), and a disclaimer. Text
follows the JSON, so parse the first JSON value after the marker:

```python
import json
start = page.index("{", page.index("search response, unchanged."))
data, _ = json.JSONDecoder().raw_decode(page, start)
```

A parser that grabs the first `{` on the page gets the request echo instead.

The JSON:

- `best_flights` (Google's top picks, usually 3) and `other_flights`: together the itineraries,
  typically 10 to 25. Each has `price` (USD, **whole party**, and for a round trip the **whole round
  trip**), `type` ("One way" or "Round trip"), `total_duration` (minutes), `carbon_emissions`,
  `layovers` (airport and minutes) when it stops, and `flights`: one entry per segment with
  `departure_airport` and `arrival_airport` (`id`, `name`, local `time`), `airline`,
  `flight_number`, `airplane`, `travel_class`, `duration`, `legroom`, `extensions` (notes such as
  legroom and Wi-Fi), and flags like `overnight` or `often_delayed_by_over_30_min` when they apply.
- `price_insights`: `lowest_price`, `price_level` (`low`, `typical` or `high`) and
  `typical_price_range` `[low, high]`. One-way pages also carry `price_history`
  (`[unix seconds, price]` pairs, about two months).
- `search_metadata.google_flights_url`: the same search on Google Flights. Give it to a person who
  wants to book: Google shows the booking options there. This model has no booking links of its
  own, and it cannot fetch return flights for a chosen outbound.
- `airports`: names, cities and countries for both ends. `search_parameters` echoes the request;
  in it and in `Request sent`, `type` `"1"` is a round trip and `"2"` one way.

**A round trip lists outbound flights only.** Each `price` is already the round-trip total, but the
return flight is not on the page: it sits behind a `departure_token` that this model cannot send
back. Quote the round-trip price with the outbound flight, and say the return is chosen at booking. To see
return-flight options, send the return as its own one-way line (`LHR JFK 2026-11-19 2`); those are
one-way fares, not a part of the round-trip price.
`booking_token` and `departure_token` are opaque; you cannot use them here.

Sort or filter the itineraries yourself (cheapest, nonstop only, before noon). `price` divided by
the adult count is the per-person price; keep the cents ($1,569 for two is $784.50 each).

**An empty search exists.** If Google finds nothing, the JSON carries `error`
("Google Flights hasn't returned any results for this query.") and
`search_information.flights_results_state: "Fully empty"` with no flights. Try other dates or the
next airport.

**Fares change by the hour.** A flight priced in one call can cost more an hour later while the
cheapest level holds. Quote a price level with its retrieval time, name the flight as of that time,
and check again before booking. This is not a booking or an airline quote.

## Cost

Per output token at the rate on the peer record. Most of a page's width is the itinerary list.
Measured 2026-10-09 (the listing's own token count): one-way pages 3,186 to 10,963 tokens (a busy
US domestic route is the widest), a round trip for two 7,269. A refused line bills nothing.

## Changes

- 1.1.0 (2026-10-09): options (class, children, infants, lap, currency); filter stops, price and
  airline from the list; the Google Flights link for booking.
- 1.0.0 (2026-10-09): first publish.
