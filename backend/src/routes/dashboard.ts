import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';
import { UserRole } from '../types';

const router = Router();
const dashboardService = new DashboardService();

router.get('/organizer', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const stats = await dashboardService.getOrganizerDashboardStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dashboard stats';
    res.status(500).json({ message });
  }
});

export default router;
