import { Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'token';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.includes('fallback') || secret.length < 16)) {
    throw new Error(
      '[Startup Error] JWT_SECRET environment variable must be configured with a secure key (minimum 16 characters) in production mode.'
    );
  }
  return secret || 'recoverai_jwt_default_secret_key_2026_fallback';
};

export interface TokenPayload {
  userId: string;
  merchantId: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};

export const setAuthCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' allows cross-origin cookie delivery between Netlify & Railway
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  });
};

export const clearAuthCookie = (res: Response): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
};
