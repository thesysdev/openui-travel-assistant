# Itinerary feedback regression check

This fixture renders the production itinerary components and CSS in React StrictMode. It uses only local sample data and a 1600×1200 inline image; no API keys or paid requests are needed.

From the repository root, with dependencies installed:

```sh
mkdir -p output/playwright
node_modules/.bin/esbuild tests/itinerary-feedback/fixture.tsx --bundle --outdir=output/playwright
cp tests/itinerary-feedback/index.html output/playwright/index.html
python3 -m http.server 8765 --bind 127.0.0.1 --directory output/playwright
```

In another terminal, using Playwright CLI:

```sh
playwright-cli -s=itinerary-feedback open http://127.0.0.1:8765 --browser chrome
playwright-cli -s=itinerary-feedback run-code --filename tests/itinerary-feedback/checks.js
playwright-cli -s=itinerary-feedback close
```

The returned result lists eight passing scenario groups. A failed assertion is reported as `Error`; check the result, because the CLI may still exit with status zero. Run only against this isolated fixture: the checks clear its origin's localStorage.

Coverage: computed body-flight styles; add/remove/re-add; cancellation before 700ms; replacement by another place; both save controls; Enter/Space and repeat; toast expiry; trip switch; provider unmount/remount; live reduced-motion preference; 390px layout with hidden tabs; missing photo. The mobile fixture models the production hidden-tab condition; it is not a full mobile app test.

Verified with Chrome 155.0.8059.40. The original cf6707c implementation fails the first check with a 1600×1200 static image; the fix passes all checks. Production build and `tsc --noEmit` also pass. No lint script is configured.
