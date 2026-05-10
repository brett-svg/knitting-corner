export type WeightCategory =
  | "Lace"
  | "Fingering"
  | "Sport"
  | "DK"
  | "Worsted"
  | "Aran"
  | "Bulky";

export type Yarn = {
  id: string;
  brand: string;
  productLine: string;
  colorway: string;
  dyeLot: string;
  fiber: string;
  weight: WeightCategory;
  yardage: number;
  meters: number;
  skeinGrams: number;
  skeins: number;
  storage: string;
  swatch: string; // CSS background for the photo placeholder
  imageUrl?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  reserved?: boolean;
  notes?: string | null;
  addedAt: string;
};

export type StorageLocation = {
  id: string;
  name: string;
};

export const locations: StorageLocation[] = [
  { id: "loc1", name: "Bin A · Top shelf" },
  { id: "loc2", name: "Bin B" },
  { id: "loc3", name: "Bin C · Drawer 2" },
  { id: "loc4", name: "Display jar" },
];

export const yarns: Yarn[] = [
  {
    id: "y1",
    brand: "Malabrigo",
    productLine: "Rios",
    colorway: "Aniversario",
    dyeLot: "0823",
    fiber: "100% Superwash Merino",
    weight: "Worsted",
    yardage: 210,
    meters: 192,
    skeinGrams: 100,
    skeins: 4,
    storage: "Bin A · Top shelf",
    locationId: "loc1",
    locationName: "Bin A · Top shelf",
    swatch:
      "linear-gradient(135deg,#F472B6 0%,#C084FC 45%,#60A5FA 90%)",
    addedAt: "2026-05-02",
  },
  {
    id: "y2",
    brand: "Brooklyn Tweed",
    productLine: "Shelter",
    colorway: "Embers",
    dyeLot: "1142",
    fiber: "100% Targhee-Columbia Wool",
    weight: "Worsted",
    yardage: 140,
    meters: 128,
    skeinGrams: 50,
    skeins: 6,
    storage: "Bin B",
    locationId: "loc2",
    locationName: "Bin B",
    swatch:
      "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
    reserved: true,
    addedAt: "2026-04-28",
  },
  {
    id: "y3",
    brand: "Quince & Co.",
    productLine: "Finch",
    colorway: "Glacier",
    dyeLot: "224",
    fiber: "100% American Wool",
    weight: "Sport",
    yardage: 221,
    meters: 202,
    skeinGrams: 50,
    skeins: 5,
    storage: "Bin C · Drawer 2",
    locationId: "loc3",
    locationName: "Bin C · Drawer 2",
    swatch:
      "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
    addedAt: "2026-04-25",
  },
  {
    id: "y4",
    brand: "La Bien Aimée",
    productLine: "Merino Singles",
    colorway: "Pêche",
    dyeLot: "M042",
    fiber: "100% Merino",
    weight: "Fingering",
    yardage: 437,
    meters: 400,
    skeinGrams: 115,
    skeins: 2,
    storage: "Display jar",
    locationId: "loc4",
    locationName: "Display jar",
    swatch:
      "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#FB7185 100%)",
    addedAt: "2026-04-21",
  },
  {
    id: "y5",
    brand: "Rauma",
    productLine: "Finullgarn",
    colorway: "Mossy Heath",
    dyeLot: "L19",
    fiber: "100% Norwegian Wool",
    weight: "Fingering",
    yardage: 191,
    meters: 175,
    skeinGrams: 50,
    skeins: 8,
    storage: "Bin A",
    locationId: "loc1",
    locationName: "Bin A · Top shelf",
    swatch:
      "linear-gradient(135deg,#86EFAC 0%,#4ADE80 50%,#166534 100%)",
    addedAt: "2026-04-18",
  },
  {
    id: "y6",
    brand: "Spincycle",
    productLine: "Dyed in the Wool",
    colorway: "Salty Dog",
    dyeLot: "S77",
    fiber: "100% American Wool",
    weight: "Fingering",
    yardage: 200,
    meters: 183,
    skeinGrams: 60,
    skeins: 3,
    storage: "Bin B · Drawer 1",
    locationId: "loc2",
    locationName: "Bin B",
    swatch:
      "linear-gradient(135deg,#1E3A8A 0%,#60A5FA 50%,#5EEAD4 100%)",
    addedAt: "2026-04-15",
  },
  {
    id: "y7",
    brand: "Isager",
    productLine: "Tvinni",
    colorway: "Buttermilk",
    dyeLot: "TV3",
    fiber: "100% Merino",
    weight: "Fingering",
    yardage: 273,
    meters: 250,
    skeinGrams: 50,
    skeins: 4,
    storage: "Display jar",
    locationId: "loc4",
    locationName: "Display jar",
    swatch:
      "linear-gradient(135deg,#FEF3C7 0%,#FDE68A 60%,#F59E0B 100%)",
    addedAt: "2026-04-12",
  },
  {
    id: "y8",
    brand: "Walcot",
    productLine: "Opus",
    colorway: "Lilac Wine",
    dyeLot: "W12",
    fiber: "Merino · Yak · Silk",
    weight: "DK",
    yardage: 219,
    meters: 200,
    skeinGrams: 50,
    skeins: 5,
    storage: "Bin C",
    locationId: "loc3",
    locationName: "Bin C · Drawer 2",
    swatch:
      "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#6D28D9 100%)",
    reserved: true,
    addedAt: "2026-04-09",
  },
];

export type Project = {
  id: string;
  name: string;
  pattern: string;
  status: "Planned" | "Active" | "Paused" | "Completed";
  progress: number; // 0–1
  yarnIds: string[];
  hero: string;
  updatedAt: string;
  recipient?: string | null;
  giftDate?: string | null;
  finishedAt?: string | null;
};

export const projects: Project[] = [
  {
    id: "p1",
    name: "Featherweight Cardigan",
    pattern: "Hannah Fettig",
    status: "Active",
    progress: 0.62,
    yarnIds: ["y4", "y7"],
    hero: "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
    updatedAt: "2026-05-04",
  },
  {
    id: "p2",
    name: "Ranger Pullover",
    pattern: "Jared Flood",
    status: "Active",
    progress: 0.28,
    yarnIds: ["y2"],
    hero: "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
    updatedAt: "2026-05-01",
  },
  {
    id: "p3",
    name: "Sōzō Wrap",
    pattern: "Olga Buraya-Kefelian",
    status: "Paused",
    progress: 0.45,
    yarnIds: ["y8"],
    hero: "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
    updatedAt: "2026-04-19",
  },
];

export type Pattern = {
  id: string;
  name: string;
  designer: string | null;
  externalUrl: string | null;
  pdfPath: string | null;
  yarnWeight: WeightCategory | null;
  requiredYardage: number | null;
  needleSize: string | null;
  notes: string | null;
  cover: string;
  coverUrl?: string | null;
  gauge?: string | null;
  sizes?: string | null;
  construction?: string | null;
  techniques?: string | null;
  garmentType?: string | null;
  recommendedYarn?: string | null;
  createdAt: string;
};

export const patterns: Pattern[] = [
  {
    id: "pat1",
    name: "Featherweight Cardigan",
    designer: "Hannah Fettig",
    externalUrl: "https://example.com/featherweight",
    pdfPath: null,
    yarnWeight: "Fingering",
    requiredYardage: 1300,
    needleSize: "US 4 (3.5mm)",
    notes: "Light, drapey. Size up for ease.",
    cover: "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
    createdAt: "2026-04-01",
  },
  {
    id: "pat2",
    name: "Ranger Pullover",
    designer: "Jared Flood",
    externalUrl: null,
    pdfPath: null,
    yarnWeight: "Worsted",
    requiredYardage: 900,
    needleSize: "US 7 (4.5mm)",
    notes: "Steeked colorwork yoke.",
    cover: "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
    createdAt: "2026-03-22",
  },
  {
    id: "pat3",
    name: "Sōzō Wrap",
    designer: "Olga Buraya-Kefelian",
    externalUrl: null,
    pdfPath: null,
    yarnWeight: "DK",
    requiredYardage: 800,
    needleSize: "US 6 (4.0mm)",
    notes: "Modular construction.",
    cover: "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
    createdAt: "2026-03-18",
  },
];

export type Needle = {
  id: string;
  sizeUs: string | null;
  sizeMm: number | null;
  type: "circular" | "dpn" | "interchangeable" | "straight" | null;
  lengthCm: number | null;
  material: string | null;
  quantity: number;
};

export type Hook = {
  id: string;
  sizeUs: string | null;
  sizeMm: number | null;
  material: string | null;
  quantity: number;
};

export type Notion = {
  id: string;
  name: string;
  quantity: number;
};

export const needles: Needle[] = [
  { id: "n1", sizeUs: "US 4", sizeMm: 3.5, type: "circular", lengthCm: 80, material: "Nickel", quantity: 1 },
  { id: "n2", sizeUs: "US 6", sizeMm: 4.0, type: "circular", lengthCm: 80, material: "Wood", quantity: 2 },
  { id: "n3", sizeUs: "US 7", sizeMm: 4.5, type: "interchangeable", lengthCm: null, material: "Nickel", quantity: 1 },
  { id: "n4", sizeUs: "US 1", sizeMm: 2.25, type: "dpn", lengthCm: 15, material: "Bamboo", quantity: 5 },
];

export const hooks: Hook[] = [
  { id: "h1", sizeUs: "G/6", sizeMm: 4.0, material: "Aluminum", quantity: 1 },
  { id: "h2", sizeUs: "H/8", sizeMm: 5.0, material: "Bamboo", quantity: 1 },
];

export const notions: Notion[] = [
  { id: "no1", name: "Stitch markers", quantity: 30 },
  { id: "no2", name: "Cable needle", quantity: 2 },
  { id: "no3", name: "Tapestry needles", quantity: 6 },
  { id: "no4", name: "Scissors (Fiskars)", quantity: 1 },
];

export const stats = {
  skeins: yarns.reduce((n, y) => n + y.skeins, 0),
  yardage: yarns.reduce((n, y) => n + y.yardage * y.skeins, 0),
  brands: new Set(yarns.map((y) => y.brand)).size,
  projects: projects.filter((p) => p.status === "Active").length,
};
