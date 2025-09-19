import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';

// Admin credentials - in production, this should be stored securely
const ADMIN_EMAIL = 'admin@rowad.com';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('Test@1234', 10);

export const login: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check credentials
    if (email !== ADMIN_EMAIL) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Set session
    req.session.user = { email: ADMIN_EMAIL };

    res.status(200).json({
      message: 'Login successful',
      user: { email: ADMIN_EMAIL }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout: RequestHandler = (req: AuthenticatedRequest, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Failed to logout' });
    }
    
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout successful' });
  });
};

export const verify: RequestHandler = (req: AuthenticatedRequest, res) => {
  if (req.session && req.session.user) {
    res.status(200).json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.status(200).json({
      authenticated: false
    });
  }
};

