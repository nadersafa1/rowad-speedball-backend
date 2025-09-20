import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { players, tests } from ".";

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

export type TestResult = typeof testResults.$inferSelect;

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
