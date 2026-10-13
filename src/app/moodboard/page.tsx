import type { Metadata } from "next";
import { BackHome } from "../../components/back-home";
import MoodboardCanvas from "./canvas";

export const metadata: Metadata = {
  title: "Moodboard",
  description: "Prompt an agent and watch it compose a moodboard of OpenUI pieces on a canvas.",
};

export default function Page() {
  return (
    <>
      <BackHome />
      <MoodboardCanvas />
    </>
  );
}
