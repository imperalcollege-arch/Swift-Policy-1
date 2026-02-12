
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Car, ShieldCheck, ArrowRight, Loader2,
  AlertCircle, Bike, Search, ChevronDown, Lock, CheckCircle, Database, AlertOctagon,
  Globe, ExternalLink
} from 'lucide-react';
import { QuoteData, PaymentRecord, EnforcedInsuranceType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const INITIAL_STATE: QuoteData = {
  vrm: '', 
  insurance_type: '',
  make: '', model: '', year: '', fuelType: '', transmission: '', bodyType: '', engineSize: '', seats: '',
  isImported: false, annualMileage: '8000', usageType: 'Social, Domestic & Pleasure', ownership: 'Owned',
  isModified: false, modifications: '', securityFeatures: [], overnightParking: 'Driveway',
  title: 'Mr', firstName: '', lastName: '', dob: '', gender: 'Male', maritalStatus: 'Married', ukResident: true,
  yearsInUk: 'Born in UK', occupation: '', employmentStatus: 'Employed', industry: '',
  licenceType: 'Full UK', licenceHeldYears: '5+', licenceDate: '', hasMedicalConditions: false,
  mainDriverHistory: { hasConvictions: false, convictions: [], hasClaims: false, claims: [] },
  ncbYears: '5', isCurrentlyInsured: true, hasPreviousCancellations: false,
  additionalDrivers: [],
  postcode: '', addressLine1: '', city: '', yearsAtAddress: '5+', homeOwnership: 'Owner',
  coverLevel: 'Comprehensive', policyStartDate: new Date().toISOString().split('T')[0], voluntaryExcess: '£250',
  addons: { breakdown: false, legal: false, courtesyCar: false, windscreen: false, protectedNcb: false },
  paymentFrequency: 'monthly', payerType: 'individual',
  email: '', phone: '', contactTime: 'Anytime', marketingConsent: false, dataProcessingConsent: false,
  isAccurate: false, termsAccepted: false
};

const QuotePage: React.FC = () => {
  const { user, signup, queueMIDSubmission, generatePolicyPDF } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<QuoteData>(INITIAL_STATE);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalQuote, setFinalQuote] = useState<number | null>(null);
  const [groundingSources, setGroundingSources] = useState<{title: string, uri: string}[]>([]);

  const validateVRM = (vrm: string) => {
    const normalized = vrm.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$|^[0-9]{1,4}[A-Z]{1,2}$|^[0-9]{1,3}[A-Z]{1,3}$|^[A-Z]{1,2}[0-9]{1,4}$|^[A-Z]{1,3}[0-9]{1,3}$/.test(normalized);
  };

  if (user && ['Frozen', 'Blocked', 'Removed', 'Deleted'].includes(user.status)) {
    return (
      <div className="min-h-screen bg-[#faf8fa] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[64px] p-16 text-center shadow-2xl border border-gray-100 animate-in zoom-in-95">
           <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-10">
              <Lock size={48} />
           </div>
           <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit mb-6">Service Restriction</h2>
           <p className="text-gray-500 mb-10 leading-relaxed font-medium">Policy acquisition is restricted for your account status: <span className="text-red-600 font-black">{user.status}</span>. Please contact administrative support.</p>
           <button onClick={() => navigate('/customers')} className="w-full py-5 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const executeBindingQuoteGeneration = (type: EnforcedInsuranceType): number => {
    let quote = 0;
    const randomSeed = Math.random();

    if (type === 'Comprehensive Cover') {
      quote = 3000 + (randomSeed * 999);
    } else if (type === 'Third Party Insurance') {
      quote = 1400 + (randomSeed * 1500);
    } else if (type === 'Motorcycle Insurance') {
      quote = 500 + (randomSeed * 500);
    }

    if (type === 'Motorcycle Insurance') {
      if (quote < 500) quote = 500;
    } else {
      if (quote < 1400) quote = 1400;
    }
    
    if (quote > 3999) quote = 3999;
    const finalVal = Math.round(quote);
    if (finalVal < 500 || finalVal > 3999 || finalVal === 0) throw new Error("SYSTEM INVALID: CALCULATION OUT OF BOUNDS");
    return finalVal;
  };

  const handleLookup = async () => {
    const vrmInput = formData.vrm.replace(/\s/g, '').toUpperCase();
    if (!vrmInput) return;
    
    if (!validateVRM(vrmInput)) {
      setLookupError("Invalid UK registration format. Check VRM.");
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setLookupSuccess(false);
    setGroundingSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        You are a self-contained vehicle lookup module for a UK motor insurance website.
        Search for real-time UK DVLA data for the provided registration.
        Return ONLY valid JSON with exactly these fields: 
        registration_number, vehicle_category, make, model, body_type, fuel_type, 
        engine_capacity_cc, year_of_manufacture, colour, transmission, mot_status, 
        mot_expiry_date, tax_status, dvla_data_confirmed.
        If any data is unknown, use null.
        Return ONLY valid JSON. No conversational text.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fetch official DVLA specifications for registration: ${vrmInput}`,
        config: {
          systemInstruction,
          tools: [{googleSearch: {}}],
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter(c => c.web)
        .map(c => ({ title: c.web.title || 'Official Record', uri: c.web.uri }));
      setGroundingSources(sources);

      const rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(rawText);

      if (data.error || !data.make) {
        setLookupError(data.error || "Vehicle not found in official UK records.");
        setIsLookingUp(false);
        return;
      }

      setFormData(prev => ({ 
        ...prev, 
        make: data.make, 
        model: data.model, 
        year: data.year_of_manufacture,
        fuelType: data.fuel_type,
        bodyType: data.body_type,
        engineSize: data.engine_capacity_cc,
        vrm: data.registration_number || vrmInput,
        transmission: data.transmission
      }));
      setLookupSuccess(true);
    } catch (err) {
      setLookupError("National registry connection interrupted. Please try manual entry.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const calculateEnforcedQuote = () => {
    if (!formData.insurance_type || !formData.vrm) return;
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const quote = executeBindingQuoteGeneration(formData.insurance_type as EnforcedInsuranceType);
        setFormData(prev => ({ ...prev, generated_quote: quote }));
        setFinalQuote(quote);
        setIsProcessing(false);
        setStep(9);
      } catch (err) {
        setIsProcessing(false);
      }
    }, 1500);
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    let currentUser = user;
    if (!currentUser) {
      const success = await signup(formData.firstName + ' ' + formData.lastName, formData.email, 'SwiftPass123!');
      if (!success) { setIsProcessing(false); return alert("Domain reserved. Please login."); }
      currentUser = JSON.parse(localStorage.getItem('sp_session') || '{}');
    }
    
    const policyId = `POL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const policy = {
      id: policyId,
      userId: currentUser!.id,
      type: formData.insurance_type,
      premium: `£${finalQuote}.00`,
      status: 'Active',
      midStatus: 'Pending',
      details: { ...formData, premium: finalQuote }
    };

    const p = JSON.parse(localStorage.getItem('sp_client_data') || '[]');
    p.push(policy);
    localStorage.setItem('sp_client_data', JSON.stringify(p));

    const pay = JSON.parse(localStorage.getItem('sp_payment_data') || '[]');
    pay.push({
      id: `PAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      policyId, userId: currentUser!.id, date: new Date().toISOString(),
      description: `PREMIUM SETTLEMENT - ${policyId}`,
      amount: `£${finalQuote}.00`, type: 'Full Payment', status: 'Paid in Full',
      method: 'Visa Debit •••• 4242', reference: `SWIFT-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
      policyDetails: { vrm: formData.vrm, make: formData.make, model: formData.model, coverLevel: formData.insurance_type!, insurer: 'SwiftPolicy Services', renewalDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString() }
    });
    localStorage.setItem('sp_payment_data', JSON.stringify(pay));
    
    queueMIDSubmission(policyId, formData.vrm);
    generatePolicyPDF(policyId);

    await new Promise(r => setTimeout(r, 800));
    setIsProcessing(false);
    navigate('/customers');
  };

  return (
    <div className="min-h-screen bg-[#faf8fa] py-20">
      <div className="max-w-4xl mx-auto px-4">
        {step < 9 && (
          <div className="bg-white rounded-[64px] p-16 border border-gray-100 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#e91e8c]/10 text-[#e91e8c] rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold font-outfit text-[#2d1f2d]">Quote Intake</h1>
                    <p className="text-gray-400 text-sm font-medium">Verified asset risk assessment via DVLA sync.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Step</p>
                  <p className="text-2xl font-black text-[#e91e8c]">01</p>
                </div>
             </div>
             
             <div className="space-y-12">
                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cover Category *</label>
                   <div className="relative">
                      <select required value={formData.insurance_type} onChange={e => setFormData({...formData, insurance_type: e.target.value as EnforcedInsuranceType})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-lg font-bold outline-none appearance-none pr-12 focus:border-[#e91e8c] transition-all">
                         <option value="">Select Insurance Type...</option>
                         <option value="Comprehensive Cover">Comprehensive Cover</option>
                         <option value="Third Party Insurance">Third Party Insurance</option>
                         <option value="Motorcycle Insurance">Motorcycle Insurance</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={24} />
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">UK Registration Number *</label>
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${lookupSuccess ? 'text-green-500' : 'text-[#e91e8c]'}`}>
                        <Database size={10}/> {lookupSuccess ? 'Asset Locked' : 'Live DVLA Sync Active'}
                      </span>
                   </div>
                   <div className="flex gap-4">
                      <input 
                        className={`flex-1 bg-gray-50 border rounded-2xl px-8 py-5 font-mono text-2xl uppercase tracking-widest outline-none transition-all ${
                          lookupError ? 'border-red-200 bg-red-50' : 'border-gray-100 focus:border-[#e91e8c]'
                        }`} 
                        placeholder="VRM REQUIRED" 
                        value={formData.vrm} 
                        onChange={e => {
                          setFormData({...formData, vrm: e.target.value.toUpperCase()});
                          setLookupError(null);
                          setLookupSuccess(false);
                          setGroundingSources([]);
                        }} 
                      />
                      <button onClick={handleLookup} disabled={isLookingUp || !formData.vrm} className="px-10 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg disabled:opacity-20 flex items-center justify-center">
                         {isLookingUp ? <Loader2 className="animate-spin" /> : <Search size={20}/>}
                      </button>
                   </div>
                   {lookupError && (
                     <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold animate-in shake duration-300">
                        <AlertOctagon size={16}/> {lookupError}
                     </div>
                   )}
                   {lookupSuccess && (
                     <div className="animate-in zoom-in-95 duration-300 space-y-4">
                        <div className="p-8 bg-green-50 rounded-[32px] border border-green-100 shadow-xl shadow-green-900/5">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">National Asset Verified</p>
                                    <p className="text-3xl font-black font-outfit text-[#2d1f2d]">{formData.make} {formData.model}</p>
                                </div>
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { l: 'Year', v: formData.year },
                                    { l: 'Engine', v: formData.engineSize ? `${formData.engineSize}cc` : 'N/A' },
                                    { l: 'Fuel', v: formData.fuelType },
                                    { l: 'Gearbox', v: formData.transmission }
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-white/50 rounded-xl border border-white">
                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{item.l}</p>
                                        <p className="text-sm font-bold text-[#2d1f2d]">{item.v || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {groundingSources.length > 0 && (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                             <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                                <Globe size={10} /> Data Sources Cited
                             </p>
                             <div className="flex flex-wrap gap-2">
                                {groundingSources.map((source, i) => (
                                  <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[9px] font-bold text-gray-500 hover:text-[#e91e8c] transition-all">
                                     {source.title.slice(0, 30)}... <ExternalLink size={8} />
                                  </a>
                                ))}
                             </div>
                          </div>
                        )}
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Identity: First Name *</label>
                      <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#e91e8c]" placeholder="Legal First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Identity: Last Name *</label>
                      <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#e91e8c]" placeholder="Legal Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                   </div>
                </div>
                <button onClick={calculateEnforcedQuote} disabled={!formData.insurance_type || !formData.vrm || !lookupSuccess} className="w-full py-6 bg-[#e91e8c] text-white rounded-[32px] font-black uppercase tracking-widest shadow-2xl hover:bg-[#c4167a] transition-all disabled:opacity-30 disabled:grayscale">Calculate Binding Premium</button>
             </div>
          </div>
        )}
        {step === 9 && !isProcessing && (
          <div className="animate-in zoom-in-95 duration-500">
             <div className="bg-[#2d1f2d] p-16 rounded-[64px] text-white text-center mb-10 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#e91e8c] mb-12">Official Binding Premium</p>
                   <div className="space-y-6">
                      <div className="text-xl font-bold font-outfit text-white/50 uppercase tracking-widest">Cover: {formData.insurance_type}</div>
                      <div className="text-9xl font-black font-outfit tracking-tighter">£{finalQuote?.toLocaleString()}</div>
                   </div>
                   <div className="inline-block mt-12 px-8 py-3 rounded-full border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest">Registry Locked • Fixed for 30 Days</div>
                </div>
                <ShieldCheck className="absolute -bottom-20 -right-20 w-80 h-80 opacity-5" />
             </div>
             <div className="flex flex-col gap-4">
                <button onClick={handlePurchase} className="w-full py-8 bg-[#e91e8c] text-white rounded-[40px] font-black uppercase text-xl shadow-2xl hover:bg-[#c4167a] transition-all flex items-center justify-center gap-4">Execute Purchase <ArrowRight size={28}/></button>
                <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#e91e8c] transition-colors">Abort and Recalculate</button>
             </div>
          </div>
        )}
        {isProcessing && (
          <div className="text-center py-40 bg-white rounded-[64px] shadow-2xl border border-gray-100 animate-in fade-in duration-300">
             <div className="w-24 h-24 border-8 border-gray-100 border-t-[#e91e8c] rounded-full animate-spin mx-auto mb-10" />
             <h2 className="text-4xl font-bold text-[#2d1f2d] font-outfit">Synchronizing Assets</h2>
             <p className="text-gray-400 font-medium mt-4">Transmitting data to underwriters and MIB registry...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotePage;
