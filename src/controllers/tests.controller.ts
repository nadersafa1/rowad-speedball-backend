import { and, count, desc, eq, ilike, gte, lte } from "drizzle-orm";
import type { Request, Response } from "express";
import z from "zod";
import { db } from "../db/connection";
import * as schema from "../db/schema";
import { testsService } from "../services/tests.service";
import {
  testsCreateSchema,
  testsParamsSchema,
  testsQuerySchema,
  testsUpdateSchema,
} from "../types/tests.schemas";
import { createPaginatedResponse } from "../types/pagination";

// Public Interface
export const testsController = {
  findAll: async (req: Request, res: Response) => {
    const parseResult = testsQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { q, playingTime, recoveryTime, dateFrom, dateTo, page, limit } =
        parseResult.data;

      // Calculate pagination parameters
      const offset = (page - 1) * limit;

      // Build base query conditions
      const conditions: any[] = [];

      if (q) {
        conditions.push(ilike(schema.tests.name, `%${q}%`));
      }

      if (playingTime !== undefined) {
        conditions.push(eq(schema.tests.playingTime, playingTime));
      }

      if (recoveryTime !== undefined) {
        conditions.push(eq(schema.tests.recoveryTime, recoveryTime));
      }

      if (dateFrom) {
        conditions.push(gte(schema.tests.dateConducted, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(schema.tests.dateConducted, dateTo));
      }

      // Create combined condition for reuse
      const combinedCondition =
        conditions.length > 0
          ? conditions.reduce((acc, condition) =>
              acc ? and(acc, condition) : condition
            )
          : undefined;

      // Get total count for pagination
      let countQuery = db.select({ count: count() }).from(schema.tests);
      if (combinedCondition) {
        countQuery = countQuery.where(combinedCondition) as any;
      }

      // Get paginated data
      let dataQuery = db.select().from(schema.tests);
      if (combinedCondition) {
        dataQuery = dataQuery.where(combinedCondition) as any;
      }

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
          .orderBy(desc(schema.tests.createdAt))
          .limit(limit)
          .offset(offset),
      ]);

      const totalItems = countResult[0].count;

      // Add calculated fields to tests
      const testsWithCalculatedFields = dataResult.map((test) => ({
        ...test,
        totalTime: testsService.calculateTotalTime(test),
        formattedTotalTime: testsService.formatTotalTime(test),
        status: testsService.getTestStatus(test.dateConducted),
      }));

      // Create paginated response
      const paginatedResponse = createPaginatedResponse(
        testsWithCalculatedFields,
        page,
        limit,
        totalItems
      );

      res.status(200).json(paginatedResponse);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  findById: async (req: Request, res: Response) => {
    const parseResult = testsParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      const test = await db
        .select()
        .from(schema.tests)
        .where(eq(schema.tests.id, id))
        .limit(1);

      if (test.length === 0) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Get test results for this test
      const testResults = await db
        .select({
          result: schema.testResults,
          player: schema.players,
        })
        .from(schema.testResults)
        .leftJoin(
          schema.players,
          eq(schema.testResults.playerId, schema.players.id)
        )
        .where(eq(schema.testResults.testId, id))
        .orderBy(desc(schema.testResults.createdAt));

      const resultsWithTotal = testResults.map((row) => ({
        ...row.result,
        totalScore: testsService.calculateTotalScore(row.result),
        player: row.player,
      }));

      const testWithCalculatedFields = {
        ...test[0],
        totalTime: testsService.calculateTotalTime(test[0]),
        formattedTotalTime: testsService.formatTotalTime(test[0]),
        status: testsService.getTestStatus(test[0].dateConducted),
        testResults: resultsWithTotal,
      };

      res.status(200).json(testWithCalculatedFields);
    } catch (error) {
      console.error("Error fetching test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  create: async (req: Request, res: Response) => {
    const parseResult = testsCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { name, playingTime, recoveryTime, dateConducted, description } =
        parseResult.data;

      const result = await db
        .insert(schema.tests)
        .values({
          name,
          playingTime,
          recoveryTime,
          dateConducted,
          description,
        })
        .returning();

      const newTest = {
        ...result[0],
        totalTime: testsService.calculateTotalTime(result[0]),
        formattedTotalTime: testsService.formatTotalTime(result[0]),
        status: testsService.getTestStatus(result[0].dateConducted),
      };

      res.status(201).json(newTest);
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  update: async (req: Request, res: Response) => {
    const paramsResult = testsParamsSchema.safeParse(req.params);
    const bodyResult = testsUpdateSchema.safeParse(req.body);

    if (!paramsResult.success) {
      return res.status(400).json(z.treeifyError(paramsResult.error));
    }

    if (!bodyResult.success) {
      return res.status(400).json(z.treeifyError(bodyResult.error));
    }

    try {
      const { id } = req.params;
      const updateData = bodyResult.data;

      // Check if test exists
      const existingTest = await db
        .select()
        .from(schema.tests)
        .where(eq(schema.tests.id, id))
        .limit(1);

      if (existingTest.length === 0) {
        return res.status(404).json({ message: "Test not found" });
      }

      const result = await db
        .update(schema.tests)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(schema.tests.id, id))
        .returning();

      const updatedTest = {
        ...result[0],
        totalTime: testsService.calculateTotalTime(result[0]),
        formattedTotalTime: testsService.formatTotalTime(result[0]),
        status: testsService.getTestStatus(result[0].dateConducted),
      };

      res.status(200).json(updatedTest);
    } catch (error) {
      console.error("Error updating test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  delete: async (req: Request, res: Response) => {
    const parseResult = testsParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
    }

    try {
      const { id } = req.params;

      // Check if test exists
      const existingTest = await db
        .select()
        .from(schema.tests)
        .where(eq(schema.tests.id, id))
        .limit(1);

      if (existingTest.length === 0) {
        return res.status(404).json({ message: "Test not found" });
      }

      await db.delete(schema.tests).where(eq(schema.tests.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
