import { Router } from 'express';
import {
  getDashboardMetrics,
  getRecentTransactions,
} from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Dashboard endpoints require authentication
router.use(requireAuth);

router.get('/metrics', getDashboardMetrics);
router.get('/recent-transactions', getRecentTransactions);

export default router;
