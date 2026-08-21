import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { User, IUser } from '../models/User.model';
import { Merchant, IMerchant } from '../models/Merchant.model';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  merchant?: IMerchant;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.token;

    // Optional Bearer token header fallback
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to continue.',
      });
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (jwtErr) {
      res.status(401).json({
        success: false,
        error: 'Session expired or invalid token. Please log in again.',
      });
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account no longer exists.',
      });
      return;
    }

    const merchant = await Merchant.findOne({ userId: user._id });
    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant profile not found.',
      });
      return;
    }

    req.user = user;
    req.merchant = merchant;
    next();
  } catch (error) {
    next(error);
  }
};
