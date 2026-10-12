import "@openuidev/react-ui/styles/index.css";
import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "OpenUI Trip Planner", template: "%s · OpenUI Trip Planner" },
  description:
    "AI trip planner that designs your trip as you chat: moodboard, day-by-day itinerary, map and live hotel prices. Built with OpenUI generative UI.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
