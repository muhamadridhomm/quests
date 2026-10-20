import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, AlertTriangle } from 'lucide-react';

export function SettingsModal({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setIsConfigured(data.geminiConfigured);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKey.trim() })
      });
      
      if (res.ok) {
        setIsConfigured(true);
        setApiKey('');
        setMessage('API Key saved successfully!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage('Failed to save API Key.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up relative">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Key size={20} className="text-indigo-400" />
            Global Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Gemini AI Configuration</h3>
            <p className="text-xs text-slate-400 mb-4">
              To use the AI Triage and Auto-Summarization features, a Google Gemini API key is required. 
              The key will be stored securely on the local server.
            </p>
            
            <div className={`p-3 rounded-lg flex items-start gap-3 border ${isConfigured ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
              {isConfigured ? (
                <ShieldCheck className="text-emerald-400 mt-0.5" size={18} />
              ) : (
                <AlertTriangle className="text-amber-400 mt-0.5" size={18} />
              )}
              <div>
                <p className={`text-sm font-medium ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {loading ? 'Checking status...' : (isConfigured ? 'API Key is configured' : 'API Key is missing')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isConfigured ? 'You can overwrite it by entering a new one below.' : 'Please enter an API key to enable AI features.'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                New API Key
              </label>
              <input 
                type="password" 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {message && (
              <div className={`mb-4 text-xs font-medium text-center ${message.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving || !apiKey.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
