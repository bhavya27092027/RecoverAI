import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all analytics endpoints with merchant authentication
router.use(requireAuth);

router.get('/overview', (req, res) => analyticsController.getOverview(req, res));
router.get('/funnel', (req, res) => analyticsController.getRecoveryFunnel(req, res));
router.get('/revenue-trends', (req, res) => analyticsController.getRevenueTrends(req, res));
router.get('/recovery-trends', (req, res) =>
  analyticsController.getRecoveryPerformanceTrends(req, res)
);
router.get('/failure-breakdown', (req, res) =>
  analyticsController.getFailureBreakdown(req, res)
);
router.get('/payment-methods', (req, res) =>
  analyticsController.getPaymentMethodPerformance(req, res)
);
router.get('/recovery-actions', (req, res) =>
  analyticsController.getRecoveryStrategyPerformance(req, res)
);
router.get('/autonomous-comparison', (req, res) =>
  analyticsController.getAutonomousVsHumanComparison(req, res)
);
router.get('/customer-segments', (req, res) =>
  analyticsController.getCustomerSegments(req, res)
);
router.get('/insights', (req, res) => analyticsController.getInsights(req, res));

export default router;
