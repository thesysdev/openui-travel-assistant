# OpenUI Trip Planner

An AI trip planner built with OpenUI: describe a trip and its answers are interfaces, not text. Explore ideas, turn them into a day-by-day itinerary on a map, compose a moodboard, and book with live hotel prices from trivago.

It grew out of the [booking assistant cookbook](https://github.com/thesysdev/openui/tree/main/examples/cookbooks/booking-assistant) in the OpenUI repo. The cookbook stays small and matches its [walkthrough](https://www.openui.com/cookbooks/booking-assistant); this repo is the full demo that gets deployed.

## Run it

Needs Node 22.13 or later.

```bash
npm install
echo "THESYS_API_KEY=sk-th-..." > .env.local
npm run dev
```

Open http://127.0.0.1:3000.

| Variable              | Default          | Purpose                                                               |
| --------------------- | ---------------- | --------------------------------------------------------------------- |
| `THESYS_API_KEY`      | (required)       | OpenUI Gateway key, used only on the server                           |
| `OPENUI_MODEL`        | `openai/gpt-5.5` | Model for every agent                                                 |
| `PEXELS_API_KEY`      | (none)           | Optional extra photo source for the moodboard                         |
| `UNSPLASH_ACCESS_KEY` | (none)           | Optional extra photo source for the moodboard                         |
| `ALLOWED_ORIGINS`     | (none)           | Extra origins the API accepts, comma-separated, e.g. a preview domain |

## What's in it

| URL | Experience |
| --- | --- |
| `/` → `/planner` | **Planner**, the home page. **Explore** ideas as visual spreads, **Chat** about the trip, and turn saved places into an **Itinerary**: a day-by-day board on a map, with weather and prices in your currency. |
| `/moodboard` | **Moodboard**: an agent composes the trip's look and feel on a canvas, piece by piece as it streams. |
| `/journal` | **Travel journal**: the trip told as a hand-drawn journal you scroll sideways. |
| `/booking` | **Book a stay**: describe a stay in your own words, get a prefilled form, and pick from live trivago prices and photos. |

The planner links to the others from its top-right corner, and each of them has a back arrow in its top-left corner.

## How it works

Each experience streams OpenUI Lang from OpenUI Gateway's Chat Completions API and renders it with its own component library as it arrives, so answers write in rather than appearing at the end. The itinerary board's ask panel streams its JSON answer too, read as partial JSON while it grows. Three small calls return whole by design: the home page's weather line (checked before it's shown), naming a moodboard trip (background metadata), and reshaping the itinerary board (the server merges the whole new plan with the current board).

Between completions the server runs app-owned tools; the main one, `search_stays`, calls [trivago's public MCP server](https://mcp.trivago.com/docs) with the MCP SDK. The model only places hotels by id, and names, prices and booking links always come from trivago.

Other data comes from keyless public services: [OpenFreeMap](https://openfreemap.org) tiles for the map (MapLibre), [Nominatim](https://nominatim.org) for places, [Open-Meteo](https://open-meteo.com) for weather, [open.er-api.com](https://open.er-api.com) for currency, and Wikipedia, Wikimedia Commons and Openverse for photos.

## Storage and privacy

Nothing is stored on a server. Trips, chats, itineraries, moodboards, journals and booking threads live in each visitor's browser (localStorage). The routes are stateless: the booking chat's browser sends its thread and only questions and answers are forwarded, and the planner and journal send the trip's earlier turns with each request. Every completion is sent with `store: false`.

The app has no sign-in. Every POST route accepts requests only from the app's own pages: one with no `Origin` header (a script, `curl`) is refused, so it can't spend Gateway credit from outside. There's no rate limiting, so add some before promoting the demo widely.

## Deploying

Set `THESYS_API_KEY` in the host's server environment, ideally a key used only by this demo so its usage can be watched and revoked on its own.

Before deploying publicly:

- The moodboard's canvas is [tldraw](https://tldraw.dev), which shows "Get a license for production" until a [tldraw license key](https://tldraw.dev/pricing) is added.
- Check [trivago's MCP terms](https://mcp.trivago.com/docs). Hotel prices are live and can change until the guest books on trivago or the booking site.

## Where things live

| Path | What |
| --- | --- |
| `src/app/planner/` | The planner: Explore spreads, Chat, the Itinerary board and map |
| `src/app/journal/` | The travel journal |
| `src/app/moodboard/`, `src/moodboard/` | The moodboard page and its tldraw canvas, pieces and Trips panel |
| `src/components/booking-chat.tsx` | The booking chat (Agent Interface), at `/booking` |
| `src/app/api/` | One route per agent and data source; `planner/agent.ts` is the shared streaming loop with `search_stays` |
| `src/lib/` | Prompts, the trivago MCP client and `search_stays` tool, local thread storage, the origin check |
| `src/design-system/` | Fonts and colour tokens shared by the planner and the journal |
| `public/icons-3d/` | 3D place, follow-up and weather icons (`<place>-pixar.webp`) |

The planner grew out of the journal, so both style the same `hj-*` class names with different rules. Each stylesheet is scoped to its own page (`.planner-page`, or `.journal-page:not(.planner-page)`), because Next.js keeps a page's CSS loaded after you navigate away. Keep new rules in those files scoped the same way.
