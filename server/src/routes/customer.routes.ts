import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateRequest,
  createCustomerSchema,
  updateCustomerSchema,
} from '../middleware/validate.middleware';

const router = Router();

// All customer endpoints require verified merchant authentication
router.use(requireAuth);

router.post('/', validateRequest(createCustomerSchema), createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', validateRequest(updateCustomerSchema), updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
