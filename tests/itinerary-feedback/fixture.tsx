import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ItineraryProvider, PlannerTabs, SaveHeart, SaveButton, useItinerary } from "../../src/app/planner/itinerary";

const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="coral"/></svg>')}`;
const alpha = { name: "Alpha", photo };
const beta = { name: "Beta", photo };
function Controls() {
  const itinerary = useItinerary()!;
  return <>
    <PlannerTabs mode="explore" onChange={() => {}} />
    <div style={{ position: "relative", width: 100, height: 100 }}><SaveHeart item={alpha} /></div>
    <SaveButton item={alpha} /><SaveButton item={beta} /><SaveButton item={{ name: "No photo" }} />
    <output data-testid="items">{itinerary.items.map(i => i.name).join(",")}</output>
  </>;
}
function Fixture() {
  const [mounted, setMounted] = useState(true);
  const [trip, setTrip] = useState("test-a");
  return <main className="planner-page">
    <button onClick={() => setMounted(m => !m)}>Toggle provider</button>
    <button onClick={() => setTrip(t => t === "test-a" ? "test-b" : "test-a")}>Switch trip</button>
    {mounted && <ItineraryProvider trip={trip}><Controls /></ItineraryProvider>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
