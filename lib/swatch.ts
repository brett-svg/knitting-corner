// Pick a CSS gradient that visually approximates a yarn's colorway,
// based on keyword matching of the colorway name. Falls back to a
// deterministic palette pick when no keywords match.

const COLOR_RULES: Array<[RegExp, string]> = [
  // Greens
  [
    /\b(sage|moss|olive|forest|emerald|grass|mint|jade|kelly|fern|pine|leaf|chartreuse)\b/,
    "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 35%,#166534 100%)",
  ],
  // Teal / aqua
  [
    /\b(teal|aqua|turquoise|seafoam|cyan|peacock)\b/,
    "linear-gradient(135deg,#A7F3D0 0%,#2DD4BF 50%,#0F766E 100%)",
  ],
  // Pinks / roses
  [
    /\b(pink|rose|blush|fuchsia|magenta|raspberry|bubblegum|cotton.?candy)\b/,
    "linear-gradient(135deg,#FFE4E6 0%,#F472B6 55%,#9F1239 100%)",
  ],
  // Silver / grey
  [
    /\b(silver|grey|gray|charcoal|slate|smoke|stone|pewter|graphite)\b/,
    "linear-gradient(135deg,#F3F4F6 0%,#9CA3AF 50%,#374151 100%)",
  ],
  // Browns / wood / earth
  [
    /\b(cedar|wood|brown|tan|caramel|chestnut|nutmeg|cinnamon|coffee|chocolate|mocha|toffee|hazelnut|walnut|umber|sepia|sienna|rust)\b/,
    "linear-gradient(135deg,#FDE68A 0%,#B45309 50%,#451A03 100%)",
  ],
  // Cream / natural / undyed
  [
    /\b(cream|ivory|vanilla|natural|ecru|oatmeal|linen|bone|alabaster|undyed|wool)\b/,
    "linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 50%,#D6BB7E 100%)",
  ],
  // Yellow / gold
  [
    /\b(yellow|gold|honey|mustard|amber|sun(?:flower|shine|set)?|saffron|lemon|butter)\b/,
    "linear-gradient(135deg,#FEF9C3 0%,#FACC15 55%,#A16207 100%)",
  ],
  // Blues
  [
    /\b(blue|navy|ocean|sky|cobalt|denim|sapphire|indigo|cornflower|periwinkle|azure|cerulean)\b/,
    "linear-gradient(135deg,#DBEAFE 0%,#60A5FA 50%,#1E3A8A 100%)",
  ],
  // Purples
  [
    /\b(purple|violet|lilac|lavender|plum|grape|orchid|aubergine|amethyst|mauve|wisteria)\b/,
    "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#6D28D9 100%)",
  ],
  // Reds
  [
    /\b(red|crimson|scarlet|cherry|burgundy|wine|merlot|brick|cardinal|ruby|garnet)\b/,
    "linear-gradient(135deg,#FECACA 0%,#EF4444 55%,#7F1D1D 100%)",
  ],
  // Oranges / peach / coral
  [
    /\b(orange|peach|apricot|terracotta|coral|salmon|tangerine|mango|persimmon|papaya|pumpkin)\b/,
    "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#EA580C 100%)",
  ],
  // Black
  [
    /\b(black|noir|midnight|onyx|raven|ink|jet)\b/,
    "linear-gradient(135deg,#4B5563 0%,#1F2937 55%,#000000 100%)",
  ],
  // White
  [
    /\b(white|snow|cloud|cotton|frost|pearl)\b/,
    "linear-gradient(135deg,#FFFFFF 0%,#F3F4F6 50%,#D1D5DB 100%)",
  ],
  // Variegated / multi
  [
    /\b(rainbow|multi|colorful|variegated|kaleidoscope|prism|tropical)\b/,
    "linear-gradient(135deg,#FF7AD9 0%,#C084FC 50%,#60A5FA 100%)",
  ],
];

const FALLBACK_PALETTE = [
  "linear-gradient(135deg,#F472B6 0%,#C084FC 45%,#60A5FA 90%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#FB7185 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#6D28D9 100%)",
];

// Build a subtle 3-stop gradient from a single hex color so the swatch
// has yarn-like depth without misrepresenting the actual color.
export function gradientFromHex(hex: string): string {
  const clean = normalizeHex(hex);
  if (!clean) return "";
  return `linear-gradient(135deg, ${shade(clean, 0.16)} 0%, ${clean} 50%, ${shade(clean, -0.2)} 100%)`;
}

function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

function shade(hex: string, ratio: number): string {
  // ratio in (-1, 1). Positive moves toward white, negative toward black.
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const t = ratio > 0 ? 255 : 0;
  const p = Math.abs(ratio);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function pickSwatch(colorway: string | null | undefined): string {
  const c = (colorway ?? "").toLowerCase();
  for (const [re, grad] of COLOR_RULES) {
    if (re.test(c)) return grad;
  }
  // Deterministic fallback so the same colorway always gets the same gradient
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
}
