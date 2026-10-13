"use client";

import { X } from "lucide-react";
import { type DragEvent, useEffect, useState } from "react";
import { type Saveable, SaveHeart } from "./itinerary";
import "./ask-panel.css";
import { withBase } from "../../lib/base-path";

// The Explore agent's answer on the Itinerary board: a frosted panel on the right with a short
// answer and the places it suggests as small prints. Drag a print onto a day (or Favourites) to
// put it on the board; its heart saves it to Favourites.

export type AskPlace = { name: string; subject: string; note?: string; kind?: "place" | "food" | "stay" };
export type AskAnswer = { question: string; answer?: string; places?: AskPlace[]; error?: string };

/** The answer and its places from the route's JSON, whole or (while it streams) partial. While it
 *  streams, the last place may still be half-written, so only the ones before it show (a card
 *  looks up its photo by subject, which must be whole). At most six, best first. */
export function readAsk(value: unknown, streaming: boolean): Omit<AskAnswer, "question"> {
  const reply = (value && typeof value === "object" ? value : {}) as { answer?: unknown; places?: unknown };
  const all = Array.isArray(reply.places) ? reply.places : [];
  const places = (streaming ? all.slice(0, -1) : all)
    .filter((p): p is AskPlace => !!p && typeof p.name === "string" && !!p.name && typeof p.subject === "string" && !!p.subject)
    .slice(0, 6);
  return { answer: typeof reply.answer === "string" ? reply.answer : "", places };
}

/** The drag payload type the board listens for. */
export const dragType = "application/x-planner-item";

const photos = new Map<string, Promise<string | undefined>>();
function photoOf(subject: string) {
  if (!photos.has(subject))
    photos.set(
      subject,
      fetch(withBase(`/api/moodboard/images?kind=named&q=${encodeURIComponent(subject)}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((body: { url?: string } | null) => body?.url)
        .catch(() => undefined),
    );
  return photos.get(subject)!;
}

function usePhotoUrl(subject: string) {
  const [url, setUrl] = useState<string | undefined | null>(undefined);
  useEffect(() => {
    let gone = false;
    photoOf(subject).then((u) => !gone && setUrl(u ?? null));
    return () => {
      gone = true;
    };
  }, [subject]);
  return url;
}

/** One suggested place as a print you can drag. */
export function AskCard({ place }: { place: AskPlace }) {
  const url = usePhotoUrl(place.subject);
  const item: Saveable = { subject: place.subject, name: place.name, photo: url ?? undefined, description: place.note, kind: place.kind ?? "place" };
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(dragType, JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };
  return (
    <figure className="pl-ask__card" draggable onDragStart={onDragStart} title="Drag onto a day">
      <span className={`pl-ask__print${url === undefined ? " is-loading" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" draggable={false} /> : null}
        {url ? <SaveHeart item={item} /> : null}
      </span>
      <figcaption>
        <span className="pl-ask__name">{place.name}</span>
        {place.note ? <span className="pl-ask__note">{place.note}</span> : null}
      </figcaption>
    </figure>
  );
}

/** The panel. `busy` while the answer is on its way. */
export function AskPanel({ ask, busy, onClose, inline }: { ask: AskAnswer; busy?: boolean; onClose?: () => void; inline?: boolean }) {
  return (
    <aside className={`pl-ask${inline ? " pl-ask--inline" : ""}`} aria-label="Explore's answer" aria-busy={busy}>
      <header className="pl-ask__head">
        <p className="pl-ask__question">{ask.question}</p>
        {onClose ? (
          <button type="button" className="pl-ask__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      {busy && !ask.answer ? (
        <div className="pl-ask__waiting" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      ) : ask.error ? (
        <p className="pl-ask__answer">{ask.error}</p>
      ) : (
        <>
          <p className="pl-ask__answer">{ask.answer}</p>
          {ask.places?.length ? (
            <>
              <div className="pl-ask__cards">
                {ask.places.map((p) => (
                  <AskCard key={p.subject} place={p} />
                ))}
              </div>
              {busy ? null : <p className="pl-ask__hint">Drag a print onto a day, or tap its heart to keep it in Favourites.</p>}
            </>
          ) : null}
        </>
      )}
    </aside>
  );
}
