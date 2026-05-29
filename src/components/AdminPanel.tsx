import React, { useState, useEffect } from 'react';
import { User, UserRole, REGISTRATION_DEPARTMENTS } from '../types';
import { 
  ShieldCheck, UserPlus, Clock, Download, RefreshCcw, Mail, Plus, Check, Loader2, AlertCircle, Trash2 
} from 'lucide-react';

interface AdminPanelProps {
  onRefreshStats: () => void;
}

export default function AdminPanel({ onRefreshStats }: AdminPanelProps) {
  // Roster registration states
  const [newMobile, setNewMobile] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('engineering_officer');
  const [newDept, setNewDept] = useState('Production');
  const [newPlant, setNewPlant] = useState<'Plant 1' | 'Plant 2' | 'Both'>('Plant 1');
  const [users, setUsers] = useState<User[]>([]);

  // Schedule states
  const [reportType, setReportType] = useState('Daily Operations Review');
  const [frequency, setFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [recipient, setRecipient] = useState('Plant Leadership Group');
  const [schedules, setSchedules] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Database purge states
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const activeEnv = localStorage.getItem('kopran_env_mode') || 'testing';

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
      // Wait 1.5s then reload to show clean state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurging(false);
    }
  };

  // Auto load directories & schedules
  const loadInfo = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(console.error);

    fetch('/api/reports/scheduled')
      .then(r => r.json())
      .then(setSchedules)
      .catch(console.error);
  };

  useEffect(() => {
    loadInfo();
  }, []);

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

  return (
    <div id="admin-panel" className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-slate-700 text-left">
      
      {/* LEFT: User Directory & CSV report export */}
      <div className="space-y-6">
        
        {/* CSV Export Widget */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Download className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 leading-none">Reports & Data Exports</h4>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Generate and export fully reconciled breakdown records including creation, assignment, resolution, and closure timestamps.
          </p>
          
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition shadow-sm cursor-pointer"
          >
            <Download className="h-4.5 w-4.5" />
            Download Breakdown Logs (CSV)
          </button>
        </div>

        {/* Database Clean & Reset Control Widget */}
        <div className="bg-rose-50/20 rounded-xl border border-rose-200/50 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-rose-100 pb-2.5">
            <Trash2 className="h-5 w-5 text-rose-600" />
            <h4 className="text-sm font-bold text-rose-950 leading-none">Database Purge & Reset Control</h4>
          </div>
          
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Wipe all tickets, logs, and activity records to establish a pristine zero-ticket slate for active operations in the <span className="text-indigo-600 font-bold font-mono">{activeEnv.toUpperCase()}</span> workspace.
          </p>
          
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResetDatabase}
              disabled={purging}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 font-bold uppercase tracking-wider text-xs rounded-lg transition-all duration-150 shadow-xs cursor-pointer ${
                confirmPurge
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-white hover:bg-rose-50 text-rose-650 text-rose-600 border border-rose-200'
              }`}
            >
              {purging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Wiping environment...
                </>
              ) : confirmPurge ? (
                '⚠️ CLICK AGAIN TO CONFIRM FOREVER'
              ) : (
                `Purge ${activeEnv.toUpperCase()} database`
              )}
            </button>
            
            {confirmPurge && (
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-650 hover:text-slate-600 underline font-extrabold uppercase tracking-widest mt-1 block"
              >
                Cancel Wipe / Secure Abort
              </button>
            )}
          </div>
        </div>

        {/* Directory Registration Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 leading-none">Roster & Team Management</h4>
          </div>
          <p className="text-xs text-slate-505 text-slate-500 font-medium">Add maintenance engineers or supervisors into ShiftSync directories</p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mobile Identity</label>
                <input
                  type="text"
                  required
                  placeholder="+91 99887 76655"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-805 text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Rahul Singh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-808 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Role Classification</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 font-bold"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="engineering_officer">Engineering Officer</option>
                  <option value="engineering_manager">Engineering Manager</option>
                  <option value="engineering_head">Engineering Head</option>
                  <option value="plant_manager">Plant Manager</option>
                  <option value="qa_manager">QA Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Default Department</label>
                <select
                  disabled={newRole === 'admin'}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 font-medium disabled:opacity-40"
                >
                  {REGISTRATION_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assigned Plant Location</label>
                <select
                  value={newPlant}
                  onChange={(e) => setNewPlant(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 font-medium"
                >
                  <option value="Plant 1">Plant 1 (Primary)</option>
                  <option value="Plant 2">Plant 2 (Auxiliary)</option>
                  <option value="Both">Both (Shared System Access)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newMobile || !newName}
              className="w-full py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition shadow-sm cursor-pointer"
            >
              Add to Active Roster
            </button>
          </form>

          {/* Active user cards view */}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <span className="text-[10px] uppercase font-bold text-slate-550 text-slate-500 tracking-wider">Registered Team Directory ({users.length})</span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.mobile} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                    <span>{u.name}</span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold">{u.role}</span>
                  </div>
                  <p className="text-slate-500 font-mono text-[10px] leading-relaxed font-semibold">{u.mobile}</p>
                  <div className="flex items-center justify-between gap-1.5 mt-1">
                    {u.department && <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{u.department}</p>}
                    <p className="text-[9px] text-slate-500 bg-slate-200 px-1 py-0.2 rounded font-bold uppercase">{u.plant || 'Plant 1'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT: Automated Scheduled reports */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-205 border-slate-200 pb-2.5">
          <Clock className="h-5 w-5 text-indigo-655 text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900 leading-none">Schedules & Report Dispatcher Automation</h4>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Configure background cron jobs to export breakdown metrics as structured messages or emails on a daily/weekly schedule.
        </p>

        <form onSubmit={handleAddSchedule} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Report Composition Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-805 text-slate-800 font-medium"
            >
              <option value="Daily Operations Review">Overall Operations summary (All Plants)</option>
              <option value="Equipment SLA Performance">Mean MTTR SLA Violations audit</option>
              <option value="Machine Breakdown Analysis">Top Failure-prone machines compilation</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 font-medium"
              >
                <option value="daily">Daily Cron</option>
                <option value="weekly">Weekly Cron</option>
                <option value="monthly">Monthly Cron</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Dispatch Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 border-slate-200 bg-white rounded-lg text-xs text-center font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Recipient Destination Channel/Mobile</label>
            <input
              type="text"
              required
              placeholder="e.g. Plant Leadership WhatsApp Group"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Activate Scheduled Cron Dispatch
          </button>
        </form>

        {/* Existing active cron schedules list */}
        <div className="border-t border-slate-200 pt-3">
          <span className="text-[10px] uppercase font-bold text-slate-550 text-slate-500 tracking-wider">Active Automated Jobs ({schedules.length})</span>
          <div className="mt-2 space-y-2 max-h-36 overflow-y-auto pr-1">
            {schedules.map((sch) => (
              <div key={sch.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <strong className="text-slate-900 block font-bold">{sch.type}</strong>
                  <span className="text-slate-500 font-mono text-[10px] block mt-0.5">
                    Trigger: <span className="text-indigo-600 font-semibold uppercase">{sch.frequency}</span> at {sch.time} • Recipient: {sch.recipientGroup}
                  </span>
                </div>
                
                <span className="p-1 px-2.5 border border-indigo-150 rounded-full text-[9px] uppercase tracking-wider bg-indigo-50 text-indigo-700 font-bold shrink-0 leading-none">
                  SYSTEM ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
