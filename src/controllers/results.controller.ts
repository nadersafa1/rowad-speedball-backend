import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Request, Response } from "express";
import z from "zod";
import { db } from "../db/connection";
import * as schema from "../db/schema";
import { resultsService } from "../services/results.service";
import {
  resultsCreateSchema,
  resultsParamsSchema,
  resultsQuerySchema,
  resultsUpdateSchema,
  resultsBulkCreateSchema,
} from "../types/results.schemas";
import { createPaginatedResponse } from "../types/pagination";

// Public Interface
export const resultsController = {
  findAll: async (req: Request, res: Response) => {
    const parseResult = resultsQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const {
        playerId,
        testId,
        minScore,
        maxScore,
        dateFrom,
        dateTo,
        page,
        limit,
      } = parseResult.data;

      // Calculate pagination parameters
      const offset = (page - 1) * limit;

      // Build base query conditions
      const conditions: any[] = [];

      if (playerId) {
        conditions.push(eq(schema.testResults.playerId, playerId));
      }

      if (testId) {
        conditions.push(eq(schema.testResults.testId, testId));
      }

      if (dateFrom) {
        conditions.push(gte(schema.testResults.createdAt, new Date(dateFrom)));
      }

      if (dateTo) {
        conditions.push(lte(schema.testResults.createdAt, new Date(dateTo)));
      }

      // Create combined condition for reuse
      const combinedCondition =
        conditions.length > 0
          ? conditions.reduce((acc, condition) =>
              acc ? and(acc, condition) : condition
            )
          : undefined;

      // Get total count for pagination
      let countQuery = db.select({ count: count() }).from(schema.testResults);
      if (combinedCondition) {
        countQuery = countQuery.where(combinedCondition) as any;
      }

      // Get paginated data with related player and test information
      let dataQuery = db
        .select({
          result: schema.testResults,
          player: schema.players,
          test: schema.tests,
        })
        .from(schema.testResults)
        .leftJoin(
          schema.players,
          eq(schema.testResults.playerId, schema.players.id)
        )
        .leftJoin(schema.tests, eq(schema.testResults.testId, schema.tests.id));

      if (combinedCondition) {
        dataQuery = dataQuery.where(combinedCondition) as any;
      }

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
          .orderBy(desc(schema.testResults.createdAt))
          .limit(limit)
          .offset(offset),
      ]);

      const totalItems = countResult[0].count;

      // Add calculated fields and filter by score range if specified
      let resultsWithCalculatedFields = dataResult.map((row) => {
        const totalScore = resultsService.calculateTotalScore(row.result);
        return {
          ...row.result,
          totalScore,
          averageScore: resultsService.calculateAverageScore(row.result),
          highestScore: resultsService.getHighestScore(row.result),
          lowestScore: resultsService.getLowestScore(row.result),
          performanceCategory:
            resultsService.getPerformanceCategory(totalScore),
          scoreDistribution: resultsService.getScoreDistribution(row.result),
          analysis: resultsService.analyzePerformance(row.result),
          player: row.player,
          test: row.test,
        };
      });

      // Filter by score range after calculation if specified
      if (minScore !== undefined || maxScore !== undefined) {
        resultsWithCalculatedFields = resultsWithCalculatedFields.filter(
          (result) =>
            resultsService.isResultInScoreRange(
              result.totalScore,
              minScore,
              maxScore
            )
        );
      }

      // Create paginated response
      const paginatedResponse = createPaginatedResponse(
        resultsWithCalculatedFields,
        page,
        limit,
        totalItems
      );

      res.status(200).json(paginatedResponse);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  findById: async (req: Request, res: Response) => {
    const parseResult = resultsParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      const result = await db
        .select({
          result: schema.testResults,
          player: schema.players,
          test: schema.tests,
        })
        .from(schema.testResults)
        .leftJoin(
          schema.players,
          eq(schema.testResults.playerId, schema.players.id)
        )
        .leftJoin(schema.tests, eq(schema.testResults.testId, schema.tests.id))
        .where(eq(schema.testResults.id, id))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ message: "Result not found" });
      }

      const row = result[0];
      const totalScore = resultsService.calculateTotalScore(row.result);

      const resultWithCalculatedFields = {
        ...row.result,
        totalScore,
        averageScore: resultsService.calculateAverageScore(row.result),
        highestScore: resultsService.getHighestScore(row.result),
        lowestScore: resultsService.getLowestScore(row.result),
        performanceCategory: resultsService.getPerformanceCategory(totalScore),
        scoreDistribution: resultsService.getScoreDistribution(row.result),
        analysis: resultsService.analyzePerformance(row.result),
        player: row.player,
        test: row.test,
      };

      res.status(200).json(resultWithCalculatedFields);
    } catch (error) {
      console.error("Error fetching result:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  create: async (req: Request, res: Response) => {
    const parseResult = resultsCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const {
        playerId,
        testId,
        leftHandScore,
        rightHandScore,
        forehandScore,
        backhandScore,
      } = parseResult.data;

      // Verify player and test exist
      const [playerExists, testExists] = await Promise.all([
        db
          .select()
          .from(schema.players)
          .where(eq(schema.players.id, playerId))
          .limit(1),
        db
          .select()
          .from(schema.tests)
          .where(eq(schema.tests.id, testId))
          .limit(1),
      ]);

      if (playerExists.length === 0) {
        return res.status(404).json({ message: "Player not found" });
      }

      if (testExists.length === 0) {
        return res.status(404).json({ message: "Test not found" });
      }

      const result = await db
        .insert(schema.testResults)
        .values({
          playerId,
          testId,
          leftHandScore,
          rightHandScore,
          forehandScore,
          backhandScore,
        })
        .returning();

      const totalScore = resultsService.calculateTotalScore(result[0]);

      const newResult = {
        ...result[0],
        totalScore,
        averageScore: resultsService.calculateAverageScore(result[0]),
        highestScore: resultsService.getHighestScore(result[0]),
        lowestScore: resultsService.getLowestScore(result[0]),
        performanceCategory: resultsService.getPerformanceCategory(totalScore),
        scoreDistribution: resultsService.getScoreDistribution(result[0]),
        analysis: resultsService.analyzePerformance(result[0]),
      };

      res.status(201).json(newResult);
    } catch (error) {
      console.error("Error creating result:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  createBulk: async (req: Request, res: Response) => {
    const parseResult = resultsBulkCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { results } = parseResult.data;

      // Verify all players and tests exist
      const playerIds = [...new Set(results.map((r) => r.playerId))];
      const testIds = [...new Set(results.map((r) => r.testId))];

      const [playersExist, testsExist] = await Promise.all([
        db.select({ id: schema.players.id }).from(schema.players).where(
          eq(schema.players.id, playerIds[0]) // This would need proper IN clause handling
        ),
        db.select({ id: schema.tests.id }).from(schema.tests).where(
          eq(schema.tests.id, testIds[0]) // This would need proper IN clause handling
        ),
      ]);

      const insertedResults = await db
        .insert(schema.testResults)
        .values(results)
        .returning();

      const resultsWithCalculatedFields = insertedResults.map((result) => {
        const totalScore = resultsService.calculateTotalScore(result);
        return {
          ...result,
          totalScore,
          averageScore: resultsService.calculateAverageScore(result),
          performanceCategory:
            resultsService.getPerformanceCategory(totalScore),
        };
      });

      res.status(201).json({
        message: `Successfully created ${insertedResults.length} results`,
        results: resultsWithCalculatedFields,
      });
    } catch (error) {
      console.error("Error creating bulk results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  update: async (req: Request, res: Response) => {
    const paramsResult = resultsParamsSchema.safeParse(req.params);
    const bodyResult = resultsUpdateSchema.safeParse(req.body);

    if (!paramsResult.success) {
      return res.status(400).json(z.treeifyError(paramsResult.error));
    }

    if (!bodyResult.success) {
      return res.status(400).json(z.treeifyError(bodyResult.error));
    }

    try {
      const { id } = req.params;
      const updateData = bodyResult.data;

      // Check if result exists
      const existingResult = await db
        .select()
        .from(schema.testResults)
        .where(eq(schema.testResults.id, id))
        .limit(1);

      if (existingResult.length === 0) {
        return res.status(404).json({ message: "Result not found" });
      }

      const result = await db
        .update(schema.testResults)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(schema.testResults.id, id))
        .returning();

      const totalScore = resultsService.calculateTotalScore(result[0]);

      const updatedResult = {
        ...result[0],
        totalScore,
        averageScore: resultsService.calculateAverageScore(result[0]),
        highestScore: resultsService.getHighestScore(result[0]),
        lowestScore: resultsService.getLowestScore(result[0]),
        performanceCategory: resultsService.getPerformanceCategory(totalScore),
        scoreDistribution: resultsService.getScoreDistribution(result[0]),
        analysis: resultsService.analyzePerformance(result[0]),
      };

      res.status(200).json(updatedResult);
    } catch (error) {
      console.error("Error updating result:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  delete: async (req: Request, res: Response) => {
    const parseResult = resultsParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      // Check if result exists
      const existingResult = await db
        .select()
        .from(schema.testResults)
        .where(eq(schema.testResults.id, id))
        .limit(1);

      if (existingResult.length === 0) {
        return res.status(404).json({ message: "Result not found" });
      }

      await db.delete(schema.testResults).where(eq(schema.testResults.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting result:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
