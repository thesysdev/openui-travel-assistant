import { redirect } from "next/navigation";

// The planner is the home page. It keeps its own addresses (/planner/explore, /planner/chat,
// /planner/itinerary), so / sends visitors there.
export default function Page() {
  redirect("/planner");
}
