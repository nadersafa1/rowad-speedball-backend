import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { db } from "./db/connection";
import {
  players,
  tests,
  testResults,
  calculateAge,
  getAgeGroup,
  calculateTotalScore,
} from "./db/schema";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";

// Load environment variables
config();

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

// Players routes
app.get("/api/players", async (req, res) => {
  try {
    const { search, gender, ageGroup } = req.query;

    let query = db.select().from(players);

    // Apply filters
    const conditions: any[] = [];

    if (search) {
      conditions.push(like(players.name, `%${search}%`));
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
      age: calculateAge(player.dateOfBirth),
      ageGroup: getAgeGroup(player.dateOfBirth),
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
});

app.get("/api/players/:id", async (req, res) => {
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
      totalScore: calculateTotalScore(row.result),
      test: row.test,
    }));

    const playerWithAge = {
      ...player[0],
      age: calculateAge(player[0].dateOfBirth),
      ageGroup: getAgeGroup(player[0].dateOfBirth),
      testResults: resultsWithTotal,
    };

    res.status(200).json(playerWithAge);
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Tests routes
app.get("/api/tests", async (req, res) => {
  try {
    const { testType, dateFrom, dateTo } = req.query;

    let query = db.select().from(tests);

    // Apply filters
    const conditions: any[] = [];

    if (
      testType &&
      (testType === "60_30" || testType === "30_30" || testType === "30_60")
    ) {
      conditions.push(eq(tests.testType, testType));
    }

    if (dateFrom) {
      conditions.push(gte(tests.dateConducted, dateFrom as string));
    }

    if (dateTo) {
      conditions.push(lte(tests.dateConducted, dateTo as string));
    }

    // Apply conditions if any exist
    if (conditions.length > 0) {
      const combinedCondition = conditions.reduce((acc, condition) =>
        acc ? and(acc, condition) : condition
      );
      query = query.where(combinedCondition) as any;
    }

    const result = await query.orderBy(desc(tests.dateConducted)).limit(50);

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

    const test = await db.select().from(tests).where(eq(tests.id, id)).limit(1);

    if (test.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (includeResults === "true") {
      const testResultsWithPlayers = await db
        .select({
          result: testResults,
          player: players,
        })
        .from(testResults)
        .leftJoin(players, eq(testResults.playerId, players.id))
        .where(eq(testResults.testId, id))
        .orderBy(desc(testResults.createdAt));

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
    const result = await db.select().from(testResults).limit(50);

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

// Admin-only players routes
app.post("/api/players", requireAuth, async (req, res) => {
  try {
    const { name, dateOfBirth, gender } = req.body;

    if (!name || !dateOfBirth || !gender) {
      return res
        .status(400)
        .json({ message: "Name, date of birth, and gender are required" });
    }

    const result = await db
      .insert(players)
      .values({
        name,
        dateOfBirth,
        gender,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const playerWithAge = {
      ...result[0],
      age: calculateAge(result[0].dateOfBirth),
      ageGroup: getAgeGroup(result[0].dateOfBirth),
    };

    res.status(201).json(playerWithAge);
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/players/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dateOfBirth, gender } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;

    const result = await db
      .update(players)
      .set(updateData)
      .where(eq(players.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Player not found" });
    }

    const playerWithAge = {
      ...result[0],
      age: calculateAge(result[0].dateOfBirth),
      ageGroup: getAgeGroup(result[0].dateOfBirth),
    };

    res.status(200).json(playerWithAge);
  } catch (error) {
    console.error("Error updating player:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/players/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(players)
      .where(eq(players.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.status(200).json({ message: "Player deleted successfully" });
  } catch (error) {
    console.error("Error deleting player:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin-only tests routes
app.post("/api/tests", requireAuth, async (req, res) => {
  try {
    const { name, testType, dateConducted, description } = req.body;

    if (!name || !testType || !dateConducted) {
      return res
        .status(400)
        .json({ message: "Name, test type, and date conducted are required" });
    }

    const result = await db
      .insert(tests)
      .values({
        name,
        testType,
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
    const { name, testType, dateConducted, description } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (testType) updateData.testType = testType;
    if (dateConducted) updateData.dateConducted = dateConducted;
    if (description !== undefined) updateData.description = description;

    const result = await db
      .update(tests)
      .set(updateData)
      .where(eq(tests.id, id))
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

    const result = await db.delete(tests).where(eq(tests.id, id)).returning();

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
      .insert(testResults)
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
      .update(testResults)
      .set(updateData)
      .where(eq(testResults.id, id))
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
      .delete(testResults)
      .where(eq(testResults.id, id))
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
