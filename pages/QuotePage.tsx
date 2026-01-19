
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Car, ShieldCheck, ArrowRight, Loader2,
  AlertCircle, Bike, Search, ChevronDown, Lock, CheckCircle
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

  // OPERATIONAL AUTHORIZATION CHECK
  if (user && (user.status === 'Frozen' || user.status === 'Blocked')) {
    return (
      <div className="min-h-screen bg-[#faf8fa] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[64px] p-16 text-center shadow-2xl border border-gray-100 animate-in zoom-in-95">
           <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-10">
              <Lock size={48} />
           </div>
           <h2 className="text-3xl font-bold text-[#2d1f2d] font-outfit mb-6">Operational Block</h2>
           <p className="text-gray-500 mb-10 leading-relaxed font-medium">Policy acquisition is restricted for accounts currently under administrative review.</p>
           <button onClick={() => navigate('/customers')} className="w-full py-5 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // ATOMIC QUOTE LOGIC - SERVER-SIDE SIMULATION
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
    if (!formData.vrm) return;
    setIsLookingUp(true);
    setLookupError(null);
    setLookupSuccess(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Vehicle specs for UK reg: ${formData.vrm}. JSON: make, model, year, fuelType, bodyType, engineSize, seats.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              make: { type: Type.STRING },
              model: { type: Type.STRING },
              year: { type: Type.STRING },
              error: { type: Type.STRING }
            }
          }
        }
      });

      const data = JSON.parse(searchResponse.text);
      if (data.error) {
        setLookupError("Registration not found. Verify VRM.");
        setIsLookingUp(false);
        return;
      }

      setFormData(prev => ({ ...prev, make: data.make || 'MANUAL', model: data.model || 'MANUAL', year: data.year || '2024' }));
      setLookupSuccess(true);
    } catch (err) {
      setLookupError("Registry link down. Proceed manually.");
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
        alert("CRITICAL SYSTEM ERROR: PRICING GATEWAY FAILURE");
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

    const payment: PaymentRecord = {
      id: `PAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      policyId, userId: currentUser!.id, date: new Date().toISOString(),
      description: `PREMIUM SETTLEMENT - ${policyId}`,
      amount: `£${finalQuote}.00`, type: 'Full Payment', status: 'Paid in Full',
      method: 'Visa Debit •••• 4242', reference: `SWIFT-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
      policyDetails: { vrm: formData.vrm, make: formData.make, model: formData.model, coverLevel: formData.insurance_type!, insurer: 'SwiftPolicy Services', renewalDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString() }
    };

    const p = JSON.parse(localStorage.getItem('sp_client_data') || '[]');
    p.push(policy);
    localStorage.setItem('sp_client_data', JSON.stringify(p));

    const pay = JSON.parse(localStorage.getItem('sp_payment_data') || '[]');
    pay.push(payment);
    localStorage.setItem('sp_payment_data', JSON.stringify(pay));
    
    // NEW: Trigger MID Parallel Flow
    queueMIDSubmission(policyId, formData.vrm);

    // NEW: Trigger Policy PDF Generation (Isolated logic)
    generatePolicyPDF(policyId);

    await new Promise(r => setTimeout(r, 800));
    setIsProcessing(false);
    navigate('/customers');
  };

  return (
    <div className="min-h-screen bg-[#faf8fa] py-20">
      <div className="max-w-4xl mx-auto px-4">
        {step < 9 && (
          <div className="bg-white rounded-[64px] p-16 border border-gray-100 shadow-2xl relative overflow-hidden">
             <div className="flex items-center gap-6 mb-12">
                <div className="w-16 h-16 bg-[#e91e8c]/10 text-[#e91e8c] rounded-2xl flex items-center justify-center">
                   <ShieldCheck size={32} />
                </div>
                <h1 className="text-4xl font-bold font-outfit text-[#2d1f2d]">Quote Intake</h1>
             </div>
             <div className="space-y-12">
                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cover Category *</label>
                   <div className="relative">
                      <select required value={formData.insurance_type} onChange={e => setFormData({...formData, insurance_type: e.target.value as EnforcedInsuranceType})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-lg font-bold outline-none appearance-none pr-12">
                         <option value="">Select Insurance Type...</option>
                         <option value="Comprehensive Cover">Comprehensive Cover</option>
                         <option value="Third Party Insurance">Third Party Insurance</option>
                         <option value="Motorcycle Insurance">Motorcycle Insurance</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={24} />
                   </div>
                </div>
                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Asset Registration (VRM) *</label>
                   <div className="flex gap-4">
                      <input className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-mono text-2xl uppercase tracking-widest outline-none" placeholder="AB12 CDE" value={formData.vrm} onChange={e => setFormData({...formData, vrm: e.target.value.toUpperCase()})} />
                      <button onClick={handleLookup} disabled={isLookingUp || !formData.vrm} className="px-10 bg-[#2d1f2d] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                         {isLookingUp ? <Loader2 className="animate-spin" /> : <Search size={20}/>}
                      </button>
                   </div>
                   {lookupSuccess && <p className="text-green-500 font-bold text-sm px-1 flex items-center gap-2"><ShieldCheck size={14}/> Asset ID: {formData.make} {formData.model}</p>}
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold" placeholder="First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                   <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold" placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <button onClick={calculateEnforcedQuote} disabled={!formData.insurance_type || !formData.vrm} className="w-full py-6 bg-[#e91e8c] text-white rounded-[32px] font-black uppercase tracking-widest shadow-2xl hover:bg-[#c4167a] transition-all disabled:opacity-30">Generate Binding Quote</button>
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
                   <div className="inline-block mt-12 px-8 py-3 rounded-full border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest">Statement Locked • No Estimates Allowed</div>
                </div>
                <ShieldCheck className="absolute -bottom-20 -right-20 w-80 h-80 opacity-5" />
             </div>
             <div className="flex flex-col gap-4">
                <button onClick={handlePurchase} className="w-full py-8 bg-[#e91e8c] text-white rounded-[40px] font-black uppercase text-xl shadow-2xl hover:bg-[#c4167a] transition-all flex items-center justify-center gap-4">Execute Purchase <ArrowRight size={28}/></button>
                <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#e91e8c] transition-colors">Restart Form to Recalculate</button>
             </div>
          </div>
        )}
        {isProcessing && (
          <div className="text-center py-40 bg-white rounded-[64px] shadow-2xl border border-gray-100">
             <div className="w-24 h-24 border-8 border-gray-100 border-t-[#e91e8c] rounded-full animate-spin mx-auto mb-10" />
             <h2 className="text-4xl font-bold text-[#2d1f2d] font-outfit">Processing Order</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotePage;
