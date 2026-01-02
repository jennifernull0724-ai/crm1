import { requireAuth } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Apply auth middleware
  await new Promise((resolve, reject) => {
    requireAuth(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  }).catch(() => {
    return; // Auth middleware already sent response
  });

  if (res.headersSent) return;

  try {
    // Get user's workspaces
    const workspaces = await prisma.workspaceUser.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: true
      }
    });

    return res.status(200).json({ 
      workspaces: workspaces.map(wu => wu.workspace)
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return res.status(500).json({ error: 'Failed to get workspaces' });
  }
}
