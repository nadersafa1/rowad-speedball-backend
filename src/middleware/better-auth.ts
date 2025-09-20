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

// Middleware to require authentication
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Convert Express request to Web API Request for better-auth
    const url = new URL(req.url, `http://${req.headers.host}`);

    const webRequest = new Request(url, {
      method: "GET",
      headers: new Headers(req.headers as Record<string, string>),
    });

    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: webRequest.headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({
        message: "Authentication required",
        error: "UNAUTHORIZED",
      });
    }

    // Attach user and session to request
    req.user = session.user;
    req.authSession = session.session;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED",
    });
  }
};

// Middleware for optional authentication
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Convert Express request to Web API Request for better-auth
    const url = new URL(req.url, `http://${req.headers.host}`);

    const webRequest = new Request(url, {
      method: "GET",
      headers: new Headers(req.headers as Record<string, string>),
    });

    // Get session from better-auth (don't fail if not authenticated)
    const session = await auth.api.getSession({
      headers: webRequest.headers,
    });

    if (session && session.user) {
      req.user = session.user;
      req.authSession = session.session;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    console.warn("Optional auth middleware warning:", error);
    next();
  }
};
