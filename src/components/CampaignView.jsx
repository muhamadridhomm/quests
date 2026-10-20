import React, { useState } from 'react';
import { StatusBadge, ProgressRing } from './UI';
import { SearchBar, Pagination } from './SearchAndPagination';
import { getTaskUrgency, getUrgencyBadgeColor, sortTasks, getTaskSubCampaign } from '../utils';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import summariesData from '../data/summaries.json';

export function CampaignCard({ campaign, stats, onClick }) {
  if (!stats) return null;
  const aiSummary = summariesData.campaigns?.[campaign.id];

  return (
    <div 
      onClick={onClick}
      className={`glass-card p-6 cursor-pointer hover:border-slate-600 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${campaign.color} rounded-full filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity`} />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{campaign.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">{campaign.name}</h3>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              {aiSummary ? (
                <span className="flex items-start gap-1">
                  <Sparkles size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  {aiSummary}
                </span>
              ) : (
                campaign.description
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
        <div className="flex items-center gap-4">
          <ProgressRing percentage={stats.percentage} colorClass={`text-${campaign.color.split('-')[1]}-500`} />
          <div>
            <div className="text-2xl font-bold text-slate-200">{stats.completed}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">/ {stats.total} Tasks</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskList({ campaign, tasks, onSelectTask, searchQuery, setSearchQuery, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage }) {
  const [selectedSubCampaign, setSelectedSubCampaign] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [sortBy, setSortBy] = useState('urgency');
  const aiSummary = summariesData.campaigns?.[campaign.id];

  const toggleGroup = (id, e) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Find top level tasks for this campaign (support both taskIds lists and folderNames/listIds mapping)
  const topLevelTasks = tasks.filter(t => {
    if (t.parent) return false;
    const matchesId = campaign.taskIds?.includes(t.id);
    const matchesFolder = campaign.folderNames && t.folder && campaign.folderNames.includes(t.folder.name);
    const matchesList = campaign.listIds && t.list && campaign.listIds.includes(t.list.id);
    return matchesId || matchesFolder || matchesList;
  });

  // Calculate task counts per sub-campaign
  const subCampaignsList = React.useMemo(() => {
    const list = [{ id: 'all', name: 'All Sub-Campaigns', icon: '⚡' }, ...(campaign.subCampaigns || [])];
    // Add Other if there are any tasks matching the fallback
    const hasOther = topLevelTasks.some(t => getTaskSubCampaign(t, campaign)?.id === `other_${campaign.id}`);
    if (hasOther) {
      list.push({ id: `other_${campaign.id}`, name: 'Other Tasks', icon: '📁' });
    }
    return list;
  }, [campaign, topLevelTasks]);

  const subCampaignCounts = React.useMemo(() => {
    const counts = { all: topLevelTasks.length };
    topLevelTasks.forEach(t => {
      const sub = getTaskSubCampaign(t, campaign);
      if (sub) {
        counts[sub.id] = (counts[sub.id] || 0) + 1;
      }
    });
    return counts;
  }, [topLevelTasks, campaign]);

  // Filter top-level tasks by sub-campaign
  const subCampaignFilteredTasks = topLevelTasks.filter(t => {
    if (selectedSubCampaign === 'all') return true;
    const sub = getTaskSubCampaign(t, campaign);
    return sub && sub.id === selectedSubCampaign;
  });

  // Filter by search query
  const filteredTasks = subCampaignFilteredTasks.filter(t => {
    const searchStr = `${t.name} ${t.id} ${t.assignees?.map(a=>a.username).join(' ')}`.toLowerCase();
    
    // Also check if any of its subtasks match the search query
    const subtasks = tasks.filter(sub => sub.parent === t.id);
    const subMatches = subtasks.some(sub => {
      const subStr = `${sub.name} ${sub.id} ${sub.assignees?.map(a=>a.username).join(' ')}`.toLowerCase();
      return subStr.includes(searchQuery.toLowerCase());
    });
    
    return searchStr.includes(searchQuery.toLowerCase()) || subMatches;
  });

  // Sort tasks
  const sortedTasks = sortTasks(filteredTasks, sortBy);

  // Slice for pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = sortedTasks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-slide-up flex flex-col h-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{campaign.icon}</span>
            <h2 className="text-2xl font-bold text-slate-100">{campaign.name} Campaign</h2>
          </div>
          <div className="text-slate-400 max-w-3xl">
            {aiSummary ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-sm text-indigo-100 flex items-start gap-2">
                <Sparkles size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>{aiSummary}</span>
              </div>
            ) : (
              campaign.description
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300">
            <span className="text-slate-500 font-semibold text-xs uppercase">Sort:</span>
            <select 
              value={sortBy} 
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none outline-none text-slate-300 text-sm font-medium cursor-pointer"
            >
              <option value="urgency" className="bg-slate-900">Urgency</option>
              <option value="dueDate" className="bg-slate-900">Due Date</option>
              <option value="alphabetical" className="bg-slate-900">A-Z</option>
              <option value="status" className="bg-slate-900">Status</option>
            </select>
          </div>
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
      </div>

      {/* Sub-Campaign Filter Pills */}
      {subCampaignsList.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-slate-900/40 border border-slate-850 rounded-xl max-w-fit">
          {subCampaignsList.map(sub => {
            const count = subCampaignCounts[sub.id] || 0;
            const isActive = selectedSubCampaign === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedSubCampaign(sub.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' 
                    : 'text-slate-450 hover:text-slate-300 border border-transparent'
                }`}
              >
                <span>{sub.icon}</span>
                <span>{sub.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-indigo-500/25 text-indigo-300' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4 flex-1">
        {paginatedTasks.map(task => {
          // Find subtasks for this task
          const subtasks = tasks.filter(t => t.parent === task.id);
          const completedSubs = subtasks.filter(t => t.status?.status?.toLowerCase() === 'complete' || t.status?.status?.toLowerCase() === 'dev - deployed').length;
          const urgency = getTaskUrgency(task);
          const isExpanded = !!expandedGroups[task.id]; // collapsed by default

          return (
            <div key={task.id} className="glass-card overflow-hidden">
              <div 
                onClick={() => onSelectTask(task, subtasks)}
                className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors flex items-center justify-between group"
              >
                <div className="flex-1 pr-6 flex items-start gap-3">
                  <button 
                    onClick={(e) => toggleGroup(task.id, e)}
                    className="mt-0.5 p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-2 leading-snug flex items-center gap-2">
                      <span title={urgency.label}>{urgency.icon}</span> 
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-mono">{task.questsId || 'Pending'}</span>
                      {task.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <StatusBadge status={task.status?.status} />
                      </span>
                      <span>•</span>
                      <span>{task.assignees?.map(a => (a.username || '').split(' ')[0] || 'Unknown').join(', ') || 'Unassigned'}</span>
                      {subtasks.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="bg-slate-800 px-2 py-1 rounded text-xs font-medium">
                            {completedSubs}/{subtasks.length} subtasks complete
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {isExpanded && subtasks.length > 0 && (
                <div className="bg-slate-900/60 border-t border-slate-800/50 p-4 pl-12 space-y-3">
                  {subtasks.map(child => {
                    const childUrgency = getTaskUrgency(child);
                    return (
                      <div 
                        key={child.id}
                        onClick={() => onSelectTask(child, [])}
                        className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/20 cursor-pointer hover:bg-slate-800/60 transition-colors flex flex-col gap-2"
                      >
                        <h5 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                          <span title={childUrgency.label}>{childUrgency.icon}</span> ↳ 
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">{child.questsId || 'Pending'}</span>
                          {child.name}
                        </h5>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 ml-6">
                          <span className="flex items-center gap-1.5">
                            <StatusBadge status={child.status?.status} />
                          </span>
                          <span>•</span>
                          {childUrgency.level !== 'none' && (
                            <>
                              <span className={getUrgencyBadgeColor(childUrgency.color) + " px-2 py-0.5 rounded uppercase font-bold"}>
                                {childUrgency.label}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>{child.assignees?.map(a => a.username.split(' ')[0]).join(', ') || 'Unassigned'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center p-12 glass-card border-dashed">
            <p className="text-slate-400">No tasks found for this campaign.</p>
          </div>
        )}
      </div>

      <Pagination 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        totalItems={filteredTasks.length}
      />
    </div>
  );
}
