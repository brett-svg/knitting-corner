// Drizzle schema for Railway Postgres. Column names match the original
// Supabase schema so the data layer barely changed — the exceptions are
// the file columns, which now hold S3 object keys instead of public URLs.

import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const storageLocations = pgTable("storage_locations", {
  id: id(),
  userId: userId(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const yarns = pgTable("yarns", {
  id: id(),
  userId: userId(),
  brand: text("brand"),
  productLine: text("product_line"),
  fiber: text("fiber"),
  weightCategory: text("weight_category"),
  yardage: integer("yardage"),
  meters: integer("meters"),
  skeinWeightGrams: integer("skein_weight_grams"),
  colorway: text("colorway"),
  dyeLot: text("dye_lot"),
  needleSize: text("needle_size"),
  skeins: integer("skeins").notNull().default(1),
  storageLocationId: uuid("storage_location_id").references(() => storageLocations.id, {
    onDelete: "set null",
  }),
  swatch: text("swatch"),
  imageKey: text("image_key"), // S3 object key
  reserved: boolean("reserved").notNull().default(false),
  notes: text("notes"),
  ravelryYarnId: integer("ravelry_yarn_id"),
  createdAt: createdAt(),
});

export const needles = pgTable("needles", {
  id: id(),
  userId: userId(),
  sizeUs: text("size_us"),
  sizeMm: numeric("size_mm"),
  type: text("type"), // circular | dpn | interchangeable | straight
  lengthCm: integer("length_cm"),
  material: text("material"),
  quantity: integer("quantity").notNull().default(1),
  storageLocationId: uuid("storage_location_id").references(() => storageLocations.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
});

export const hooks = pgTable("hooks", {
  id: id(),
  userId: userId(),
  sizeUs: text("size_us"),
  sizeMm: numeric("size_mm"),
  material: text("material"),
  quantity: integer("quantity").notNull().default(1),
  storageLocationId: uuid("storage_location_id").references(() => storageLocations.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
});

export const notions = pgTable("notions", {
  id: id(),
  userId: userId(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  storageLocationId: uuid("storage_location_id").references(() => storageLocations.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
});

export const patterns = pgTable("patterns", {
  id: id(),
  userId: userId(),
  name: text("name").notNull(),
  designer: text("designer"),
  externalUrl: text("external_url"),
  pdfKey: text("pdf_key"), // S3 object key
  coverKey: text("cover_key"), // S3 object key
  yarnWeight: text("yarn_weight"),
  requiredYardage: integer("required_yardage"),
  needleSize: text("needle_size"),
  notes: text("notes"),
  gauge: text("gauge"),
  sizes: text("sizes"),
  construction: text("construction"),
  techniques: text("techniques"),
  garmentType: text("garment_type"),
  recommendedYarn: text("recommended_yarn"),
  createdAt: createdAt(),
});

export const projects = pgTable("projects", {
  id: id(),
  userId: userId(),
  name: text("name").notNull(),
  patternId: uuid("pattern_id").references(() => patterns.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Planned"), // Planned | Active | Paused | Completed
  progress: numeric("progress").notNull().default("0"), // 0..1
  notes: text("notes"),
  hero: text("hero"),
  imageKey: text("image_key"),
  recipient: text("recipient"),
  giftDate: date("gift_date"),
  finishedAt: date("finished_at"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectYarns = pgTable(
  "project_yarns",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    yarnId: uuid("yarn_id")
      .notNull()
      .references(() => yarns.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.yarnId] })]
);

export const projectTools = pgTable(
  "project_tools",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    needleId: uuid("needle_id")
      .notNull()
      .references(() => needles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.needleId] })]
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
  },
  (t) => [unique().on(t.userId, t.name)]
);
