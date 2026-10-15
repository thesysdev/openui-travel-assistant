# OpenUI Trip Planner

An AI trip planner built with OpenUI: describe a trip and its answers are interfaces, not text. Explore ideas, chat about the trip, and turn it into a day-by-day itinerary on a map with live hotel prices from trivago.

It grew out of the [booking assistant cookbook](https://github.com/thesysdev/openui/tree/main/examples/cookbooks/booking-assistant) in the OpenUI repo. The cookbook stays small and matches its [walkthrough](https://www.openui.com/cookbooks/booking-assistant); this repo is the full demo that gets deployed.

## Run it

Needs Node 22.13 or later.

```bash
npm install
npm run generate:apiKey   # writes THESYS_API_KEY to .env.local
npm run dev
```

Open http://127.0.0.1:3000.

| Variable                  | Default                | Purpose                                                                                                            |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `THESYS_API_KEY`          | (required)             | OpenUI Gateway key, used only on the server                                                                        |
| `OPENUI_MODEL`            | `openai/gpt-5.6-terra` | Model for every agent                                                                                              |
| `OPENUI_REASONING_EFFORT` | `low`                  | How long the model reasons before it answers, e.g. `low`, `medium` or `high` (what's allowed depends on the model) |
| `OPENUI_PROVIDER`         | (any)                  | Providers the model may run on, as comma-separated OpenRouter slugs, e.g. `cerebras/fp16`. No fallback when set    |
| `PEXELS_API_KEY`          | (none)                 | Optional extra photo source for the planner                                                                        |
| `UNSPLASH_ACCESS_KEY`     | (none)                 | Optional extra photo source for the planner                                                                        |
| `ALLOWED_ORIGINS`         | (none)                 | Extra origins the API accepts, comma-separated, e.g. a preview domain                                              |

## What's in it

| URL | Experience |
| --- | --- |
| `/` → `/planner` | **Planner**, the home page. **Explore** ideas as visual spreads, **Chat** about the trip, and turn saved places into an **Itinerary**: a day-by-day board on a map, with weather and prices in your currency. |

## How it works

The planner streams OpenUI Lang from OpenUI Gateway's Chat Completions API and renders it with its component library as it arrives, so answers write in rather than appearing at the end. The itinerary board's ask panel streams its JSON answer too, read as partial JSON while it grows. Two small calls return whole by design: the home page's weather line (checked before it's shown) and reshaping the itinerary board (the server merges the whole new plan with the current board).

Between completions the server runs app-owned tools; the main one, `search_stays`, calls [trivago's public MCP server](https://mcp.trivago.com/docs) with the MCP SDK. The model only places hotels by id, and names, prices and booking links always come from trivago.

Other data comes from keyless public services: [OpenFreeMap](https://openfreemap.org) tiles for the map (MapLibre), [Nominatim](https://nominatim.org) for places, [Open-Meteo](https://open-meteo.com) for weather, [open.er-api.com](https://open.er-api.com) for currency, and Wikipedia, Wikimedia Commons and Openverse for photos.

## Storage and privacy

Trips, chats and itineraries live in each visitor's browser (localStorage). The routes are stateless: the planner sends the trip's earlier turns with each request, and their completions are sent with `store: false`.

The app has no sign-in. Every POST route accepts requests only from the app's own pages: one with no `Origin` header (a script, `curl`) is refused, so it can't spend Gateway credit from outside. There's no rate limiting, so add some before promoting the demo widely.

## Deploying

Set `THESYS_API_KEY` in the host's server environment, ideally a key used only by this demo so its usage can be watched and revoked on its own.

Before deploying publicly:

- Check [trivago's MCP terms](https://mcp.trivago.com/docs). Hotel prices are live and can change until the guest books on trivago or the booking site.

## Where things live

| Path | What |
| --- | --- |
| `src/app/planner/` | The planner: Explore spreads, Chat, the Itinerary board and map |
| `src/app/api/` | One route per agent and data source; `planner/agent.ts` is the shared streaming loop with `search_stays` |
| `src/lib/` | Prompts, the trivago MCP client and `search_stays` tool, the origin check |
| `src/design-system/` | Fonts and colour tokens |
| `public/icons-3d/` | 3D place, follow-up and weather icons (`<place>-pixar.webp`) |

