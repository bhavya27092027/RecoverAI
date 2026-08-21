import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  processTransactionPayment,
} from '../controllers/transaction.controller';
import {
  analyzeTransaction,
  getTransactionRecoveryAnalysis,
} from '../controllers/recovery.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateRequest,
  createTransactionSchema,
  processPaymentSchema,
} from '../middleware/validate.middleware';

const router = Router();

// All transaction endpoints require verified merchant authentication
router.use(requireAuth);

router.post('/', validateRequest(createTransactionSchema), createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/:id/process', validateRequest(processPaymentSchema), processTransactionPayment);
router.post('/:id/analyze', analyzeTransaction);
router.get('/:id/recovery-analysis', getTransactionRecoveryAnalysis);

export default router;
