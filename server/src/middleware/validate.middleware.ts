import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid request payload',
      });
    }
  };
};

export const signupSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),
    businessName: z
      .string({ required_error: 'Business/Company name is required' })
      .min(2, 'Business name must be at least 2 characters')
      .max(150, 'Business name cannot exceed 150 characters')
      .trim(),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string({ required_error: 'Password is required' }),
  rememberMe: z.boolean().optional().default(false),
});

export const onboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .trim()
    .optional(),
  businessType: z.enum([
    'E-commerce',
    'SaaS',
    'Subscription',
    'Marketplace',
    'Education',
    'Services',
    'Other',
  ]),
  monthlyPaymentVolume: z.enum([
    '< ₹1L',
    '₹1L–₹5L',
    '₹5L–₹25L',
    '₹25L+',
  ]),
  preferredPaymentMethods: z
    .array(z.enum(['UPI', 'Credit Card', 'Debit Card', 'Net Banking']))
    .min(1, 'Please select at least one preferred payment method'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .trim()
    .optional(),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(150)
    .trim()
    .optional(),
  businessType: z
    .enum([
      'E-commerce',
      'SaaS',
      'Subscription',
      'Marketplace',
      'Education',
      'Services',
      'Other',
    ])
    .optional(),
  monthlyPaymentVolume: z
    .enum(['< ₹1L', '₹1L–₹5L', '₹5L–₹25L', '₹25L+'])
    .optional(),
  preferredPaymentMethods: z
    .array(z.enum(['UPI', 'Credit Card', 'Debit Card', 'Net Banking']))
    .min(1, 'At least one payment method is required')
    .optional(),
});

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Customer email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(val),
      'Please enter a valid phone number'
    ),
});

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(val),
      'Please enter a valid phone number'
    ),
});

export const createTransactionSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0'),
  currency: z.string().default('INR').optional(),
  paymentMethod: z.enum(['UPI', 'Credit Card', 'Debit Card', 'Net Banking'], {
    required_error: 'Payment method is required',
  }),
  description: z
    .string()
    .max(250, 'Description cannot exceed 250 characters')
    .trim()
    .optional(),
});

export const processPaymentSchema = z.object({
  simulateStatus: z.enum(['SUCCESS', 'FAILED'], {
    required_error: 'Simulation outcome is required (SUCCESS or FAILED)',
  }),
  failureReason: z
    .enum([
      'BANK_TIMEOUT',
      'INSUFFICIENT_BALANCE',
      'CARD_DECLINED',
      'AUTHENTICATION_FAILURE',
      'TRANSACTION_LIMIT',
      'CUSTOMER_ABANDONMENT',
    ])
    .optional(),
});
