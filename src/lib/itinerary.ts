// The planner's itinerary items. They live in the visitor's browser (planner/itinerary.tsx keeps
// one list per trip in localStorage); the board agent receives the current list with each request
// and returns the new one, so nothing is stored on the server.

export type ItineraryItem = {
  id: string;
  /** Wikipedia title the photo came from, when it was a place or a dish. */
  subject?: string;
  name: string;
  photo?: string;
  /** Where it is, e.g. "Alfama, Lisbon". */
  place?: string;
  description?: string;
  /** A booking link (trivago) and its price a night, for stays. */
  url?: string;
  price?: string;
  /** For stays, what trivago said about it, so the hotel sheet can open from the board. */
  rating?: string;
  reviews?: string;
  stars?: number;
  amenities?: string;
  site?: string;
  total?: string;
  kind?: "place" | "stay" | "food";
  /** The plan's day this sits in, e.g. "Day 1 · Fri 6 Nov"; absent until the plan is made. */
  day?: string;
  /** A short handwritten note on the board. */
  note?: string;
  /** When in the day, e.g. "Morning". */
  time?: string;
  /** A stay the planner recommends: starred on the board, with a note saying why. */
  recommended?: boolean;
  /** Hand-drawn stickers on the card: a doodle name (see planner/doodles.tsx) and where it sits. */
  stickers?: { doodle: string; at?: string }[];
  addedAt: number;
};

/** A trip id from the address, or null if it isn't one. */
export const tripKey = (trip: string | null) => (trip && /^[\w-]{1,80}$/.test(trip) ? trip : null);
