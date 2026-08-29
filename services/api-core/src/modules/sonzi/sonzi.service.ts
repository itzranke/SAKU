import { Injectable } from '@nestjs/common';

export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';

export interface FinancialHealthMetrics {
  dsrPercent: number;           // Debt Service Ratio (Target < 35%)
  emergencyFundMonths: number;  // Emergency Fund Coverage (Target >= 6 months)
  solvencyRatioPercent: number; // Net Worth / Total Assets (Target >= 50%)
  currentStage: 'STAGE_1_SAFETY' | 'STAGE_2_GROWTH' | 'STAGE_3_FIRE';
  stageName: string;
  stageProgressPercent: number;
  recommendedAllocation: {
    cashPercent: number;
    equitiesPercent: number;
    tradingCryptoPercent: number;
  };
}

@Injectable()
export class SonziService {
  calculateHealthMetrics(
    monthlyIncome: number = 35000000,
    monthlyDebtPayment: number = 5200000,
    monthlyExpenses: number = 12000000,
    liquidCash: number = 260500000,
    totalAssets: number = 1600000000,
    netWorth: number = 1450230000,
    riskProfile: RiskProfile = 'MODERATE'
  ): FinancialHealthMetrics {
    // 1. Debt Service Ratio (DSR)
    const dsrPercent = Math.round((monthlyDebtPayment / (monthlyIncome || 1)) * 100);

    // 2. Emergency Fund Months
    const emergencyFundMonths = parseFloat((liquidCash / (monthlyExpenses || 1)).toFixed(1));

    // 3. Solvency Ratio
    const solvencyRatioPercent = Math.round((netWorth / (totalAssets || 1)) * 100);

    // 4. SONZI Stage Progression
    let currentStage: 'STAGE_1_SAFETY' | 'STAGE_2_GROWTH' | 'STAGE_3_FIRE' = 'STAGE_2_GROWTH';
    let stageName = 'Tahap 2: Active Capital Growth';
    let stageProgressPercent = 65;

    if (emergencyFundMonths < 6 || dsrPercent > 35) {
      currentStage = 'STAGE_1_SAFETY';
      stageName = 'Tahap 1: Basic Safety & Debt Freedom';
      stageProgressPercent = Math.min(100, Math.round((emergencyFundMonths / 6) * 100));
    } else if (netWorth >= monthlyExpenses * 12 * 25) {
      currentStage = 'STAGE_3_FIRE';
      stageName = 'Tahap 3: Financial Independence (FIRE)';
      stageProgressPercent = 100;
    } else {
      currentStage = 'STAGE_2_GROWTH';
      stageName = 'Tahap 2: Active Capital Growth';
      const fireTarget = monthlyExpenses * 12 * 25;
      stageProgressPercent = Math.min(99, Math.round((netWorth / fireTarget) * 100));
    }

    // 5. Allocation Presets
    let recommendedAllocation = { cashPercent: 40, equitiesPercent: 40, tradingCryptoPercent: 20 };
    if (riskProfile === 'CONSERVATIVE') {
      recommendedAllocation = { cashPercent: 60, equitiesPercent: 30, tradingCryptoPercent: 10 };
    } else if (riskProfile === 'AGGRESSIVE') {
      recommendedAllocation = { cashPercent: 20, equitiesPercent: 50, tradingCryptoPercent: 30 };
    }

    return {
      dsrPercent,
      emergencyFundMonths,
      solvencyRatioPercent,
      currentStage,
      stageName,
      stageProgressPercent,
      recommendedAllocation,
    };
  }
}
