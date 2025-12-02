
// Enums for strict typing
export enum TransactionType {
  SEND_MONEY = 'SEND_MONEY',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  MOBILE_RECHARGE = 'MOBILE_RECHARGE',
  BILL_PAYMENT = 'BILL_PAYMENT',
  MERCHANT_PAY = 'MERCHANT_PAY'
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED'
}

// Database Schema Simulation: User
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  pinHash: string; // Simulated hash
  balance: number;
  avatarUrl?: string;
  isKycVerified: boolean;
  role: 'USER' | 'AGENT' | 'MERCHANT' | 'ADMIN';
  createdAt: string;
}

// Database Schema Simulation: Transaction
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  fee: number;
  recipient?: string; // Phone number or Merchant ID
  reference?: string;
  status: TransactionStatus;
  timestamp: string;
  description?: string;
  metadata?: {
    operator?: string;
    billType?: string;
    merchantName?: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string; // Simulated JWT
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
