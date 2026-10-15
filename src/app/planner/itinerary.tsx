"use client";

import { Compass, Heart, Map as MapIcon } from "lucide-react";
import { createContext, type MouseEvent, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryItem } from "../../lib/itinerary";
import "./itinerary.css";
import "./board.css";

// The trip's itinerary on the page: what's saved (in this browser, one list per trip), and the
// heart that saves a photo to it from anywhere in the planner.

export type { ItineraryItem };
export type Saveable = Omit<ItineraryItem, "id" | "addedAt">;

type Itinerary = {
  trip: string;
  items: ItineraryItem[];
  /** The saved item matching this subject or name, if any. */
  find: (what: { subject?: string; name: string }) => ItineraryItem | undefined;
  toggle: (item: Saveable) => void;
  /** Adds (or, matching an earlier save, moves) one item, e.g. a card dragged onto a day. */
  add: (item: Saveable) => void;
  /** Replaces the list with the board's or the agent's version. */
  set: (items: ItineraryItem[]) => void;
  /** Saves the whole list in this order (the board's own edits). */
  save: (items: ItineraryItem[]) => void;
};

const ItineraryContext = createContext<Itinerary | null>(null);
export const useItinerary = () => useContext(ItineraryContext);

const matches = (item: ItineraryItem, what: { subject?: string; name: string }) =>
  (!!what.subject && item.subject === what.subject) || item.name.toLowerCase() === what.name.toLowerCase();

// Boards live in the visitor's browser, one list per trip (like the journal's planner:v1), so a
// hosted copy needs no server storage.
const boardKey = (trip: string) => `planner:board:${trip}`;
const readBoard = (trip: string): ItineraryItem[] | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(boardKey(trip)) ?? "null");
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
};
const writeBoard = (trip: string, items: ItineraryItem[]) => {
  try {
    localStorage.setItem(boardKey(trip), JSON.stringify(items));
  } catch {}
};
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function ItineraryProvider({ trip, children }: { trip: string; children: ReactNode }) {
  const [items, setStored] = useState<ItineraryItem[]>([]);
  const current = useRef({ trip, items });
  current.current = { trip, items };
  // Every change is saved in the browser at once.
  const setItems = useCallback((next: ItineraryItem[] | ((list: ItineraryItem[]) => ItineraryItem[])) => {
    setStored((list) => {
      const value = typeof next === "function" ? next(list) : next;
      if (current.current.trip) writeBoard(current.current.trip, value);
      return value;
    });
  }, []);
  useEffect(() => {
    if (!trip) return;
    setStored(readBoard(trip) ?? []);
  }, [trip]);

  const find = useCallback((what: { subject?: string; name: string }) => items.find((i) => matches(i, what)), [items]);

  const toggle = useCallback(
    (item: Saveable) =>
      setItems((list) => {
        const saved = list.find((i) => matches(i, item));
        return saved ? list.filter((i) => i.id !== saved.id) : [...list, { ...item, id: newId(), addedAt: Date.now() }];
      }),
    [setItems],
  );

  const add = useCallback(
    (item: Saveable) => setItems((list) => [...list.filter((i) => !matches(i, item)), { ...item, id: newId(), addedAt: Date.now() }]),
    [setItems],
  );

  const save = useCallback((next: ItineraryItem[]) => setItems(next), [setItems]);

  const value = useMemo(() => ({ trip, items, find, toggle, add, set: setItems, save }), [trip, items, find, toggle, add, save]);
  return (
    <ItineraryContext.Provider value={value}>
      {children}
      <SaveIsland key={trip} />
    </ItineraryContext.Provider>
  );
}

/** The heart in a photo's corner: shows on hover, stays filled in red once saved. Its click
 *  never reaches the photo underneath, so the photo still opens its sheet. */
export function SaveHeart({ item, className, label = true }: { item: Saveable; className?: string; label?: boolean }) {
  const itinerary = useItinerary();
  if (!itinerary || !item.name) return null;
  const saved = !!itinerary.find(item);
  const stop = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  // A span with a button's role, so it can sit inside the cards it saves (links and buttons).
  return (
    <span
      role="button"
      tabIndex={0}
      className={`pl-heart${saved ? " is-saved" : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.name} from the itinerary` : `Add ${item.name} to the itinerary`}
      title={label ? (saved ? "In your itinerary" : "Add to itinerary") : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (e.repeat) return;
          flyToItinerary(item, e.currentTarget, saved ? "removed" : "added");
          itinerary.toggle(item);
        }
      }}
      onClick={(e) => {
        stop(e);
        flyToItinerary(item, e.currentTarget, saved ? "removed" : "added");
        itinerary.toggle(item);
      }}
    >
      <Heart aria-hidden strokeWidth={2} />
    </span>
  );
}

/** The labelled heart for a detail sheet's header: "Add to itinerary". */
export function SaveButton({ item }: { item: Saveable }) {
  const itinerary = useItinerary();
  if (!itinerary || !item.name) return null;
  const saved = !!itinerary.find(item);
  return (
    <button type="button" className={`pl-save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={(e) => {
        flyToItinerary(item, e.currentTarget, saved ? "removed" : "added");
        itinerary.toggle(item);
      }}>
      <Heart aria-hidden strokeWidth={2} />
      <span>{saved ? "In your itinerary" : "Add to itinerary"}</span>
    </button>
  );
}

/** Explore and Itinerary: the two ways to use the planner, as a segmented control at the top. */
export function PlannerTabs({ mode, onChange }: { mode: "explore" | "itinerary"; onChange: (mode: "explore" | "itinerary") => void }) {
  return (
    <div className="pl-tabs" role="tablist" aria-label="Planner" data-mode={mode}>
      <span className="pl-tabs__thumb" aria-hidden />
      <button type="button" role="tab" className="pl-tab" aria-selected={mode === "explore"} onClick={() => onChange("explore")}>
        <Compass aria-hidden strokeWidth={1.75} />
        Explore
      </button>
      <button type="button" role="tab" className="pl-tab" aria-selected={mode === "itinerary"} onClick={() => onChange("itinerary")}>
        <MapIcon aria-hidden strokeWidth={1.75} />
        Itinerary
      </button>
    </div>
  );
}

/* ---------- Saving: a fly-in and a Dynamic Island ---------- */

type Saved = { name: string; photo?: string; from: DOMRect; action: "added" | "removed" };
const SAVED = "planner:saved";

/** Announces the toggle outcome; only additions fly into the itinerary. */
export function flyToItinerary(item: Saveable, from: Element, action: Saved["action"] = "added") {
  window.dispatchEvent(new CustomEvent<Saved>(SAVED, { detail: { name: item.name, photo: item.photo, from: from.getBoundingClientRect(), action } }));
}

// A spring that overshoots a little and settles, for the flight and the island.
const spring = "linear(0, 0.13 6%, 0.5 15%, 0.86 25%, 1.03 34%, 1.07 41%, 1.04 52%, 1 64%, 0.99 78%, 1)";

/** Feedback describes the latest action. A new action supersedes any pending flight/toast. */
function SaveIsland() {
  const [island, setIsland] = useState<(Pick<Saved, "name" | "photo" | "action"> & { at: number }) | null>(null);
  useEffect(() => {
    let closing = 0;
    let arriving = 0;
    let thumb: HTMLImageElement | null = null;
    let flight: Animation | null = null;
    let sequence = 0;
    const cancel = () => {
      window.clearTimeout(closing);
      window.clearTimeout(arriving);
      flight?.cancel();
      flight = null;
      thumb?.remove();
      thumb = null;
    };
    const onSaved = (event: Event) => {
      cancel();
      setIsland(null);
      const at = ++sequence;
      const { name, photo, from, action } = (event as CustomEvent<Saved>).detail;
      const target = document.querySelector(".pl-tabs [role=tab]:last-of-type")?.getBoundingClientRect();
      const open = () => {
        setIsland({ name, photo, action, at });
        closing = window.setTimeout(() => setIsland(null), 1700);
      };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (action === "removed" || reduce || !photo || !target?.width || !target.height) return open();
      // The thumbnail: from the heart, up and over in an arc, into the tab.
      thumb = document.createElement("img");
      thumb.alt = "";
      thumb.setAttribute("aria-hidden", "true");
      thumb.width = thumb.height = 56;
      thumb.src = photo;
      thumb.className = "pl-flight";
      const size = 56;
      thumb.style.left = `${from.left + from.width / 2 - size / 2}px`;
      thumb.style.top = `${from.top + from.height / 2 - size / 2}px`;
      document.body.appendChild(thumb);
      const dx = target.left + target.width / 2 - (from.left + from.width / 2);
      const dy = target.top + target.height / 2 - (from.top + from.height / 2);
      flight = thumb.animate(
        [
          { transform: "translate(0, 0) scale(0.6)", opacity: 0 },
          { transform: `translate(${dx * 0.35}px, ${dy * 0.55 - 80}px) scale(1.05)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
        ],
        { duration: 700, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
      );
      // On a timer rather than onfinish, so a paused animation (a hidden tab) never strands the thumb.
      arriving = window.setTimeout(() => {
        flight?.cancel();
        flight = null;
        thumb?.remove();
        thumb = null;
        open();
      }, 700);
    };
    window.addEventListener(SAVED, onSaved);
    return () => {
      window.removeEventListener(SAVED, onSaved);
      cancel();
    };
  }, []);
  if (!island) return null;
  return (
    <div key={island.at} className="pl-island" role="status" style={{ ["--spring" as string]: spring }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {island.photo ? <img className="pl-island__thumb" src={island.photo} alt="" /> : <Heart className="pl-island__heart" aria-hidden />}
      <span className="pl-island__text">
        <span className="pl-island__name">{island.name}</span>
        <span className="pl-island__line">{island.action === "added" ? "Saved to itinerary" : "Removed from itinerary"}</span>
      </span>
    </div>
  );
}
