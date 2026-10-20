import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Plus, LayoutDashboard, ArrowLeft, Send, Loader2, AlertCircle, Clock, FileText, CheckCircle2, BrainCircuit, XCircle } from 'lucide-react';
import { StatusBadge } from './UI';

export default function IntakePortal() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [triagingId, setTriagingId] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'feature',
    title: '',
    description: ''
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;
    
    try {
      setSubmitting(true);
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to submit request');
      
      // Clear form
      setFormData({ type: 'feature', title: '', description: '' });
      // Refresh list
      fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Approved') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'Rejected') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (status === 'Pending Approval') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-800 border-slate-700'; // Pending Triage
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return <CheckCircle2 size={14} />;
    if (status === 'Rejected') return <AlertCircle size={14} />;
    if (status === 'Pending Approval') return <Clock size={14} />;
    return <Sparkles size={14} />; // Pending Triage
  };

  const handleTriage = async (id) => {
    try {
      setTriagingId(id);
      const res = await fetch(`/api/requests/triage/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run AI triage');
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setTriagingId(null);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles size={24} className="text-emerald-400" />
              QUESTS Intake Portal
            </h1>
          </div>
          
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700">
            <LayoutDashboard size={16} />
            Developer Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Request Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-emerald-400" />
              New Request
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Request Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="feature">New Feature</option>
                  <option value="bug">Bug Report</option>
                  <option value="app">New App Request</option>
                  <option value="change">Change Request</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Short, descriptive title..." 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description & Justification</label>
                <textarea 
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  placeholder="Provide detailed information, steps to reproduce, or business justification..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              
              {error && <p className="text-rose-400 text-xs mt-2 text-center">{error}</p>}
            </form>
          </div>
        </div>

        {/* Right Col: Request Tracker */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-indigo-400" />
                My Requests Status
              </h2>
              
              <button onClick={fetchRequests} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white" title="Refresh list">
                <Clock size={16} />
              </button>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p>Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                  <Sparkles size={24} className="text-slate-600" />
                </div>
                <p>You haven't submitted any requests yet.</p>
                <p className="text-sm mt-1">Use the form on the left to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.slice().reverse().map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 transition-colors flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">{req.id}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{req.type}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-200 truncate">{req.title}</h3>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)} shrink-0 uppercase tracking-wider`}>
                        {getStatusIcon(req.status)} {req.status}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-400 line-clamp-2">{req.description}</p>
                    
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-800/50">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Submitted: {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {req.status === 'Pending Triage' && (
                          <button 
                            onClick={() => handleTriage(req.id)}
                            disabled={triagingId === req.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 disabled:opacity-50"
                          >
                            {triagingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                            {triagingId === req.id ? 'Analyzing...' : 'Run AI Triage'}
                          </button>
                        )}
                        
                        {req.status === 'Pending Triage' && req.aiTriage && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(req.id, 'Approved')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* AI Assessment Result Section */}
                    {req.aiTriage && (
                      <div className="mt-2 bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <BrainCircuit size={14} /> AI Triage Assessment
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${req.aiTriage.priority === 'High' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : req.aiTriage.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                            Priority: {req.aiTriage.priority}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700">
                            Cat: {req.aiTriage.category}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${req.aiTriage.recommendedAction === 'Approve' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : req.aiTriage.recommendedAction === 'Reject' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                            Action: {req.aiTriage.recommendedAction}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-200/80 leading-relaxed italic">{req.aiTriage.assessment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </main>
    </div>
  );
}
