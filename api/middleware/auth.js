import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscriptions: {
          where: { status: 'active' }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user has active subscription
    if (user.subscriptions.length === 0) {
      return res.status(403).json({ 
        error: 'Active subscription required',
        requiresSubscription: true 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requireWorkspaceAccess(req, res, next) {
  const workspaceId = req.query.workspaceId || req.body.workspaceId;
  
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID required' });
  }

  // Check if user has access to this workspace
  const hasAccess = req.user.workspaces?.some(
    wu => wu.workspaceId === workspaceId
  );

  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this workspace' });
  }

  next();
}
