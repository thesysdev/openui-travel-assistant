"use client";

import {
  AgentInterface,
  fetchLLM,
  openAIMessageFormat,
  openAIReadableStreamAdapter,
  useSystemThemeMode,
} from "@openuidev/react-ui";
import { useThread, useThreadList } from "@openuidev/react-headless";
import { Briefcase, CalendarDays, Users, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { darkTheme, lightTheme } from "../lib/theme";
import { library } from "../library";
import { localThreadStorage, saveMessages } from "../lib/thread-storage";

// The route is stateless, so openAIMessageFormat sends the whole thread every turn; the runner's
// stream comes back as NDJSON.
const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIReadableStreamAdapter(),
  messageFormat: openAIMessageFormat,
});

const starters = [
  {
    displayText: "A room in Goa for two this weekend",
    prompt: "Book a room in Goa for two this weekend.",
    icon: <CalendarDays size={16} />,
  },
  {
    displayText: "A family trip to Barcelona",
    prompt:
      "We're two adults and two kids, ages 6 and 9, looking for a hotel in Barcelona with a pool for five nights in late October.",
    icon: <Users size={16} />,
  },
  {
    displayText: "A cheap stay near Shibuya",
    prompt:
      "A cheap hotel near Shibuya Station in Tokyo for one, next month, with free cancellation.",
    icon: <Wallet size={16} />,
  },
  {
    displayText: "A work trip to New York",
    prompt: "A 4-star hotel in Midtown Manhattan with a gym for a work trip, November 10 to 13.",
    icon: <Briefcase size={16} />,
  },
];

// Keeps each thread's messages in this browser's local storage: right away when a run ends, and
// at most once a second while one streams. Rendered inside Agent Interface, so it sees the thread.
function PersistThread() {
  const threadId = useThreadList((s) => s.selectedThreadId);
  const messages = useThread((s) => s.messages);
  const isRunning = useThread((s) => s.isRunning);
  const isLoading = useThread((s) => s.isLoadingMessages);
  const lastSave = useRef(0);
  useEffect(() => {
    if (!threadId || isLoading || !messages.length) return;
    const now = Date.now();
    if (isRunning && now - lastSave.current < 1000) return;
    lastSave.current = now;
    saveMessages(threadId, messages);
  }, [threadId, messages, isRunning, isLoading]);
  return null;
}

export default function BookingChat() {
  const mode = useSystemThemeMode();
  const theme = useMemo(() => ({ mode, lightTheme, darkTheme }), [mode]);
  return (
    <div className="booking-app">
      <AgentInterface
        llm={llm}
        storage={localThreadStorage}
        componentLibrary={library}
        agentName="Stay finder"
        logoUrl="/logo.svg"
        theme={theme}
        starters={starters}
        starterVariant="long"
      >
        <AgentInterface.ThreadHeader>
          <span className="thread-context">
            Live hotel prices from{" "}
            <a href="https://mcp.trivago.com/docs" target="_blank" rel="noreferrer">
              trivago
            </a>{" "}
            · You book on the hotel or booking site
          </span>
        </AgentInterface.ThreadHeader>
        <AgentInterface.Welcome
          image={{ url: "/logo.svg" }}
          title="Where are you headed?"
          description="Describe your trip in your own words. I'll turn it into a form with what I understood, ask only for what's missing, and find stays with live prices."
        />
        <AgentInterface.Composer placeholder="Describe your trip…" />
        <PersistThread />
      </AgentInterface>
    </div>
  );
}
