
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
  ArrowUpRight, AlertOctagon, FileDown
} from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { PaymentRecord, AuditLog, User, UserStatus, PolicyStatus, Policy, ContactMessage, Claim, ClaimStatus, RiskLevel, KYCStatus, ComplianceStatus } from '../types';

type AdminTab = 'dashboard' | 'users' | 'policies' | 'payments' | 'claims' | 'audit';

// Custom hook for debouncing search query
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
    downloadPDF, generatePolicyPDF // Newly exposed additive methods
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // ACTION MODAL STATES
  const [actingUser, setActingUser] = useState<User | null>(null);
  const [actingPolicy, setActingPolicy] = useState<Policy | null>(null);
  const [actingClaim, setActingClaim] = useState<Claim | null>(null);
  const [actingPayment, setActingPayment] = useState<PaymentRecord | null>(null);
  
  const [internalNotes, setInternalNotes] = useState('');
  const [riskFlag, setRiskFlag] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Low');

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users;
    const lower = debouncedSearchQuery.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
  }, [users, debouncedSearchQuery]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" />;

  const isAdmin = user.role === 'admin';

  if (!isAdmin && user.status === 'Frozen') {
    return (
      <div className="min-h-screen bg-[#2d1f2d] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[48px] p-12 shadow-2xl animate-in zoom-in-95">
           <Snowflake size={64} className="mx-auto mb-8 text-blue-500" />
           <h1 className="text-3xl font-black font-outfit text-[#2d1f2d] mb-4">Account Frozen</h1>
           <p className="text-gray-500 mb-10 leading-relaxed font-medium">Policy access restricted by administration.</p>
           <button onClick={logout} className="w-full py-4 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Terminate Session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8fa] pb-20 font-inter">
      <div className="absolute top-0 left-0 w-full h-[350px] bg-[#2d1f2d] z-0" />
      <div className="relative z-10 pt-16 max-w-7xl mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
               {isAdmin ? <Terminal className="text-[#e91e8c]" size={28} /> : <div className="text-2xl font-black text-[#e91e8c] font-outfit">{user.name.charAt(0)}</div>}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white font-outfit tracking-tighter">{isAdmin ? 'SwiftPolicy Command' : 'My Portal'}</h1>
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
            <div className="lg:col-span-1 space-y-2">
              {[
                { id: 'dashboard', label: 'System Health', icon: <TrendingUp size={18} /> },
                { id: 'users', label: 'Identity Hub', icon: <Users size={18} /> },
                { id: 'policies', label: 'Risk Portfolio', icon: <Shield size={18} /> },
                { id: 'payments', label: 'Financial Ledger', icon: <Landmark size={18} /> },
                { id: 'claims', label: 'Claims Engine', icon: <Hammer size={18} /> },
                { id: 'audit', label: 'Audit Log', icon: <History size={18} /> }
              ].map((item: any) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black text-xs transition-all text-left uppercase tracking-widest ${activeTab === item.id ? 'bg-[#e91e8c] text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-2xl min-h-[750px]">
                
                {activeTab === 'dashboard' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Fleet Status</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {[
                         { label: 'Total Accounts', val: users.length, icon: <Users /> },
                         { label: 'Live Risk', val: policies.filter(p => p.status === 'Active').length, icon: <Activity /> },
                         { label: 'Fraud Suspicion', val: users.filter(u => u.isSuspicious || u.risk_flag).length, icon: <ShieldAlert className="text-red-500" /> },
                         { label: 'Active Policies', val: policies.length, icon: <Shield /> }
                       ].map((s, i) => (
                         <div key={i} className="p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                           <div className="mb-4">{s.icon}</div>
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
                       <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit">Identity Hub</h2>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input className="bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-6 py-4 text-xs font-bold w-64 focus:border-[#e91e8c] outline-none" placeholder="Filter identities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                       </div>
                    </div>
                    <div className="space-y-4">
                       {filteredUsers.map(u => (
                         <div key={u.id} className="p-6 bg-gray-50 border border-gray-100 rounded-[32px] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                            <div className="flex items-center gap-5">
                               <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${u.isSuspicious || u.risk_flag ? 'bg-red-500 animate-pulse' : 'bg-[#2d1f2d]'}`}>{u.name.charAt(0)}</div>
                               <div>
                                  <p className="text-lg font-bold text-[#2d1f2d]">{u.name}</p>
                                  <p className="text-xs text-gray-400 font-medium">{u.email} • {u.id}</p>
                                  <div className="flex gap-2 mt-2">
                                     <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.status}</span>
                                     {u.risk_flag && <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-red-600 text-white tracking-widest">HIGH RISK</span>}
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => setActingUser(u)} className="p-4 bg-white text-[#2d1f2d] rounded-xl border border-gray-100 hover:bg-[#e91e8c] hover:text-white transition-all shadow-sm"><Settings size={18}/></button>
                               <button onClick={() => { if(window.confirm('IRREVERSIBLE: Execute permanent PII purge?')) { deleteUserPermanent(u.id, 'Admin Cleanup'); } }} className="p-4 bg-white text-red-500 rounded-xl border border-gray-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Risk Portfolio</h2>
                    <div className="space-y-4">
                       {policies.map(p => (
                         <div key={p.id} className="p-8 bg-gray-50 border border-gray-100 rounded-[40px] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#e91e8c] shadow-lg">{p.type.includes('CAR') ? <Car size={24}/> : <Bike size={24}/>}</div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.id} • {p.details?.vrm}</p>
                                  <p className="text-lg font-bold text-[#2d1f2d]">{p.premium}</p>
                                  <div className="flex gap-2 mt-2">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{p.status}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               {p.status === 'Active' && (
                                 <button 
                                   onClick={() => p.pdfUrl ? downloadPDF(p.id) : generatePolicyPDF(p.id)}
                                   className="p-4 bg-white text-blue-500 rounded-xl border border-gray-100 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                   title="Admin: Download/Regenerate Policy PDF"
                                 >
                                   {p.pdfUrl ? <Download size={18}/> : <RefreshCw size={18} className="animate-spin-slow"/>}
                                 </button>
                               )}
                               <button onClick={() => setActingPolicy(p)} className="p-4 bg-white text-[#2d1f2d] rounded-xl border border-gray-100 hover:bg-black hover:text-white transition-all shadow-sm"><Hammer size={18}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                   <div className="animate-in fade-in duration-300">
                      <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Financial Ledger</h2>
                      <div className="space-y-4">
                         {payments.map(p => (
                            <div key={p.id} className="p-8 bg-gray-50 border border-gray-100 rounded-[40px] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.id} • {p.date.split('T')[0]}</p>
                                  <p className="text-xl font-black text-[#e91e8c] font-outfit">{p.amount}</p>
                                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'Paid in Full' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{p.status}</span>
                               </div>
                               <button onClick={() => setActingPayment(p)} className="p-4 bg-white text-[#2d1f2d] rounded-xl border border-gray-100 hover:bg-black hover:text-white transition-all shadow-sm"><CreditCard size={18}/></button>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                {activeTab === 'claims' && (
                   <div className="animate-in fade-in duration-300">
                      <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Claims Engine</h2>
                      <div className="space-y-4">
                         {claims.map(c => (
                            <div key={c.id} className="p-10 bg-gray-50 border border-gray-100 rounded-[48px] flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all">
                               <div>
                                  <div className="flex items-center gap-3 mb-4">
                                     <span className="px-3 py-1 bg-[#e91e8c] text-white rounded-full text-[8px] font-black uppercase tracking-widest">{c.status}</span>
                                  </div>
                                  <h3 className="text-xl font-bold text-[#2d1f2d] font-outfit mb-2">{c.type} Claim</h3>
                                  <p className="text-gray-500 text-sm italic">"{c.description}"</p>
                               </div>
                               <button onClick={() => setActingClaim(c)} className="px-8 py-4 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl">Process Case</button>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                {activeTab === 'audit' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Audit Trail</h2>
                    <div className="space-y-3">
                      {auditLogs.map(log => (
                        <div key={log.id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                          <div className="flex justify-between items-center mb-1">
                             <span className="px-2 py-0.5 bg-black text-white rounded-md text-[7px] font-black uppercase tracking-widest">{log.action}</span>
                             <span className="text-[9px] font-mono text-gray-300">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs font-bold text-[#2d1f2d]">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : (
          /* CUSTOMER VIEW */
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-14 rounded-[64px] shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-12">
                   <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit">Active Protection</h2>
                   <div className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Database size={14} /> National MID Updated
                   </div>
                </div>
                <div className="space-y-6">
                   {policies.filter(p => p.userId === user.id).map(p => (
                     <div key={p.id} className="p-10 bg-gray-50 rounded-[48px] border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                        <div className="flex items-center gap-8">
                           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#e91e8c] shadow-lg">{p.type.includes('CAR') ? <Car size={32}/> : <Bike size={32}/>}</div>
                           <div>
                              <h3 className="text-2xl font-bold text-[#2d1f2d] font-outfit uppercase">{p.details?.vrm}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                 <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Policy: {p.id}</p>
                                 <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                 <p className={`font-black uppercase text-[10px] tracking-widest ${p.midStatus === 'Success' ? 'text-green-500' : 'text-blue-500'}`}>
                                    {p.midStatus === 'Success' ? 'MID LIVE' : 'SYNCING TO MID'}
                                 </p>
                              </div>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-3">
                           <p className="text-3xl font-black text-[#e91e8c] font-outfit">{p.premium}</p>
                           <div className="flex flex-col gap-2 items-end">
                              <Link to="/contact" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#e91e8c]">Get Certificate <Download size={12} /></Link>
                              {p.status === 'Active' && (
                                <button 
                                  onClick={() => p.pdfUrl ? downloadPDF(p.id) : generatePolicyPDF(p.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#e91e8c] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c4167a] transition-all shadow-lg shadow-pink-900/10"
                                >
                                  {p.pdfUrl ? <><FileDown size={14}/> Download Policy (PDF)</> : <><RefreshCw size={14} className="animate-spin"/> Generating...</>}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="p-10 bg-[#2d1f2d] rounded-[48px] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-2xl font-bold font-outfit mb-2">Compliance Notice</h3>
                   <p className="text-white/40 text-sm max-w-md">Your policy is live on the national Motor Insurance Database.</p>
                </div>
                <button onClick={() => window.open('https://www.askmid.com', '_blank')} className="relative z-10 px-8 py-4 bg-[#e91e8c] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-[#c4167a] transition-all">Check askMID Status</button>
                <Database className="absolute -bottom-10 -right-10 w-48 h-48 opacity-5 text-white" />
             </div>
          </div>
        )}
      </div>

      {/* ADMIN CONTROL MODALS */}
      {actingUser && (
        <div className="fixed inset-0 z-[100] bg-[#2d1f2d]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[48px] p-12 relative shadow-2xl animate-in zoom-in-95 duration-300">
              <button onClick={() => setActingUser(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-xl hover:bg-red-50 text-gray-400 transition-all"><X size={20}/></button>
              <h2 className="text-3xl font-bold text-[#2d1f2d] mb-2 font-outfit">Identity Control</h2>
              <div className="space-y-8 mt-10">
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { updateUserStatus(actingUser.id, 'Active', 'Admin Restored'); setActingUser(null); }} className="p-4 border border-green-200 rounded-xl text-green-600 font-black uppercase text-[8px] tracking-widest hover:bg-green-600 hover:text-white transition-all">ACTIVATE</button>
                    <button onClick={() => { updateUserStatus(actingUser.id, 'Frozen', 'Admin Freeze'); setActingUser(null); }} className="p-4 border border-blue-200 rounded-xl text-blue-600 font-black uppercase text-[8px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">FREEZE</button>
                    <button onClick={() => { updateUserStatus(actingUser.id, 'Blocked', 'Admin Block'); setActingUser(null); }} className="p-4 border border-red-200 rounded-xl text-red-600 font-black uppercase text-[8px] tracking-widest hover:bg-red-600 hover:text-white transition-all">BLOCK</button>
                 </div>
                 <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none" placeholder="Administrative notes..." rows={4} />
                 <button onClick={() => { updateUserRisk(actingUser.id, riskLevel, riskFlag, internalNotes); setActingUser(null); }} className="w-full py-5 bg-[#2d1f2d] text-white rounded-[32px] font-black uppercase tracking-widest text-[10px]">Commit Profile</button>
              </div>
           </div>
        </div>
      )}

      {actingPolicy && (
        <div className="fixed inset-0 z-[100] bg-[#2d1f2d]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[48px] p-12 relative shadow-2xl animate-in zoom-in-95 duration-300">
              <button onClick={() => setActingPolicy(null)} className="absolute top-10 right-10 p-4 bg-gray-50 rounded-xl text-gray-400 transition-all"><X size={20}/></button>
              <h2 className="text-3xl font-bold text-[#2d1f2d] mb-10 font-outfit">Policy Controller</h2>
              <div className="grid grid-cols-2 gap-3">
                 {['Active', 'Frozen', 'Cancelled', 'Terminated'].map(s => (
                   <button key={s} onClick={() => { updatePolicyStatus(actingPolicy.id, s as PolicyStatus, 'Admin override'); setActingPolicy(null); }} className="p-5 border-2 border-gray-100 rounded-3xl text-[8px] font-black uppercase tracking-widest text-[#2d1f2d] hover:bg-black hover:text-white transition-all">{s}</button>
                 ))}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CustomerCenterPage;
