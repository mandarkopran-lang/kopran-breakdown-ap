import React, { useState, useEffect } from 'react';
import { User, UserRole, REGISTRATION_DEPARTMENTS } from '../types';
import { 
  Building2, Link, Copy, Check, Download, RefreshCcw, Mail, Plus, CheckCircle2, 
  Trash2, UserPlus, Clock, Loader2, AlertCircle, Sparkles, Image, ShieldAlert
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  onRefreshStats: () => void;
  onCompanyUpdated?: (company: any) => void;
}

export default function AdminPanel({ currentUser, onRefreshStats, onCompanyUpdated }: AdminPanelProps) {
  // Roster registration states
  const [newMobile, setNewMobile] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('engineering_officer');
  const [newDept, setNewDept] = useState('Production');
  const [newPlant, setNewPlant] = useState<string>('Plant 1');
  const [users, setUsers] = useState<User[]>([]);

  // Custom plants and departments list states
  const [plantsList, setPlantsList] = useState<string[]>([]);
  const [deptsList, setDeptsList] = useState<string[]>([]);
  const [newCustomPlant, setNewCustomPlant] = useState('');
  const [newCustomDept, setNewCustomDept] = useState('');

  // Schedule states
  const [reportType, setReportType] = useState('Daily Operations Review');
  const [frequency, setFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [recipient, setRecipient] = useState('Plant Leadership Group');
  const [schedules, setSchedules] = useState<any[]>([]);

  // Company / Tenant configuration states
  const [companyName, setCompanyName] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [activeCompany, setActiveCompany] = useState<{ id: string; name: string; logoUrl?: string; plants?: string[]; departments?: string[] } | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Database purge states
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const activeEnv = localStorage.getItem('kopran_env_mode') || 'testing';
  const isCustomCompany = !!currentUser.companyId;

  const handleResetDatabase = async () => {
    if (!confirmPurge) {
      setConfirmPurge(true);
      return;
    }
    setPurging(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reset error');
      }
      setSuccessMsg(data.message || 'Database reset successfully!');
      setConfirmPurge(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurging(false);
    }
  };

  // Auto load directories, company profiles
  const loadInfo = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(console.error);

    fetch('/api/reports/scheduled')
      .then(r => r.json())
      .then(setSchedules)
      .catch(console.error);

    const isKopran = currentUser.companyId === 'KOPRAN';
    const fallbackPlants = isKopran ? ["Pen Plant", "Non-Pen Plant"] : ["Plant 1", "Plant 2", "Other Area"];
    const fallbackDepts = REGISTRATION_DEPARTMENTS;

    if (currentUser.companyId) {
      fetch(`/api/companies/${currentUser.companyId.toUpperCase()}`)
        .then(r => {
          if (r.ok) return r.json();
          throw new Error('Not found');
        })
        .then(data => {
          setActiveCompany(data);
          setCompanyName(data.name || '');
          setCompanyLogoUrl(data.logoUrl || '');
          const loadedPlants = data.plants || fallbackPlants;
          setPlantsList(loadedPlants);
          setDeptsList(data.departments || fallbackDepts);
          if (loadedPlants.length > 0) {
            setNewPlant(loadedPlants[0]);
          }
        })
        .catch(() => {
          // Fallback if KOPRAN/current tenant profile not populated yet
          const initialCompany = { 
            id: currentUser.companyId || 'KOPRAN', 
            name: isKopran ? 'Engineering' : (currentUser.companyId ? `${currentUser.companyId} Systems` : 'Enterprise Workspace'),
            plants: fallbackPlants,
            departments: fallbackDepts
          };
          setActiveCompany(initialCompany);
          setCompanyName(initialCompany.name);
          setPlantsList(fallbackPlants);
          setDeptsList(fallbackDepts);
          if (fallbackPlants.length > 0) {
            setNewPlant(fallbackPlants[0]);
          }
        });
    } else {
      setPlantsList(fallbackPlants);
      setDeptsList(fallbackDepts);
      if (fallbackPlants.length > 0) {
        setNewPlant(fallbackPlants[0]);
      }
    }
  };

  useEffect(() => {
    loadInfo();
  }, [currentUser.companyId]);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMobile.trim() || !newName.trim()) {
      setError('Fulfil mobile and full name identifiers');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: newMobile,
          name: newName,
          role: newRole,
          department: newRole !== 'admin' ? newDept : undefined,
          plant: newPlant
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration error');
      }
      setSuccessMsg(`Registered ${newName} successfully as ${newRole}!`);
      setNewName('');
      setNewMobile('');
      loadInfo();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          frequency,
          time: scheduleTime,
          recipientGroup: recipient
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Scheduling error');
      }
      setSuccessMsg(`Successfully scheduled automated report: ${reportType}!`);
      loadInfo();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/reports/export', '_blank');
  };

  // Create or Update Corporate Entity
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    setSavingCompany(true);
    setError('');
    setSuccessMsg('');
    try {
      const endpoint = currentUser.companyId 
        ? '/api/admin/update-company' 
        : '/api/admin/register-company';
      
      const payload = currentUser.companyId
        ? { companyId: currentUser.companyId, name: companyName, logoUrl: companyLogoUrl, plants: plantsList, departments: deptsList }
        : { name: companyName, logoUrl: companyLogoUrl, plants: plantsList, departments: deptsList };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync company parameters');
      }

      setSuccessMsg(`Successfully saved company entity: "${companyName}"!`);
      
      if (data.company) {
        setActiveCompany(data.company);
        if (onCompanyUpdated) {
          onCompanyUpdated(data.company);
        }
      }
      
      // If a brand new company got registered, we need to update session user state
      if (data.user && onCompanyUpdated) {
        // Trigger session update dynamically
        onCompanyUpdated(data.company);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  // Generate Invite URL
  const getInviteLink = () => {
    const inviteCode = currentUser.companyId || 'KOPRAN';
    return `${window.location.origin}/?companyId=${inviteCode}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="admin-panel" className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans text-slate-700 text-left">
      
      {/* COLUMN 1: Company Profile (Tenant Setup & Share Link) & Automation */}
      <div className="space-y-6">
        
        {/* 🏢 CORPORATE TENANT SETUP UNIT */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-amber-500 opacity-15 pointer-events-none">
            <Building2 className="h-20 w-20" />
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Building2 className="h-5 w-5 text-amber-600" />
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide leading-none font-sans">
              {isCustomCompany ? "Admin Panel" : "One time Company Set Up"}
            </h4>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {isCustomCompany 
              ? "Modify your company name, upload corporate logos, and add or remove custom Plants and Departments instantly."
              : "Perform your initial corporate setup. Define the Company Name, upload a company logo, and establish default Plants and Departments."
            }
          </p>

          <form onSubmit={handleUpdateCompany} className="space-y-4 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1 tracking-wider">Company Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Kopran Pharmaceuticals Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Logo File Selector and Preview */}
            <div>
              <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1 tracking-wider">Company Logo Upload</label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 8 * 1024 * 1024) {
                        setError('Logo file must be smaller than 8MB size.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCompanyLogoUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-black file:uppercase file:bg-slate-50 file:text-slate-800 hover:file:bg-slate-100 cursor-pointer"
                />

                {companyLogoUrl && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <img 
                      src={companyLogoUrl} 
                      alt="Logo preview" 
                      className="max-h-11 max-w-11 object-contain bg-white border border-slate-200 rounded p-0.5 animate-fade-in"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <span className="text-[10px] font-bold text-slate-800 block">Uploaded Logo Preview</span>
                      <span className="text-[8px] font-mono text-slate-400 block truncate max-w-[170px]">{companyLogoUrl.substring(0, 50)}...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompanyLogoUrl('')}
                      className="ml-auto text-[9px] text-rose-600 hover:underline font-extrabold uppercase tracking-wide cursor-pointer font-sans"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Plants Editor tag panel */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <label className="block text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Configure Plants & Facilities</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Plant 1, Plant 2, Other Area"
                  value={newCustomPlant}
                  onChange={(e) => setNewCustomPlant(e.target.value)}
                  className="flex-grow px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newCustomPlant.trim();
                    if (trimmed && !plantsList.includes(trimmed)) {
                      setPlantsList([...plantsList, trimmed]);
                      setNewCustomPlant('');
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                >
                  Add Plant
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-24 overflow-y-auto">
                {plantsList.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-extrabold">
                    {p}
                    <button
                      type="button"
                      onClick={() => setPlantsList(plantsList.filter(x => x !== p))}
                      className="text-slate-500 hover:text-slate-900 font-extrabold text-[11px] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {plantsList.length === 0 && <span className="text-[10px] text-slate-400 italic">No Plants added yet</span>}
              </div>
            </div>

            {/* Departments Editor tag panel */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1 tracking-wider font-sans">Configure Departments & Sections</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Production, QA, Engineering"
                  value={newCustomDept}
                  onChange={(e) => setNewCustomDept(e.target.value)}
                  className="flex-grow px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newCustomDept.trim();
                    if (trimmed && !deptsList.includes(trimmed)) {
                      setDeptsList([...deptsList, trimmed]);
                      setNewCustomDept('');
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider font-sans"
                >
                  Add Dept
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-24 overflow-y-auto">
                {deptsList.map(d => (
                  <span key={d} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold">
                    {d}
                    <button
                      type="button"
                      onClick={() => setDeptsList(deptsList.filter(x => x !== d))}
                      className="text-slate-500 hover:text-slate-900 font-extrabold text-[11px] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {deptsList.length === 0 && <span className="text-[10px] text-slate-400 italic">No Departments added yet</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCompany}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl shadow transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 mt-4"
            >
              {savingCompany ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Updating Corporate Workspace...
                </>
              ) : currentUser.companyId ? (
                'Save Corporate Branding Setup'
              ) : (
                'Register & Isolate Corporate Tenant'
              )}
            </button>
          </form>

          {/* Share Dynamic Referral Link Component */}
          {currentUser.companyId && (
            <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200/50 mt-4 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider">Access Link Code Generator</span>
                  <h5 className="text-[11px] font-black text-slate-800">Dynamic Employee Join Link</h5>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase animate-pulse">
                  CODE: {currentUser.companyId}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-amber-200">
                <input
                  type="text"
                  readOnly
                  value={getInviteLink()}
                  className="w-full bg-transparent border-none text-[10px] font-semibold text-slate-600 focus:outline-none focus:ring-0 font-mono select-all overflow-x-auto"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-amber-700 transition shrink-0 cursor-pointer flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"
                  title="Copy link"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                📢 Share this link with Supervisors, Engineering Officers, or Managers. Opening it registers their onboard status to join <strong>"{companyName || activeCompany?.name}"</strong> automatically!
              </p>
            </div>
          )}

        </div>



      </div>

      {/* COLUMN 2: Users roster, file exports & cleanups */}
      <div className="space-y-6">
        
        {/* MANUAL DIRECTORY USER REGISTRATION PANEL */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 leading-none">Roster Directory & Team Management</h4>
          </div>
          <p className="text-xs text-slate-505 text-slate-500 font-medium leading-relaxed select-none">
            Inject vetted corporate specialists or operator personnel profiles directly into your isolated corporate directory roster.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-1.5 font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 font-semibold animate-fade-in">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mobile number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 99887 76655"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-204 border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Role Classification</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="engineering_officer">Engineering Supervisor / Officer</option>
                  <option value="engineering_manager">Engineering Manager</option>
                  <option value="engineering_head">Engineering Head</option>
                  <option value="plant_manager">Plant Manager</option>
                  <option value="qa_manager">QA Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Department</label>
                <select
                  disabled={newRole === 'admin'}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-40"
                >
                  {(deptsList.length > 0 ? deptsList : REGISTRATION_DEPARTMENTS).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Operation Location Assignment</label>
              <select
                value={newPlant}
                onChange={(e) => setNewPlant(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800"
              >
                {(plantsList.length > 0 ? plantsList : ['Pen Plant', 'Non-Pen Plant']).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="Both">Both (Shared Cross-Plant Access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !newMobile || !newName}
              className="w-full py-2 px-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wide text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              Add Authorized Roster Row
            </button>
          </form>

          {/* Directory card list */}
          <div className="border-t border-slate-200 pt-3">
            <span className="text-[10px] uppercase font-bold text-slate-455 text-slate-400 tracking-wider">Internal Corporate Directory ({users.length})</span>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.mobile} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                    <span>{u.name}</span>
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.2 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold">{u.role.replace('_', ' ')}</span>
                  </div>
                  <p className="text-slate-500 font-mono text-[10px] select-all">{u.mobile}</p>
                  <div className="flex items-center justify-between gap-1.5 mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-450">
                    <span>{u.department || 'Management'}</span>
                    <span className="bg-slate-200 px-1 py-0.2 rounded">{u.plant || 'Pen Plant'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DATA UTILITIES & EXPORTS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Download className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 leading-none">Reports & Data Exports</h4>
          </div>
          <p className="text-xs text-slate-505 text-slate-500 font-medium select-none">
            Download full chronological records containing exact breakdown, routing, remarks, and user action times.
          </p>
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wide text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            <Download className="h-4.5 w-4.5 text-white" />
            Download Breakdown Logs (CSV)
          </button>
        </div>

        {/* WIPE ENVIRONMENT */}
        <div className="bg-rose-50/10 border border-rose-200/50 p-5 rounded-xl space-y-3.5">
          <div className="flex items-center gap-2 border-b border-rose-100 pb-2">
            <Trash2 className="h-5 w-5 text-rose-600 font-bold" />
            <span className="text-sm font-black text-rose-950 uppercase tracking-wide">Secure Database Purge</span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed select-none">
            Wipe all tickets and WhatsApp logs for your company isolated workspace <span className="font-mono text-indigo-600 font-bold">{activeEnv.toUpperCase()}</span>. Roster access keys are retained.
          </p>
          
          <div className="space-y-2">
            <button
              onClick={handleResetDatabase}
              disabled={purging}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition duration-150 cursor-pointer ${
                confirmPurge
                  ? 'bg-rose-605 bg-rose-605 bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                  : 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              {purging ? 'Purging records...' : confirmPurge ? '⚠️ CLICK ONCE MORE TO ERASE ALL DATA' : `Force clean isolated ${activeEnv.toUpperCase()} logs`}
            </button>
            {confirmPurge && (
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 underline font-extrabold uppercase tracking-widest block"
              >
                Cancel Wipe / Secure Abort
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
