import type { Request, Response } from "express";
import z from "zod";
import { db } from "../db/connection";
import { like, eq, and, desc } from "drizzle-orm";
import { players } from "../db/schema";
import { playersService } from "../services/players.service";
import {
  playersQuerySchema,
  playersParamsSchema,
  playersCreateSchema,
  playersUpdateSchema,
} from "../types/players.schemas";
import { testResults, tests } from "../db/schema";

// Public Interface
export const playersController = {
  findAll: async (req: Request, res: Response) => {
    const parseResult = playersQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { q, gender, ageGroup } = req.query;

      let query = db.select().from(players);

      // Apply filters
      const conditions: any[] = [];

      if (q) {
        conditions.push(like(players.name, `%${q}%`));
      }

      if (gender && (gender === "male" || gender === "female")) {
        conditions.push(eq(players.gender, gender));
      }

      // Apply conditions if any exist
      if (conditions.length > 0) {
        const combinedCondition = conditions.reduce((acc, condition) =>
          acc ? and(acc, condition) : condition
        );
        query = query.where(combinedCondition) as any;
      }

      const result = await query.orderBy(desc(players.createdAt)).limit(50);

      const playersWithAge = result.map((player) => ({
        ...player,
        age: playersService.calculateAge(player.dateOfBirth),
        ageGroup: playersService.getAgeGroup(player.dateOfBirth),
      }));

      // Filter by age group after calculation if specified
      let filteredPlayers = playersWithAge;
      if (ageGroup) {
        filteredPlayers = playersWithAge.filter(
          (player) => player.ageGroup === ageGroup
        );
      }

      res.status(200).json(filteredPlayers);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  findById: async (req: Request, res: Response) => {
    const parseResult = playersParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      const player = await db
        .select()
        .from(players)
        .where(eq(players.id, id))
        .limit(1);

      if (player.length === 0) {
        return res.status(404).json({ message: "Player not found" });
      }

      const playerResults = await db
        .select({
          result: testResults,
          test: tests,
        })
        .from(testResults)
        .leftJoin(tests, eq(testResults.testId, tests.id))
        .where(eq(testResults.playerId, id))
        .orderBy(desc(testResults.createdAt));

      const resultsWithTotal = playerResults.map((row) => ({
        ...row.result,
        totalScore: playersService.calculateTotalScore(row.result),
        test: row.test,
      }));

      const playerWithAge = {
        ...player[0],
        age: playersService.calculateAge(player[0].dateOfBirth),
        ageGroup: playersService.getAgeGroup(player[0].dateOfBirth),
        testResults: resultsWithTotal,
      };

      res.status(200).json(playerWithAge);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  create: async (req: Request, res: Response) => {
    const parseResult = playersCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { name, dateOfBirth, gender } = parseResult.data;

      const result = await db
        .insert(players)
        .values({
          name,
          dateOfBirth,
          gender,
        })
        .returning();

      const newPlayer = {
        ...result[0],
        age: playersService.calculateAge(result[0].dateOfBirth),
        ageGroup: playersService.getAgeGroup(result[0].dateOfBirth),
      };

      res.status(201).json(newPlayer);
    } catch (error) {
      console.error("Error creating player:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  update: async (req: Request, res: Response) => {
    const paramsResult = playersParamsSchema.safeParse(req.params);
    const bodyResult = playersUpdateSchema.safeParse(req.body);

    if (!paramsResult.success) {
      return res.status(400).json(z.treeifyError(paramsResult.error));
    }

    if (!bodyResult.success) {
      return res.status(400).json(z.treeifyError(bodyResult.error));
    }

    try {
      const { id } = req.params;
      const updateData = bodyResult.data;

      // Check if player exists
      const existingPlayer = await db
        .select()
        .from(players)
        .where(eq(players.id, id))
        .limit(1);

      if (existingPlayer.length === 0) {
        return res.status(404).json({ message: "Player not found" });
      }

      const result = await db
        .update(players)
        .set(updateData)
        .where(eq(players.id, id))
        .returning();

      const updatedPlayer = {
        ...result[0],
        age: playersService.calculateAge(result[0].dateOfBirth),
        ageGroup: playersService.getAgeGroup(result[0].dateOfBirth),
      };

      res.status(200).json(updatedPlayer);
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  delete: async (req: Request, res: Response) => {
    const parseResult = playersParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      // Check if player exists
      const existingPlayer = await db
        .select()
        .from(players)
        .where(eq(players.id, id))
        .limit(1);

      if (existingPlayer.length === 0) {
        return res.status(404).json({ message: "Player not found" });
      }

      await db.delete(players).where(eq(players.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
