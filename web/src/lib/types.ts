// TypeScript types matching the Go domain model.

export type Currency = 'JPY' | 'CNY';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type ActorType = 'personal' | 'household_shared';
export type AccountType = 'cash' | 'paypay' | 'credit_card' | 'bank_account' | 'cny_rmb' | 'other';
export type CategoryType = 'expense' | 'income' | 'transfer';

export interface MeResponse {
  uid: string;
  email: string;
  householdId: string;
  actorId: string;
  needsSetup: boolean;
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  householdId: string;
  displayName: string;
  type: ActorType;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  householdId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  ownerActorId: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  householdId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  ownerActorId: string;
  billingDay?: number;
  settlementDay?: number;
  debitPmId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  householdId: string;
  name: string;
  type: CategoryType;
  parentCategoryId?: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransaction {
  id: string;
  householdId: string;
  actorId: string;
  transactionType: TransactionType;
  transactionDate: string; // YYYY-MM-DD
  amount: number;
  currency: Currency;
  categoryId?: string;
  paymentMethodId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  merchantName?: string;
  title?: string;
  memo?: string;
  receiptId?: string;
  source: 'manual' | 'ai_receipt' | 'recurring';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ActorScope = 'actor' | 'household' | 'all';

export interface MonthlyBudget {
  id: string;
  householdId: string;
  month: string; // YYYY-MM
  actorScope: ActorScope;
  actorId?: string;
  categoryId: string;
  limitAmount: number;
  currency: Currency;
  alertThresholdPercent: number;
  rolloverEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetUsageItem {
  budgetId: string;
  categoryId: string;
  limitAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercent: number;
  status: 'ok' | 'warning' | 'over';
}

export interface BudgetUsageResponse {
  month: string;
  items: BudgetUsageItem[];
}

export interface CreateTransactionRequest {
  transactionType: TransactionType;
  transactionDate: string;
  amount: number;
  currency: Currency;
  actorId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  convertedAmount?: number;
  convertedCurrency?: Currency;
  exchangeRate?: string;
  title?: string;
  memo?: string;
}
