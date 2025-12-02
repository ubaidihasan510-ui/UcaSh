
import { User, Transaction, TransactionType, TransactionStatus, ApiResult } from '../types';

const USERS_KEY = 'ucash_users';
const TRANSACTIONS_KEY = 'ucash_transactions';
const CURRENT_USER_KEY = 'ucash_current_user';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DATABASE SIMULATION
 */
const getDbUsers = (): User[] => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

const saveDbUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const getDbTransactions = (): Transaction[] => {
  const txs = localStorage.getItem(TRANSACTIONS_KEY);
  return txs ? JSON.parse(txs) : [];
};

const saveDbTransactions = (txs: Transaction[]) => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
};

/**
 * AUTH SERVICE
 */
export const register = async (name: string, phone: string, pin: string, email: string): Promise<ApiResult<User>> => {
  await delay(800); // Simulate network latency
  const users = getDbUsers();
  
  if (users.find(u => u.phone === phone)) {
    return { success: false, error: 'Phone number already registered.' };
  }

  const newUser: User = {
    id: generateId(),
    name,
    phone,
    email,
    pinHash: btoa(pin), // SIMPLE MOCK HASH - DO NOT USE IN PRODUCTION
    balance: 500.00, // Sign up bonus
    isKycVerified: false,
    role: 'USER',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveDbUsers(users);
  
  // Auto login
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return { success: true, data: newUser };
};

export const login = async (phone: string, pin: string): Promise<ApiResult<User>> => {
  await delay(800);
  let users = getDbUsers();

  const ADMIN_PHONE = '01804985430';
  const ADMIN_PIN = '558510';

  // --- SEED ADMIN IF NOT EXISTS ---
  // If user tries to login with the specific admin phone and it doesn't exist, create it.
  if (phone === ADMIN_PHONE) {
    const existingAdmin = users.find(u => u.phone === ADMIN_PHONE);
    if (!existingAdmin) {
      const adminUser: User = {
        id: 'admin_master_specific',
        name: 'System Administrator',
        phone: ADMIN_PHONE,
        email: 'admin@ucash.com',
        pinHash: btoa(ADMIN_PIN),
        balance: 1000000.00,
        isKycVerified: true,
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      };
      users.push(adminUser);
      saveDbUsers(users);
      // Reload users from storage to ensure we have the latest reference
      users = getDbUsers();
    }
  }
  // --------------------------------

  const user = users.find(u => u.phone === phone && u.pinHash === btoa(pin));

  if (!user) {
    return { success: false, error: 'Invalid phone or PIN.' };
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, data: user };
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const u = localStorage.getItem(CURRENT_USER_KEY);
  return u ? JSON.parse(u) : null;
};

/**
 * ADMIN SERVICE
 */
export const getAdminStats = () => {
  const users = getDbUsers();
  const transactions = getDbTransactions();
  
  const totalUsers = users.length;
  const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
  const activeUsers = users.filter(u => transactions.some(t => t.userId === u.id)).length;

  return {
    users,
    transactions,
    stats: {
      totalUsers,
      totalVolume,
      activeUsers
    }
  };
};

/**
 * TRANSACTION SERVICE
 */
export const createTransaction = async (
  userId: string,
  type: TransactionType,
  amount: number,
  recipient?: string,
  metadata?: any
): Promise<ApiResult<Transaction>> => {
  await delay(1000);
  
  const users = getDbUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return { success: false, error: 'User not found' };

  const user = users[userIndex];
  
  // Calculate Fee
  let fee = 0;
  if (type === TransactionType.CASH_OUT) fee = amount * 0.0185; // 1.85%
  if (type === TransactionType.SEND_MONEY && amount > 100) fee = 5; 

  const totalDeduction = amount + fee;

  // Check balance for outgoing (non-CashIn) transactions
  if (type !== TransactionType.CASH_IN && user.balance < totalDeduction) {
    return { success: false, error: 'Insufficient balance' };
  }

  // === HANDLE BALANCE UPDATES ===

  if (type === TransactionType.CASH_IN) {
    // Logic for Cash In (Add Money)
    if (user.role === 'ADMIN' && recipient) {
      // ADMIN FEATURE: Cash In to a specific user (Credit User)
      const recipientIndex = users.findIndex(u => u.phone === recipient);
      if (recipientIndex === -1) {
        return { success: false, error: 'Recipient user not found. Please check the phone number.' };
      }
      users[recipientIndex].balance += amount;
      // Note: We do not deduct from Admin balance for "System Cash In" operations, 
      // effectively treating Admin as the mint/gateway.
    } else {
      // STANDARD FEATURE: User adding money to themselves (Bank/Card simulation)
      user.balance += amount;
    }
  } else {
    // Logic for Send Money, Cash Out, Bill Pay, etc.
    user.balance -= totalDeduction;

    // Credit Recipient if applicable
    if ((type === TransactionType.SEND_MONEY || type === TransactionType.CASH_OUT) && recipient) {
      const recipientIndex = users.findIndex(u => u.phone === recipient);
      if (recipientIndex !== -1) {
        users[recipientIndex].balance += amount;
      }
    }
  }

  // Save User State (Persist changes to sender and recipient)
  users[userIndex] = user;
  saveDbUsers(users);
  
  // Update Current Session if it's the logged-in user
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

  // Create Transaction Record
  const tx: Transaction = {
    id: generateId(),
    userId,
    type,
    amount,
    fee,
    recipient,
    status: TransactionStatus.SUCCESS,
    timestamp: new Date().toISOString(),
    metadata,
    description: getDescription(type, recipient, user.role)
  };

  const allTxs = getDbTransactions();
  allTxs.unshift(tx); // Add to top
  saveDbTransactions(allTxs);

  return { success: true, data: tx };
};

export const getUserTransactions = (userId: string): Transaction[] => {
  const all = getDbTransactions();
  return all.filter(t => t.userId === userId || t.recipient === getUserPhone(userId));
};

// Helper
const getUserPhone = (userId: string): string => {
  const users = getDbUsers();
  return users.find(u => u.id === userId)?.phone || '';
};

const getDescription = (type: TransactionType, recipient?: string, userRole?: string) => {
  switch (type) {
    case TransactionType.SEND_MONEY: return `Sent to ${recipient}`;
    case TransactionType.CASH_IN: 
      return (userRole === 'ADMIN' && recipient) ? `Agent Cash In to ${recipient}` : 'Bank Transfer / Card';
    case TransactionType.CASH_OUT: return `Cash out to ${recipient}`;
    case TransactionType.MOBILE_RECHARGE: return `Recharge for ${recipient}`;
    case TransactionType.BILL_PAYMENT: return 'Bill Payment';
    case TransactionType.MERCHANT_PAY: return `Payment to ${recipient}`;
    default: return 'Transaction';
  }
};
