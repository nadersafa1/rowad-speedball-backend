import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  req.user = req.session.user;
  next();
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    user?: {
      email: string;
    };
  }
}

