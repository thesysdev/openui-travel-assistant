import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import "./back-home.css";

/** Top-left way back to the planner (the home page), for the demo's other experiences. */
export function BackHome() {
  return (
    <Link href="/" className="back-home" aria-label="Back to the planner" title="Back to the planner">
      <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
    </Link>
  );
}
