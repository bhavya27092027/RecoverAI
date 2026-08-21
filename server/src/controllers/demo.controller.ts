import { Request, Response } from 'express';
import { seedDemoDataForMerchant } from '../scripts/seedDemoData';

export class DemoController {
  public async seedDemoData(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      await seedDemoDataForMerchant(merchantId);
      res.status(200).json({
        success: true,
        message: 'Successfully generated realistic demo scenario records.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const demoController = new DemoController();
