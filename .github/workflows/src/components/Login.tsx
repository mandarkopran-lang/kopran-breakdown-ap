import React, { useState } from 'react';
import { User, UserRole, REGISTRATION_DEPARTMENTS } from '../types';
import { Shield, Smartphone, Key, UserCheck, Factory } from 'lucide-react';
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
  
  // Registration state if user is new
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('supervisor');
  const [registerDept, setRegisterDept] = useState('Production');
  const [registerPlant, setRegisterPlant] = useState<'Plant 1' | 'Plant 2' | 'Both'>('Plant 1');

  // Invitation check state
  const [invitedUser, setInvitedUser] = useState<{ mobile: string; name: string; role: string } | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('inviteMobile');
    const n = params.get('inviteName');
    const r = params.get('inviteRole');
    const d = params.get('inviteDept');
    const p = params.get('invitePlant');
    if (m) {
      const cleanMobile = m.trim();
      setMobile(cleanMobile);
      if (n) {
        setRegisterName(n.trim());
        setRegisterRole((r as any) || 'plant_manager');
      }
      if (d) setRegisterDept(d.trim());
      if (p) {
        const parsedPlant = p === 'Plant 1' || p === 'Plant 2' || p === 'Both' ? p : 'Plant 1';
        setRegisterPlant(parsedPlant);
      }
      if (n && r) {
        setInvitedUser({ mobile: cleanMobile, name: n.trim(), role: r.trim() });
      }
      // Automatically request simulation OTP check
      handleStartAuth(cleanMobile);
    }
  }, []);

  // Preconfigured profiles list for testing / evaluation of 7 roles
  const PRESET_USERS = [
    { name: 'Rajesh Kumar', mobile: '+91 98765 43210', role: 'supervisor' as const, dept: 'Production', plant: 'Plant 1' as const, desc: 'Supervisor: Can raise breakdowns, confirm repairs' },
    { name: 'Anil Sharma', mobile: '+91 87654 32109', role: 'engineering_officer' as const, dept: 'Engineering', plant: 'Plant 1' as const, desc: 'Engineering Officer: Can self-assign and resolve' },
    { name: 'Sunil Verma', mobile: '+91 99999 88888', role: 'engineering_head' as const, dept: 'Engineering', plant: 'Both' as const, desc: 'Engineering Head: Can assign/reassign, view graphics/analysis' },
    { name: 'Vikram Singh', mobile: '+91 76543 21098', role: 'admin' as const, dept: 'Admin', plant: 'Both' as const, desc: 'Admin: Full system parameters/directories control' },
    { name: 'Karan Johar', mobile: '+91 88888 77777', role: 'engineering_manager' as const, dept: 'Engineering', plant: 'Both' as const, desc: 'Engineering Manager: Can assign/reassign, view graphics, reports' },
    { name: 'Meeta Patel', mobile: '+91 77777 66666', role: 'plant_manager' as const, dept: 'Production', plant: 'Plant 1' as const, desc: 'Plant Manager: Write comments & concerns' },
    { name: 'Hitesh Shah', mobile: '+91 66666 55555', role: 'qa_manager' as const, dept: 'QA', plant: 'Both' as const, desc: 'QA Manager: Manage quality issues, write concerns' }
  ];

  const handleStartAuth = async (number: string) => {
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
        throw new Error(data.error || 'Server connection failure');
      }

      if (data.exists === false) {
        setMobile(number);
        setStep('register');
      } else {
        setMobile(number);
        setOtp(data.otp || '123456'); // pre-set default
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
        throw new Error(data.error || 'Incorrect OTP code');
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
      setError('Please enter your full name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Register new user profile
      const resReg = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          name: registerName,
          role: registerRole,
          department: registerDept,
          plant: registerPlant
        })
      });
      
      const regData = await resReg.json();
      if (!resReg.ok) {
        throw new Error(regData.error || 'Unable to register profile');
      }

      // Request OTP
      await handleStartAuth(mobile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-100 grid-lines flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-150 relative overflow-hidden">
      {/* Visual background decoration */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative flex flex-col items-center">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <KopranLogo size={60} />
          <div className="mt-2 text-center">
            <h1 className="text-lg font-extrabold text-indigo-700 leading-none uppercase tracking-wider">
              Breakdown Monitor
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Real-time Plant Operations Portal
            </p>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-extrabold tracking-tight text-slate-900 uppercase">
          Digital Operator Portal
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500 font-medium px-4">
          Direct manufacturing breakdown reporting, automatic engineered routing, and live logs.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 rounded-xl shadow-md border border-slate-200 sm:px-10 relative">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-700 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-650 bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'mobile' && (
            <div>
              <form onSubmit={(e) => { e.preventDefault(); handleStartAuth(mobile); }} className="space-y-4">
                <div>
                  <label htmlFor="mobile-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Enter Mobile Number
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="mobile-input"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-xs font-medium"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Use full international format including country prefix code.
                  </p>
                </div>

                <button
                  id="request-otp-button"
                  type="submit"
                  disabled={loading || !mobile}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-xs font-bold tracking-wider uppercase text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shadow-sm"
                >
                  {loading ? 'Requesting OTP...' : 'Proceed with OTP Secure Signin'}
                </button>
              </form>

              {/* Preset Profile Grid */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-slate-400 font-bold">
                      Or Quick-Test as Mock Role
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PRESET_USERS.map((user) => (
                    <button
                      id={`preset-user-${user.role}`}
                      key={user.mobile}
                      onClick={() => {
                        setMobile(user.mobile);
                        handleStartAuth(user.mobile);
                      }}
                      className="flex flex-col text-left p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-lg border border-slate-200 hover:border-indigo-505 hover:border-indigo-500 transition-all duration-150 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-slate-800">{user.name}</span>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                          user.role === 'admin' ? 'bg-indigo-150 text-indigo-750 bg-indigo-100 text-indigo-700 border border-indigo-200' :
                          user.role === 'engineering_head' || user.role === 'engineering_manager' ? 'bg-indigo-50 border border-indigo-200 text-indigo-800 font-extrabold' :
                          user.role === 'engineering_officer' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                          user.role === 'plant_manager' || user.role === 'qa_manager' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                          'bg-slate-100 border border-slate-200 text-slate-800'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{user.mobile}</span>
                      <span className="text-[10px] text-slate-400 mt-1 italic. block">
                        {user.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Verify Automated Login OTP
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center tracking-widest text-base font-bold font-mono"
                  />
                </div>
                <div className="mt-2.5 bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  ⚡ <strong>Evaluation Simulation:</strong> Use the auto-generated test code <strong className="text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono ml-1">123456</strong> to sign in securely.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="flex-1 py-2.5 px-4 border border-slate-200 hover:border-slate-350 rounded-lg text-xs font-semibold text-slate-600 bg-transparent hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="verify-otp-button"
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="flex-1 py-2.5 px-4 border border-transparent rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3 text-xs text-indigo-700 font-medium">
                👤 No account with mobile <strong>{mobile}</strong> exists. Complete quick registration to proceed.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 text-slate-700 uppercase tracking-wide mt-3 flex items-center justify-between">
                  <span>System Role</span>
                  {invitedUser ? (
                    <span className="text-[9px] text-emerald-650 text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded uppercase font-extrabold">Allotted by Admin</span>
                  ) : (
                    <span className="text-[9px] text-amber-650 text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.2 rounded uppercase font-extrabold">Standard Class</span>
                  )}
                </label>
                
                {invitedUser ? (
                  <div className="mt-1 block w-full px-3 py-2 border border-emerald-200 rounded-lg bg-emerald-50/50 text-slate-800 text-xs font-bold uppercase tracking-wide">
                    {registerRole.replace('_', ' ')}
                  </div>
                ) : (
                  <>
                    <select
                      value={registerRole}
                      onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs font-semibold"
                    >
                      <option value="supervisor">Supervisor (Raise issues & confirm resolution)</option>
                      <option value="engineering_officer">Engineering Officer (Respond, self-assign, repair)</option>
                    </select>
                    <p className="mt-1.5 text-[9px] text-slate-450 leading-relaxed text-slate-500 bg-slate-50 border border-slate-100 rounded p-2">
                      🔒 <strong>Role Restrictions Active:</strong> High-level roles (<em>Admin, Engineering Head, Engineering Manager, Plant Manager, QA Manager</em>) cannot be self-selected to prevent unauthorized access. If you need any of these, register as a Supervisor first and ask your System Admin to upgrade your role via the Team Directory.
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mt-3">Primary Dept Segment</label>
                <select
                  value={registerDept}
                  onChange={(e) => setRegisterDept(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs"
                >
                  {REGISTRATION_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mt-3">Assigned Plant Location</label>
                <select
                  value={registerPlant}
                  onChange={(e) => setRegisterPlant(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs"
                >
                  <option value="Plant 1">Plant 1 (Primary)</option>
                  <option value="Plant 2">Plant 2 (Auxiliary)</option>
                  <option value="Both">Both (Shared System Access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-transparent hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 border border-transparent rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 cursor-pointer"
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
