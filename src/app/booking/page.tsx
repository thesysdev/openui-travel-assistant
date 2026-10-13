import type { Metadata } from "next";
import BookingChat from "../../components/booking-chat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a stay",
  description: "Describe a stay in your own words and pick from live trivago prices and photos.",
};

export default function Page() {
  return <BookingChat />;
}
