import { Router } from 'express';
import { demoController } from '../controllers/demo.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/seed', (req, res) => demoController.seedDemoData(req, res));

export default router;
