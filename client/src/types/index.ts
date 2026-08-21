export type BusinessType =
  | 'E-commerce'
  | 'SaaS'
  | 'Subscription'
  | 'Marketplace'
  | 'Education'
  | 'Services'
  | 'Other';

export type MonthlyPaymentVolume =
  | '< ₹1L'
  | '₹1L–₹5L'
  | '₹5L–₹25L'
  | '₹25L+';

export type PaymentMethod =
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking';

export type TransactionStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RECOVERED';

export type FailureReason =
  | 'BANK_TIMEOUT'
  | 'INSUFFICIENT_BALANCE'
  | 'CARD_DECLINED'
  | 'AUTHENTICATION_FAILURE'
  | 'TRANSACTION_LIMIT'
  | 'CUSTOMER_ABANDONMENT';

export type RecommendedAction =
  | 'RETRY_NOW'
  | 'WAIT_AND_RETRY'
  | 'SEND_PAYMENT_LINK'
  | 'SUGGEST_ALTERNATE_METHOD'
  | 'STOP_RECOVERY';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type RecoveryAttemptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export type RecoveryEventType =
  | 'ANALYSIS_SELECTED'
  | 'RECOVERY_STARTED'
  | 'ACTION_SELECTED'
  | 'RETRY_INITIATED'
  | 'PAYMENT_LINK_GENERATED'
  | 'ALTERNATE_METHOD_SELECTED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_RECOVERED'
  | 'RECOVERY_FAILED'
  | 'RECOVERY_SKIPPED';

export type CustomerHealth = 'Strong' | 'Watch' | 'At Risk';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  businessType: BusinessType;
  monthlyPaymentVolume: MonthlyPaymentVolume;
  preferredPaymentMethods: PaymentMethod[];
  onboardingCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  totalTransactions?: number;
  successfulPayments?: number;
  failedPayments?: number;
  recoveredPayments?: number;
  totalValue?: number;
  health?: CustomerHealth;
}

export interface CustomerStats {
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  recoveredPayments: number;
  totalSpent: number;
  revenueRecovered: number;
}

export interface CustomerRecoveryHistoryItem {
  id: string;
  transactionId: string;
  originalAmount: number;
  failureReason?: string;
  recoveryProbability: number;
  action: RecommendedAction;
  attemptNumber: number;
  outcome: RecoveryAttemptStatus;
  resultMessage?: string;
  recoveredAmount: number;
  date: string;
}

export interface AiRecoveryProfile {
  paymentReliability: number;
  historicalSuccessRate: number;
  openRecoveryOpportunities: number;
  potentialRecoverableRevenue: number;
  previousRecoveryAttempts: number;
}

export interface CustomerDetailResponse {
  success: boolean;
  data: {
    customer: Customer;
    stats: CustomerStats;
    aiRecoveryProfile?: AiRecoveryProfile;
    recoveryHistory?: CustomerRecoveryHistoryItem[];
    transactions: Transaction[];
  };
}

export interface TransactionCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

export type PaymentProvider = 'DEMO' | 'RAZORPAY';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  status: TransactionStatus;
  failureReason?: FailureReason | null;
  provider?: PaymentProvider;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paymentVerifiedAt?: string | null;
  recoveredAmount?: number | null;
  recoveredAt?: string | null;
  recoveryAttemptId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: TransactionCustomer | null;
}

export interface RazorpayPublicConfig {
  isConfigured: boolean;
  keyId: string | null;
  mode: 'TEST';
}

export interface RazorpayOrderData {
  orderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  keyId: string;
  businessName: string;
  transactionId: string;
}

export interface RazorpayVerificationPayload {
  transactionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface DecisionFactors {
  failureReasonScore: number;
  customerHistoryScore: number;
  paymentMethodScore: number;
  merchantRecoveryScore: number;
  repeatFailurePenalty: number;
  customerSuccessRate: number;
  customerTotalSpend: number;
  historicalAttemptsCount: number;
}

export interface RecoveryAnalysis {
  id: string;
  merchantId: string;
  transactionId: string;
  customerId: string;
  recoveryProbability: number;
  confidence: ConfidenceLevel;
  recommendedAction: RecommendedAction;
  expectedRecoveryAmount: number;
  reasoning: string;
  factors: DecisionFactors;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryAttempt {
  id: string;
  merchantId: string;
  transactionId: string;
  customerId: string;
  analysisId: string;
  action: RecommendedAction;
  status: RecoveryAttemptStatus;
  attemptNumber: number;
  paymentMethod: string;
  amount: number;
  failureReason?: string | null;
  resultMessage: string;
  startedAt: string;
  completedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryEvent {
  id: string;
  merchantId: string;
  transactionId: string;
  recoveryAttemptId?: string | null;
  eventType: RecoveryEventType;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface PaymentLink {
  id: string;
  recoveryLinkId: string;
  merchantId: string;
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED';
  expiresAt: string;
  paidAt?: string | null;
}

export interface RecoveryOpportunity {
  id: string;
  transactionId: string;
  recoveryProbability: number;
  confidence: ConfidenceLevel;
  recommendedAction: RecommendedAction;
  expectedRecoveryAmount: number;
  reasoning: string;
  factors: DecisionFactors;
  createdAt: string;
  isAutonomousReady?: boolean;
  transaction: {
    id: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    failureReason: FailureReason;
    status: TransactionStatus;
    recoveredAmount?: number | null;
    recoveredAt?: string | null;
    createdAt: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface RecoveryOpportunitiesSummary {
  totalOpportunities: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  potentialRecoverableRevenue: number;
}

export interface RecoveryOpportunitiesResponse {
  success: boolean;
  data: RecoveryOpportunity[];
  summary: RecoveryOpportunitiesSummary;
}

export interface RecoveryDetailsResponse {
  success: boolean;
  data: {
    transaction: Transaction;
    analysis: RecoveryAnalysis | null;
    attempts: RecoveryAttempt[];
    events: RecoveryEvent[];
    paymentLink?: PaymentLink | null;
    isAutonomousReady?: boolean;
  };
}

export interface ExecuteRecoveryResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
    transaction: Transaction;
    attempt: RecoveryAttempt;
    analysis: RecoveryAnalysis;
    paymentLink?: PaymentLink | null;
    events: RecoveryEvent[];
  };
}

export interface RecoveryMetrics {
  revenueAtRisk: number;
  recoveredRevenue: number;
  aiRecoverableRevenue: number;
  recoveryOpportunities: number;
  successfulRecoveries: number;
  recoveryAttempts: number;
  recoverySuccessRate: number;
}

// ----------------------------------------------------
// PHASE 5: ANALYTICS & INSIGHTS TYPES
// ----------------------------------------------------

export type DataConfidence = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LIMITED_DATA';

export interface AiInsight {
  id: string;
  category: 'REVENUE' | 'RECOVERY_PERFORMANCE' | 'FAILURE_PATTERNS' | 'PAYMENT_RAILS' | 'CUSTOMER_BEHAVIOR';
  title: string;
  description: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'INFO';
  dataConfidence?: DataConfidence;
  metricHighlight?: string;
  actionableRecommendation?: string;
}

export interface AnalyticsOverview {
  totalVolume: number;
  totalTransactions: number;
  successfulRevenue: number;
  successfulTransactions: number;
  revenueAtRisk: number;
  failedTransactions: number;
  recoveredRevenue: number;
  recoveredTransactions: number;
  recoveryRate: number;
  recoverySuccessRate: number;
  recoveryLift: number;
  potentialRecoverableRevenue: number;
  activeRecoveryOpportunities: number;
  totalAttempts: number;
  successfulAttempts: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  amount: number;
  conversionRate: number;
}

export interface RecoveryFunnelData {
  funnel: FunnelStage[];
  summary: {
    totalFailedRevenue: number;
    totalRecoveredRevenue: number;
    overallRecoveryRate: number;
  };
}

export interface RevenueTrendPoint {
  date: string;
  successfulRevenue: number;
  failedRevenue: number;
  recoveredRevenue: number;
  totalVolume: number;
  txCount: number;
}

export interface RevenueTrendsResponse {
  range: string;
  points: RevenueTrendPoint[];
}

export interface RecoveryPerformanceTrendPoint {
  date: string;
  recoveredRevenue: number;
  recoveryRate: number;
  recoverySuccessRate: number;
  attemptsCount: number;
  successCount: number;
}

export interface RecoveryPerformanceTrendsResponse {
  range: string;
  points: RecoveryPerformanceTrendPoint[];
}

export interface FailureBreakdownItem {
  failureReason: FailureReason;
  count: number;
  totalAmount: number;
  percentageOfFailures: number;
  averageRecoveryProbability: number;
  recoveredCount: number;
  recoverySuccessRate: number;
}

export interface FailureBreakdownResponse {
  totalFailures: number;
  breakdown: FailureBreakdownItem[];
}

export interface PaymentRailPerformanceItem {
  paymentMethod: PaymentMethod;
  count: number;
  volume: number;
  successCount: number;
  successRate: number;
  failureCount: number;
  failureRate: number;
  recoveredCount: number;
  recoveredRevenue: number;
  recoveryRate: number;
}

export interface PaymentRailPerformanceResponse {
  bestPerformingMethod: string;
  breakdown: PaymentRailPerformanceItem[];
}

export interface StrategyPerformanceItem {
  action: RecommendedAction;
  attempts: number;
  successfulRecoveries: number;
  successRate: number;
  revenueRecovered: number;
}

export interface StrategyPerformanceResponse {
  breakdown: StrategyPerformanceItem[];
}

export interface AutonomousComparisonData {
  attempts: number;
  successfulRecoveries: number;
  successRate: number;
  revenueRecovered: number;
}

export interface AutonomousVsHumanResponse {
  autonomous: AutonomousComparisonData;
  humanApproved: AutonomousComparisonData;
}

export interface CustomerSegmentCustomer {
  id: string;
  name: string;
  email: string;
  ltv: number;
  totalTransactions: number;
  avgProbability: number;
  recoverableRevenue: number;
}

export interface CustomerSegmentQuadrant {
  count: number;
  totalLtv: number;
  recoverablePipeline: number;
  customers: CustomerSegmentCustomer[];
}

export interface CustomerSegmentsResponse {
  segments: {
    HIGH_VALUE_HIGH_RECOVERY: CustomerSegmentQuadrant;
    HIGH_VALUE_LOW_RECOVERY: CustomerSegmentQuadrant;
    LOW_VALUE_HIGH_RECOVERY: CustomerSegmentQuadrant;
    LOW_VALUE_LOW_RECOVERY: CustomerSegmentQuadrant;
  };
}

export interface NotificationItem {
  id: string;
  merchantId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'CUSTOMER' | 'TRANSACTION';
  url: string;
  status?: string;
}

export interface GlobalSearchResponse {
  success: boolean;
  data: {
    customers: SearchResultItem[];
    transactions: SearchResultItem[];
    totalResults: number;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateTransactionInput {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  description?: string;
}

export interface ProcessPaymentInput {
  simulateStatus: 'SUCCESS' | 'FAILED';
  failureReason?: FailureReason;
}

export interface DashboardMetrics {
  revenueAtRisk: number;
  recoveredRevenue: number;
  successfulRevenue: number;
  recoveryRate: number;
  recoverySuccessRate: number;
  failedPayments: number;
  totalTransactions: number;
  recoveredTransactions?: number;
  recoveryAttempts?: number;
  successfulRecoveries?: number;
  autonomousRecoveries?: number;
  aiRecoverableRevenue: number;
  recoveryOpportunities: number;
  highPriorityOpportunities: number;
  currency: string;
  merchantId: string;
  businessName: string;
  onboardingCompleted: boolean;
  connectedGatewaysCount: number;
  lastSync: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: User;
  merchant: Merchant;
}

export interface ApiErrorResponse {
  success: boolean;
  error: string;
  details?: Array<{ field: string; message: string }>;
}
