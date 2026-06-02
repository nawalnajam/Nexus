import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, Loader, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  user: { _id: string; name: string; avatar: string };
  recipient?: { _id: string; name: string; avatar: string };
  createdAt: string;
}

const statusColors: Record<string, any> = {
  pending:   'warning',
  completed: 'success',
  failed:    'error',
};

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance]           = useState(0);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [submitting, setSubmitting]     = useState(false);
  const [form, setForm]                 = useState({
    amount: '',
    recipientId: '',
    description: '',
  });

  const token = localStorage.getItem('nexus_access_token');

  // ── Fetch history ────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setBalance(data.balance);
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // ── Submit transaction ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const endpoints: Record<string, string> = {
      deposit:  '/payments/deposit',
      withdraw: '/payments/withdraw',
      transfer: '/payments/transfer',
    };

    const body: any = {
      amount:      Number(form.amount),
      description: form.description,
    };
    if (activeTab === 'transfer') body.recipientId = form.recipientId;

    try {
      const res  = await fetch(`${BASE_URL}${endpoints[activeTab]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`${activeTab} successful! ✅`);
        setForm({ amount: '', recipientId: '', description: '' });
        fetchHistory();
      } else {
        toast.error(data.message || 'Transaction failed');
      }
    } catch {
      toast.error('Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'deposit')    return <ArrowDownCircle size={18} className="text-green-500" />;
    if (type === 'withdrawal') return <ArrowUpCircle size={18} className="text-red-500" />;
    return <ArrowRightCircle size={18} className="text-blue-500" />;
  };

  const isIncoming = (t: Transaction) =>
    t.type === 'deposit' || String(t.recipient?._id) === String(user?._id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage your transactions</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary-600 text-white md:col-span-1">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Total Balance</p>
                <h2 className="text-3xl font-bold mt-1">${balance.toFixed(2)}</h2>
                <p className="text-primary-200 text-xs mt-1">USD</p>
              </div>
              <div className="p-4 bg-primary-500 rounded-full">
                <DollarSign size={28} className="text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardBody>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Total Deposits</p>
                <p className="text-xl font-semibold text-green-600">
                  ${transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((a, t) => a + t.amount, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Withdrawals</p>
                <p className="text-xl font-semibold text-red-500">
                  ${transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((a, t) => a + t.amount, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transfers</p>
                <p className="text-xl font-semibold text-blue-500">
                  ${transactions.filter(t => t.type === 'transfer' && t.status === 'completed').reduce((a, t) => a + t.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Transaction</h2>
          </CardHeader>
          <CardBody>
            {/* Tabs */}
            <div className="flex rounded-lg border border-gray-200 mb-4 overflow-hidden">
              {(['deposit', 'withdraw', 'transfer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {activeTab === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient User ID
                  </label>
                  <input
                    type="text"
                    required
                    value={form.recipientId}
                    onChange={e => setForm({ ...form, recipientId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="MongoDB user _id"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional note..."
                />
              </div>

              {activeTab === 'deposit' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-700">
                    🧪 <strong>Test Mode</strong> — Use card: <strong>4242 4242 4242 4242</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Any future date, any CVV</p>
                </div>
              )}

              <Button type="submit" fullWidth disabled={submitting}
                leftIcon={submitting ? <Loader size={16} className="animate-spin" /> : <CreditCard size={16} />}
              >
                {submitting ? 'Processing...' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader size={32} className="animate-spin text-primary-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {typeIcon(t.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{t.type}</p>
                          <p className="text-xs text-gray-500">{t.description || '—'}</p>
                          <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isIncoming(t) ? 'text-green-600' : 'text-red-500'}`}>
                          {isIncoming(t) ? '+' : '-'}${t.amount.toFixed(2)}
                        </p>
                        <Badge variant={statusColors[t.status]} size="sm">
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};