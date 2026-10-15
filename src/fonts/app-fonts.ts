import localFont from "next/font/local";

// The app's two faces, loaded once: the Timeless type family. Its license (timeless/LICENSE.pdf)
// allows embedding the fonts in an app but not redistributing the files, so they are
// git-ignored and next/font serves them only as part of the pages that use them.
//
// Apply both `.variable` class names to a wrapper, then use:
//   --font-display  Timeless Serif (variable weight 200-700, real italic 300-700)
//   --font-ui       Timeless Sans (variable weight)

export const displaySerif = localFont({
  src: [
    { path: "./timeless/TimelessSerifVF.woff2", weight: "200 700", style: "normal" },
    { path: "./timeless/TimelessSerifItalicVF.woff2", weight: "300 700", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const uiSans = localFont({
  src: [{ path: "./timeless/TimelessSansVF.woff2", weight: "300 800", style: "normal" }],
  variable: "--font-ui",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
