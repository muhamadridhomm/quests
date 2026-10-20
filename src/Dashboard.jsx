import React, { useState, useEffect } from 'react';
import { useWorkTracker } from './hooks/useWorkTracker';
import { Sidebar } from './components/Sidebar';
import { CampaignCard, TaskList } from './components/CampaignView';
import { TaskDetail } from './components/TaskDetail';
import { StickyMatrix } from './components/StickyMatrix';
import { WorkloadDashboard } from './components/WorkloadDashboard';
import { DispatchBoard } from './components/DispatchBoard';
import { SearchBar, Pagination } from './components/SearchAndPagination';
import { StatusBadge } from './components/UI';
import { LayoutDashboard, AlertCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { getTaskUrgency, getUrgencyBadgeColor, sortTasks, getTaskCampaign, getTaskSubCampaign } from './utils';

function Dashboard() {
  const { 
    tasks, 
    campaignStats, 
    loading, 
    error, 
    refreshData,
    getTasksByAssignee,
    CAMPAIGNS,
    TARGET_ASSIGNEES,
    DEVELOPERS,
    syncStatus
  } = useWorkTracker();

  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Search and Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Urgent Tab Filters
  const [urgentFilterCampaign, setUrgentFilterCampaign] = useState('all');
  const [urgentFilterSubCampaign, setUrgentFilterSubCampaign] = useState('all');
  const [urgentFilterAssignee, setUrgentFilterAssignee] = useState('all');
  const [urgentSortBy, setUrgentSortBy] = useState('urgency');
  const [expandedUrgentGroups, setExpandedUrgentGroups] = useState({});
  const toggleUrgentGroup = (id, e) => {
    e.stopPropagation();
    setExpandedUrgentGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [expandedAssigneeGroups, setExpandedAssigneeGroups] = useState({});
  const toggleAssigneeGroup = (id, e) => {
    e.stopPropagation();
    setExpandedAssigneeGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Reset pagination when view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCampaign, selectedAssignee, searchQuery, urgentFilterCampaign, urgentFilterSubCampaign, urgentFilterAssignee]);
  const [activeTask, setActiveTask] = useState(null);
  const [activeSubtasks, setActiveSubtasks] = useState([]);

  const handleTaskClick = (task, subtasks) => {
    setActiveTask(task);
    setActiveSubtasks(subtasks);
  };

  const closeTaskDetail = () => {
    setActiveTask(null);
    setActiveSubtasks([]);
  };

  const totalUrgentCount = React.useMemo(() => {
    return tasks.filter(t => {
      const u = getTaskUrgency(t);
      return u.level === 'high' || u.level === 'medium';
    }).length;
  }, [tasks]);

  // Determine what to show in the main content area
  let content = null;

  if (loading && Object.keys(campaignStats).length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading workspace data...</p>
      </div>
    );
  } else if (error && Object.keys(campaignStats).length === 0) {
    content = (
      <div className="p-6 glass-card bg-rose-500/10 border-rose-500/20">
        <h3 className="text-rose-400 font-bold mb-2">Error Loading Data</h3>
        <p className="text-rose-300/80 text-sm">{error}</p>
      </div>
    );
  } else if (selectedAssignee) {
    const assigneeTasks = getTasksByAssignee(selectedAssignee);
    const assigneeName = TARGET_ASSIGNEES.find(a => a.id === selectedAssignee)?.name;
    
    // Group assignee tasks by campaign
    const grouped = {};
    assigneeTasks.forEach(t => {
      // Find which campaign this belongs to
      const camp = getTaskCampaign(t, CAMPAIGNS);
      if (camp) {
        if (!grouped[camp.id]) grouped[camp.id] = [];
        grouped[camp.id].push(t);
      } else {
        if (!grouped['uncategorized']) grouped['uncategorized'] = [];
        grouped['uncategorized'].push(t);
      }
    });

    content = (
      <div className="animate-slide-up">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Tasks for {assigneeName}</h2>
        <p className="text-slate-400 mb-8">Showing all tasks assigned to this user across all campaigns.</p>
        
        {Object.entries(grouped).map(([campId, campTasks]) => {
          const camp = CAMPAIGNS.find(c => c.id === campId) || { name: 'Uncategorized', icon: '❓' };
          return (
            <div key={campId} className="mb-8">
              <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                <span>{camp.icon}</span> {camp.name}
              </h3>
              <div className="space-y-4">
                {(() => {
                  const assigneeGroupsMap = {};
                  campTasks.forEach(t => {
                    if (t.parent) {
                      const pt = tasks.find(p => p.id === t.parent);
                      if (pt) {
                        if (!assigneeGroupsMap[pt.id]) assigneeGroupsMap[pt.id] = { parent: pt, children: [] };
                        if (!assigneeGroupsMap[pt.id].children.some(c => c.id === t.id)) {
                          assigneeGroupsMap[pt.id].children.push(t);
                        }
                      }
                    } else {
                      if (!assigneeGroupsMap[t.id]) assigneeGroupsMap[t.id] = { parent: t, children: [] };
                    }
                  });
                  const assigneeGroups = Object.values(assigneeGroupsMap);
                  
                  if (assigneeGroups.length === 0) {
                     return <p className="text-sm text-slate-500 italic px-4">No tasks found in this campaign.</p>
                  }

                  return assigneeGroups.map(group => {
                    const parent = group.parent;
                    const children = group.children;
                    const isExpanded = !!expandedAssigneeGroups[parent.id];
                    const parentUrgency = getTaskUrgency(parent);

                    return (
                      <div key={parent.id} className="glass-card overflow-hidden">
                        <div 
                          onClick={() => handleTaskClick(parent, tasks.filter(t => t.parent === parent.id))}
                          className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors border-l-4 border-l-indigo-500 flex items-center justify-between group"
                        >
                          <div className="flex-1 pr-6 flex items-start gap-3">
                            <button 
                              onClick={(e) => toggleAssigneeGroup(parent.id, e)}
                              className="mt-0.5 p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            <div>
                              <h4 className="text-lg font-semibold text-slate-200 mb-2 leading-snug flex items-center gap-2">
                                {parentUrgency.level !== 'none' && <span title={parentUrgency.label}>{parentUrgency.icon}</span>}
                                {parent.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <StatusBadge status={parent.status?.status} />
                                </span>
                                {parentUrgency.level !== 'none' && (
                                  <>
                                    <span>•</span>
                                    <span className={getUrgencyBadgeColor(parentUrgency.color) + " px-2 py-0.5 rounded text-xs font-bold uppercase"}>
                                      {parentUrgency.label}
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{parent.assignees?.map(a => (a.username || '').split(' ')[0] || 'Unknown').join(', ') || 'Unassigned'}</span>
                                {children.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-400 font-medium">{children.length} subtask{children.length > 1 ? 's' : ''} assigned</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isExpanded && children.length > 0 && (
                          <div className="bg-slate-900/60 border-t border-slate-800/50 p-4 pl-12 space-y-3">
                            {children.map(child => {
                              const childUrgency = getTaskUrgency(child);
                              return (
                                <div 
                                  key={child.id}
                                  onClick={() => handleTaskClick(child, [])}
                                  className="p-3 rounded-lg border bg-slate-800/20 cursor-pointer hover:bg-slate-800/60 transition-colors flex flex-col gap-2 border-slate-700/50"
                                >
                                  <h5 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                                    {childUrgency.level !== 'none' && <span title={childUrgency.label}>{childUrgency.icon}</span>}
                                    ↳ {child.name}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 ml-6">
                                    <span className="flex items-center gap-1.5">
                                      <StatusBadge status={child.status?.status} />
                                    </span>
                                    {childUrgency.level !== 'none' && (
                                      <>
                                        <span>•</span>
                                        <span className={getUrgencyBadgeColor(childUrgency.color) + " px-2 py-0.5 rounded uppercase font-bold"}>
                                          {childUrgency.label}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
        {assigneeTasks.length === 0 && (
          <p className="text-slate-400 text-center p-12 glass-card border-dashed">No tasks found for this assignee.</p>
        )}
      </div>
    );
  } else if (selectedCampaign === 'dispatch') {
    content = <DispatchBoard />;
  } else if (selectedCampaign === 'all') {
    content = (
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-100 mb-2">Workspace Overview</h2>
            <p className="text-slate-400">Track all active campaigns and project progress.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {CAMPAIGNS.map(campaign => (
            <CampaignCard 
              key={campaign.id} 
              campaign={campaign} 
              stats={campaignStats[campaign.id]}
              onClick={() => setSelectedCampaign(campaign.id)}
            />
          ))}
        </div>
      </div>
    );
  } else if (selectedCampaign === 'urgent') {
    // 1. Build groups of urgent tasks
    const urgentGroupsMap = {};
    tasks.forEach(t => {
      const u = getTaskUrgency(t);
      if (u.level === 'high' || u.level === 'medium') {
        if (t.parent) {
          const pt = tasks.find(p => p.id === t.parent);
          if (pt) {
            if (!urgentGroupsMap[pt.id]) urgentGroupsMap[pt.id] = { parent: pt, urgentChildren: [] };
            urgentGroupsMap[pt.id].urgentChildren.push(t);
          }
        } else {
          if (!urgentGroupsMap[t.id]) urgentGroupsMap[t.id] = { parent: t, urgentChildren: [] };
        }
      }
    });

    const urgentGroups = Object.values(urgentGroupsMap).sort((a, b) => {
      if (urgentSortBy === 'alphabetical') {
        return a.parent.name.localeCompare(b.parent.name);
      }
      if (urgentSortBy === 'dueDate') {
        const dateA = a.parent.due_date ? parseInt(a.parent.due_date) : Infinity;
        const dateB = b.parent.due_date ? parseInt(b.parent.due_date) : Infinity;
        return dateA - dateB;
      }
      if (urgentSortBy === 'status') {
        const statusA = a.parent.status?.status || '';
        const statusB = b.parent.status?.status || '';
        return statusA.localeCompare(statusB);
      }
      if (urgentSortBy === 'urgency') {
        const uA = getTaskUrgency(a.parent).level;
        const uB = getTaskUrgency(b.parent).level;
        if (uA === uB) return 0;
        if (uA === 'high') return -1;
        return 1;
      }
      return 0;
    });

    // 2. Filter by search query and dropdowns
    const filteredUrgentGroups = urgentGroups.filter(group => {
      const { parent, urgentChildren } = group;
      
      const matchesSearch = [parent, ...urgentChildren].some(t => {
        const searchStr = `${t.name} ${t.id} ${t.assignees?.map(a=>a.username).join(' ')}`.toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase());
      });
      
      let matchesCampaign = true;
      if (urgentFilterCampaign !== 'all') {
        const taskCamp = getTaskCampaign(parent, CAMPAIGNS);
        matchesCampaign = taskCamp ? taskCamp.id === urgentFilterCampaign : false;
      }
      
      let matchesSubCampaign = true;
      if (urgentFilterCampaign !== 'all' && urgentFilterSubCampaign !== 'all') {
        const camp = CAMPAIGNS.find(c => c.id === urgentFilterCampaign);
        const taskSubCamp = getTaskSubCampaign(parent, camp);
        matchesSubCampaign = taskSubCamp ? taskSubCamp.id === urgentFilterSubCampaign : false;
      }
      
      let matchesAssignee = true;
      if (urgentFilterAssignee !== 'all') {
        matchesAssignee = [parent, ...urgentChildren].some(t => 
          t.assignees?.some(a => String(a.id) === String(urgentFilterAssignee))
        );
      }
      
      return matchesSearch && matchesCampaign && matchesSubCampaign && matchesAssignee;
    });

    // 3. Calculate filtered urgent tasks count dynamically
    const filteredUrgentTasksCount = filteredUrgentGroups.reduce((acc, g) => {
      const isParentUrgent = getTaskUrgency(g.parent).level === 'high' || getTaskUrgency(g.parent).level === 'medium';
      return acc + (isParentUrgent ? 1 : 0) + g.urgentChildren.length;
    }, 0);

    // 4. Slice for pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUrgentGroups = filteredUrgentGroups.slice(startIndex, startIndex + itemsPerPage);

    content = (
      <div className="animate-slide-up flex flex-col h-full">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
                <AlertCircle className="text-rose-500" size={32} /> Action Required
              </h2>
              <p className="text-slate-400">
                You have <strong className="text-rose-450">{filteredUrgentTasksCount}</strong> task{filteredUrgentTasksCount !== 1 ? 's' : ''} that require attention.
              </p>
            </div>
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Filters:</span>
            <select
              value={urgentFilterCampaign}
              onChange={(e) => {
                setUrgentFilterCampaign(e.target.value);
                setUrgentFilterSubCampaign('all');
              }}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm py-1.5 px-3 focus:outline-none focus:border-indigo-500 min-w-[150px]"
            >
              <option value="all">All Campaigns</option>
              {CAMPAIGNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            {urgentFilterCampaign !== 'all' && (
              <select
                value={urgentFilterSubCampaign}
                onChange={(e) => setUrgentFilterSubCampaign(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm py-1.5 px-3 focus:outline-none focus:border-indigo-500 min-w-[150px]"
              >
                <option value="all">All Sub-Campaigns</option>
                {CAMPAIGNS.find(c => c.id === urgentFilterCampaign)?.subCampaigns?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</option>
                ))}
                {CAMPAIGNS.find(c => c.id === urgentFilterCampaign)?.subCampaigns?.length > 0 && (
                  <option value={`other_${urgentFilterCampaign}`}>📁 Other Tasks</option>
                )}
              </select>
            )}
            
            <select
              value={urgentFilterAssignee}
              onChange={(e) => setUrgentFilterAssignee(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm py-1.5 px-3 focus:outline-none focus:border-indigo-500 min-w-[150px]"
            >
              <option value="all">All Assignees</option>
              {TARGET_ASSIGNEES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <div className="w-px h-6 bg-slate-800 ml-2" />
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Sort:</span>
            <select
              value={urgentSortBy}
              onChange={(e) => setUrgentSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm py-1.5 px-3 focus:outline-none focus:border-indigo-500 min-w-[120px]"
            >
              <option value="urgency">Urgency</option>
              <option value="dueDate">Due Date</option>
              <option value="alphabetical">A-Z</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4 flex-1">
          {paginatedUrgentGroups.map(group => {
            const parent = group.parent;
            const children = group.urgentChildren;
            const urgency = getTaskUrgency(parent);
            const isExpanded = !!expandedUrgentGroups[parent.id]; // collapsed by default
            
            return (
              <div key={parent.id} className="glass-card overflow-hidden">
                <div 
                  onClick={() => handleTaskClick(parent, tasks.filter(t => t.parent === parent.id))}
                  className={`p-5 cursor-pointer hover:bg-slate-800/30 transition-colors border-l-4 ${urgency.level === 'high' ? 'border-l-rose-500' : (urgency.level === 'medium' ? 'border-l-amber-500' : 'border-l-slate-500')} flex items-center justify-between group`}
                >
                  <div className="flex-1 pr-6 flex items-start gap-3">
                    <button 
                      onClick={(e) => toggleUrgentGroup(parent.id, e)}
                      className="mt-0.5 p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-2 leading-snug flex items-center gap-2">
                        {urgency.level !== 'none' && <span title={urgency.label}>{urgency.icon}</span>}
                        {parent.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <StatusBadge status={parent.status?.status} />
                        </span>
                        {urgency.level !== 'none' && (
                          <>
                            <span>•</span>
                            <span className={getUrgencyBadgeColor(urgency.color) + " px-2 py-0.5 rounded text-xs font-bold uppercase"}>
                              {urgency.label}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{parent.assignees?.map(a => (a.username || '').split(' ')[0] || 'Unknown').join(', ') || 'Unassigned'}</span>
                        {children.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-medium">{children.length} urgent subtask{children.length > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && children.length > 0 && (
                  <div className="bg-slate-900/60 border-t border-slate-800/50 p-4 pl-12 space-y-3">
                    {children.map(child => {
                      const childUrgency = getTaskUrgency(child);
                      return (
                        <div 
                          key={child.id}
                          onClick={() => handleTaskClick(child, [])}
                          className={`p-3 rounded-lg border bg-slate-800/20 cursor-pointer hover:bg-slate-800/60 transition-colors flex flex-col gap-2 ${childUrgency.level === 'high' ? 'border-rose-500/30' : 'border-amber-500/30'}`}
                        >
                          <h5 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                            <span title={childUrgency.label}>{childUrgency.icon}</span> ↳ {child.name}
                          </h5>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 ml-6">
                            <span className="flex items-center gap-1.5">
                              <StatusBadge status={child.status?.status} />
                            </span>
                            <span>•</span>
                            <span className={getUrgencyBadgeColor(childUrgency.color) + " px-2 py-0.5 rounded uppercase font-bold"}>
                              {childUrgency.label}
                            </span>
                            <span>•</span>
                            <span>{child.assignees?.map(a => (a.username || '').split(' ')[0] || 'Unknown').join(', ') || 'Unassigned'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredUrgentGroups.length === 0 && (
            <div className="text-center p-12 glass-card border-dashed">
              <p className="text-slate-400">No urgent tasks found! Great job. 🟢</p>
            </div>
          )}
        </div>

        <Pagination 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={filteredUrgentGroups.length}
        />
      </div>
    );
  } else if (selectedCampaign === 'workload') {
    content = (
      <WorkloadDashboard 
        tasks={tasks}
        developers={DEVELOPERS}
        CAMPAIGNS={CAMPAIGNS}
        onSelectTask={handleTaskClick}
      />
    );
  } else if (selectedCampaign === 'matrix') {
    content = (
      <div className="animate-slide-up flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        <StickyMatrix 
          tasks={tasks} 
          CAMPAIGNS={CAMPAIGNS}
          TARGET_ASSIGNEES={TARGET_ASSIGNEES}
          DEVELOPERS={DEVELOPERS}
          onSelectTask={handleTaskClick} 
          searchQuery={searchQuery}
        />
      </div>
    );
  } else {
    const campaign = CAMPAIGNS.find(c => c.id === selectedCampaign);
    if (campaign) {
      content = (
        <TaskList 
          campaign={campaign} 
          tasks={tasks} 
          onSelectTask={handleTaskClick} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />
      );
    }
  }

  // Get DEMO_TRACKER mapping if available for the active task
  let activeMapping = null;
  if (activeTask) {
    const campaign = getTaskCampaign(activeTask, CAMPAIGNS);
    if (campaign?.demoTrackerMappings?.[activeTask.id]) {
      activeMapping = campaign.demoTrackerMappings[activeTask.id];
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar 
        selectedCampaign={selectedCampaign}
        setSelectedCampaign={setSelectedCampaign}
        selectedAssignee={selectedAssignee}
        setSelectedAssignee={setSelectedAssignee}
        campaignStats={campaignStats}
        refreshData={refreshData}
        loading={loading}
        totalUrgentCount={totalUrgentCount}
        CAMPAIGNS={CAMPAIGNS}
        TARGET_ASSIGNEES={TARGET_ASSIGNEES}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <main className={`flex-1 transition-all duration-300 p-10 max-w-7xl relative ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {content}
        
        {/* Task Detail Overlay */}
        {activeTask && (
          <>
            <div 
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity"
              onClick={closeTaskDetail}
            />
            <TaskDetail 
              task={activeTask} 
              subtasks={activeSubtasks} 
              onClose={closeTaskDetail}
              demoTrackerMapping={activeMapping}
            />
          </>
        )}
      </main>

      {/* Detailed Sync Progress Overlay */}
      {syncStatus && syncStatus.status !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-lg glass-card p-8 border-indigo-500/30 bg-slate-900/60 shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col items-center">
            {/* Spinning/pulsing logo/icon */}
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 relative">
              <RefreshCw 
                size={36} 
                className={`text-indigo-400 ${syncStatus.status === 'running' ? 'animate-spin' : ''}`}
              />
              <div className="absolute inset-0 rounded-full border-t border-indigo-500 animate-ping opacity-20" />
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-2">Syncing Work tracker & Demo Tracker API</h3>
            <p className="text-sm text-slate-400 mb-6 text-center max-w-sm h-10 flex items-center justify-center font-medium">
              {syncStatus.message}
            </p>

            {/* Progress Bar Container */}
            <div className="w-full bg-slate-800 rounded-full h-3 mb-3 overflow-hidden border border-slate-700 p-0.5">
              <div 
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                style={{ width: `${syncStatus.progress}%` }}
              />
            </div>

            {/* Info Row */}
            <div className="flex justify-between w-full text-xs text-slate-500 font-semibold px-1">
              <span>PROGRData: {syncStatus.progress}%</span>
              <span>TASKS ACCUMULATED: {syncStatus.totalFetched}</span>
            </div>

            {/* Cancel/Close button if it failed */}
            {syncStatus.status === 'error' && (
              <button 
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-6 px-6 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-sm font-semibold transition-colors"
              >
                Close & Reload
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
