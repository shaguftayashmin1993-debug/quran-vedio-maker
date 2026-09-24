import QRCode from 'qrcode';
import { UpiConfig } from '../types';

export const DEFAULT_UPI_CONFIG: UpiConfig = {
  upiId: 'shaguftayashmin1993@okaxis', // Default UPI ID - Admin can customize anytime in Admin modal
  payeeName: 'Quran Video Studio',
  monthlyPriceInr: 299,
  annualPriceInr: 1499,
  lifetimePriceInr: 2999,
  autoApproveOnSubmit: true,
};

export interface UpiPlanOption {
  id: 'monthly' | 'annual' | 'lifetime';
  name: string;
  subTitle: string;
  badge?: string;
  priceInr: number;
  originalPriceInr?: number;
  period: string;
  features: string[];
}

export function getUpiPlans(config: UpiConfig): UpiPlanOption[] {
  return [
    {
      id: 'monthly',
      name: 'Pro Monthly',
      subTitle: 'Monthly Creator Pass',
      priceInr: config.monthlyPriceInr || 299,
      originalPriceInr: 599,
      period: '/ month',
      features: [
        'Full 4K Ultra-HD Video Export',
        'All 114 Surahs & 30+ Qaris',
        '0% Watermark & Commercial Rights',
        'Makkah & Madinah 4K Sceneries',
        'Subtitles in 12+ Languages'
      ]
    },
    {
      id: 'annual',
      name: 'Creator Annual',
      subTitle: 'Most Popular for Channels',
      badge: '🔥 MOST POPULAR (Save 60%)',
      priceInr: config.annualPriceInr || 1499,
      originalPriceInr: 3599,
      period: '/ year (₹125/mo)',
      features: [
        'Everything in Monthly Plan',
        'Mass Batch Video Automation',
        'Madani Mushaf Page Fullscreen',
        'Priority Audio Transcoding',
        'Full Year Updates & Support'
      ]
    },
    {
      id: 'lifetime',
      name: 'Studio VIP Lifetime',
      subTitle: 'One-Time Payment, Forever Access',
      badge: '👑 BEST VALUE',
      priceInr: config.lifetimePriceInr || 2999,
      originalPriceInr: 9999,
      period: 'one-time (Never pay again)',
      features: [
        'Lifetime Unlimited Video Exports',
        'All Future Surah & Reciter Updates',
        'Dedicated VIP Server Bandwidth',
        '100% Unrestricted Studio Access',
        'Priority VIP WhatsApp Support'
      ]
    }
  ];
}

/**
 * Builds standard UPI Payment URI compatible with Google Pay, PhonePe, Paytm, BHIM, CRED
 */
export function buildUpiPaymentUrl(
  upiId: string,
  payeeName: string,
  amountInr: number,
  transactionNote: string = 'Quran Video Studio Subscription'
): string {
  const cleanUpi = upiId.trim();
  const cleanName = payeeName.trim();
  const cleanAmount = Math.max(1, amountInr).toFixed(2);
  
  // Standard NPCI UPI URI Specification
  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
}

/**
 * Generates high-res QR code image data URL for UPI desktop scanning
 */
export async function generateUpiQrCode(upiUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(upiUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return '';
  }
}
