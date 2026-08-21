import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));
router.post('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));

export default router;
