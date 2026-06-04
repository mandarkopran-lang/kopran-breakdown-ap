import React, { useState, useEffect } from 'react';
import { User, UserRole, REGISTRATION_DEPARTMENTS } from '../types';
import { Shield, Smartphone, Key, UserCheck, Factory, Building2, Link, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import KopranLogo from './KopranLogo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp' | 'register'>('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration forms
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('supervisor');
  const [registerDept, setRegisterDept] = useState('Production');
  const [registerPlant, setRegisterPlant] = useState<'Pen Plant' | 'Non-Pen Plant' | 'Both'>('Pen Plant');
  const [manualCompanyId, setManualCompanyId] = useState('');

  // Auto-parsed joining company states
  const [joiningCompany, setJoiningCompany] = useState<{ id: string; name: string; logoUrl?: string } | null>(null);

  // Parse invite links and query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('inviteMobile');
    const n = params.get('inviteName');
    const r = params.get('inviteRole');
    const d = params.get('inviteDept');
    const p = params.get('invitePlant');
    const ucid = params.get('companyId');

    // Handle parsed company invite code
    if (ucid) {
      fetch(`/api/companies/${ucid.toUpperCase().trim()}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          setJoiningCompany(data);
          setManualCompanyId(data.id);
        })
        .catch(() => {
          // Fallback if not found
          setJoiningCompany({ id: ucid.toUpperCase().trim(), name: `Company ID: ${ucid.toUpperCase().trim()}` });
          setManualCompanyId(ucid.toUpperCase().trim());
        });
    }

    if (m) {
      const cleanMobile = m.trim();
      setMobile(cleanMobile);
      if (n) {
        setRegisterName(n.trim());
        setRegisterRole((r as any) || 'plant_manager');
      }
      if (d) setRegisterDept(d.trim());
      if (p) {
        const parsedPlant = p === 'Pen Plant' || p === 'Non-Pen Plant' || p === 'Both' || p === 'Plant 1' || p === 'Plant 2'
          ? (p === 'Plant 1' ? 'Pen Plant' : p === 'Plant 2' ? 'Non-Pen Plant' : p as any)
          : 'Pen Plant';
        setRegisterPlant(parsedPlant);
      }
      // Trigger request OTP automatically
      handleStartAuth(cleanMobile);
    }
  }, []);

  // Preconfigured profiles list for testing / evaluation
  const PRESET_USERS = [
    { name: 'Rajesh Kumar', mobile: '+91 98765 43210', role: 'supervisor' as const, dept: 'Production', plant: 'Pen Plant' as const, desc: 'Supervisor: Raise breakdown tickets, close tasks' },
    { name: 'Anil Sharma', mobile: '+91 87654 32109', role: 'engineering_officer' as const, dept: 'Engineering', plant: 'Pen Plant' as const, desc: 'Engineer: Receive assign alerts, update progress' },
    { name: 'Vikram Singh', mobile: '+91 76543 21098', role: 'admin' as const, dept: 'Admin', plant: 'Both' as const, desc: 'Manager: Roster directory, CSV reports, multi-tenant setup' },
    { name: 'Sunil Verma', mobile: '+91 99999 88888', role: 'engineering_head' as const, dept: 'Engineering', plant: 'Both' as const, desc: 'Head: Plant performance metrics, diagnostics cockpit' }
  ];

  const handleStartAuth = async (number: string) => {
    if (!number.trim()) {
      setError('A valid mobile number is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: number })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Connection failed.');
      }

      if (data.exists === false) {
        setMobile(number);
        setStep('register');
      } else {
        setMobile(number);
        setOtp(data.otp || '123456'); // Simulation fallback code
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Incorrect OTP.');
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) {
      setError('Please input your full name for credentials.');
      return;
    }

    const companyTarget = registerRole === 'admin' 
      ? '' 
      : (manualCompanyId.trim() || joiningCompany?.id || 'KOPRAN');

    if (registerRole !== 'admin' && !companyTarget) {
      setError('Company invite code/ID is required for general staff directories.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Direct registration & OTP dispatch combined in backend
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          name: registerName,
          role: registerRole,
          department: registerRole !== 'admin' ? registerDept : 'Management',
          plant: registerPlant,
          companyId: companyTarget.toUpperCase()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setOtp(data.otp || '123456');
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen-redesign" className="w-full max-w-lg mx-auto p-4 sm:p-6 font-sans select-none">
      
      {/* Upper Brand Badge */}
      <div className="flex flex-col items-center justify-center text-center mb-8">
        
        {/* Dynamic Logo View based on Shared Tenant */}
        <div className="relative">
          {joiningCompany?.logoUrl ? (
            <img 
              src={joiningCompany.logoUrl} 
              alt={joiningCompany.name}
              className="h-16 w-16 object-contain rounded-xl border-2 border-amber-500 shadow-md p-1 bg-white"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If it crashes, fallback to KopranLogo icon
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 shadow-sm">
              <Factory className="h-10 w-10 text-amber-600" />
            </div>
          )}
          
          <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 border border-slate-750 text-white rounded-full p-1 text-[8px] font-mono leading-none font-bold uppercase tracking-widest px-2">
            Multi-Tenant v2.4
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight uppercase flex items-center justify-center gap-1.5">
            Break Down Monitor
          </h2>
          {joiningCompany ? (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              <Building2 className="h-3.5 w-3.5" />
              Corporate Portal: {joiningCompany.name}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Corporate Breakdown Monitoring System
            </p>
          )}
        </div>
      </div>

      {/* Main card box with high-tech Teal/Charcoal styling details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600" />
        
        <div className="p-6 sm:p-10 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-start gap-2.5 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
              <div className="flex-1">
                <span className="font-extrabold block uppercase tracking-wide text-[10px] text-rose-950 mb-0.5">Authorization Error</span>
                {error}
              </div>
            </div>
          )}

          {/* STEP 1: Enter Mobile */}
          {step === 'mobile' && (
            <div className="space-y-6">
              
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Authentication Required</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Connect using your physical registered mobile number to confirm identity and route notifications.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleStartAuth(mobile); }} className="space-y-4">
                <div>
                  <label htmlFor="mobile" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Mobile Identifier
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="mobile"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border border-slate-250 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-xs font-bold font-mono text-slate-800 tracking-wide"
                    />
                  </div>
                  <p className="mt-1.5 text-[9px] text-slate-400 font-medium leading-normal">
                    Format: +91 [10 Digits] (Include standard country prefix identifier)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !mobile}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Routing Dispatch...' : 'Generate OTP Code'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Presets Grid - conditional on testing mode only */}
              {((localStorage.getItem('kopran_env_mode') || 'production') === 'testing') && (
                <div className="border-t border-slate-200 pt-6 animate-fade-in">
                  <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-extrabold mb-4 select-none">
                    <span className="bg-white px-3 text-slate-400">
                      Or Evaluate as Mock Profile (Testing Mode Only)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PRESET_USERS.map((user) => (
                      <button
                        key={user.mobile}
                        onClick={() => {
                          setMobile(user.mobile);
                          handleStartAuth(user.mobile);
                        }}
                        className="group flex flex-col text-left p-3 bg-slate-50 hover:bg-amber-50/25 rounded-xl border border-slate-200 hover:border-amber-500 transition-all duration-150 cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-extrabold text-[11px] text-slate-800 group-hover:text-amber-900">{user.name}</span>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{user.mobile}</span>
                        <p className="text-[9px] text-slate-400 mt-1 lines-clamp-1 italic font-medium leading-tight">
                          {user.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">SMS Authentication</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  A transient authentication code has been sent over secure fallback protocols to mobile: <span className="font-bold text-slate-800 font-mono">{mobile}</span>
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-405 text-slate-400 uppercase tracking-widest">
                  Authentication Code
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-slate-250 border-slate-200 rounded-xl bg-slate-50 text-center tracking-widest text-base font-bold font-mono text-slate-850"
                  />
                </div>

                <div className="mt-3.5 p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl text-[11px] text-emerald-850 font-semibold space-y-2">
                  <p className="flex items-start gap-1.5 leading-snug">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Evaluation Bypass Mode Active:</strong> Use the pre-computed credential <strong className="bg-emerald-100 text-emerald-950 px-1.5 py-0.2 rounded font-mono font-bold">123456</strong> to connect.</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold border-t border-emerald-200/55 pt-1.5 flex items-start gap-1.5 leading-snug">
                    <span>💬</span>
                    <span><strong>WhatsApp delivery:</strong> If standard carrier SMS network signals are unavailable, the secure OTP dispatch is automatically routed via WhatsApp fallback instant messaging.</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 bg-white transition duration-150 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase tracking-wider text-xs rounded-xl shadow-md transition duration-150 cursor-pointer text-center"
                >
                  {loading ? 'Verifying...' : 'Access Console'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Register New User */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              
              <div className="text-left bg-teal-50 border border-teal-150 rounded-xl p-3.5 text-xs text-teal-850 font-medium">
                🛡️ Complete corporate directory cataloging for number: <strong className="font-bold font-mono">{mobile}</strong>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Mahindra"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">System Role</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                  className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="supervisor">Supervisor (Raise breakdowns & audit closure)</option>
                  <option value="engineering_officer">Engineering Officer (Accept assignments & resolve)</option>
                  <option value="admin">Admin (Company Owner - Generate Invite Link)</option>
                </select>
                <p className="mt-1 text-[9px] text-slate-400 font-medium leading-relaxed italic">
                  * Note: Admin profiles can construct isolated corporate configurations with customized dashboards and logos.
                </p>
              </div>

              {registerRole !== 'admin' && (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Department / Work Center</label>
                    <select
                      value={registerDept}
                      onChange={(e) => setRegisterDept(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
                    >
                      {REGISTRATION_DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                      {joiningCompany ? 'Allotted Corporate Tenant' : 'Company Invite Code'}
                    </label>
                    {joiningCompany ? (
                      <div className="bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-bold flex items-center justify-between">
                        <span>🏢 {joiningCompany.name}</span>
                        <span className="font-mono text-[10px] bg-teal-50 text-teal-800 border-teal-200 px-1.5 py-0.2 rounded uppercase">{joiningCompany.id}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Type Code (e.g., KOPRAN)"
                        value={manualCompanyId}
                        onChange={(e) => setManualCompanyId(e.target.value)}
                        className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-xs font-extrabold font-mono uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded-xl placeholder-slate-400"
                      />
                    )}
                    {!joiningCompany && (
                      <p className="mt-1 text-[9px] text-slate-400 font-medium leading-tight">
                        Enter <strong className="text-slate-600 font-mono uppercase">KOPRAN</strong> or the specific Admin company invite code provided in your onboarding materials.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Plant Operations Allotment</label>
                <select
                  value={registerPlant}
                  onChange={(e) => setRegisterPlant(e.target.value as any)}
                  className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="Pen Plant">Pen Plant Operations Only</option>
                  <option value="Non-Pen Plant">Non-Pen Plant Operations Only</option>
                  <option value="Both">Both (Shared Cross-Plant Access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 transition duration-150 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-md transition duration-150 cursor-pointer text-center"
                >
                  {loading ? 'Submitting...' : 'Register Profile'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
      
    </div>
  );
}
