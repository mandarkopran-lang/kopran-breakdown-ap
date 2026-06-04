import React, { useState, useEffect } from 'react';
import { Issue, User } from '../types';
import { 
  X, Check, AlertTriangle, Play, HelpCircle, ArrowRight, UserPlus, FileText, 
  Clock, ShieldAlert, Sparkles, MessageCircle, AlertCircle, RefreshCw, ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface IssueDetailProps {
  issue: Issue;
  currentUser: User;
  onRefresh: () => void;
  onClose: () => void;
}

export default function IssueDetail({ issue, currentUser, onRefresh, onClose }: IssueDetailProps) {
  const [engineers, setEngineers] = useState<User[]>([]);
  const [selectedEngineerMobile, setSelectedEngineerMobile] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch engineers for assignments list
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then((data: User[]) => {
        const engs = data.filter(u => {
          const isEngOrAdmin = ['engineering_officer', 'engineering_manager', 'engineering_head', 'admin'].includes(u.role);
          if (!isEngOrAdmin) return false;
          // Filter matching: engineer's plant must be 'Both' or match the issue's plant
          const engPlant = u.plant || 'Pen Plant';
          return engPlant === 'Both' || engPlant === issue.plant;
        });
        setEngineers(engs);
        if (engs.length > 0) {
          setSelectedEngineerMobile(engs[0].mobile);
        } else {
          setSelectedEngineerMobile('');
        }
      })
      .catch(err => console.error("Error loaded engineers directory", err));
  }, [issue.plant]);

  const handleAssign = async () => {
    setLoading(true);
    setError('');
    try {
      const selectedEng = engineers.find(e => e.mobile === selectedEngineerMobile);
      if (!selectedEng) throw new Error('Choose an engineer to assign');

      const res = await fetch(`/api/issues/${issue.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: selectedEng.mobile,
          assignedToName: selectedEng.name,
          mobileSignature: currentUser.mobile,
          nameSignature: currentUser.name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Assignment error');
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'in_progress' | 'resolved') => {
    if (newStatus === 'resolved' && !resolutionRemarks.trim()) {
      setError('Provide repairs and resolution summary remarks to notify production supervisor.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/issues/${issue.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          remarks: newStatus === 'resolved' ? resolutionRemarks : undefined,
          mobileSignature: currentUser.mobile,
          nameSignature: currentUser.name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Status transition error');
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorDecision = async (decision: 'closed' | 'reopened') => {
    if (decision === 'reopened' && !feedback.trim()) {
      setError('Outline reasons for declining resolution to assist engineering team re-inspection.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/issues/${issue.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          feedback: decision === 'reopened' ? feedback : (feedback || undefined),
          mobileSignature: currentUser.mobile,
          nameSignature: currentUser.name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Closure submission error');
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper variables
  const isEngineerAssigned = issue.assignedTo === currentUser.mobile;
  const isSupervisorOfIssue = issue.createdBy === currentUser.mobile || currentUser.role === 'supervisor';
  const isAdmin = currentUser.role === 'admin';

  // Format Elapsed time
  const getElapsedSlaInfo = () => {
    const created = new Date(issue.createdDateTime).getTime();
    const targetLimit = issue.slaMinutes * 60 * 1000;
    
    // If ticket resolved/closed, stop calculating elapsed relative to now
    const endTimestamp = issue.resolvedDateTime 
      ? new Date(issue.resolvedDateTime).getTime() 
      : (issue.closureDateTime ? new Date(issue.closureDateTime).getTime() : Date.now());

    const elapsedMs = endTimestamp - created;
    const elapsedMins = Math.floor(elapsedMs / (1000 * 60));
    const remainsMins = issue.slaMinutes - elapsedMins;

    return {
      elapsedMins,
      remainsMins,
      isViolated: elapsedMins > issue.slaMinutes,
      isResolvedStatus: issue.status === 'resolved' || issue.status === 'closed'
    };
  };

  const slaInfo = getElapsedSlaInfo();

  return (
    <div id={`issue-detail-pane-${issue.id}`} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans text-slate-800 animate-fade-in text-left">
      
      {/* Detail header block */}
      <div className="bg-[#f8fafc] px-6 py-4 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-indigo-650 bg-indigo-600 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-tight">
              {issue.id}
              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ml-2 ${
                issue.status === 'open' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                issue.status === 'assigned' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200 font-bold' :
                issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {issue.status}
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{issue.plant} • {issue.department}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-805 hover:text-slate-800 transition cursor-pointer"
          title="Return to list"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Error notification banner if any */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-850 text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Basic Breakdown Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            
            {/* Machine & Area */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Target Machine</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{issue.machine}</span>
              <span className="text-xs text-slate-550 text-slate-500 font-bold block mt-1 uppercase tracking-wider">{issue.area}</span>
            </div>

            {/* Description Remarks */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Breakdown Symptom Remarks</span>
              <p className="text-xs sm:text-sm text-slate-800 bg-white p-4 rounded-lg border border-slate-200 leading-relaxed font-sans select-text shadow-sm">
                {issue.description}
              </p>
            </div>

            {/* SLA Alert block */}
            <div className={`p-4 rounded-lg border flex items-center justify-between ${
              slaInfo.isViolated 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-slate-550/5 bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock className={`h-5 w-5 ${slaInfo.isViolated ? 'text-red-600' : 'text-indigo-600'}`} />
                <div>
                  <span className="text-xs font-bold font-sans">
                    SLA Resolution Target: {issue.slaMinutes} minutes
                  </span>
                  <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                    {slaInfo.isResolvedStatus 
                      ? `Resolved in total of ${slaInfo.elapsedMins} minutes.`
                      : `Elapsed duration so far: ${slaInfo.elapsedMins} minutes.`}
                  </p>
                </div>
              </div>
              
              {!slaInfo.isResolvedStatus && (
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded uppercase leading-none font-sans ${
                  slaInfo.isViolated 
                    ? 'bg-red-100 text-red-800 animate-pulse' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {slaInfo.isViolated ? 'SLA Violated' : `${slaInfo.remainsMins}m remaining`}
                </span>
              )}
            </div>

          </div>

          {/* Picture capture container if provided */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Equipment Physical State picture</span>
            {issue.imageUrl ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden aspect-video relative flex items-center justify-center p-2 shadow-sm">
                <img src={issue.imageUrl} alt="Machine broken snaps" className="object-contain max-h-52 w-full rounded" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-lg aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs shadow-sm">
                <AlertTriangle className="h-7 w-7 stroke-[1.5] text-slate-300 mb-1.5" />
                <span className="font-bold">No breakdown picture uploaded by Supervisor</span>
              </div>
            )}

            {/* Created By Metadata */}
            <div className="mt-4 flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 uppercase shrink-0">
                {issue.createdByName.charAt(0)}
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Filed by production:</span>
                <strong className="text-slate-900 block font-bold">{issue.createdByName}</strong>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{issue.createdBy} • {new Date(issue.createdDateTime).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. AI Diagnostics section if pre-diagnosed during submission */}
        {issue.aiRecommendations && (
          <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 space-y-3.5">
            <h4 className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-655 text-indigo-600" />
              ShiftSync AI Action Guide & Diagnosis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <strong className="text-indigo-950 block mb-1 font-bold">Possible Root Causes:</strong>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {issue.aiRecommendations.possibleCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-indigo-950 block mb-1 font-bold">Recommended steps:</strong>
                <ul className="list-decimal pl-4 space-y-1 text-slate-600">
                  {issue.aiRecommendations.stepsToFix.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3. Workflow Routing Actions & Roles Panel */}
        <div id="routing-actions-card" className="bg-[#f8fafc] border border-slate-205 border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <ClipboardCheck className="h-4.5 w-4.5 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-none">Repair Action Desk</h4>
            <span className="ml-auto text-[9px] font-bold text-slate-500 uppercase tracking-widest">Identity Role: {currentUser.role.toUpperCase()}</span>
          </div>

          {/* STATUS: OPEN (Wait Assignment) */}
          {issue.status === 'open' && (
            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                This ticket is currently <strong className="text-amber-700 font-bold">'Open'</strong> awaiting assignation to an on-site mechanical/electrical breakdown service engineer.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* 1. Self Assignment for engineering staff */}
                {(['engineering_officer', 'engineering_manager', 'engineering_head', 'admin'].includes(currentUser.role)) && (
                  <button
                    onClick={() => {
                        setSelectedEngineerMobile(currentUser.mobile);
                        setTimeout(handleAssign, 50);
                    }}
                    disabled={loading}
                    className="flex-grow py-2.5 px-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Accept breakdown
                  </button>
                )}

                {/* 2. Admin or general delegative assignor selection */}
                {(isAdmin || currentUser.role === 'supervisor') && (
                  <div className="flex-grow flex gap-2">
                    <select
                      value={selectedEngineerMobile}
                      onChange={(e) => setSelectedEngineerMobile(e.target.value)}
                      className="flex-grow px-3 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-650 text-slate-800"
                    >
                      <option value="">-- Choose Engineer --</option>
                      {engineers.map(eng => (
                        <option key={eng.mobile} value={eng.mobile}>
                          {eng.name} ({eng.plant || 'Pen Plant'}) — {eng.mobile}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={loading || !selectedEngineerMobile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer"
                    >
                      Delegate Work
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATUS: ASSIGNED (Awaiting Check start) */}
          {issue.status === 'assigned' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 font-semibold text-left">
                Ticket assigned to Maintenance Engineer: <strong className="text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-150">{issue.assignedToName} ({issue.assignedTo})</strong>
              </div>
              
              {/* Mark In Progress action */}
              {(isEngineerAssigned || isAdmin) ? (
                <button
                  onClick={() => handleStatusUpdate('in_progress')}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  Initiate Diagnosis & Repairs (Mark 'In Progress')
                </button>
              ) : (
                <p className="text-xs italic text-slate-500">Waiting for {issue.assignedToName} to mark issue as In Progress and start diagnostics.</p>
              )}
            </div>
          )}

          {/* STATUS: IN PROGRESS (Repairs active) */}
          {issue.status === 'in_progress' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-605 text-slate-600 font-semibold text-left">
                Repairs currently under diagnosis by: <strong className="text-indigo-707 text-indigo-705 text-indigo-700 font-bold">{issue.assignedToName}</strong>. 
                SLA track countdown is active.
              </div>

              {/* Mark resolved resolution form */}
              {(isEngineerAssigned || isAdmin) ? (
                <div className="space-y-3 pt-2 text-left">
                  <label className="block text-xs font-bold text-slate-705 text-slate-705 text-slate-700">Resolution & Maintenance Remarks</label>
                  <textarea
                    required
                    rows={2.5}
                    placeholder="Specify action taken, faulty parts replaced (e.g. main cylinder double seal, lithium fat grease repacked, PLC card firmware parameter E-104 calibration done), physical inspection tests completed"
                    value={resolutionRemarks}
                    onChange={(e) => setResolutionRemarks(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs"
                  />
                  <button
                    onClick={() => handleStatusUpdate('resolved')}
                    disabled={loading || !resolutionRemarks.trim()}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Check className="h-4.5 w-4.5" />
                    Complete Repairs (Mark 'Resolved')
                  </button>
                </div>
              ) : (
                <p className="text-xs italic text-slate-500 text-left">Engineer is currently working on resolution. Please wait for repair markings.</p>
              )}
            </div>
          )}

          {/* STATUS: RESOLVED (Await Supervisor decision close) */}
          {issue.status === 'resolved' && (
            <div className="space-y-4 text-left">
              <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-150 text-xs">
                <strong className="text-emerald-800 block mb-1">✅ Breakdown Resolved by {issue.assignedToName}</strong>
                <p className="text-slate-650 font-medium">
                  Remarks: <span className="italic">"{issue.resolutionRemarks}"</span>
                </p>
                <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">Resolved on: {new Date(issue.resolvedDateTime || '').toLocaleString()}</span>
              </div>

              {/* Supervisor choice to close or decline/reopen */}
              {(isSupervisorOfIssue || isAdmin) ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-705">Feedback Remarks for Repair</label>
                  <input
                    type="text"
                    required
                    placeholder="Specify physical line testing success, or specify reasons if re-opening (e.g. vibration remains, oil drops, machine trips again)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-800"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSupervisorDecision('reopened')}
                      disabled={loading || !feedback.trim()}
                      className="flex-grow py-2 px-4 bg-white border border-rose-205 border-rose-300 text-rose-700 hover:bg-rose-50 text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
                    >
                      ❌ Reject & Re-open
                    </button>
                    <button
                      onClick={() => handleSupervisorDecision('closed')}
                      disabled={loading}
                      className="flex-grow py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer"
                    >
                      Confirm Success & Close
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-500">Waiting for Issue Creator to confirm successful repair and close the breakdown ticket.</p>
              )}
            </div>
          )}

          {/* STATUS: CLOSED */}
          {issue.status === 'closed' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-550 text-left">
              <strong className="text-slate-800 block mb-1">🏁 Breakdown ticket is closed.</strong>
              <span className="text-slate-500 font-medium">Full resolution timestamps logged and stored. Machine operates safely. Mean resolution time KPI updated.</span>
            </div>
          )}

        </div>

        {/* 4. Complete Audit Trail Timestamp log */}
        <div id="breakdown-audit-trail" className="space-y-3 text-left">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Historical Audit Timeline / Logs</span>
          <div className="relative border-l border-slate-200 pl-4 space-y-4">
            {issue.history && issue.history.map((log, index) => (
              <div key={index} className="relative">
                {/* Visual marker dot */}
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-indigo-600" />
                
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">{log.status}</span>
                    <span className="text-slate-400 text-[10px] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-650 text-slate-600 mt-1 select-text">
                    {log.notes}
                  </p>
                  <span className="text-[9.5px] text-slate-400 mt-0.5 block italic leading-none font-bold uppercase tracking-wider">— logged by {log.updatedByName || 'SYSTEM'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
