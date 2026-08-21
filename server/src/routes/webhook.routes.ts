import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

router.post('/razorpay', (req, res) => webhookController.handleRazorpayWebhook(req, res));

export default router;
