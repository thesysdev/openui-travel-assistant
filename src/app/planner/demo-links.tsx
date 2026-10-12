import { BookOpen, BedDouble, LayoutGrid } from "lucide-react";
import Link from "next/link";
import "./demo-links.css";

// The demo's other experiences, linked from the planner (the home page) so they can be found:
// the moodboard canvas, the sideways journal, and the booking chat.
const links = [
  { href: "/moodboard", label: "Moodboard", Icon: LayoutGrid },
  { href: "/journal", label: "Journal", Icon: BookOpen },
  { href: "/booking", label: "Book a stay", Icon: BedDouble },
];

export function DemoLinks() {
  return (
    <nav className="pl-demos" aria-label="More of the demo">
      {links.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="pl-demos__link" title={label}>
          <Icon aria-hidden strokeWidth={1.75} />
          {/* On phones the links show their icons alone, like the planner's tabs. */}
          <span className="pl-demos__label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
