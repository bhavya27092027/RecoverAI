import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => searchController.globalSearch(req, res));

export default router;
