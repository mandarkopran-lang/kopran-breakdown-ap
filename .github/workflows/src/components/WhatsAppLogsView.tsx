import React, { useState } from 'react';
import { WhatsAppLog } from '../types';
import { 
  MessageSquare, Trash2, Search, Smartphone, Calendar, CheckSquare, RefreshCw 
} from 'lucide-react';

interface WhatsAppLogsViewProps {
  logs: WhatsAppLog[];
  onClear: () => void;
  onRefresh: () => void;
}

export default function WhatsAppLogsView({ logs, onClear, onRefresh }: WhatsAppLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="whatsapp-logs-panel" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 font-sans text-slate-700 text-left">
      
      {/* Panel title info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            WhatsApp Communications Dispatch Outbox
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">Automated messages matching on-site changes & escalations</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
            Sync Logs
          </button>
          
          {logs.length > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Logs
            </button>
          )}
        </div>
      </div>

      {/* Developer note */}
      <div className="bg-emerald-50/55 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 leading-relaxed font-medium">
        📌 <strong>WhatsApp API Dispatch Engine:</strong> The backend automatically triggers these structured notifications out of the box. Real integrations are active when Twilio configurations are set in environment settings, otherwise they safely propagate to these auditable logs.
      </div>

      {/* Search Filter input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Filter logs by keyword, template, or recipient name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-9 pr-3 py-2 border border-slate-205 border-slate-200 bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-650"
        />
      </div>

      {/* Logs stack */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-350 flex flex-col sm:flex-row justify-between gap-3 relative hover:shadow-sm transition-shadow">
              <div className="space-y-1.5 flex-grow">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                    log.type === 'issue_created' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    log.type === 'assigned' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                    log.type === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-slate-50 text-slate-705 text-slate-600 border-slate-200'
                  }`}>
                    Type: {log.type.replace('_', ' ')}
                  </span>
                  
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                    {log.apiUsed}
                  </span>
                </div>

                <div className="flex items-start gap-1 text-xs font-bold text-slate-900">
                  <Smartphone className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>Recipient: {log.recipient}</span>
                </div>

                <div className="bg-[#f0fdf4] p-3 rounded-lg border border-[#bbf7d0] text-xs text-emerald-950 font-mono select-text whitespace-pre-wrap leading-relaxed shadow-sm">
                  {log.message}
                </div>
              </div>

              <div className="sm:text-right shrink-0 flex sm:flex-col justify-between sm:justify-start gap-2 text-[10px] text-slate-500 font-medium">
                <span className="flex items-center sm:justify-end gap-1 font-mono">
                  <Calendar className="h-3 w-3" />
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                
                <span className="flex items-center sm:justify-end gap-1.5 text-emerald-600 font-bold self-start sm:self-end">
                  <CheckSquare className="h-3 w-3" />
                  DISPATCHED
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
            <span>No matching dispatches logged inside outbox. Create issue tickets or assign repairs to trigger WhatsApp alerts.</span>
          </div>
        )}
      </div>

    </div>
  );
}
