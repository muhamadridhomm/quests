import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, User, Sparkles, Loader2, AlertCircle, RefreshCw, Layers, Copy, Check } from 'lucide-react';
import { StatusBadge } from './UI';
import { getTaskUrgency, getUrgencyBadgeColor } from '../utils';
import summariesData from '../data/summaries.json';

function formatDate(ms) {
  if (!ms) return '-';
  const d = new Date(parseInt(ms));
  return d.toLocaleDateString();
}

function CopyIdButton({ idString }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!idString) return;
    navigator.clipboard.writeText(idString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!idString) return null;
  
  return (
    <button 
      onClick={handleCopy}
      className="ml-2 text-slate-400 hover:text-indigo-400 transition-colors bg-slate-800/50 p-1 rounded border border-slate-700 hover:bg-slate-800"
      title="Copy ID"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function TaskSummary({ task, type }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Whenever task changes or summariesData updates, try to load pre-generated summary
    if (summariesData.tasks && summariesData.tasks[task.id]) {
      setSummary(summariesData.tasks[task.id]);
    }
  }, [task.id, summariesData]);

  const fetchSummary = async () => {
    if (!task.description && !task.text_content) {
      setSummary('No description available to summarize.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          name: task.name,
          description: task.description || task.text_content || '',
          type: type
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 glass-card bg-indigo-500/5 border-indigo-500/20 relative group">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
          <Sparkles size={16} /> AI Summary
        </h4>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {summary && !loading && (
            <button 
              onClick={fetchSummary}
              title="Regenerate Summary"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-md transition-colors flex items-center justify-center"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        {!summary && !loading && (
          <button 
            onClick={fetchSummary}
            className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-full transition-colors"
          >
            Explain this
          </button>
        )}
      </div>
      
      {loading && (
        <div className="flex items-center gap-2 text-indigo-300 text-sm">
          <Loader2 size={14} className="animate-spin" /> Analyzing task details...
        </div>
      )}
      
      {error && (
        <div className="text-rose-400 text-sm">{error}</div>
      )}
      
      {summary && !loading && (
        <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-p:my-1 max-w-none">
          {summary.split('\\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskDetail({ task, subtasks, onClose }) {
  if (!task) return null;
  const parentUrgency = getTaskUrgency(task);

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] glass border-l shadow-2xl z-50 flex flex-col animate-slide-up transform translate-y-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 glass-header flex items-start justify-between">
        <div className="pr-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={task.status?.status} />
            {parentUrgency.level !== 'none' && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getUrgencyBadgeColor(parentUrgency.color)} flex items-center gap-1 uppercase tracking-wider`}>
                <AlertCircle size={12} /> {parentUrgency.label}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 leading-tight">{task.name}</h2>
          <div className="flex gap-4 items-center mt-3">
            <a 
              href={task.url} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <ExternalLink size={14} /> Open demo tracker record
            </a>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Traceability Block */}
        <div className="glass-card p-4 mb-6 border-indigo-500/30 bg-indigo-500/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
            <Layers size={14} /> ID Traceability Registry
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">QUESTS ID</div>
              <div className="flex items-center">
                <div className="text-sm font-mono text-slate-200 bg-slate-900/50 px-2 py-1 rounded inline-block border border-slate-800">{task.questsId || 'Pending'}</div>
                {task.questsId && <CopyIdButton idString={task.questsId} />}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Demo Tracker ID</div>
              <div className="flex items-center">
                {task.demoTrackerId ? (
                  <a href={`/demo-tracker-api/tasks/${task.demoTrackerId}`} target="_blank" rel="noreferrer" className="text-sm font-mono text-indigo-300 hover:text-indigo-200 bg-slate-900/50 px-2 py-1 rounded inline-flex items-center gap-1.5 border border-indigo-500/30 hover:border-indigo-400 transition-colors">
                    {task.demoTrackerId} <ExternalLink size={12} />
                  </a>
                ) : (
                  <div className="text-sm font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded inline-block border border-slate-800/50 italic">Unlinked</div>
                )}
                {task.demoTrackerId && <CopyIdButton idString={task.demoTrackerId} />}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Work tracker ID</div>
              <div className="flex items-center">
                <a href={task.url} target="_blank" rel="noreferrer" className="text-sm font-mono text-indigo-300 hover:text-indigo-200 bg-slate-900/50 px-2 py-1 rounded inline-flex items-center gap-1.5 border border-indigo-500/30 hover:border-indigo-400 transition-colors">
                  {task.workTrackerId || task.id} <ExternalLink size={12} />
                </a>
                <CopyIdButton idString={task.workTrackerId || task.id} />
              </div>
            </div>
          </div>
        </div>
        {/* Meta Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <User size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">Developer</span>
            </div>
            <div className="text-sm font-medium text-slate-200 truncate" title={task.assignees?.map(a => a.username).join(', ') || 'Unassigned'}>
              {task.assignees?.map(a => a.username).join(', ') || 'Unassigned'}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">Start Date</span>
            </div>
            <div className="text-sm font-medium text-slate-200">
              {formatDate(task.start_date)}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">End Date</span>
            </div>
            <div className="text-sm font-medium text-slate-200">
              {formatDate(task.due_date)}
            </div>
          </div>
        </div>

        {/* Parent Task Summary */}
        <div className="mb-8">
          <TaskSummary task={task} type="Parent Task" />
        </div>

        {/* Subtasks */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Subtasks ({subtasks.length})
            </h3>
          </div>

          {subtasks.length === 0 ? (
            <div className="text-sm text-slate-500 italic p-4 text-center glass-card border-dashed">
              No subtasks found.
            </div>
          ) : (
            <div className="space-y-4">
              {subtasks.map((st, idx) => {
                const isComplete = st.status?.status?.toLowerCase() === 'complete' || st.status?.status?.toLowerCase() === 'dev - deployed';
                return (
                  <div key={st.id} className={`glass-card p-5 transition-colors ${isComplete ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className={`text-base font-medium leading-snug ${isComplete ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                        {idx + 1}. {st.name}
                      </h4>
                      <StatusBadge status={st.status?.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1"><User size={12}/> <strong>Dev:</strong> {st.assignees?.map(a => a.username).join(', ') || 'Unassigned'}</span>
                      {st.start_date && <span className="flex items-center gap-1"><Calendar size={12}/> <strong>Start:</strong> {formatDate(st.start_date)}</span>}
                      {st.due_date && <span className="flex items-center gap-1"><Calendar size={12}/> <strong>End:</strong> {formatDate(st.due_date)}</span>}
                    </div>
                    
                    {/* Subtask Summary */}
                    <TaskSummary task={st} type="Subtask" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
