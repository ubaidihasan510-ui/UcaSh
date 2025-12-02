import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { User, Transaction, TransactionType, TransactionStatus } from './types';
import * as Storage from './services/storageService';
import * as Gemini from './services/geminiService';
import { Icons, Button, Input, Card, Modal } from './components/Components';

// ============================================================================
// SUB-COMPONENTS (PAGES)
// Defined here to keep single-file structure requirement manageable,
// though typically these would be in separate files.
// ============================================================================

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  // Hide nav on admin pages to maximize space
  if (p.startsWith('/admin')) return null;

  const NavItem = ({ to, icon: Icon, label }: any) => {
    const isActive = p === to;
    return (
      <button 
        onClick={() => navigate(to)}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-primary-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
      >
        <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-slate-200 dark:border-slate-800 h-16 pb-safe flex z-40 max-w-md mx-auto">
      <NavItem to="/dashboard" icon={Icons.Home} label="Home" />
      <NavItem to="/history" icon={Icons.History} label="History" />
      <NavItem to="/scan" icon={Icons.Scan} label="Scan" />
      <NavItem to="/assistant" icon={Icons.Bot} label="AI Help" />
      <NavItem to="/profile" icon={Icons.User} label="Profile" />
    </div>
  );
};

// --- AUTH PAGES ---

const Login = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ phone: '', pin: '', name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!formData.name || !formData.email) throw new Error("All fields required");
        const res = await Storage.register(formData.name, formData.phone, formData.pin, formData.email);
        if (res.success && res.data) onLogin(res.data);
        else setError(res.error || 'Registration failed');
      } else {
        const res = await Storage.login(formData.phone, formData.pin);
        if (res.success && res.data) onLogin(res.data);
        else setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-slate-50 dark:bg-dark-bg">
      <div className="mb-8 text-center animate-fade-in">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">UcaSh</h1>
        <p className="text-slate-500 mt-2">The future of secure payments.</p>
      </div>

      <Card className="animate-slide-up">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
             <>
               <Input 
                 placeholder="Full Name" 
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
               />
               <Input 
                 placeholder="Email Address" 
                 type="email"
                 value={formData.email}
                 onChange={e => setFormData({...formData, email: e.target.value})}
               />
             </>
          )}
          <Input 
            placeholder="Phone Number" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            icon={<Icons.Smartphone className="w-5 h-5" />}
          />
          <Input 
            placeholder="4-Digit PIN" 
            type="password"
            maxLength={6}
            value={formData.pin}
            onChange={e => setFormData({...formData, pin: e.target.value})}
          />
          
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}

          <Button type="submit" isLoading={loading}>
            {isRegister ? 'Sign Up' : 'Log In'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <button onClick={() => setIsRegister(!isRegister)} className="text-primary-600 text-sm font-medium hover:underline">
            {isRegister ? 'Already have an account? Log In' : 'New to UcaSh? Register'}
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- ADMIN PAGES ---

const AdminPanel = ({ user }: { user: User }) => {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only Admin allowed
    if (user.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    setData(Storage.getAdminStats());
  }, [user]);

  if (!data) return <div className="p-8 text-center">Loading Admin Data...</div>;

  const { users, transactions, stats } = data;

  // Chart data: Transaction status distribution
  const pieData = [
    { name: 'Success', value: transactions.filter((t: Transaction) => t.status === 'SUCCESS').length, color: '#10b981' },
    { name: 'Failed', value: transactions.filter((t: Transaction) => t.status === 'FAILED').length, color: '#ef4444' }
  ];

  return (
    <div className="p-5 pb-24 animate-fade-in">
       {/* Header */}
       <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icons.ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
           <p className="text-slate-400 text-xs uppercase mb-1">Total Users</p>
           <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </Card>
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none">
           <p className="text-primary-100 text-xs uppercase mb-1">Total Volume</p>
           <p className="text-3xl font-bold">${stats.totalVolume.toFixed(0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* User Table */}
        <Card className="overflow-hidden">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">System Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Role</th>
                  <th className="p-2 text-right">Bal</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((u: User) => (
                  <tr key={u.id} className="border-b dark:border-slate-800 last:border-0">
                    <td className="p-2 dark:text-slate-200">{u.name}</td>
                    <td className="p-2"><span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{u.role}</span></td>
                    <td className="p-2 text-right font-mono dark:text-slate-300">${u.balance.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length > 5 && <p className="text-xs text-center mt-2 text-slate-400">+{users.length - 5} more users</p>}
          </div>
        </Card>

        {/* Charts */}
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Transaction Health</h3>
          <div className="h-40 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={40} 
                  outerRadius={60} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Success</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Failed</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- MAIN PAGES ---

const Dashboard = ({ user, refreshUser }: { user: User, refreshUser: () => void }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [showPhone, setShowPhone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTxs(Storage.getUserTransactions(user.id).slice(0, 5));
  }, [user]);

  const allActions = [
    { label: 'Scan QR', icon: Icons.Scan, color: 'bg-indigo-500', path: '/scan' },
    { label: 'Send', icon: Icons.Send, color: 'bg-blue-500', path: '/send' },
    { label: 'Cash In', icon: Icons.Download, color: 'bg-emerald-500', path: '/add-money' },
    { label: 'Cash Out', icon: Icons.Plus, color: 'bg-orange-500', path: '/cash-out' },
    { label: 'Recharge', icon: Icons.Smartphone, color: 'bg-purple-500', path: '/recharge' },
    { label: 'Pay Bill', icon: Icons.Zap, color: 'bg-yellow-500', path: '/bill-pay' },
    { label: 'History', icon: Icons.History, color: 'bg-slate-500', path: '/history' },
  ];

  // Filter actions based on role
  let actions = allActions;

  if (user.role === 'ADMIN') {
    actions = actions.filter(a => a.label !== 'Send');
  }

  if (user.role === 'USER') {
    actions = actions.filter(a => a.label !== 'Cash In');
  }

  return (
    <div className="p-5 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-medium text-slate-500 dark:text-slate-400">Total Balance</h2>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">${user.balance.toFixed(2)}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
          {user.name.charAt(0)}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-6 text-white shadow-lg shadow-primary-500/20 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <div className="relative z-10">
          <p className="opacity-80 text-sm mb-1">UcaSh Secure Wallet</p>
          <div className="flex items-center gap-3 mb-6">
            <p className="text-2xl font-mono tracking-widest">
              {showPhone ? user.phone : `•••• •••• ${user.phone.slice(-4)}`}
            </p>
            <button onClick={() => setShowPhone(!showPhone)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              {showPhone ? <Icons.EyeOff className="w-5 h-5 opacity-80" /> : <Icons.Eye className="w-5 h-5 opacity-80" />}
            </button>
          </div>
          <div className="flex justify-between items-end">
             <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-medium">
               {user.role === 'ADMIN' ? 'ADMIN' : 'Active'}
             </div>
             <div className="text-right">
                <p className="text-[10px] opacity-70 uppercase">Card Holder</p>
                <p className="font-semibold text-sm">{user.name}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Action */}
      {user.role === 'ADMIN' && (
        <div className="mb-8">
           <Button onClick={() => navigate('/admin')} className="bg-slate-900 dark:bg-slate-700 shadow-xl shadow-slate-900/20">
              <Icons.User className="w-5 h-5" /> Open Admin Panel
           </Button>
        </div>
      )}

      {/* Quick Actions */}
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {actions.map((a) => (
          <div key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2 cursor-pointer group">
            <div className={`w-14 h-14 rounded-2xl ${a.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
              <a.icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">{a.label}</span>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
        <button onClick={() => navigate('/history')} className="text-primary-600 text-sm font-medium">View All</button>
      </div>
      <div className="space-y-3">
        {txs.length === 0 ? <p className="text-center text-slate-400 py-4">No transactions yet.</p> : txs.map(t => (
          <div key={t.id} className="bg-white dark:bg-dark-card p-4 rounded-xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                t.type === TransactionType.CASH_IN ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {t.type === TransactionType.CASH_IN ? <Icons.Download className="w-5 h-5" /> : <Icons.Send className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">{t.description}</p>
                <p className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
            <span className={`font-bold ${t.type === TransactionType.CASH_IN ? 'text-green-600' : 'text-slate-900 dark:text-slate-200'}`}>
              {t.type === TransactionType.CASH_IN ? '+' : '-'}${t.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScanPage = ({ user, refreshUser }: { user: User, refreshUser: () => void }) => {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [merchant, setMerchant] = useState<{name: string, id: string} | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Simulate scanning
  useEffect(() => {
    if (step === 'scan') {
      const timer = setTimeout(() => {
        // Randomly simulate finding a code
        // In real app, this would be a camera stream reader
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSimulatedScan = () => {
    // Mock Merchant
    setMerchant({ name: "Star Coffee House", id: "MERCH_88291" });
    setStep('pay');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (btoa(pin) !== user.pinHash) throw new Error("Incorrect PIN");
      
      const res = await Storage.createTransaction(
        user.id, 
        TransactionType.MERCHANT_PAY, 
        Number(amount), 
        merchant.name, 
        { merchantId: merchant.id }
      );

      if (res.success) {
        refreshUser();
        navigate('/dashboard');
        alert("Payment Successful to " + merchant.name);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'scan') {
    return (
      <div className="h-screen bg-black relative flex flex-col">
        {/* Camera Overlay */}
        <div className="absolute inset-0 z-0 bg-slate-900">
           {/* Simulated Camera Feed (Placeholder) */}
           <div className="w-full h-full opacity-30 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
        </div>
        
        {/* Header */}
        <div className="relative z-10 p-5 flex justify-between items-center text-white">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full bg-black/40 backdrop-blur-md">
            <Icons.ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Scan QR Code</h1>
          <div className="w-10"></div>
        </div>

        {/* Viewfinder */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-white text-center mb-8 opacity-80">Align QR code within the frame</div>
          
          <div 
            onClick={handleSimulatedScan}
            className="w-64 h-64 border-2 border-primary-500 rounded-3xl relative overflow-hidden cursor-pointer shadow-[0_0_100px_rgba(6,182,212,0.3)] bg-white/5 backdrop-blur-sm"
          >
             {/* Scanning Animation Line */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-scan-line opacity-80 shadow-[0_0_10px_#22d3ee]"></div>
             
             {/* Corner Markers */}
             <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-xl"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-xl"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-xl"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-xl"></div>
          </div>
          
          <p className="text-primary-300 text-xs mt-6 animate-pulse">(Tap the square to simulate scan)</p>
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 bg-black/80 backdrop-blur-lg p-6 rounded-t-3xl border-t border-white/10">
          <div className="flex justify-around text-white">
            <button className="flex flex-col items-center gap-2 opacity-100">
               <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center"><Icons.Scan className="w-6 h-6" /></div>
               <span className="text-xs">Scan</span>
            </button>
             <button className="flex flex-col items-center gap-2 opacity-50">
               <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><Icons.User className="w-6 h-6" /></div>
               <span className="text-xs">My Code</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  return (
    <div className="p-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setStep('scan')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icons.ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Merchant Payment</h1>
      </div>

      <Card className="mb-6 flex items-center gap-4 bg-primary-50 dark:bg-slate-800/50 border-primary-100 dark:border-slate-700">
         <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Icons.Scan className="w-6 h-6" />
         </div>
         <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Paying to</p>
            <p className="font-bold text-lg text-slate-900 dark:text-white">{merchant?.name}</p>
            <p className="text-xs text-slate-400">{merchant?.id}</p>
         </div>
      </Card>

      <Card>
        <form onSubmit={handlePayment} className="space-y-4">
          <Input 
            label="Amount to Pay"
            type="number"
            placeholder="$0.00"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Input 
            label="Enter PIN"
            type="password"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" isLoading={loading} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
            Confirm Payment
          </Button>
        </form>
      </Card>
    </div>
  );
};

const GenericTransactionPage = ({ user, type, title, refreshUser }: { user: User, type: TransactionType, title: string, refreshUser: () => void }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const ADMIN_PHONE = '01804985430';

  useEffect(() => {
    // If Cash Out, lock recipient to Admin
    if (type === TransactionType.CASH_OUT) {
      setRecipient(ADMIN_PHONE);
    }
  }, [type]);

  // Determine label based on type and role
  let recipientLabel = "Recipient / Account";
  if (type === TransactionType.CASH_OUT) recipientLabel = "Agent Number (Fixed)";
  if (type === TransactionType.CASH_IN && user.role === 'ADMIN') recipientLabel = "Credit to User (Phone)";

  const handleTransact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      // Very basic PIN check for simulation
      if (btoa(pin) !== user.pinHash) throw new Error("Incorrect PIN");
      
      const res = await Storage.createTransaction(user.id, type, Number(amount), recipient);
      if (res.success) {
        setStatus('success');
        refreshUser();
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setStatus('error');
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-fade-in text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Success!</h2>
        <p className="text-slate-500">Transaction completed successfully.</p>
      </div>
    );
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icons.ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold dark:text-white">{title}</h1>
      </div>

      <Card>
        <form onSubmit={handleTransact} className="space-y-4">
          <Input 
            label={recipientLabel}
            placeholder={type === TransactionType.MOBILE_RECHARGE ? "Mobile Number" : "Recipient Account"}
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            readOnly={type === TransactionType.CASH_OUT}
            className={type === TransactionType.CASH_OUT ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
          />
          <Input 
            label="Amount"
            type="number"
            placeholder="$0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Input 
            label="Enter PIN to Confirm"
            type="password"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          
          {status === 'error' && <p className="text-red-500 text-sm">{msg}</p>}

          <Button type="submit" isLoading={loading} className="mt-4">
            Confirm {title}
          </Button>
        </form>
      </Card>
    </div>
  );
};

const History = ({ user }: { user: User }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  
  useEffect(() => {
    setTxs(Storage.getUserTransactions(user.id));
  }, [user]);

  // Prepare data for chart
  const chartData = txs.slice(0, 7).reverse().map(t => ({
    name: new Date(t.timestamp).toLocaleDateString(undefined, {weekday:'short'}),
    amt: t.amount
  }));

  return (
    <div className="p-5 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Transaction History</h1>
      
      {/* Simple Chart */}
      <Card className="mb-6 h-48 flex flex-col justify-center">
        <p className="text-sm text-slate-500 mb-2">Last 7 Transactions Volume</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <Bar dataKey="amt" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{fill: 'transparent'}}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="space-y-4">
        {txs.map(t => (
          <div key={t.id} className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t.type.replace('_', ' ')}</p>
              <p className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{t.id}</p>
            </div>
            <div className="text-right">
              <span className={`block font-bold ${t.type === 'CASH_IN' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'CASH_IN' ? '+' : '-'}${t.amount}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Assistant = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: `Hi ${user.name}! I'm your UcaSh financial assistant. Ask me about your spending or for financial advice.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const query = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    const txs = Storage.getUserTransactions(user.id);
    const response = await Gemini.generateFinancialAdvice(query, txs, user.balance);

    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in bg-slate-50 dark:bg-dark-bg">
      <div className="p-4 bg-white dark:bg-dark-card border-b dark:border-slate-800 shadow-sm z-10">
        <h1 className="text-lg font-bold flex items-center gap-2 dark:text-white">
          <Icons.Bot className="text-primary-500" /> AI Financial Assistant
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-800 dark:text-slate-200 shadow-sm border dark:border-slate-700 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white dark:bg-dark-card border-t dark:border-slate-800">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-100 dark:bg-slate-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
            placeholder="Ask anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={loading} className="bg-primary-600 text-white p-3 rounded-xl disabled:opacity-50">
            <Icons.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Profile = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setDarkMode(true);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  return (
    <div className="p-5 pb-24 animate-fade-in">
      <div className="flex flex-col items-center mb-8 pt-4">
        <div className="w-24 h-24 bg-gradient-to-tr from-primary-400 to-blue-500 rounded-full flex items-center justify-center text-4xl text-white font-bold mb-4 shadow-lg">
          {user.name.charAt(0)}
        </div>
        <h2 className="text-xl font-bold dark:text-white">{user.name}</h2>
        <p className="text-slate-500">{user.email}</p>
        <span className="mt-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          {user.isKycVerified ? 'KYC Verified' : 'KYC Pending'}
        </span>
      </div>

      <div className="space-y-4">
        <Card className="flex items-center justify-between cursor-pointer" onClick={toggleTheme}>
          <span className="font-medium dark:text-white">Dark Mode</span>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-primary-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : ''}`} />
          </div>
        </Card>
        
        <Card className="cursor-pointer" onClick={() => alert('KYC Upload Feature Simulated')}>
          <span className="font-medium dark:text-white">Update KYC Document</span>
          <p className="text-xs text-slate-400 mt-1">Upload NID or Passport</p>
        </Card>

        <Card className="cursor-pointer" onClick={() => alert('Support Chat')}>
          <span className="font-medium dark:text-white">Help & Support</span>
        </Card>
        
        <Button variant="danger" onClick={onLogout} className="mt-8">
          <Icons.LogOut className="w-5 h-5" /> Logout
        </Button>
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-8">Version 1.0.0 • UcaSh</p>
    </div>
  );
};

// --- APP LAYOUT SHELL ---

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black flex justify-center">
      <div className="w-full max-w-md bg-slate-50 dark:bg-dark-bg min-h-screen relative shadow-2xl overflow-hidden">
        {children}
        <BottomNav />
      </div>
    </div>
  );
};

// --- ROOT COMPONENT ---

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    const currentUser = Storage.getCurrentUser();
    if (currentUser) setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    Storage.logout();
    setUser(null);
  };

  const refreshUser = () => {
    const u = Storage.getCurrentUser();
    if (u) setUser(u);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary-600 text-white">Loading UcaSh...</div>;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard user={user} refreshUser={refreshUser} />} />
        <Route path="/admin" element={<AdminPanel user={user} />} />
        <Route path="/scan" element={<ScanPage user={user} refreshUser={refreshUser} />} />
        <Route path="/send" element={<GenericTransactionPage user={user} type={TransactionType.SEND_MONEY} title="Send Money" refreshUser={refreshUser} />} />
        <Route path="/add-money" element={<GenericTransactionPage user={user} type={TransactionType.CASH_IN} title="Add Money" refreshUser={refreshUser} />} />
        <Route path="/cash-out" element={<GenericTransactionPage user={user} type={TransactionType.CASH_OUT} title="Cash Out" refreshUser={refreshUser} />} />
        <Route path="/recharge" element={<GenericTransactionPage user={user} type={TransactionType.MOBILE_RECHARGE} title="Mobile Recharge" refreshUser={refreshUser} />} />
        <Route path="/bill-pay" element={<GenericTransactionPage user={user} type={TransactionType.BILL_PAYMENT} title="Pay Bill" refreshUser={refreshUser} />} />
        <Route path="/history" element={<History user={user} />} />
        <Route path="/assistant" element={<Assistant user={user} />} />
        <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </MainLayout>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}