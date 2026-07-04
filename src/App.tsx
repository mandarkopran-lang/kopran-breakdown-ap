import React, { useState, useEffect, useRef } from 'react';
import { User, Issue, DashboardStats, REGISTRATION_DEPARTMENTS } from './types';
import Login from './components/Login';
import DashboardStatsPanel from './components/DashboardStatsPanel';
import BreakdownForm from './components/BreakdownForm';
import IssueDetail from './components/IssueDetail';
import WhatsAppLogsView from './components/WhatsAppLogsView';
import AdminPanel from './components/AdminPanel';
import { 
  Factory, LogOut, AppWindow, PlusCircle, MessageSquare, Shield, CheckCircle2, 
  AlertTriangle, Filter, Search, RefreshCw, Smartphone, ClipboardList, Clock, 
  UserPlus2, ShieldAlert, Wifi, XCircle, Activity, Building2, Bell, Sparkles,
  HelpCircle, Monitor, ExternalLink, RefreshCcw, Layout, FileText, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reporting' | 'whatsapp' | 'admin'>('dashboard');
  const [isExitOverlayOpen, setIsExitOverlayOpen] = useState(false);
  
  // Custom multi-tenant brand configuration
  const [currentCompany, setCurrentCompany] = useState<{ id: string; name: string; logoUrl?: string } | null>(null);
  
  // Minimization states
  const [isMinimized, setIsMinimized] = useState(false);
  const [alertNotification, setAlertNotification] = useState<string | null>(null);

  // Incidents collection states
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  
  // Filter settings
  const [statusFilter, setStatusFilter] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Polling tracker
  const [loading, setLoading] = useState(false);
  const [syncTime, setSyncTime] = useState<string>('');
  
  // Tracker for issue counts to throw live background alerts
  const previousIssuesCountRef = useRef<number>(-1);

  // Dropdown states for system menu triggers
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<'file' | 'view' | 'diagnostics' | 'help' | null>(null);

  // Load user from localStorage on start
  useEffect(() => {
    const saved = localStorage.getItem('shift_sync_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('shift_sync_user');
      }
    }
  }, []);

  // Fetch company branding parameters dynamically
  useEffect(() => {
    if (currentUser?.companyId) {
      fetch(`/api/companies/${currentUser.companyId.toUpperCase()}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          setCurrentCompany(data);
        })
        .catch(() => {
          // Fallback if not physically initialized yet
          const isKopran = currentUser.companyId?.toUpperCase() === 'KOPRAN';
          setCurrentCompany({ 
            id: currentUser.companyId, 
            name: isKopran ? 'Engineering' : `${currentUser.companyId} Systems` 
          });
        });
    } else {
      setCurrentCompany(null);
    }
  }, [currentUser]);

  // Fetch essential system states
  const syncSystemData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      // 1. Fetch Issues matching active filters
      const filterParams = new URLSearchParams();
      if (statusFilter) filterParams.append('status', statusFilter);
      if (plantFilter) filterParams.append('plant', plantFilter);
      if (deptFilter) filterParams.append('department', deptFilter);
      if (searchFilter) filterParams.append('search', searchFilter);

      const resIssues = await fetch(`/api/issues?${filterParams.toString()}`);
      if (resIssues.ok) {
        const issuesData: Issue[] = await resIssues.json();
        setIssues(issuesData);

        // Check if a new issue occurred while running in background
        if (previousIssuesCountRef.current !== -1 && issuesData.length > previousIssuesCountRef.current) {
          const newTicket = issuesData[0]; // Assuming newest raises are sorted top
          if (newTicket) {
            setAlertNotification(`🚨 NEW INCIDENT: [${newTicket.id}] Active breakdown on ${newTicket.machine} at ${newTicket.area}!`);
            // Trigger a sound beep simulation in browser
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
            } catch (e) {}
          }
        }
        previousIssuesCountRef.current = issuesData.length;
        
        // Re-sync selected issue in case details modified
        if (selectedIssue) {
          const updated = issuesData.find(i => i.id === selectedIssue.id);
          if (updated) setSelectedIssue(updated);
        }
      }

      // 2. Fetch Dashboard Analytics stats
      const resStats = await fetch('/api/reports/stats');
      if (resStats.ok) {
        setStats(await resStats.json());
      }

      // 3. Fetch WhatsApp alert outbox dispatches
      const resWa = await fetch('/api/whatsapp-logs');
      if (resWa.ok) {
        setWhatsappLogs(await resWa.json());
      }

      setSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Data pull sync exceptions:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Run initial pull and trigger polling interval loop
  useEffect(() => {
    if (currentUser) {
      syncSystemData(true);

      const interval = setInterval(() => {
        syncSystemData(false);
      }, 7000); // Polling every 7s for super fast checks!

      return () => clearInterval(interval);
    }
  }, [currentUser, statusFilter, plantFilter, deptFilter, searchFilter]);

  const [envMode, setEnvMode] = useState<'testing' | 'production'>(
    (localStorage.getItem('kopran_env_mode') as 'testing' | 'production') || 'production'
  );

  const handleToggleEnv = (mode: 'testing' | 'production') => {
    localStorage.setItem('kopran_env_mode', mode);
    setEnvMode(mode);
    window.location.reload();
  };

  const renderEnvBanner = () => {
    return (
      <div className={`w-full text-center py-2 px-4 flex flex-col md:flex-row items-center justify-center gap-2 text-[10px] font-extrabold font-sans tracking-wide transition-colors ${
        envMode === 'testing' 
          ? 'bg-amber-500 text-amber-950 border-b border-amber-600' 
          : 'bg-emerald-600 text-emerald-50 border-b border-emerald-700'
      }`}>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${envMode === 'testing' ? 'bg-amber-900' : 'bg-emerald-300'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${envMode === 'testing' ? 'bg-amber-950' : 'bg-emerald-200'}`}></span>
          </span>
          {envMode === 'testing' ? (
            <span>🧪 <strong>CLOSED TESTING SANDBOX</strong> — raising test breakdowns is isolated securely.</span>
          ) : (
            <span>⚡ <strong>PRODUCTION COMPLIANCE MODE (LIVE)</strong> — Active manufacturing operations monitoring channel.</span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <span className="opacity-40 hidden md:inline">|</span>
          <button
            onClick={() => handleToggleEnv(envMode === 'testing' ? 'production' : 'testing')}
            className={`px-2.5 py-0.5 text-[8.5px] rounded uppercase font-extrabold border transition-all cursor-pointer ${
              envMode === 'testing'
                ? 'bg-amber-950 text-amber-200 border-amber-800 hover:bg-amber-900'
                : 'bg-emerald-950 text-emerald-100 border-emerald-800 hover:bg-emerald-900'
            }`}
          >
            Switch to {envMode === 'testing' ? 'Production' : 'Testing'} Mode
          </button>
        </div>
      </div>
    );
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // User remains logged in securely inside localStorage on OTP verification success
    localStorage.setItem('shift_sync_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedIssue(null);
    setCurrentCompany(null);
    previousIssuesCountRef.current = -1;
    localStorage.removeItem('shift_sync_user');
  };

  const handleClearWhatsAppLogs = async () => {
    try {
      const res = await fetch('/api/whatsapp-logs/clear', { method: 'POST' });
      if (res.ok) {
        syncSystemData(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Close dropdown menu triggers
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Simple validation route fallback if user not set
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
        {renderEnvBanner()}
        <div className="flex-grow flex items-center justify-center py-6">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
        <div className="p-4 text-center text-[10px] text-slate-400 font-mono">
          ShiftSync System Enterprise Node • Secured OTP Proxy
        </div>
      </div>
    );
  }

  // MINIMIZED STATE VIEW (Runs behind, polling active, pulsing notifications)
  if (isMinimized) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-150 p-6 flex flex-col justify-between font-sans grid-lines border-t-4 border-teal-500 animate-fade-in select-none">
        
        {/* Minimized Header Toolset */}
        <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 max-w-4xl mx-auto w-full mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">ShiftSync Background Service Taskmgr</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMinimized(false)}
              className="py-1 px-3 bg-teal-550 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-lg transition cursor-pointer"
            >
              Restore Main App
            </button>
            <button 
              onClick={handleLogout}
              className="py-1 px-3 bg-slate-700 hover:bg-rose-950 hover:text-rose-200 text-slate-300 font-bold uppercase text-[9px] tracking-widest rounded-lg transition border border-slate-650 cursor-pointer"
            >
              Sign-out Exit
            </button>
          </div>
        </div>

        {/* Minimized Central Dashboard bento */}
        <div className="max-w-md w-full mx-auto bg-slate-800 rounded-2xl border border-slate-750 p-6 shadow-2xl text-center space-y-6">
          <div className="relative inline-block mx-auto">
            <div className="p-4 bg-teal-950/40 rounded-full text-teal-400 border border-teal-800/60">
              <Activity className="h-12 w-12 text-teal-400 animate-pulse" />
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-teal-400">Background Real-Time Monitor Active</span>
            <h2 className="text-lg font-black text-white uppercase mt-1 leading-tight tracking-tight">ShiftSync run-behind node</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Active company thread syncs with the central server database every <strong>7 seconds</strong> to retrieve production line breakdown dispatches.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-750 text-left">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Open incidents</span>
              <p className="text-2xl font-black font-mono text-white mt-0.5">
                {issues.filter(i => ['open', 'assigned', 'in_progress'].includes(i.status)).length}
              </p>
            </div>
            
            <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-750 text-left">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-sans">Heartbeat telemetry</span>
              <p className="text-xs font-semibold font-mono text-emerald-400 mt-2 flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5 shrink-0" />
                <span>{syncTime || 'Polling active'}</span>
              </p>
            </div>
          </div>

          {/* Active alerts panel */}
          {alertNotification ? (
            <div className="p-3 bg-teal-950/60 border border-teal-500/30 text-teal-350 text-xs rounded-xl font-medium animate-bounce flex items-center justify-between text-left gap-3">
              <div className="flex-1">
                <span className="font-extrabold text-[9px] uppercase text-teal-400 block mb-0.5">NEW BREAKDOWN DETECTED!</span>
                {alertNotification}
              </div>
              <button 
                onClick={() => {
                  setAlertNotification(null);
                  setIsMinimized(false);
                }}
                className="py-1 px-2.5 bg-teal-500 hover:bg-teal-605 text-slate-950 uppercase text-[8.5px] font-black rounded-lg transition shrink-0 cursor-pointer"
              >
                Inspect Issue
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-850/50 rounded-xl text-[10px] text-slate-500 font-mono tracking-tight font-medium">
              No new alerts detected. Rest your console safe.
            </div>
          )}

          {currentCompany && (
            <div className="border-t border-slate-700/60 pt-4 flex items-center justify-center gap-2">
              {currentCompany.logoUrl && (
                <img src={currentCompany.logoUrl} alt="logo" className="h-4.5 w-4.5 object-contain" />
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tenant Partition: {currentCompany.name}</span>
            </div>
          )}
        </div>

        {/* Minimized Tray Footer */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-slate-500 font-mono">
            User Mobile ID: {currentUser.mobile} ({currentUser.name})
          </p>
          <p className="text-[9px] text-slate-600 font-mono">
            You can lock your system. Real-time background telemetry intercepts live actions.
          </p>
        </div>

      </div>
    );
  }

  // MAIN RUNNING EXPANDED APPLICATION SCREEN
  return (
    <div id="shiftsync-main-screen" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col antialiased transition-colors duration-200 grid-lines select-none">
      
      {/* 1. TOP SYSTEM MENU BAR WITH OS STYLE LAYOUT (Minimize, exit, diagnostics & tenant status) */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-4 h-9 flex items-center justify-between select-none z-50 shrink-0 font-sans">
        
        {/* Left Side: System Menus dropdown actions */}
        <div className="flex items-center gap-4 relative">
          
          <div className="flex items-center gap-1 px-1 py-0.5 bg-slate-800/80 rounded border border-slate-700 text-teal-400 font-bold text-[10.5px] tracking-wide uppercase shrink-0">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            <span>ShiftSync Pro</span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {/* File Menu */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuDropdown(activeMenuDropdown === 'file' ? null : 'file'); }}
                className="hover:text-white hover:bg-slate-800 px-2.5 py-1 rounded cursor-pointer transition font-medium"
              >
                File
              </button>
              {activeMenuDropdown === 'file' && (
                <div className="absolute left-0 mt-1.5 w-48 bg-slate-800 border border-slate-750 rounded-xl shadow-xl z-50 p-1 text-left font-sans animate-fade-in">
                  <button 
                    onClick={() => setActiveTab('reporting')}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    New Breakdown
                  </button>
                  <button 
                    onClick={() => {
                      window.open('/api/reports/export', '_blank');
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Export CSV Excel
                  </button>
                  <div className="h-px bg-slate-700 my-1" />
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    Minimize to Tray
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-rose-300 hover:bg-rose-950 hover:text-rose-105 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Exit & Sign-Out
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuDropdown(activeMenuDropdown === 'view' ? null : 'view'); }}
                className="hover:text-white hover:bg-slate-800 px-2.5 py-1 rounded cursor-pointer transition font-medium"
              >
                View
              </button>
              {activeMenuDropdown === 'view' && (
                <div className="absolute left-0 mt-1.5 w-48 bg-slate-800 border border-slate-750 rounded-xl shadow-xl z-50 p-1 text-left font-sans animate-fade-in">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layout className="h-3.5 w-3.5" />
                    Breakdowns List Console
                  </button>
                  <button 
                    onClick={() => setActiveTab('whatsapp')}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp Outbox logs
                  </button>
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-teal-600 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Admin Panel Settings
                  </button>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuDropdown(activeMenuDropdown === 'help' ? null : 'help'); }}
                className="hover:text-white hover:bg-slate-800 px-2.5 py-1 rounded cursor-pointer transition font-medium"
              >
                Help
              </button>
              {activeMenuDropdown === 'help' && (
                <div className="absolute left-0 mt-1.5 w-56 bg-slate-800 border border-slate-750 rounded-xl shadow-xl z-50 p-2.5 text-left font-sans text-slate-300 text-[11px] font-medium space-y-2 animate-fade-in">
                  <p className="font-extrabold text-white text-xs uppercase border-b border-slate-700 pb-1">ShiftSync Support</p>
                  <p>Check "Admin Panel" and configure organization parameters to create custom isolate environments.</p>
                  <div className="bg-slate-900 border border-slate-750 p-2 rounded text-[10px] text-slate-400">
                    Active Environment: <span className="text-amber-400 font-mono font-bold uppercase">{envMode}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Middle part: Connected Entity brand label */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
          <Building2 className="h-4 w-4" />
          <span>Tenant Organization:</span>
          <span className="text-emerald-100">{currentCompany?.name || 'Enterprise Workspace'}</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 py-0.5 px-2 rounded-full font-mono">{currentCompany?.id || 'ENTERPRISE'}</span>
        </div>

        {/* Right Side Window Controls (Our prompt Minimize & Exit Button requirement!) */}
        <div className="flex items-center gap-2 font-mono">
          
          {/* Real-time pulse notification status */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-750 rounded p-1 px-2.5 text-[10px] font-sans font-extrabold text-teal-400 leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
            <span>SYNC DATA: {issues.length} ISSUES</span>
          </div>

          <div className="h-5 w-px bg-slate-850 mx-1"></div>

          {/* Minimize button (sets isMinimized = true) */}
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1 px-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5 font-bold font-sans text-[11px]"
            title="Minimize Dashboard & Run Background Thread"
          >
            <span>🗕</span>
            <span className="hidden md:inline uppercase text-[9px] tracking-wider font-extrabold text-slate-400">Minimize</span>
          </button>

          {/* Exit App button (performs full logout / session exit) */}
          <button 
            onClick={handleLogout}
            className="p-1 px-2 hover:bg-rose-950 hover:text-rose-200 border border-transparent hover:border-rose-900 rounded text-rose-500 transition cursor-pointer flex items-center justify-center gap-1.5 font-bold font-sans text-[11px]"
            title="Exit Software (Full Logout & Disconnect)"
          >
            <span>❌</span>
            <span className="hidden md:inline uppercase text-[9px] tracking-wider font-extrabold">Exit App</span>
          </button>

        </div>

      </div>

           {/* 2. REGULAR DYNAMIC APPLICATION HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-10 select-none">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center bg-white">
          
          {/* Shifting brand and menus in a single left-aligned flex layout */}
          <div className="flex items-center gap-6 flex-1">
            {/* Dynamic White-Label Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              {currentCompany?.logoUrl && (
                <>
                  <img 
                    src={currentCompany.logoUrl} 
                    alt={currentCompany.name}
                    className="h-9 w-20 object-contain rounded-lg border border-slate-200 p-0.5 bg-slate-50"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                </>
              )}
              
              <div>
                <h1 className="text-sm font-black text-slate-950 leading-none uppercase tracking-wide">
                  {currentCompany?.name ? currentCompany.name : 'Break Down Monitor'}
                </h1>
                <p className="text-[9px] text-amber-600 font-extrabold uppercase tracking-widest mt-1">
                  {currentUser?.department || 'Engineering'} Breakdown Monitor
                </p>
              </div>
            </div>

            {/* Quick Filter actions - Left aligned next to brand! */}
            <nav className="hidden md:flex space-x-1 border border-slate-200 p-1 rounded-lg bg-slate-50 font-sans">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedIssue(null); }}
                className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Console
              </button>

              <button
                onClick={() => setActiveTab('reporting')}
                className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'reporting' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-905 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Raise Breakdown
              </button>
            </nav>
          </div>

          {/* User profile section */}
          <div className="flex items-center gap-3">
            <div className="text-right leading-none hidden sm:block">
              <p className="text-xs font-extrabold text-slate-900">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{currentUser.role.replace('_', ' ')}</p>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-extrabold text-teal-700 text-xs text-center">
              {currentUser.name.charAt(0)}
            </div>
          </div>

        </div>
      </header>

      {/* Mobile view subheader navigator */}
      <div className="md:hidden bg-white border-b border-slate-200 grid grid-cols-4 p-1 text-center font-sans tracking-tight leading-tight select-none shrink-0 shadow-sm animate-fade-in">
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedIssue(null); }}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Console
        </button>
        <button
          onClick={() => setActiveTab('reporting')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'reporting' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          Report
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'whatsapp' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Whatsapp
        </button>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'admin' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
            }`}
          >
            <Shield className="h-4 w-4" />
            Admin
          </button>
        )}
      </div>

      {/* CORE DISPLAY SCROLL AREA */}
      <main className="flex-grow overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Internal Live background alerts within the main application view */}
          <AnimatePresence>
            {alertNotification && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-teal-950 text-teal-350 border border-teal-500 p-4 rounded-xl flex items-center justify-between text-left shadow-lg text-xs font-semibold gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1 px-2.5 rounded bg-teal-500 text-slate-900 font-extrabold uppercase text-[10px] tracking-wide animate-pulse">
                    NEW UPDATE
                  </span>
                  <span>{alertNotification}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setAlertNotification(null); syncSystemData(false); }}
                    className="py-1 px-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                  >
                    Acknowledge
                  </button>
                  <button 
                    onClick={() => setAlertNotification(null)}
                    className="p-1 text-slate-450 hover:text-white shrink-0 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sync timeline banner */}
          <div className="flex items-center justify-between text-xs text-slate-550 text-slate-500 border-b border-slate-200 pb-3" id="sync-banner">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[9.5px] tracking-wider select-none">
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              Machine Incidents Synced: <strong className="text-slate-800 font-mono ml-1">{syncTime || 'Polling...'}</strong>
            </span>
            {loading && <span className="text-[10px] text-teal-600 animate-pulse flex items-center gap-1 font-bold">SYNCHRONIZING TELEMETRY...</span>}
          </div>

          {/* TAB 1: OPERATE DOCK CONSOLE */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="incidents-console-grid">
              
              {/* Left col: stats + incident filters + listings */}
              <div className="lg:col-span-2 space-y-5">
                
                {stats && ['admin', 'engineering_head', 'engineering_manager'].includes(currentUser.role) ? (
                  <DashboardStatsPanel stats={stats} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1">
                      <Activity className="h-4 w-4 text-teal-500" />
                      Analytical Performance Dashboard
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Detailed analytical graphs, Failure Frequent Frequencies, and Maintenance Engineering Roster Metrics are restricted to <strong>Admin, Engineering Head,</strong> and <strong>Engineering Manager</strong> classifications. Supervisors and officers write, update, and resolve breakdown statuses.
                    </p>
                  </div>
                )}

                {/* Filters Row */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-905 text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-teal-600" />
                      Dynamic Telemetry Filters
                    </span>
                    {(statusFilter || plantFilter || deptFilter || searchFilter) && (
                      <button
                        onClick={() => {
                          setStatusFilter('');
                          setPlantFilter('');
                          setDeptFilter('');
                          setSearchFilter('');
                        }}
                        className="text-[10px] text-teal-600 hover:text-teal-700 underline font-extrabold uppercase tracking-widest cursor-pointer"
                      >
                        Reset Views
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    >
                      <option value="">Status (All)</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={plantFilter}
                      onChange={(e) => setPlantFilter(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    >
                      <option value="">Plant (All)</option>
                      <option value="Pen Plant">Pen Plant</option>
                      <option value="Non-Pen Plant">Non-Pen Plant</option>
                    </select>

                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    >
                      <option value="">Department (All)</option>
                      {REGISTRATION_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    <div className="relative col-span-2 md:col-span-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search breakdowns..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="block w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Directory Issues Stack */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1 uppercase tracking-wider select-none">
                    <span>Incidents Directory ({issues.length} matching)</span>
                    <span>Status Order Priority</span>
                  </div>

                  {issues.length > 0 ? (
                    issues.map((issue) => {
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <div
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-white border-teal-500 ring-2 ring-teal-550/10 shadow-md scale-[1.01]' 
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 font-mono">
                                {issue.id}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] uppercase font-black text-teal-600 tracking-wider">{issue.plant}</span>
                              {issue.escalationStatus === 'escalated' && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-750 border border-rose-200 animate-pulse">
                                  ESCALATED
                                </span>
                              )}
                            </div>

                            <strong className="text-base font-black text-slate-900 block mt-1">
                              {issue.machine}
                            </strong>
                            <p className="text-xs text-slate-500 italic font-medium max-w-lg truncate leading-relaxed">
                              "{issue.description}"
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold pt-1 uppercase tracking-wider">
                              <span>Area: {issue.area}</span>
                              <span>•</span>
                              <span>Filed By: {issue.createdByName}</span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded ${
                              issue.status === 'open' ? 'bg-amber-150 text-amber-900 border border-amber-200' :
                              issue.status === 'assigned' ? 'bg-indigo-100 text-indigo-750 border border-indigo-200' :
                              issue.status === 'in_progress' ? 'bg-blue-105 bg-blue-100 text-blue-700 border border-blue-200' :
                              issue.status === 'resolved' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {issue.status}
                            </span>
                            <span className="text-[10px] text-slate-450 font-mono">
                              {new Date(issue.createdDateTime).toLocaleTimeString()}
                            </span>
                            {issue.assignedToName && (
                              <span className="text-[10px] text-teal-700 font-extrabold max-w-28 truncate">
                                Assigned: {issue.assignedToName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 border-dashed shadow-xs">
                      <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2.5" />
                      <span className="font-extrabold text-slate-500 block uppercase">No Active Breakdowns Found</span>
                      <span className="text-[11px] text-slate-400 block mt-1">Raise a breakdown alert to commence telemetry monitoring.</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Right column: Issue detail diagnostics view */}
              <div className="lg:col-span-1">
                {selectedIssue ? (
                  <IssueDetail 
                    issue={selectedIssue} 
                    currentUser={currentUser} 
                    onRefresh={() => syncSystemData(false)} 
                    onClose={() => setSelectedIssue(null)} 
                  />
                ) : (
                  <div className="border border-slate-200 rounded-xl p-8 bg-white text-center text-slate-500 text-xs flex flex-col items-center justify-center min-h-[350px] shadow-sm select-none">
                    <Monitor className="h-10 w-10 text-teal-600 opacity-60 mb-3" />
                    <span className="font-black text-slate-800 text-sm uppercase tracking-wider block">Diagnostics Console</span>
                    <p className="mt-2 leading-relaxed max-w-xs text-slate-400">
                      Select any logged equipment breakdown record to check Mean Time to Repair (MTTR), analyze root cause, append audit remarks, or coordinate engineers.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: REPORT NEW BREAKDOWN ALERT */}
          {activeTab === 'reporting' && (
            <div className="max-w-2xl mx-auto">
              <BreakdownForm 
                currentUser={currentUser} 
                onSuccess={() => {
                  setActiveTab('dashboard');
                  syncSystemData(true);
                }} 
                onCancel={() => setActiveTab('dashboard')} 
              />
            </div>
          )}

          {/* TAB 3: WHATSAPP OUTBOX TRACES */}
          {activeTab === 'whatsapp' && (
            <div className="max-w-4xl mx-auto">
              <WhatsAppLogsView 
                logs={whatsappLogs} 
                onClear={handleClearWhatsAppLogs} 
                onRefresh={() => syncSystemData(true)} 
              />
            </div>
          )}

          {/* TAB 4: TENANT ADMIN SETTING DIRECTORIES */}
          {activeTab === 'admin' && (
            <div className="max-w-5xl mx-auto">
              {currentUser.role === 'admin' ? (
                <AdminPanel 
                  currentUser={currentUser}
                  onRefreshStats={() => syncSystemData(false)} 
                  onCompanyUpdated={(comp) => {
                    setCurrentCompany(comp);
                  }}
                />
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center text-rose-805 shadow-sm animate-fade-in select-none">
                  <ShieldAlert className="h-12 w-12 text-rose-600 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">Access Prohibited</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Role-based multi-tenant restriction active. Only administrators with owner classifications can access isolated tenant config portals.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
