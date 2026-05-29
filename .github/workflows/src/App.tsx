import React, { useState, useEffect } from 'react';
import { User, Issue, DashboardStats, REGISTRATION_DEPARTMENTS } from './types';
import Login from './components/Login';
import DashboardStatsPanel from './components/DashboardStatsPanel';
import BreakdownForm from './components/BreakdownForm';
import IssueDetail from './components/IssueDetail';
import WhatsAppLogsView from './components/WhatsAppLogsView';
import AdminPanel from './components/AdminPanel';
import KopranLogo from './components/KopranLogo';
import { 
  Factory, LogOut, AppWindow, PlusCircle, MessageSquare, Shield, CheckCircle2, 
  AlertTriangle, Filter, Search, RefreshCw, Smartphone, ClipboardList, Clock, 
  UserPlus2, ShieldAlert, Wifi, XCircle, Activity
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reporting' | 'whatsapp' | 'admin'>('dashboard');
  const [isExitOverlayOpen, setIsExitOverlayOpen] = useState(false);
  
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
        const issuesData = await resIssues.ok ? await resIssues.json() : [];
        setIssues(issuesData);
        
        // Re-sync selected issue in case details modified
        if (selectedIssue) {
          const updated = (issuesData as Issue[]).find(i => i.id === selectedIssue.id);
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
      }, 8000); // Poll every 10s for real-time live boards!

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
      <div className={`w-full text-center py-2 px-4 flex flex-col md:flex-row items-center justify-center gap-2 text-[11px] font-bold font-sans tracking-wide transition-colors ${
        envMode === 'testing' 
          ? 'bg-amber-500 text-amber-950 border-b border-amber-600' 
          : 'bg-emerald-600 text-emerald-50 border-b border-emerald-700'
      }`}>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${envMode === 'testing' ? 'bg-amber-900' : 'bg-emerald-300'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${envMode === 'testing' ? 'bg-amber-950' : 'bg-emerald-200'}`}></span>
          </span>
          {envMode === 'testing' ? (
            <span>🧪 <strong>CLOSED GROUP TESTING MODE (SANDBOX)</strong> — All test breakdown data raised here is fully isolated.</span>
          ) : (
            <span>⚡ <strong>REAL-TIME PRODUCTION MODE (LIVE)</strong> — Active factory operation breakdown logs.</span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <span className="opacity-50 hidden md:inline">|</span>
          <button
            onClick={() => handleToggleEnv(envMode === 'testing' ? 'production' : 'testing')}
            className={`px-2.5 py-1 text-[9px] rounded uppercase font-extrabold border transition-all cursor-pointer shadow-xs ${
              envMode === 'testing'
                ? 'bg-amber-950 text-amber-200 border-amber-800 hover:bg-amber-900 hover:text-white'
                : 'bg-emerald-950 text-emerald-100 border-emerald-800 hover:bg-emerald-900 hover:text-white'
            }`}
          >
            Switch to {envMode === 'testing' ? 'Production (Live)' : 'Testing (Sandbox)'} Mode
          </button>
        </div>
      </div>
    );
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('shift_sync_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedIssue(null);
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

  // Simple validation route fallback if user not set
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-105 bg-slate-100 flex flex-col">
        {renderEnvBanner()}
        <div className="flex-grow flex items-center justify-center py-8">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col antialiased transition-colors duration-200 grid-lines">
      {renderEnvBanner()}
      
      {/* Dynamic Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10 select-none">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <KopranLogo size={36} />
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-950 leading-none uppercase tracking-wide">Breakdown Monitor</h1>
              <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">Real-time Plant Operations</p>
            </div>
          </div>

          {/* Quick Filter actions */}
          <nav className="hidden md:flex space-x-1 border border-slate-200 p-1 rounded-lg bg-slate-50">
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedIssue(null); }}
              className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Console
            </button>

            <button
              onClick={() => setActiveTab('reporting')}
              className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'reporting' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Raise Breakdown
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'whatsapp' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp Outbox
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-105 hover:bg-slate-100'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin Panel
            </button>
          </nav>

          {/* Connected state & role metadata */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> WHATSAPP: ONLINE
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> SERVER: ACTIVE
              </div>
            </div>

            <div className="hidden lg:block h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right leading-none">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{currentUser.role}</p>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                {currentUser.name.charAt(0)}
              </div>

              <button
                onClick={() => setIsExitOverlayOpen(true)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-650 hover:text-indigo-600 text-slate-400 transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Exit Portal (Run Behind)"
              >
                <XCircle className="h-4 w-4 text-rose-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-650 hidden md:block">Exit App</span>
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-650 hover:text-red-600 text-slate-400 transition cursor-pointer"
                title="Disconnect sign-out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile view subheader navigator */}
      <div className="md:hidden bg-white border-b border-slate-200 grid grid-cols-4 p-1 text-center font-sans tracking-tight leading-tight select-none shrink-0 shadow-sm animate-fade-in">
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedIssue(null); }}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-600 bg-slate-50' : 'text-slate-505 text-slate-500'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Console
        </button>
        <button
          onClick={() => setActiveTab('reporting')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'reporting' ? 'text-indigo-600 bg-slate-50' : 'text-slate-505 text-slate-500'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          Report
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'whatsapp' ? 'text-indigo-600 bg-slate-50' : 'text-slate-505 text-slate-500'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Outbox
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'admin' ? 'text-indigo-600 bg-slate-50' : 'text-slate-505 text-slate-500'
          }`}
        >
          <Shield className="h-4 w-4" />
          Admin
        </button>
      </div>

      {/* Core main scrolling body layout */}
      <main className="flex-grow overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Real-time system synchronized update banner */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3" id="sync-banner">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider">
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              Machine Incidents Synced: <strong className="text-slate-800 font-mono ml-1">{syncTime || 'Polling...'}</strong>
            </span>
            {loading && <span className="text-[10px] text-indigo-600 animate-pulse flex items-center gap-1 font-bold">SYNCHRONIZING...</span>}
          </div>

          {/* TAB CONTENT: INCIDENTS CONSOLE (Primary layout with List/Filters and graphs) */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="incidents-console-grid">
              
              {/* Left 2 Column layout: Filters + Breakdown Incidents stack list */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* Real-time statistics counters widgets directly on top */}
                {stats && ['admin', 'engineering_head', 'engineering_manager'].includes(currentUser.role) ? (
                  <DashboardStatsPanel stats={stats} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-205 border-slate-200 p-5 shadow-sm space-y-2 mb-2.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Activity className="h-4 w-4 text-indigo-505 text-indigo-500" />
                      Analytical Performance Dashboard
                    </span>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Graphical reports, Failure Frequent Frequencies, Breakdown Distribution shares, and Maintenance Engineering Roster Metrics are role-based features restricted to <strong>Admin, Engineering Head,</strong> and <strong>Engineering Manager</strong> classifications. All active operators can write, submit, and confirm resolution status safely.
                    </p>
                  </div>
                )}                {/* Filters Board header */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-indigo-600" />
                      Dynamic Filters
                    </span>
                    {(statusFilter || plantFilter || deptFilter || searchFilter) && (
                      <button
                        onClick={() => {
                          setStatusFilter('');
                          setPlantFilter('');
                          setDeptFilter('');
                          setSearchFilter('');
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 underline font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        Reset Views
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    
                    {/* Status */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                    >
                      <option value="">Status (All)</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    {/* Plant */}
                    <select
                      value={plantFilter}
                      onChange={(e) => setPlantFilter(e.target.value)}
                      className="px-2 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                    >
                      <option value="">Plant (All)</option>
                      <option value="Plant 1">Plant 1</option>
                      <option value="Plant 2">Plant 2</option>
                    </select>

                    {/* Dept */}
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-2 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                    >
                      <option value="">Department (All)</option>
                      {REGISTRATION_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    {/* Search string descriptor */}
                    <div className="relative col-span-2 md:col-span-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search incidents..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="block w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                      />
                    </div>

                  </div>
                </div>

                {/* List stack of incidents */}
                <div className="space-y-3" id="incidents-stack-list">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1 select-none uppercase tracking-wider">
                    <span>Incidents Directory ({issues.length} records matching)</span>
                    <span>Status Order Priority</span>
                  </div>

                  {issues.length > 0 ? (
                    issues.map((issue) => {
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <div
                          id={`incident-item-${issue.id}`}
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-155 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-md animate-fade-in' 
                              : 'bg-white border-slate-205 border-slate-200 hover:border-slate-350 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 font-mono block">
                                {issue.id}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider block">{issue.plant}</span>
                              
                              {issue.escalationStatus === 'escalated' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-750 border border-red-200 animate-pulse">
                                  ESCALATED
                                </span>
                              )}
                            </div>

                            <strong className="text-base font-bold text-slate-900 block mt-1">
                              {issue.machine}
                            </strong>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic leading-tight select-none">
                              "{issue.description}"
                            </p>
                            
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold pt-1 uppercase tracking-wider">
                              <span>Area: {issue.area}</span>
                              <span>•</span>
                              <span>Filed By: {issue.createdByName}</span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            
                            {/* Visual state label */}
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded ${
                              issue.status === 'open' ? 'bg-amber-100 text-amber-805 text-amber-800 border border-amber-200' :
                              issue.status === 'assigned' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                              issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200 font-bold' :
                              issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-850 text-emerald-800 border border-emerald-250 border-emerald-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {issue.status}
                            </span>

                            <span className="text-[10px] text-slate-405 text-slate-400 font-mono">
                              {new Date(issue.createdDateTime).toLocaleTimeString()}
                            </span>

                            {issue.assignedToName && (
                              <span className="text-[10px] text-indigo-700 font-bold max-w-28 overflow-hidden text-ellipsis whitespace-nowrap block">
                                Eng: {issue.assignedToName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 border-dashed shadow-sm animate-fade-in">
                      <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2.5" />
                      <span className="font-bold text-slate-500 block">No Active Incidents</span>
                      <span className="text-[11px] text-slate-400 block mt-1">Zero failure incidents captured matching requirements. Raise breakdown alert to get started.</span>
                    </div>
                  )}
                </div>

              </div>
              
              {/* Right Column: Selected item Detail view, or instructions block if nothing selected */}
              <div className="lg:col-span-1 select-none">
                {selectedIssue ? (
                  <IssueDetail 
                    issue={selectedIssue} 
                    currentUser={currentUser} 
                    onRefresh={() => syncSystemData(false)} 
                    onClose={() => setSelectedIssue(null)} 
                  />
                ) : (
                  <div className="border border-slate-200 rounded-xl p-8 bg-white text-center text-slate-500 text-xs flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                    <AppWindow className="h-10 w-10 text-indigo-600 opacity-60 mb-3" />
                    <span className="font-extrabold text-slate-800 text-sm uppercase tracking-wider block">Incident Diagnostics</span>
                    <p className="mt-2 leading-relaxed max-w-xs text-slate-500">
                      Choose any machine breakdown item from the directory list to examine real-time workflows, view equipment physical states, review timers, or delegate repairs.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: REPORT BREAKDOWN FORM */}
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

          {/* TAB CONTENT: WHATSAPP OUTBOX */}
          {activeTab === 'whatsapp' && (
            <div className="max-w-4xl mx-auto">
              <WhatsAppLogsView 
                logs={whatsappLogs} 
                onClear={handleClearWhatsAppLogs} 
                onRefresh={() => syncSystemData(true)} 
              />
            </div>
          )}

          {/* TAB CONTENT: ADMIN PANEL */}
          {activeTab === 'admin' && (
            <div className="max-w-5xl mx-auto">
              {currentUser.role === 'admin' ? (
                <AdminPanel onRefreshStats={() => syncSystemData(false)} />
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-800 shadow-sm animate-fade-in-down">
                  <ShieldAlert className="h-12 w-12 text-red-650 text-red-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 leading-tight">Administrator Panel Confined</h3>
                  <p className="text-xs text-slate-505 text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Role-based security active. Ensure you sign in using Vikram Singh's (+91 76543 21098) Admin profile to access database roster directories and CSV schedules.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Background Running App Modal Overlay */}
      {isExitOverlayOpen && (
        <div id="exit-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-750 border-b border-slate-100 pb-3">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                <Wifi className="h-5 w-5 animate-pulse text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-none">Minimizing Breakdown Portal</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-1">Background Worker Active</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Company Breakdown Monitor has been folded to standard background-active state on this device.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-2 leading-relaxed font-semibold">
              <p className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>Active Thread:</strong> Automated polling loop (8s interval sync active behind)</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span><strong>WhatsApp Dispatches:</strong> "Kopran Engineering" outbox worker running</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                <span><strong>Notifications:</strong> Native system webhook push protocols are armed</span>
              </p>
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              You can lock your terminal or switch tabs. The app is securely active.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setIsExitOverlayOpen(false)}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition text-center cursor-pointer"
              >
                Resume Active Portal
              </button>
              <button
                onClick={() => {
                  setIsExitOverlayOpen(false);
                  handleLogout();
                }}
                className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-650 text-slate-600 font-semibold uppercase tracking-wider text-xs rounded-lg transition text-center cursor-pointer"
              >
                Full Sign-Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
