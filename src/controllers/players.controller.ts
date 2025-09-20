import type { Request, Response } from "express";
import z from "zod";
import { db } from "../db/connection";
import { like, eq, and, desc } from "drizzle-orm";
import { players } from "../db/schema";
import { playersService } from "../services/players.service";
import { playersQuerySchema } from "../types/players.schemas";

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
};
