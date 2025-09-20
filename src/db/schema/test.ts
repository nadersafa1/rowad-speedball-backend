import {
  pgTable,
  varchar,
  date,
  timestamp,
  uuid,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const tests = pgTable("tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  playingTime: integer("playing_time").notNull(),
  recoveryTime: integer("recovery_time").notNull(),
  dateConducted: date("date_conducted").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Test = typeof tests.$inferSelect;
