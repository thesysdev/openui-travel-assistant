// Landmark icons in the clean style chosen in the place icons thread: plain geometric SVG on a
// 100-unit grid, even black strokes, and one signature detail per place filled in its colour.
// Every shape is built straight from its coordinates: straight runs are lines, curves are real
// arc (A) or quadratic commands. Static, so every render draws the same icon.

type Pt = [number, number];

const n = (v: number) => +v.toFixed(2);

// Each helper returns SVG path data.
const line = (x1: number, y1: number, x2: number, y2: number) => `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}`;
const closed = (pts: Pt[]) => `${poly(pts)}Z`;

/** Elliptical arc from angle a0 to a1 (radians, increasing angle runs clockwise on screen). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) {
  const [x0, y0] = [cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)];
  const [x1, y1] = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)];
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${n(x0)} ${n(y0)}A${n(rx)} ${n(ry)} 0 ${large} 1 ${n(x1)} ${n(y1)}`;
}

const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 1 ${n(cx + r)} ${n(cy)}A${r} ${r} 0 1 1 ${n(cx - r)} ${n(cy)}Z`;

/** Water: a sine wave of half-period quadratic curves, starting upward. */
function wave(x1: number, x2: number, y: number, amp = 2.2, per = 10) {
  let d = `M${n(x1)} ${n(y)}`;
  for (let x = x1, up = true; x < x2 - 0.01; x += per / 2, up = !up) {
    const end = Math.min(x + per / 2, x2);
    d += `Q${n((x + end) / 2)} ${n(y + (up ? -2 : 2) * amp)} ${n(end)} ${n(y)}`;
  }
  return d;
}

const U = Math.PI; // arcs from U to 2U run over the top

const rect = (x1: number, y1: number, x2: number, y2: number) =>
  closed([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);

/** An arched opening: legs from base up to top, then a half circle over them. Add "Z" to fill it. */
const arch = (cx: number, w: number, top: number, base: number) =>
  `M${n(cx - w)} ${n(base)}L${n(cx - w)} ${n(top)}A${n(w)} ${n(w)} 0 0 1 ${n(cx + w)} ${n(top)}L${n(cx + w)} ${n(base)}`;

/** A leaf from (x1, y1) to its tip (x2, y2), bowed b units to the left of that direction. */
function leaf(x1: number, y1: number, x2: number, y2: number, b: number) {
  const [mx, my, len] = [(x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1)];
  const [px, py] = [((y2 - y1) / len) * b, (-(x2 - x1) / len) * b];
  return `M${n(x1)} ${n(y1)}Q${n(mx + px)} ${n(my + py)} ${n(x2)} ${n(y2)}Q${n(mx + px * 0.2)} ${n(my + py * 0.2)} ${n(x1)} ${n(y1)}Z`;
}

type Place = {
  name: string;
  /** The place's one colour, used for every fill in its icon. */
  color: string;
  fills: string[];
  strokes: string[];
};

const pine = (cx: number, top: number, trunk: number, w: number): Pt[] => {
  const h = trunk - top;
  return [
    [cx, top], [cx + w * 0.55, top + h * 0.45], [cx + w * 0.3, top + h * 0.45], [cx + w, trunk],
    [cx - w, trunk], [cx - w * 0.3, top + h * 0.45], [cx - w * 0.55, top + h * 0.45],
  ];
};
const pines = [pine(50, 14, 76, 18), pine(24, 36, 78, 12), pine(76, 32, 78, 13)];
const islandFronds = [leaf(60, 36, 78, 40, 5), leaf(60, 36, 42, 32, -5), leaf(60, 36, 70, 22, 5), leaf(60, 36, 46, 46, -4)];
const lake = "M10 60L90 60L90 76Q50 90 10 76Z";
const hillFront = "M10 76Q40 52 70 72Q80 66 90 70";
const field = closed([[46, 86], [52, 64], [90, 58], [90, 86]]);
const villageRoofs = [closed([[12, 64], [24, 52], [36, 64]]), closed([[40, 46], [50, 22], [60, 46]]), closed([[62, 64], [75, 52], [88, 64]])];
const range = closed([[10, 86], [34, 40], [48, 58], [64, 30], [90, 86]]);
const snowZig: Pt[] = [[36.6, 42], [42, 49], [47, 42], [53, 49], [58, 43], [63.4, 42]];
const snowCap = closed([[50, 18], [63.4, 42], [58, 43], [53, 49], [47, 42], [42, 49], [36.6, 42]]);

/** Generic scenes for places without a landmark of their own, drawn to the same rules as `places`. */
export const landscapes: Place[] = [
  {
    name: "Beach",
    color: "#FFB020", // saffron sun
    fills: [circle(70, 36, 9)],
    strokes: [
      circle(70, 36, 9),
      wave(10, 90, 66),
      arc(34, 52, 18, 12, U, 2 * U),
      line(16, 52, 52, 52),
      line(34, 52, 34, 86),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Island",
    color: "#14B8A6", // teal island
    fills: [`${arc(50, 80, 26, 12, U, 2 * U)}Z`],
    strokes: [arc(50, 80, 26, 12, U, 2 * U), "M50 70Q52 50 60 36", ...islandFronds, wave(10, 90, 80), wave(18, 82, 88)],
  },
  {
    name: "Lake",
    color: "#5BC0FF", // sky water
    fills: [lake],
    strokes: [poly([[10, 60], [34, 34], [50, 50], [64, 38], [90, 60]]), lake, line(30, 68, 46, 68), line(54, 74, 70, 74)],
  },
  {
    name: "Forest",
    color: "#22A65A", // leaf pines
    fills: pines.map(closed),
    strokes: [
      ...pines.map(closed),
      line(50, 76, 50, 86),
      line(24, 78, 24, 86),
      line(76, 78, 76, 86),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Waterfall",
    color: "#2F5BFF", // cobalt falling water
    fills: [rect(40, 28, 58, 72)],
    strokes: [
      poly([[10, 44], [22, 28], [40, 28]]),
      poly([[58, 28], [72, 24], [90, 38]]),
      rect(40, 28, 58, 72),
      line(46, 34, 46, 66),
      line(52, 38, 52, 70),
      wave(14, 86, 78),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Hills",
    color: "#22A65A", // leaf front hill
    fills: [`M10 86L${hillFront.slice(1)}L90 86Z`],
    strokes: ["M10 62Q34 36 58 58Q74 46 90 56", hillFront, line(10, 86, 90, 86)],
  },
  {
    name: "Countryside",
    color: "#FFB020", // saffron wheat field
    fills: [field],
    strokes: [
      field,
      line(60, 86, 62, 62.7),
      line(72, 86, 72, 61),
      line(84, 86, 82, 59.3),
      poly([[16, 86], [16, 62], [40, 62], [40, 86]]),
      poly([[12, 64], [28, 48], [44, 64]]),
      poly([[24, 86], [24, 72], [32, 72], [32, 86]]),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Village",
    color: "#FF8FB1", // pink roofs
    fills: villageRoofs,
    strokes: [
      ...villageRoofs,
      poly([[16, 86], [16, 64], [32, 64], [32, 86]]),
      poly([[42, 86], [42, 46], [58, 46], [58, 86]]),
      arch(50, 4, 76, 86),
      poly([[66, 86], [66, 64], [84, 64], [84, 86]]),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "City",
    color: "#2F5BFF", // cobalt tower
    fills: [rect(40, 22, 54, 86)],
    strokes: [
      rect(12, 56, 26, 86),
      rect(26, 40, 40, 86),
      rect(40, 22, 54, 86),
      line(47, 22, 47, 12),
      rect(54, 48, 68, 86),
      rect(68, 34, 82, 86),
      ...[44, 52, 60].map((y) => line(72, y, 78, y)),
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Desert",
    color: "#FF5364", // coral sun
    fills: [circle(68, 30, 10)],
    strokes: [
      circle(68, 30, 10),
      "M10 70Q34 54 58 68Q74 60 90 66",
      arch(37, 5, 46, 86),
      "M32 72L24 72Q20 72 20 68L20 56A3 3 0 0 1 26 56L26 66L32 66",
      "M42 64L50 64Q54 64 54 60L54 50A3 3 0 0 0 48 50L48 58L42 58",
      line(10, 86, 90, 86),
    ],
  },
  {
    name: "Mountains",
    color: "#14B8A6", // teal range
    fills: [range],
    strokes: [range, line(48, 58, 56, 86)],
  },
  {
    name: "Snow peak",
    color: "#2F5BFF", // cobalt slopes below the snow
    fills: [closed([[12, 86], [50, 18], [88, 86]]) + snowCap],
    strokes: [poly([[12, 86], [50, 18], [88, 86]]), poly(snowZig), line(10, 86, 90, 86)],
  },
];
