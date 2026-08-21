import { Router } from 'express';
import {
  completeOnboarding,
  getProfile,
  updateProfile,
} from '../controllers/merchant.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateRequest,
  onboardingSchema,
  updateProfileSchema,
} from '../middleware/validate.middleware';

const router = Router();

// All merchant endpoints require authentication
router.use(requireAuth);

router.post('/onboarding', validateRequest(onboardingSchema), completeOnboarding);
router.get('/profile', getProfile);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);

export default router;
