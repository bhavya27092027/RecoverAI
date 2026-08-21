export interface IRecoveryPolicyConfig {
  minRecoveryProbability: number;
  autonomousProbabilityThreshold: number;
  autonomousRequiredConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  maxRecoveryAttempts: number;
}

export const RECOVERY_CONFIG: IRecoveryPolicyConfig = {
  minRecoveryProbability: 60,
  autonomousProbabilityThreshold: 80,
  autonomousRequiredConfidence: 'HIGH',
  maxRecoveryAttempts: 3,
};

export const isEligibleForAutonomousExecution = (
  recoveryProbability: number,
  confidence: string
): boolean => {
  return (
    recoveryProbability >= RECOVERY_CONFIG.autonomousProbabilityThreshold &&
    confidence === RECOVERY_CONFIG.autonomousRequiredConfidence
  );
};
