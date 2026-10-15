import "@openuidev/react-ui/styles/index.css";
import type { Metadata } from "next";
import "./styles.css";
import { Analytics } from "./analytics";

const description =
  "AI trip planner that designs your trip as you chat: moodboard, day-by-day itinerary, map and live hotel prices. Built with OpenUI generative UI.";

export const metadata: Metadata = {
  // Link previews need absolute URLs. The public page is on openui.com, which proxies this
  // deployment under its base path, so opengraph-image.png resolves there too.
  metadataBase: new URL("https://www.openui.com"),
  title: { default: "OpenUI Trip Planner", template: "%s · OpenUI Trip Planner" },
  description,
  openGraph: { title: "OpenUI Trip Planner", description, siteName: "OpenUI", type: "website" },
  twitter: { card: "summary_large_image", title: "OpenUI Trip Planner", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
