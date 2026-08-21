import { Router } from 'express';
import { signup, login, logout, getMe } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest, signupSchema, loginSchema } from '../middleware/validate.middleware';

const router = Router();

// Public auth endpoints
router.post('/signup', validateRequest(signupSchema), signup);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);

// Protected session check
router.get('/me', requireAuth, getMe);

export default router;
