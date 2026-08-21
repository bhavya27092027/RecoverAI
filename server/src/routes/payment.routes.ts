import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public configuration for checkout initialization
router.get('/config', (req, res) => paymentController.getPublicConfig(req as any, res));

// Authenticated payment operations
router.post('/razorpay/order', requireAuth, (req, res, next) =>
  paymentController.createRazorpayOrder(req, res, next)
);

router.post('/razorpay/verify', requireAuth, (req, res, next) =>
  paymentController.verifyRazorpayPayment(req, res, next)
);

export default router;
