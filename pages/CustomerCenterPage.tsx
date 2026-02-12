
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, ShieldCheck, Shield, Lock, Users, Trash2, Ban, Pause, Play, 
  Terminal, Activity, Search, Eye, X, Filter, FileText, Banknote, 
  Car, Bike, Truck, RefreshCw, AlertCircle, TrendingUp, MoreVertical,
  ChevronRight, ReceiptText, Printer, Download, CreditCard, ExternalLink,
  Snowflake, History, Landmark, Gavel, UserX, Inbox, MessageSquare, CheckCircle, Mail,
  AlertTriangle, Hammer, ClipboardList, Flag, CheckCircle2, RotateCcw,
  Settings, Phone, EyeOff, UserPlus, Fingerprint, RefreshCcw, ShieldX, Database,
  ArrowUpRight, AlertOctagon, FileDown, Plus, Info, Zap, Clock, Loader2,
  Code, FileJson, Copy
} from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { PaymentRecord, AuditLog, User, UserStatus, PolicyStatus, Policy, ContactMessage, Claim, ClaimStatus, RiskLevel, KYCStatus, ComplianceStatus } from '../types';

type AdminTab = 'dashboard' | 'users' | 'policies' | 'payments' | 'claims' | 'audit';
type CustomerTab = 'protection' | 'documents' | 'payments' | 'claims';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const CustomerCenterPage: React.FC = () => {
  const { 
    user, isLoading, logout, 
    users, policies, payments, auditLogs, claims,
    updateUserStatus, updateUserRisk, setComplianceStatus, deleteUserPermanent, setKYCStatus, blockPayments,
    updatePolicyStatus, updatePolicyDetails, updatePaymentStatus, markPaymentDispute, updateClaimStatus,
    downloadPDF, generatePolicyPDF, submitClaim, checkAskMID, deletePolicy
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [customerTab, setCustomerTab] = useState<CustomerTab>('protection');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // MODAL STATES
  const [actingUser, setActingUser] = useState<User | null>(null);
  const [actingPolicy, setActingPolicy] = useState<Policy | null>(null);
  const [actingClaim, setActingClaim] = useState<Claim | null>(null);
  const [actingPayment, setActingPayment] = useState<PaymentRecord | null>(null);
  const [manifestPolicy, setManifestPolicy] = useState<Policy | null>(null);
  
  const [generatingPolicyId, setGeneratingPolicyId] = useState<string | null>(null);
  const [isFilingClaim, setIsFilingClaim] = useState(false);
  const [claimPolicyId, setClaimPolicyId] = useState('');
  const [claimType, setClaimType] = useState('Accident');
  const [claimDesc, setClaimDesc] = useState('');
  const [isClaimSubmitting, setIsClaimSubmitting] = useState(false);

  const [isCheckingMID, setIsCheckingMID] = useState(false);
  const [midCheckResult, setMidCheckResult] = useState<{ found: boolean; status?: string; message: string; vrm?: string } | null>(null);

  const [internalNotes, setInternalNotes] = useState('');
  const [riskFlag, setRiskFlag] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Low');

  // CRITICAL: Only display users with the 'customer' role in the Clients management section.
  const filteredUsers = useMemo(() => {
    const clientsOnly = users.filter(u => u.role === 'customer');
    if (!debouncedSearchQuery) return clientsOnly;
    const lower = debouncedSearchQuery.toLowerCase();
    return clientsOnly.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
  }, [users, debouncedSearchQuery]);

  const filteredPolicies = useMemo(() => {
    if (!debouncedSearchQuery) return policies;
    const lower = debouncedSearchQuery.toLowerCase();
    return policies.filter(p => p.id.toLowerCase().includes(lower) || p.details?.vrm?.toLowerCase().includes(lower));
  }, [policies, debouncedSearchQuery]);

  const filteredPayments = useMemo(() => {
    if (!debouncedSearchQuery) return payments;
    const lower = debouncedSearchQuery.toLowerCase();
    return payments.filter(p => 
      p.id.toLowerCase().includes(lower) || 
      p.policyId.toLowerCase().includes(lower) ||
      users.find(u => u.id === p.userId)?.name.toLowerCase().includes(lower)
    );
  }, [payments, debouncedSearchQuery, users]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" />;

  const isAdmin = user.role === 'admin';

  if (!isAdmin && ['Frozen', 'Blocked', 'Removed', 'Deleted'].includes(user.status)) {
    return (
      <div className="min-h-screen bg-[#2d1f2d] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[48px] p-12 shadow-2xl animate-in zoom-in-95">
           <Snowflake size={64} className="mx-auto mb-8 text-blue-500" />
           <h1 className="text-3xl font-black font-outfit text-[#2d1f2d] mb-4">Account Restricted</h1>
           <p className="text-gray-500 mb-10 leading-relaxed font-medium">Policy access and account features have been suspended by administrative command.</p>
           <button onClick={logout} className="w-full py-4 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Terminate Session</button>
        </div>
      </div>
    );
  }

  const myPolicies = policies.filter(p => p.userId === user.id);
  const myPayments = payments.filter(p => p.userId === user.id);
  const myClaims = claims.filter(c => c.userId === user.id);

  const handleDownloadEnhancedPDF = async (policy: Policy) => {
    if (!user) return;
    if (!policy.pdfUrl) {
      setGeneratingPolicyId(policy.id);
      try {
        await generatePolicyPDF(policy.id);
      } finally {
        setGeneratingPolicyId(null);
      }
    }
    downloadPDF(policy.id);
  };

  const handleCheckMID = async (vrm: string) => {
    setIsCheckingMID(true);
    setMidCheckResult(null);
    const result = await checkAskMID(vrm);
    setMidCheckResult({ ...result, vrm });
    setIsCheckingMID(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8fa] pb-20 font-inter text-[#2d1f2d]">
      <div className="absolute top-0 left-0 w-full h-[350px] bg-[#2d1f2d] z-0" />
      <div className="relative z-10 pt-16 max-w-7xl mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
               {isAdmin ? <Terminal className="text-[#e91e8c]" size={28} /> : <div className="text-2xl font-black text-[#e91e8c] font-outfit">{user.name.charAt(0)}</div>}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white font-outfit tracking-tighter">{isAdmin ? 'SwiftPolicy Command' : 'Dashboard'}</h1>
              <p className="text-white/50 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin/mid-status" className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all">
                MID Monitor
              </Link>
            )}
            <button onClick={logout} className="px-8 py-3 bg-white text-[#2d1f2d] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">Sign Out</button>
          </div>
        </div>

        {isAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1 space-y-3">
              {[
                { id: 'dashboard', label: 'System Health', icon: <TrendingUp size={18} /> },
                { id: 'users', label: 'Clients', icon: <Users size={18} /> },
                { id: 'policies', label: 'Policies', icon: <Shield size={18} /> },
                { id: 'payments', label: 'Payments', icon: <Landmark size={18} /> },
                { id: 'claims', label: 'Claims Engine', icon: <Hammer size={18} /> },
                { id: 'audit', label: 'Audit Log', icon: <History size={18} /> }
              ].map((item: any) => {
                const isTargetBlack = ['policies', 'payments', 'claims', 'audit'].includes(item.id);
                return (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id)} 
                    className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black text-xs transition-all text-left uppercase tracking-widest ${
                      activeTab === item.id 
                      ? 'bg-[#e91e8c] text-white shadow-lg' 
                      : `bg-white/5 hover:bg-white/10 ${isTargetBlack ? 'text-[#000000]' : 'text-white'}`
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-2xl min-h-[750px]">
                
                {activeTab === 'dashboard' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold mb-10 font-outfit">System Health</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {[
                         { label: 'Total Accounts', val: users.length, icon: <Users /> },
                         { label: 'Live Risk', val: policies.filter(p => p.status === 'Active').length, icon: <Activity /> },
                         { label: 'Fraud Suspicion', val: users.filter(u => u.isSuspicious || u.risk_flag).length, icon: <ShieldAlert className="text-red-500" /> },
                         { label: 'Active Policies', val: policies.length, icon: <Shield /> }
                       ].map((s, i) => (
                         <div key={i} className="p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                           <div className="mb-4 text-[#e91e8c]">{s.icon}</div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                           <p className="text-2xl font-black font-outfit text-[#2d1f2d]">{s.val}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-10">
                       <h2 className="text-3xl font-bold font-outfit">Clients</h2>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input className="bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-6 py-4 text-xs font-bold w-64 focus:border-[#e91e8c] outline-none" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                       </div>
                    </div>
                    
                    {filteredUsers.length === 0 ? (
                      <div className="py-40 text-center">
                        <Users size={48} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No clients found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-4">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              <th className="px-6 py-2">Client ID</th>
                              <th className="px-6 py-2">Full Name</th>
                              <th className="px-6 py-2">Email</th>
                              <th className="px-6 py-2">Status</th>
                              <th className="px-6 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map(u => (
                              <tr key={u.id} className="bg-gray-50 group hover:bg-white hover:shadow-xl transition-all rounded-[32px]">
                                <td className="px-6 py-5 rounded-l-[24px] text-[10px] font-mono font-bold text-gray-400">{u.id}</td>
                                <td className="px-6 py-5 font-bold text-sm">
                                  <button onClick={() => setActingUser(u)} className="hover:text-[#e91e8c] text-left">{u.name}</button>
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-500">{u.email}</td>
                                <td className="px-6 py-5">
                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    u.status === 'Active' ? 'bg-green-100 text-green-600' : 
                                    u.status === 'Frozen' ? 'bg-blue-100 text-blue-600' : 
                                    'bg-orange-100 text-orange-600'
                                  }`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="px-6 py-5 rounded-r-[24px] text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => { updateUserStatus(u.id, 'Frozen', 'Admin Action'); }}
                                      className="px-3 py-1.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-all"
                                    >
                                      Freeze
                                    </button>
                                    <button 
                                      onClick={() => { updateUserStatus(u.id, 'Removed', 'Admin Action'); }}
                                      className="px-3 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-all"
                                    >
                                      Remove
                                    </button>
                                    <button 
                                      onClick={() => { if(window.confirm('IRREVERSIBLE: Execute permanent deletion for ' + u.name + '?')) { deleteUserPermanent(u.id, 'Admin Permanent Deletion'); } }}
                                      className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-10">
                       <h2 className="text-3xl font-bold font-outfit">Policies</h2>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input className="bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-6 py-4 text-xs font-bold w-64 focus:border-[#e91e8c] outline-none" placeholder="Search policies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                       </div>
                    </div>
                    
                    {filteredPolicies.length === 0 ? (
                      <div className="py-40 text-center">
                        <Shield size={48} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No policies found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-4">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              <th className="px-6 py-2">Policy ID</th>
                              <th className="px-6 py-2">Linked Client</th>
                              <th className="px-6 py-2">Cover Type</th>
                              <th className="px-6 py-2">Status</th>
                              <th className="px-6 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPolicies.map(p => {
                              const owner = users.find(u => u.id === p.userId);
                              return (
                                <tr key={p.id} className="bg-gray-50 group hover:bg-white hover:shadow-xl transition-all rounded-[32px]">
                                  <td className="px-6 py-5 rounded-l-[24px]">
                                    <button onClick={() => setActingPolicy(p)} className="flex flex-col text-left">
                                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{p.id}</span>
                                      <span className="text-xs font-black text-[#e91e8c] uppercase">{p.details?.vrm}</span>
                                    </button>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm">{owner?.name || 'Unknown'}</span>
                                      <span className="text-[10px] text-gray-400">{owner?.email}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-sm font-medium">{p.type}</td>
                                  <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      p.status === 'Active' ? 'bg-green-100 text-green-600' : 
                                      p.status === 'Frozen' ? 'bg-blue-100 text-blue-600' : 
                                      'bg-red-100 text-red-600'
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 rounded-r-[24px] text-right">
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => { updatePolicyStatus(p.id, 'Frozen', 'Admin Action'); }}
                                        className="px-3 py-1.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-all"
                                      >
                                        Freeze
                                      </button>
                                      <button 
                                        onClick={() => { updatePolicyStatus(p.id, 'Cancelled', 'Admin Action'); }}
                                        className="px-3 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-all"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        onClick={() => { if(window.confirm('Delete Policy record ' + p.id + '?')) deletePolicy(p.id, 'Admin Manual Delete'); }}
                                        className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'payments' && (
                   <div className="animate-in fade-in duration-300">
                      <div className="flex justify-between items-center mb-10">
                        <h2 className="text-3xl font-bold font-outfit">Payments</h2>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input className="bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-6 py-4 text-xs font-bold w-64 focus:border-[#e91e8c] outline-none" placeholder="Search payments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                      </div>

                      {filteredPayments.length === 0 ? (
                        <div className="py-40 text-center">
                          <Landmark size={48} className="mx-auto text-gray-100 mb-6" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No payments found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-separate border-spacing-y-4">
                            <thead>
                              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="px-6 py-2">Payment ID</th>
                                <th className="px-6 py-2">Client</th>
                                <th className="px-6 py-2">Policy Number</th>
                                <th className="px-6 py-2">Amount (£)</th>
                                <th className="px-6 py-2">Status</th>
                                <th className="px-6 py-2">Date</th>
                                <th className="px-6 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPayments.map(p => {
                                const owner = users.find(u => u.id === p.userId);
                                return (
                                  <tr key={p.id} className="bg-gray-50 group hover:bg-white hover:shadow-xl transition-all rounded-[32px]">
                                    <td className="px-6 py-5 rounded-l-[24px] text-[10px] font-mono font-bold text-gray-400">{p.id}</td>
                                    <td className="px-6 py-5 font-bold text-sm">{owner?.name || 'Unknown'}</td>
                                    <td className="px-6 py-5 text-xs font-mono">{p.policyId}</td>
                                    <td className="px-6 py-5 font-black text-[#e91e8c]">{p.amount}</td>
                                    <td className="px-6 py-5">
                                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        p.status === 'Paid in Full' || p.status === 'Payment Successful' ? 'bg-green-100 text-green-600' : 
                                        p.status === 'Refunded' ? 'bg-gray-100 text-gray-600' : 
                                        p.status === 'Pending' ? 'bg-blue-100 text-blue-600' :
                                        'bg-red-100 text-red-600'
                                      }`}>
                                        {p.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-medium text-gray-400">{p.date.split('T')[0]}</td>
                                    <td className="px-6 py-5 rounded-r-[24px] text-right">
                                      <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => setActingPayment(p)}
                                          className="px-3 py-1.5 bg-gray-100 text-[#2d1f2d] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black hover:text-white transition-all"
                                        >
                                          View
                                        </button>
                                        <button 
                                          onClick={() => updatePaymentStatus(p.id, 'Refunded', 'Admin Manual Refund')}
                                          className="px-3 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-all"
                                        >
                                          Mark as Refunded
                                        </button>
                                        <button 
                                          onClick={() => updatePaymentStatus(p.id, 'Overdue', 'Admin Marked Failed')}
                                          className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all"
                                        >
                                          Mark as Failed
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                   </div>
                )}

                {activeTab === 'claims' && (
                   <div className="animate-in fade-in duration-300">
                      <h2 className="text-3xl font-bold mb-10 font-outfit">Claims Engine</h2>
                      {claims.length === 0 ? (
                        <div className="py-40 text-center">
                          <Hammer size={48} className="mx-auto text-gray-100 mb-6" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No claims submitted yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-separate border-spacing-y-4">
                            <thead>
                              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="px-6 py-2">Claim ID</th>
                                <th className="px-6 py-2">Policy No</th>
                                <th className="px-6 py-2">Status</th>
                                <th className="px-6 py-2">Created Date</th>
                                <th className="px-6 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {claims.map(c => (
                                <tr key={c.id} className="bg-gray-50 rounded-[32px]">
                                  <td className="px-6 py-5 rounded-l-[24px] text-[10px] font-mono font-bold text-gray-400">{c.id}</td>
                                  <td className="px-6 py-5 font-bold text-sm">{c.policyId}</td>
                                  <td className="px-6 py-5">
                                    <span className="px-3 py-1 bg-[#e91e8c] text-white rounded-full text-[8px] font-black uppercase tracking-widest">{c.status}</span>
                                  </td>
                                  <td className="px-6 py-5 text-xs font-medium text-gray-400">{c.date.split('T')[0]}</td>
                                  <td className="px-6 py-5 rounded-r-[24px] text-right">
                                    <button onClick={() => setActingClaim(c)} className="px-4 py-2 bg-[#2d1f2d] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black">Process</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                   </div>
                )}

                {activeTab === 'audit' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold mb-10 font-outfit">Audit Log</h2>
                    {auditLogs.length === 0 ? (
                      <div className="py-40 text-center text-gray-300">
                        <History size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No audit records available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map(log => (
                          <div key={log.id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center">
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <span className="px-2 py-0.5 bg-black text-white rounded-md text-[7px] font-black uppercase tracking-widest">{log.action}</span>
                                  <span className="text-[10px] font-bold text-[#2d1f2d]">{log.userEmail}</span>
                               </div>
                               <p className="text-xs text-gray-500">{log.details}</p>
                            </div>
                            <span className="text-[9px] font-mono text-gray-300">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 max-w-fit mx-auto backdrop-blur-sm">
                {(['protection', 'documents', 'payments', 'claims'] as CustomerTab[]).map(t => (
                  <button key={t} onClick={() => setCustomerTab(t)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${customerTab === t ? 'bg-[#e91e8c] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
             </div>

             {customerTab === 'protection' && (
               <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-14 rounded-[64px] shadow-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-12">
                       <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit">Active Protection</h2>
                       <button onClick={() => setIsFilingClaim(true)} className="px-6 py-3 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-black transition-all">
                          <Plus size={14} /> Report Incident
                       </button>
                    </div>
                    {myPolicies.length === 0 ? (
                      <div className="py-20 text-center text-gray-300">
                        <ShieldX size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No active protection found</p>
                        <Link to="/quote" className="text-[#e91e8c] font-black uppercase text-[10px] mt-4 block">Get Instant Cover</Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {myPolicies.map(p => (
                          <div key={p.id} className={`p-10 rounded-[48px] border flex items-center justify-between group transition-all ${p.status === 'Active' ? 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-xl' : 'bg-red-50/30 border-red-100 opacity-60 grayscale'}`}>
                              <div className="flex items-center gap-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${p.status === 'Active' ? 'bg-white text-[#e91e8c]' : 'bg-gray-200 text-gray-400'}`}>
                                  {p.type.includes('CAR') ? <Car size={32}/> : <Bike size={32}/>}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-[#2d1f2d] font-outfit uppercase">{p.details?.vrm}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                      <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Policy: {p.id}</p>
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      <p className={`font-black uppercase text-[10px] tracking-widest ${p.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                                          {p.status === 'Active' ? 'ENFORCED' : 'SUSPENDED'}
                                      </p>
                                    </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-3">
                                <p className="text-3xl font-black text-[#e91e8c] font-outfit">{p.premium}</p>
                                <div className="flex gap-2">
                                    <button 
                                      disabled={isCheckingMID || p.status !== 'Active'}
                                      onClick={() => handleCheckMID(p.details?.vrm)}
                                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2d1f2d] hover:text-white transition-all disabled:opacity-30"
                                    >
                                      {isCheckingMID ? <RefreshCw className="animate-spin" size={14}/> : <Database size={14}/>} 
                                      Verify askMID
                                    </button>
                                    {p.status === 'Active' && (
                                      <button 
                                        disabled={generatingPolicyId === p.id}
                                        onClick={() => handleDownloadEnhancedPDF(p)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#e91e8c] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c4167a] transition-all shadow-lg"
                                      >
                                        {generatingPolicyId === p.id ? <><RefreshCw size={14} className="animate-spin"/> Initializing...</> : <><FileDown size={14}/> PDF Policy</>}
                                      </button>
                                    )}
                                </div>
                              </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
             )}

             {customerTab === 'documents' && (
               <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-14 rounded-[64px] shadow-2xl border border-gray-100 min-h-[500px]">
                    <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit mb-12">Document Vault</h2>
                    <div className="space-y-6">
                      {myPolicies.map(p => (
                        <div key={p.id} className="p-10 bg-gray-50 rounded-[48px] border border-gray-100 flex items-center justify-between">
                           <div className="flex items-center gap-8">
                              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-lg"><FileText size={32}/></div>
                              <div>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Policy Statement • {p.id}</p>
                                 <h3 className="text-xl font-bold text-[#2d1f2d] font-outfit uppercase">Certificate of Motor Insurance</h3>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button onClick={() => setManifestPolicy(p)} className="px-6 py-4 bg-white border border-gray-100 text-[#2d1f2d] rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
                                 <FileJson size={16}/> View Manifest
                              </button>
                              <button 
                                disabled={p.status !== 'Active'}
                                onClick={() => handleDownloadEnhancedPDF(p)}
                                className="px-8 py-4 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-black transition-all shadow-xl disabled:opacity-30"
                              >
                                 <Printer size={16}/> Download PDF
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* CLIENT MANAGEMENT MODAL */}
      {actingUser && (
        <div className="fixed inset-0 z-[100] bg-[#2d1f2d]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-3xl rounded-[48px] p-12 relative shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setActingUser(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-xl hover:bg-red-50 text-gray-400 transition-all"><X size={20}/></button>
              
              <div className="flex items-center gap-6 mb-10">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-white text-2xl ${actingUser.status === 'Active' ? 'bg-[#2d1f2d]' : 'bg-red-500'}`}>{actingUser.name.charAt(0)}</div>
                <div>
                   <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit">Client Account: {actingUser.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${actingUser.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{actingUser.status}</span>
                      <span className="text-[10px] font-medium text-gray-400">{actingUser.email}</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Identity Overrides</h3>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => { updateUserStatus(actingUser.id, 'Active', 'Admin Manual Override'); setActingUser(null); }} className="p-4 border border-green-200 rounded-xl text-green-600 font-black uppercase text-[8px] tracking-widest hover:bg-green-600 hover:text-white transition-all">Enable</button>
                       <button onClick={() => { updateUserStatus(actingUser.id, 'Frozen', 'Admin Manual Freeze'); setActingUser(null); }} className="p-4 border border-blue-200 rounded-xl text-blue-600 font-black uppercase text-[8px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">Freeze</button>
                       <button onClick={() => { updateUserStatus(actingUser.id, 'Removed', 'Admin Manual Removal'); setActingUser(null); }} className="p-4 border border-orange-200 rounded-xl text-orange-600 font-black uppercase text-[8px] tracking-widest hover:bg-orange-600 hover:text-white transition-all">Remove</button>
                       <button onClick={() => { if(window.confirm('IRREVERSIBLE: Execute permanent deletion?')) { deleteUserPermanent(actingUser.id, 'Admin Hard Purge'); setActingUser(null); } }} className="p-4 border border-red-200 rounded-xl text-red-600 font-black uppercase text-[8px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Purge</button>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Risk Assessment</h3>
                       <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none" placeholder="Internal notes..." rows={4} />
                       <button onClick={() => { updateUserRisk(actingUser.id, riskLevel, riskFlag, internalNotes); setActingUser(null); }} className="w-full py-4 bg-[#2d1f2d] text-white rounded-[24px] font-black uppercase tracking-widest text-[9px] shadow-lg">Save Assessment</button>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Associated Policies</h3>
                       <div className="space-y-2">
                          {policies.filter(p => p.userId === actingUser.id).map(p => (
                            <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                               <div>
                                  <p className="text-[9px] font-bold text-[#2d1f2d]">{p.id}</p>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{p.details?.vrm}</p>
                               </div>
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${p.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{p.status}</span>
                            </div>
                          ))}
                          {policies.filter(p => p.userId === actingUser.id).length === 0 && <p className="text-[10px] text-gray-400 italic">No policies on file.</p>}
                       </div>
                    </div>

                    <div>
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Recent Ledger</h3>
                       <div className="space-y-2">
                          {payments.filter(pay => pay.userId === actingUser.id).slice(0, 3).map(pay => (
                            <div key={pay.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                               <div>
                                  <p className="text-[9px] font-bold text-[#2d1f2d]">{pay.amount}</p>
                                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">{pay.date.split('T')[0]}</p>
                               </div>
                               <CheckCircle2 size={12} className="text-green-500" />
                            </div>
                          ))}
                          {payments.filter(pay => pay.userId === actingUser.id).length === 0 && <p className="text-[10px] text-gray-400 italic">No payments recorded.</p>}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* POLICY OPERATIONS MODAL */}
      {actingPolicy && (
        <div className="fixed inset-0 z-[100] bg-[#2d1f2d]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[48px] p-12 relative shadow-2xl animate-in zoom-in-95 duration-300">
              <button onClick={() => setActingPolicy(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-xl text-gray-400 transition-all"><X size={20}/></button>
              
              <div className="mb-10">
                 <h2 className="text-3xl font-bold font-outfit">Policy Operations: {actingPolicy.id}</h2>
                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">Status: <span className={actingPolicy.status === 'Active' ? 'text-green-600' : 'text-red-500'}>{actingPolicy.status}</span></p>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                       <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Asset Holder</p>
                       <p className="text-sm font-bold text-[#2d1f2d] truncate">{users.find(u => u.id === actingPolicy.userId)?.name || 'N/A'}</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                       <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Type</p>
                       <p className="text-sm font-bold text-[#2d1f2d]">{actingPolicy.type}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Risk States</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => { updatePolicyStatus(actingPolicy.id, 'Active', 'Admin Activation'); setActingPolicy(null); }} className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-green-600 hover:bg-green-50 transition-all">Enable</button>
                       <button onClick={() => { updatePolicyStatus(actingPolicy.id, 'Frozen', 'Admin Suspension'); setActingPolicy(null); }} className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all">Freeze</button>
                       <button onClick={() => { updatePolicyStatus(actingPolicy.id, 'Cancelled', 'Admin Termination'); setActingPolicy(null); }} className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50 transition-all">Cancel</button>
                       <button onClick={() => { if(window.confirm('IRREVERSIBLE: Purge policy ' + actingPolicy.id + '?')) { deletePolicy(actingPolicy.id, 'Admin Manual Delete'); setActingPolicy(null); } }} className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all">Purge</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PAYMENT DETAILS MODAL (READ-ONLY) */}
      {actingPayment && (
        <div className="fixed inset-0 z-[100] bg-[#2d1f2d]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[48px] p-12 relative shadow-2xl animate-in zoom-in-95 duration-300">
              <button onClick={() => setActingPayment(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-xl hover:bg-red-50 text-gray-400 transition-all"><X size={20}/></button>
              
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-lg"><Banknote size={32}/></div>
                <div>
                   <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit">Payment Transaction</h2>
                   <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Reference: {actingPayment.reference}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-[#2d1f2d]">{actingPayment.status}</p>
                 </div>
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Amount</p>
                    <p className="text-sm font-bold text-[#e91e8c]">{actingPayment.amount}</p>
                 </div>
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Policy ID</p>
                    <p className="text-sm font-bold text-[#2d1f2d]">{actingPayment.policyId}</p>
                 </div>
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Date</p>
                    <p className="text-sm font-bold text-[#2d1f2d]">{new Date(actingPayment.date).toLocaleString()}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Update Transaction State</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { updatePaymentStatus(actingPayment.id, 'Refunded', 'Admin Action'); setActingPayment(null); }}
                      className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50 transition-all"
                    >
                      Mark as Refunded
                    </button>
                    <button 
                      onClick={() => { updatePaymentStatus(actingPayment.id, 'Overdue', 'Admin Action'); setActingPayment(null); }}
                      className="p-5 border-2 border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all"
                    >
                      Mark as Failed
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CustomerCenterPage;
