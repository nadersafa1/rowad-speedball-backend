import {
  pgTable,
  uuid,
  varchar,
  date,
  timestamp,
  integer,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const testTypeEnum = pgEnum("test_type", ["60_30", "30_30", "30_60"]);

// Players table
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: genderEnum("gender").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tests table
export const tests = pgTable("tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  testType: testTypeEnum("test_type").notNull(),
  dateConducted: date("date_conducted").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Test Results table
export const testResults = pgTable("test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull(),
  testId: uuid("test_id")
    .references(() => tests.id, { onDelete: "cascade" })
    .notNull(),
  leftHandScore: integer("left_hand_score").notNull(),
  rightHandScore: integer("right_hand_score").notNull(),
  forehandScore: integer("forehand_score").notNull(),
  backhandScore: integer("backhand_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertPlayerSchema = createInsertSchema(players, {
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  dateOfBirth: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  gender: z.enum(["male", "female"], { message: "Gender is required" }),
});

export const selectPlayerSchema = createSelectSchema(players);

export const insertTestSchema = createInsertSchema(tests, {
  name: z
    .string()
    .min(1, "Test name is required")
    .max(255, "Test name is too long"),
  testType: z.enum(["60_30", "30_30", "30_60"], {
    message: "Test type is required",
  }),
  dateConducted: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  description: z.string().optional(),
});

export const selectTestSchema = createSelectSchema(tests);

export const insertTestResultSchema = createInsertSchema(testResults, {
  playerId: z.uuid("Invalid player ID"),
  testId: z.uuid("Invalid test ID"),
  leftHandScore: z.number().int().min(0, "Score must be non-negative"),
  rightHandScore: z.number().int().min(0, "Score must be non-negative"),
  forehandScore: z.number().int().min(0, "Score must be non-negative"),
  backhandScore: z.number().int().min(0, "Score must be non-negative"),
});

export const selectTestResultSchema = createSelectSchema(testResults);

// Types
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Test = typeof tests.$inferSelect;
export type NewTest = typeof tests.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;

// Computed field helpers
export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const getAgeGroup = (dateOfBirth: string): string => {
  const age = calculateAge(dateOfBirth);

  if (age < 7) return "Mini";
  if (age < 9) return "U-09";
  if (age < 11) return "U-11";
  if (age < 13) return "U-13";
  if (age < 15) return "U-15";
  if (age < 17) return "U-17";
  if (age < 19) return "U-19";
  if (age < 21) return "U-21";
  return "Seniors";
};

export const calculateTotalScore = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
): number => {
  return (
    result.leftHandScore +
    result.rightHandScore +
    result.forehandScore +
    result.backhandScore
  );
};
