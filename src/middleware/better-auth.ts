import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image?: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      authSession?: {
        id: string;
        userId: string;
        expiresAt: Date;
        ipAddress?: string | null;
        userAgent?: string | null;
      };
    }
  }
}

// Production-ready middleware to require authentication
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (!session?.user) {
      return res.status(401).json({
        message: "Authentication required",
        error: "UNAUTHORIZED",
      });
    }

    req.user = session.user;
    req.authSession = session.session;
    next();
  } catch (error) {
    // Production error handling
    console.error("Auth middleware error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED",
    });
  }
};

// Production-ready middleware for optional authentication
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (session?.user) {
      req.user = session.user;
      req.authSession = session.session;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors but log them
    console.warn("Optional auth middleware warning:", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    next();
  }
};
