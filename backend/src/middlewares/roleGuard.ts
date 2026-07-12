import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export interface AuthRequest extends Request {
  user?: { userId: number; role: string; departmentId: number | null };
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Strict Role-Based Access Control (RBAC)
    if (decoded.role !== 'Admin') {
      console.warn(`[Security] Unauthorized access attempt by User ID ${decoded.userId}`);
      res.status(403).json({ error: 'Forbidden: Administrator access required.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};