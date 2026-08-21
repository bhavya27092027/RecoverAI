import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMerchantInsights } from '../controllers/ai.controller';

const router = Router();

// Require verified merchant authentication for AI insights
router.use(requireAuth);

router.get('/insights', getMerchantInsights);

export default router;
