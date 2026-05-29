import React, { useState, useEffect } from 'react';
import { PLANT_HIERARCHY, User } from '../types';
import { 
  PlusCircle, Sparkles, Image, Loader2, Clock, Check, AlertCircle, Trash, Camera 
} from 'lucide-react';
import { motion } from 'motion/react';

interface BreakdownFormProps {
  currentUser: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BreakdownForm({ currentUser, onSuccess, onCancel }: BreakdownFormProps) {
  // Dropdown states
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');

  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [customSla, setCustomSla] = useState(120);
  const [customMachineName, setCustomMachineName] = useState('');

  // Diagnostic states
  const [diagnosing, setDiagnosing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    possibleCauses: string[];
    stepsToFix: string[];
    recommendedSlaMinutes: number;
    estimatedSeverity: 'Low' | 'Medium' | 'High' | 'Critical';
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Dropdown list derivations
  const departments = selectedPlant ? Object.keys(PLANT_HIERARCHY[selectedPlant] || {}) : [];
  const areas = (selectedPlant && selectedDept) ? Object.keys(PLANT_HIERARCHY[selectedPlant][selectedDept] || {}) : [];
  const machines = (selectedPlant && selectedDept && selectedArea) ? PLANT_HIERARCHY[selectedPlant][selectedDept][selectedArea] || [] : [];

  // Reset derivative dropdowns when parent resets
  useEffect(() => {
    setSelectedDept('');
    setSelectedArea('');
    setSelectedMachine('');
  }, [selectedPlant]);

  useEffect(() => {
    setSelectedArea('');
    setSelectedMachine('');
  }, [selectedDept]);

  useEffect(() => {
    setSelectedMachine('');
  }, [selectedArea]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Snapshot file must be smaller than 8MB size to prevent load overflows.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAiDiagnosis = async () => {
    if (!description.trim()) {
      setError('Please write an issue description first so that ShiftSync AI can run diagnostics.');
      return;
    }
    setDiagnosing(true);
    setError('');
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Diagnostic network failure');
      }
      setAiSuggestions(data);
      if (data.recommendedSlaMinutes) {
        setCustomSla(data.recommendedSlaMinutes);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const machineValue = selectedMachine === 'OTHER' ? customMachineName.trim() : selectedMachine;
    if (!selectedPlant || !selectedDept || !selectedArea || !machineValue || !description.trim()) {
      setError('Please fulfill all equipment selection fields and provide description remarks.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant: selectedPlant,
          department: selectedDept,
          area: selectedArea,
          machine: machineValue,
          description: description,
          imageUrl: imageUrl || undefined,
          createdBy: currentUser.mobile,
          createdByName: currentUser.name,
          slaMinutes: customSla,
          aiRecommendations: aiSuggestions || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to log breakdown ticket');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="breakdown-form-container" className="bg-white rounded-xl border border-slate-205 border-slate-200 shadow-sm p-6 relative font-sans text-left">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-indigo-655 text-indigo-600" />
            File Machine Breakdown Report
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">Specify machinery hierarchy to route alerts to appropriate engineers</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-655 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Step Dropdowns (Hierarchy Chaining) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Plant Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">1. Target Plant</label>
            <select
              required
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650"
            >
              <option value="">-- Choose Plant --</option>
              {Object.keys(PLANT_HIERARCHY).map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-505 text-slate-505 text-slate-500 uppercase tracking-wider mb-1.5">2. Operating Department</label>
            <select
              required
              disabled={!selectedPlant}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650 disabled:opacity-50"
            >
              <option value="">-- Select Dept --</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Area Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-505 text-slate-505 text-slate-505 text-slate-500 uppercase tracking-wider mb-1.5">3. Line / Area Location</label>
            <select
              required
              disabled={!selectedDept}
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-655 focus:ring-indigo-650 focus:border-indigo-650 disabled:opacity-50"
            >
              <option value="">-- Select Line --</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          {/* Machine Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">4. Faulty Machine Unit</label>
            <select
              required
              disabled={!selectedArea}
              value={selectedMachine}
              onChange={(e) => {
                setSelectedMachine(e.target.value);
                if (e.target.value !== 'OTHER') {
                  setCustomMachineName('');
                }
              }}
              className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-650 focus:border-indigo-650 disabled:opacity-50"
            >
              <option value="">-- Choose Machine --</option>
              {machines.map(mach => (
                <option key={mach} value={mach}>{mach}</option>
              ))}
              {selectedArea && (
                <option value="OTHER">-- Machine Not Listed (Type Manually) --</option>
              )}
            </select>

            {selectedMachine === 'OTHER' && (
              <div className="mt-2.5">
                <label className="block text-[9px] font-bold text-indigo-650 text-indigo-600 uppercase tracking-widest mb-1 font-mono">
                  Specify Machine Name (No Special Characters)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Centrifuge 03"
                  value={customMachineName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
                    const capitalized = val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : "";
                    setCustomMachineName(capitalized);
                  }}
                  className="block w-full px-3 py-2 border border-indigo-250 border-indigo-200 bg-indigo-50/20 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <p className="text-[9px] text-slate-400 mt-1">
                  Machine List by Plant will be added after 3 months collected implementation data.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Description remarks */}
        <div>
          <label htmlFor="issue-description" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            5. Breakdown Symptom Description
          </label>
          <div className="relative">
            <textarea
              id="issue-description"
              required
              rows={3}
              placeholder="Detail the failure symptoms (e.g. pressure drops during cycles, abnormal heavy vibrations, PLC interface fault code E-201, smoke/fluid leaks)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full px-3.5 py-3 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-650"
            />
            
            {/* AI Diagnose Action Trigger */}
            <div className="absolute right-2 bottom-2">
              <button
                type="button"
                onClick={handleAiDiagnosis}
                disabled={diagnosing || !description.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-755 hover:bg-indigo-700 text-white text-[10.5px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {diagnosing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Diagnose Assist
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Snapshot uploads and Camera Mock option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              6. Hardware Snapshot (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-grow flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-600 cursor-pointer transition-colors shadow-sm font-semibold">
                <Image className="h-4 w-4 text-slate-400" />
                Upload Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Simulation Instant Snapshot Button */}
              <button
                type="button"
                onClick={() => {
                  // Simulate on-site physical camera snap
                  setImageUrl("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23f1f5f9'/><circle cx='200' cy='150' r='60' stroke='%234338ca' stroke-width='4' fill='none'/><line x1='120' y1='150' x2='280' y2='150' stroke='%234338ca' stroke-width='2'/><text x='50%' y='260' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='12' font-weight='bold'>ON-SITE FLUID LINE LEAK DETECTED (MOCK)</text></svg>");
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-600 cursor-pointer shadow-sm font-semibold"
                title="Simulate Mobile Camera click"
              >
                <Camera className="h-4 w-4 text-indigo-600" />
                Auto-snap
              </button>
            </div>

            {imageUrl && (
              <div className="mt-3 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-slate-1.3 px-2 py-2 shadow-sm shrink-0">
                <img src={imageUrl} alt="Machine broken preview" className="w-full max-h-36 object-contain rounded-lg" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-1 rounded bg-rose-650 hover:bg-rose-750 bg-rose-600 text-white cursor-pointer"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {currentUser.role === 'admin' ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                7. Target SLA Limits (Mins)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    required
                    min={10}
                    max={2880}
                    value={customSla}
                    onChange={(e) => setCustomSla(Number(e.target.value))}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-semibold"
                  />
                </div>
                <span className="text-xs text-slate-500 font-bold shrink-0">Minutes</span>
              </div>
              
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[30, 60, 120, 240, 480].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomSla(mins)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition cursor-pointer ${
                      customSla === mins ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Gemini AI suggestion summary banner if loaded */}
        {aiSuggestions && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-indigo-950 font-bold flex items-center gap-1.5 font-sans">
                <Sparkles className="h-4 w-4 text-indigo-650 text-indigo-600 animate-pulse" />
                ShiftSync AI Analysis & Diagnostic Recommendations
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                aiSuggestions.estimatedSeverity === 'Critical' ? 'bg-red-50 border border-red-200 text-red-800' :
                aiSuggestions.estimatedSeverity === 'High' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                'bg-slate-50 border border-slate-200 text-slate-700'
              }`}>
                {aiSuggestions.estimatedSeverity} Severity
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-650 mt-2 font-medium">
              <div>
                <strong className="text-slate-800 text-[10px] uppercase font-bold block tracking-wider mb-1">Potential Physical Causes:</strong>
                <ul className="list-disc pl-4 space-y-0.5">
                  {aiSuggestions.possibleCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-slate-800 text-[10px] uppercase font-bold block tracking-wider mb-1">Recommended Resolution Guide:</strong>
                <ul className="list-decimal pl-4 space-y-0.5 text-indigo-950 font-semibold leading-relaxed">
                  {aiSuggestions.stepsToFix.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <p className="text-[10px] text-indigo-600 font-bold mt-1.5 block text-right font-mono">
                Recommended SLA target applied automatically: {aiSuggestions.recommendedSlaMinutes} minutes.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-grow py-2 px-4 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 cursor-pointer transition-all duration-150"
          >
            Go Back
          </button>
          
          <button
            id="submit-breakdown-ticket"
            type="submit"
            disabled={submitting || !selectedMachine || (selectedMachine === 'OTHER' && !customMachineName.trim())}
            className="flex-grow flex justify-center items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg shadow-sm text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer transition-all duration-150"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dispatching alert logs...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Submit Breakdown Alert
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
