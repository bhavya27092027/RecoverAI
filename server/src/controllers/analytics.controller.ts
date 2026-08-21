import { Request, Response } from 'express';
import { analyticsService, DateRange } from '../services/analytics.service';
import { insightsService } from '../ai/insightsService';

export class AnalyticsController {
  public async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getOverview(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRecoveryFunnel(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getRecoveryFunnel(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRevenueTrends(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const range = (req.query.range as DateRange) || '30D';
      const data = await analyticsService.getRevenueTrends(merchantId, range);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRecoveryPerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const range = (req.query.range as DateRange) || '30D';
      const data = await analyticsService.getRecoveryPerformanceTrends(merchantId, range);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getFailureBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getFailureBreakdown(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getPaymentMethodPerformance(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getPaymentMethodPerformance(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRecoveryStrategyPerformance(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getRecoveryStrategyPerformance(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getAutonomousVsHumanComparison(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getAutonomousVsHumanComparison(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getCustomerSegments(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await analyticsService.getCustomerSegments(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const data = await insightsService.getMerchantInsights(merchantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const analyticsController = new AnalyticsController();
