import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { db } from "./db/connection";
import * as schema from "./db/schema";
import { calculateTotalScore } from "./db/schema/results";
import { calculateAge, getAgeGroup } from "./db/schema/players";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import router from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5555;

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://rowad.speedballhub.com",
            "http://rowad.speedballhub.com",
            "http://localhost:3001",
            "http://frontend:3000",
          ]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // 1000 requests per minute in dev, 100 in prod
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use("/api/", limiter);

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(router);

// Health check endpoint - simple version that doesn't require DB
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Detailed health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Admin credentials
const ADMIN_EMAIL = "admin@rowad.com";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("Test@1234", 10);

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (email !== ADMIN_EMAIL) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.user = { email: ADMIN_EMAIL };

    res.status(200).json({
      message: "Login successful",
      user: { email: ADMIN_EMAIL },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Failed to logout" });
    }

    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logout successful" });
  });
});

app.get("/api/auth/verify", (req, res) => {
  if (req.session && req.session.user) {
    res.status(200).json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.status(200).json({
      authenticated: false,
    });
  }
});

// Tests routes
app.get("/api/tests", async (req, res) => {
  try {
    const { testType, dateFrom, dateTo } = req.query;

    let query = db.select().from(schema.tests);

    // Apply filters
    const conditions: any[] = [];

    if (dateFrom) {
      conditions.push(gte(schema.tests.dateConducted, dateFrom as string));
    }

    if (dateTo) {
      conditions.push(lte(schema.tests.dateConducted, dateTo as string));
    }

    // Apply conditions if any exist
    if (conditions.length > 0) {
      const combinedCondition = conditions.reduce((acc, condition) =>
        acc ? and(acc, condition) : condition
      );
      query = query.where(combinedCondition) as any;
    }

    const result = await query
      .orderBy(desc(schema.tests.dateConducted))
      .limit(50);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/tests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { includeResults } = req.query;

    const test = await db
      .select()
      .from(schema.tests)
      .where(eq(schema.tests.id, id))
      .limit(1);

    if (test.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (includeResults === "true") {
      const testResultsWithPlayers = await db
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

      const resultsWithAge = testResultsWithPlayers.map((row) => ({
        ...row.result,
        totalScore: calculateTotalScore(row.result),
        player: row.player
          ? {
              ...row.player,
              age: calculateAge(row.player.dateOfBirth),
              ageGroup: getAgeGroup(row.player.dateOfBirth),
            }
          : null,
      }));

      const testWithResults = {
        ...test[0],
        testResults: resultsWithAge,
      };

      res.status(200).json(testWithResults);
    } else {
      res.status(200).json(test[0]);
    }
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Test Results routes
app.get("/api/results", async (req, res) => {
  try {
    const result = await db.select().from(schema.testResults).limit(50);

    const resultsWithTotal = result.map((result) => ({
      ...result,
      totalScore: calculateTotalScore(result),
    }));

    res.status(200).json(resultsWithTotal);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only tests routes
app.post("/api/tests", requireAuth, async (req, res) => {
  try {
    const { name, playingTime, recoveryTime, dateConducted, description } =
      req.body;

    if (!name || !playingTime || !recoveryTime || !dateConducted) {
      return res.status(400).json({
        message:
          "Name, playing time, recovery time, and date conducted are required",
      });
    }

    const result = await db
      .insert(schema.tests)
      .values({
        name,
        playingTime,
        recoveryTime,
        dateConducted,
        description: description || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/tests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, playingTime, recoveryTime, dateConducted, description } =
      req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (playingTime) updateData.playingTime = playingTime;
    if (recoveryTime) updateData.recoveryTime = recoveryTime;
    if (dateConducted) updateData.dateConducted = dateConducted;
    if (description !== undefined) updateData.description = description;

    const result = await db
      .update(schema.tests)
      .set(updateData)
      .where(eq(schema.tests.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/tests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(schema.tests)
      .where(eq(schema.tests.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ message: "Test deleted successfully" });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only results routes
app.post("/api/results", requireAuth, async (req, res) => {
  try {
    const {
      playerId,
      testId,
      leftHandScore,
      rightHandScore,
      forehandScore,
      backhandScore,
    } = req.body;

    if (
      !playerId ||
      !testId ||
      leftHandScore === undefined ||
      rightHandScore === undefined ||
      forehandScore === undefined ||
      backhandScore === undefined
    ) {
      return res
        .status(400)
        .json({ message: "All scores and player/test IDs are required" });
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const resultWithTotal = {
      ...result[0],
      totalScore: calculateTotalScore(result[0]),
    };

    res.status(201).json(resultWithTotal);
  } catch (error) {
    console.error("Error creating test result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/results/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      playerId,
      testId,
      leftHandScore,
      rightHandScore,
      forehandScore,
      backhandScore,
    } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (playerId) updateData.playerId = playerId;
    if (testId) updateData.testId = testId;
    if (leftHandScore !== undefined) updateData.leftHandScore = leftHandScore;
    if (rightHandScore !== undefined)
      updateData.rightHandScore = rightHandScore;
    if (forehandScore !== undefined) updateData.forehandScore = forehandScore;
    if (backhandScore !== undefined) updateData.backhandScore = backhandScore;

    const result = await db
      .update(schema.testResults)
      .set(updateData)
      .where(eq(schema.testResults.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Test result not found" });
    }

    const resultWithTotal = {
      ...result[0],
      totalScore: calculateTotalScore(result[0]),
    };

    res.status(200).json(resultWithTotal);
  } catch (error) {
    console.error("Error updating test result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/results/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(schema.testResults)
      .where(eq(schema.testResults.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Test result not found" });
    }

    res.status(200).json({ message: "Test result deleted successfully" });
  } catch (error) {
    console.error("Error deleting test result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
);

// Extend session interface
declare module "express-session" {
  interface SessionData {
    user?: {
      email: string;
    };
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
