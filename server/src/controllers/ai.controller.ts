import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { insightsService } from '../ai/insightsService';

export const getMerchantInsights = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const insights = await insightsService.getMerchantInsights(merchant._id);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};
