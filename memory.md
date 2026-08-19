# Memory — Pretplata status fix

Last updated: 2026-08-19 00:00

## What was built

Fixed `backend/rute/KorisnikPretplataRuta.py` so the `/api/korisnik_pretplata/korisnik/{korisnik_id}` endpoint no longer throws when a subscription is inactive or expired.

Updated the web and mobile subscription screens so `pauzirana` subscriptions no longer offer a cancel action, and instead guide the user toward buying or renewing.

## Decisions made

Kept the inactive/expired subscription flow as a normal response path instead of treating it as an error. The backend now returns the existing subscription record with `pretplataStatus` forced to `istekla`.

On the UI, `aktivna` is the only state that can be cancelled. `pauzirana` is treated as already stopped, so the interface should only suggest a purchase or renewal path.

## Problems solved

The route was constructing `KorisnikPretplata(...)` with a non-existent `datumKupovine` field, which caused a server-side failure and bubbled up as an error on web and mobile.

## Current state

The subscription page should now receive a valid response for inactive or expired subscriptions, and paused subscriptions should no longer show a cancel button on either web or mobile.

## Next session starts with

Verify the subscription page flow on web and mobile with paused, expired, and active subscriptions, then tighten wording or translations if needed.

## Open questions

None at the moment.
