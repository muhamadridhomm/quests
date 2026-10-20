import React from 'react';
import { LayoutDashboard, Users, RefreshCw, Layers, AlertCircle, KanbanSquare, BarChart3, Menu, Sparkles, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProgressRing } from './UI';
import { SettingsModal } from './SettingsModal';
import { useState } from 'react';

export function Sidebar({ 
  selectedCampaign, 
  setSelectedCampaign, 
  selectedAssignee, 
  setSelectedAssignee,
  campaignStats,
  refreshData,
  loading,
  totalUrgentCount,
  CAMPAIGNS,
  TARGET_ASSIGNEES,
  isCollapsed,
  setIsCollapsed
}) {
  const totalTasks = Object.values(campaignStats).reduce((acc, curr) => acc + curr.total, 0);
  const totalCompleted = Object.values(campaignStats).reduce((acc, curr) => acc + curr.completed, 0);
  const totalPercentage = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);
  
  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className={`glass border-r flex flex-col h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Logo Area */}
      <div className={`p-4 border-b border-slate-800 flex ${isCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-500/30 flex-shrink-0">
            <img src="/quests-logo.svg" alt="QUESTS Logo" className="w-full h-full object-cover transform scale-110" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 
                className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent cursor-help"
                title="Quality Assurance & Unified Engineering Service Tracking System"
              >
                QUESTS
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 font-medium tracking-wider">WORKSPACE</p>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold tracking-wider" title="Demo Tracker API Sync is running in safe mock mode">
                  MOCK
                </span>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Global Stats */}
      <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div>
            <span className="text-sm font-medium text-slate-400 block mb-1">Overall Progress</span>
            <span className="text-xs text-slate-500 font-semibold">{totalCompleted} / {totalTasks} Tasks</span>
          </div>
        )}
        <div className="relative flex items-center justify-center" title={`${totalPercentage}% Completed`}>
          <ProgressRing percentage={totalPercentage} size={isCollapsed ? 48 : 56} strokeWidth={isCollapsed ? 4 : 5} colorClass="text-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={`${isCollapsed ? 'text-[10px]' : 'text-xs'} font-bold text-slate-300`}>{totalPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex-1 ${isCollapsed ? 'px-2 py-4 flex flex-col items-center' : 'p-4'}`}>
        <div className="mb-6 w-full">
          {!isCollapsed && <h2 className="px-3 mb-2 text-xs font-semibold text-slate-500 tracking-wider uppercase">Views</h2>}
          <button
            onClick={() => { setSelectedCampaign('all'); setSelectedAssignee(null); }}
            title={isCollapsed ? "All Campaigns" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors mb-1 ${
              selectedCampaign === 'all' && !selectedAssignee
                ? 'bg-indigo-500/10 text-indigo-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>All Campaigns</span>}
          </button>
          
          <button
            onClick={() => { setSelectedCampaign('urgent'); setSelectedAssignee(null); }}
            title={isCollapsed ? "Action Required" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl relative' : 'justify-between px-3 py-2 rounded-lg'} text-sm font-medium transition-colors mb-1 ${
              selectedCampaign === 'urgent' && !selectedAssignee
                ? 'bg-rose-500/10 text-rose-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <AlertCircle size={isCollapsed ? 20 : 18} className={totalUrgentCount > 0 ? "text-rose-500" : ""} />
              {!isCollapsed && <span>Action Required</span>}
            </div>
            {totalUrgentCount > 0 && !isCollapsed && (
              <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUrgentCount}
              </span>
            )}
            {totalUrgentCount > 0 && isCollapsed && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => { setSelectedCampaign('matrix'); setSelectedAssignee(null); }}
            title={isCollapsed ? "Developer Board" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors mb-1 ${
              selectedCampaign === 'matrix' && !selectedAssignee
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KanbanSquare size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Developer Board</span>}
          </button>

          <button
            onClick={() => { setSelectedCampaign('workload'); setSelectedAssignee(null); }}
            title={isCollapsed ? "Developer Load" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors mb-1 ${
              selectedCampaign === 'workload' && !selectedAssignee
                ? 'bg-purple-500/10 text-purple-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Developer Load</span>}
          </button>

          <button
            onClick={() => { setSelectedCampaign('dispatch'); setSelectedAssignee(null); }}
            title={isCollapsed ? "Smart Dispatch" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors ${
              selectedCampaign === 'dispatch' && !selectedAssignee
                ? 'bg-sky-500/10 text-sky-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Smart Dispatch</span>}
          </button>
        </div>

        {!isCollapsed && (
          <div className="mb-6 w-full">
            <h2 className="px-3 mb-2 text-xs font-semibold text-slate-500 tracking-wider uppercase">Assignees</h2>
            {TARGET_ASSIGNEES.map(assignee => (
              <button
                key={assignee.id}
                onClick={() => { setSelectedAssignee(assignee.id); setSelectedCampaign(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  selectedAssignee === assignee.id
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users size={18} />
                <span className="truncate text-left">{assignee.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="w-full">
          {!isCollapsed && <h2 className="px-3 mb-2 text-xs font-semibold text-slate-500 tracking-wider uppercase">Campaigns</h2>}
          {CAMPAIGNS.map(campaign => {
            const stats = campaignStats[campaign.id] || { percentage: 0 };
            return (
              <button
                key={campaign.id}
                title={isCollapsed ? campaign.name : ""}
                onClick={() => { setSelectedCampaign(campaign.id); setSelectedAssignee(null); }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'justify-between px-3 py-2 rounded-lg'} text-sm font-medium transition-colors mb-1 ${
                  selectedCampaign === campaign.id
                    ? 'bg-slate-800 text-slate-200' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'} truncate`}>
                  <span className={isCollapsed ? 'text-lg' : ''}>{campaign.icon}</span>
                  {!isCollapsed && <span className="truncate">{campaign.name}</span>}
                </div>
                {!isCollapsed && <span className="text-xs text-slate-500">{stats.percentage}%</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4`}>
        {/* Bottom Actions */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
          <Link
            to="/portal"
            title={isCollapsed ? "Intake Portal" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20`}
          >
            <Sparkles size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Intake Portal</span>}
          </Link>
          
          <button 
            onClick={() => setShowSettings(true)}
            title={isCollapsed ? "Global Settings" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/50`}
          >
            <Settings size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Settings</span>}
          </button>
          
          <button 
            onClick={refreshData}
            title={isCollapsed ? "Sync Data" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'} text-sm font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/50`}
          >
            <RefreshCw size={isCollapsed ? 20 : 18} className={loading ? "animate-spin text-indigo-400" : ""} />
            {!isCollapsed && <span>{loading ? 'Syncing...' : 'Sync Data'}</span>}
          </button>
        </div>
      </div>
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </aside>
  );
}
