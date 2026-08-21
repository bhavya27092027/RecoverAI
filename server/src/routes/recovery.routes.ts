import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  analyzeTransaction,
  getTransactionRecoveryAnalysis,
  getRecoveryOpportunities,
  executeRecovery,
  approveRecovery,
  simulatePayment,
  getRecoveryDetails,
  getRecoveryEvents,
  getRecoveryAttempts,
  getRecoveryMetrics,
} from '../controllers/recovery.controller';

const router = Router();

// Protect all recovery routes
router.use(requireAuth);

// Metric & Opportunity aggregates
router.get('/metrics', getRecoveryMetrics);
router.get('/opportunities', getRecoveryOpportunities);

// Execution endpoints
router.post('/:transactionId/execute', executeRecovery);
router.post('/:transactionId/approve', approveRecovery);
router.post('/:transactionId/simulate-payment', simulatePayment);

// Detail & timeline queries
router.get('/:transactionId', getRecoveryDetails);
router.get('/:transactionId/events', getRecoveryEvents);
router.get('/:transactionId/attempts', getRecoveryAttempts);

// Transaction Analysis routes
router.post('/transactions/:id/analyze', analyzeTransaction);
router.get('/transactions/:id/recovery-analysis', getTransactionRecoveryAnalysis);

export default router;
