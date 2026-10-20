import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getTaskUrgency, sortTasks, getTaskCampaign, getTaskSubCampaign } from '../utils';
import { User, AlertCircle, Clock, ChevronDown, Filter, Calendar, FolderGit2, Users, Briefcase } from 'lucide-react';

// --- Matrix Configurations --- //
const PROGRData_COLS = [
  { id: 'todo', label: 'New Requests', icon: '📥', match: (status) => ['to do', 'planning', 'backlog'].includes(status) },
  { id: 'inprogress', label: 'In Kitchen (WIP)', icon: '🍳', match: (status) => status.includes('progress') || status.includes('dev - ready') || status.includes('dev - testing') },
  { id: 'done', label: 'Served (Done)', icon: '🍽️', match: (status) => ['complete', 'dev - deployed'].includes(status) },
  { id: 'blocked', label: 'Blocked / At Risk', icon: '⚠️', match: (status) => status.includes('blocked') || status.includes('risk') || status.includes('on hold') },
];

const DATE_COLS = [
  { id: 'overdue', label: 'Overdue / Blocked', icon: '🚨', matchUrgency: (level) => level === 'high' },
  { id: 'soon', label: 'Due Soon (≤3 Days)', icon: '🟡', matchUrgency: (level) => level === 'medium' },
  { id: 'later', label: 'Action Soon', icon: '🔵', matchUrgency: (level) => level === 'low' },
  { id: 'track', label: 'On Track / Done', icon: '🟢', matchUrgency: (level) => level === 'normal' || level === 'none' },
];

// Helper to generate stable background colors for avatars based on assignee ID
function getAvatarBgColor(userId) {
  const colors = [
    'bg-indigo-650 text-indigo-200 border-indigo-500/30',
    'bg-emerald-650 text-emerald-200 border-emerald-500/30',
    'bg-rose-650 text-rose-200 border-rose-500/30',
    'bg-amber-650 text-amber-200 border-amber-500/30',
    'bg-sky-650 text-sky-200 border-sky-500/30',
    'bg-purple-650 text-purple-200 border-purple-500/30',
    'bg-fuchsia-650 text-fuchsia-200 border-fuchsia-500/30',
    'bg-slate-700 text-slate-200 border-slate-600/30'
  ];
  const num = parseInt(userId) || 0;
  return colors[num % colors.length];
}

// Helper to get initials from name or username
function getUserInitials(name) {
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function StickyMatrix({ tasks, onSelectTask, searchQuery, CAMPAIGNS, TARGET_ASSIGNEES, DEVELOPERS = [] }) {
  // View & Filter States
  const [colView, setColView] = useState('progress'); // 'progress' | 'dates'
  
  // Role selection state ('dev' filters for Developers, 'pm' filters for Product Managers)
  const [assigneeType, setAssigneeType] = useState('dev'); // 'dev' | 'pm'
  const [filterAssignee, setFilterAssignee] = useState('all'); // 'all' | 'unassigned' | assigneeId
  
  const [filterCampaign, setFilterCampaign] = useState('all'); // 'all' | campaignId
  const [filterSubCampaign, setFilterSubCampaign] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');

  // Tooltip Portal States
  const [hoveredTask, setHoveredTask] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const cols = colView === 'progress' ? PROGRData_COLS : DATE_COLS;

  // Active filter list of people based on toggle role
  const activePeopleList = useMemo(() => {
    return assigneeType === 'dev' ? DEVELOPERS : TARGET_ASSIGNEES;
  }, [assigneeType, DEVELOPERS, TARGET_ASSIGNEES]);

  // Calculate task counts per person based on active role list
  const activePeopleCounts = useMemo(() => {
    const counts = {};
    activePeopleList.forEach(p => {
      counts[p.id] = tasks.filter(t => t.assignees?.some(a => String(a.id) === String(p.id))).length;
    });
    counts['unassigned'] = tasks.filter(t => !t.assignees || t.assignees.length === 0).length;
    counts['all'] = tasks.length;
    return counts;
  }, [tasks, activePeopleList]);

  // Process, filter and sort tasks for each column
  const boardTasksByColumn = useMemo(() => {
    const result = {};
    cols.forEach(c => {
      result[c.id] = [];
    });

    tasks.forEach(task => {
      // 1. Filter by search query
      if (searchQuery) {
        const searchStr = `${task.name} ${task.id} ${task.questsId || ''} ${task.demoTrackerId || ''} ${task.assignees?.map(a => a.username || '').join(' ')}`.toLowerCase();
        if (!searchStr.includes(searchQuery.toLowerCase())) return;
      }

      // 2. Filter by selected Assignee
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned') {
          if (task.assignees && task.assignees.length > 0) return;
        } else {
          const hasAssignee = task.assignees?.some(a => String(a.id) === String(filterAssignee));
          if (!hasAssignee) return;
        }
      }

      // 3. Filter by selected Campaign (Folder)
      const taskCamp = getTaskCampaign(task, CAMPAIGNS);
      if (filterCampaign !== 'all') {
        const matchesCampaign = taskCamp ? taskCamp.id === filterCampaign : false;
        if (!matchesCampaign) return;
        
        // 4. Filter by selected Sub-Campaign
        if (filterSubCampaign !== 'all') {
          const camp = CAMPAIGNS.find(c => c.id === filterCampaign);
          const taskSubCamp = getTaskSubCampaign(task, camp);
          const matchesSubCampaign = taskSubCamp ? taskSubCamp.id === filterSubCampaign : false;
          if (!matchesSubCampaign) return;
        }
      }

      const urgency = getTaskUrgency(task);
      const status = task.status?.status?.toLowerCase() || '';

      // Determine Column ID
      let colId = 'unknown';
      if (colView === 'progress') {
        const c = PROGRData_COLS.find(col => col.match(status));
        colId = c ? c.id : 'todo';
      } else {
        const c = DATE_COLS.find(col => col.matchUrgency(urgency.level));
        colId = c ? c.id : 'track';
      }

      // Determine sticky note color based on Campaign color
      let colorClass = 'sticky-slate';
      if (taskCamp) {
        const cName = taskCamp.color.split('-')[1]; // bg-indigo-500 -> indigo
        colorClass = `sticky-${cName}`;
      }

      // Stable rotation based on task ID
      const hash = task.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
      const rotation = (Math.abs(hash) % 6) - 3;

      if (result[colId]) {
        result[colId].push({
          ...task,
          colorClass,
          rotation,
          urgency,
          campaign: taskCamp,
          subCampaign: taskCamp ? getTaskSubCampaign(task, taskCamp) : null
        });
      }
    });

    // Apply sorting to each column
    cols.forEach(c => {
      result[c.id] = sortTasks(result[c.id], sortBy);
    });

    return result;
  }, [tasks, colView, filterAssignee, filterCampaign, filterSubCampaign, sortBy, searchQuery, cols, CAMPAIGNS]);

  const handleTaskHover = (e, task) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTask(task);
    
    // Position tooltip dynamically
    const xPos = rect.right + window.scrollX + 10;
    const yPos = rect.top + window.scrollY - 10;
    
    // Check overflow
    if (xPos + 320 > window.innerWidth) {
      setHoverPosition({ x: rect.left + window.scrollX - 330, y: yPos });
    } else {
      setHoverPosition({ x: xPos, y: yPos });
    }
  };

  const handleTaskClick = (task) => {
    setHoveredTask(null);
    const subtasks = tasks.filter(t => t.parent === task.id);
    onSelectTask(task, subtasks);
  };

  const formatUnixDate = (ms) => {
    if (!ms) return null;
    const d = new Date(parseInt(ms));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const isOverdue = (dueDateMs) => {
    if (!dueDateMs) return false;
    const now = new Date().getTime();
    return parseInt(dueDateMs) < now;
  };

  return (
    <div className="animate-slide-up flex flex-col h-full space-y-6">
      {/* Board Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
              📋 Developer Board
            </h2>
            <p className="text-slate-400">High-density board (3 columns per group). Hover cards for details.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setColView('progress')} 
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${colView === 'progress' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Progress
              </button>
              <button 
                onClick={() => setColView('dates')} 
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${colView === 'dates' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Dates
              </button>
            </div>

            {/* Campaign Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="text-slate-500 font-semibold text-xs uppercase">Campaign:</span>
              <select 
                value={filterCampaign} 
                onChange={(e) => {
                  setFilterCampaign(e.target.value);
                  setFilterSubCampaign('all');
                }}
                className="bg-transparent border-none outline-none text-slate-300 text-sm font-medium cursor-pointer"
              >
                <option value="all">All Campaigns</option>
                {CAMPAIGNS.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
              </select>
            </div>

            {/* Sub-Campaign Filter Dropdown */}
            {filterCampaign !== 'all' && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300">
                <span className="text-slate-500 font-semibold text-xs uppercase">Sub-Campaign:</span>
                <select 
                  value={filterSubCampaign} 
                  onChange={(e) => setFilterSubCampaign(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-300 text-sm font-medium cursor-pointer"
                >
                  <option value="all">All Sub-Campaigns</option>
                  {CAMPAIGNS.find(c => c.id === filterCampaign)?.subCampaigns?.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-slate-900">{sub.icon} {sub.name}</option>
                  ))}
                  {CAMPAIGNS.find(c => c.id === filterCampaign)?.subCampaigns?.length > 0 && (
                    <option value={`other_${filterCampaign}`} className="bg-slate-900">📁 Other Tasks</option>
                  )}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="text-slate-500 font-semibold text-xs uppercase">Sort:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-300 text-sm font-medium cursor-pointer"
              >
                <option value="urgency" className="bg-slate-900">Urgency</option>
                <option value="dueDate" className="bg-slate-900">Due Date</option>
                <option value="alphabetical" className="bg-slate-900">A-Z</option>
                <option value="status" className="bg-slate-900">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignee Filters Panel with Toggle */}
        <div className="flex flex-col gap-3 bg-slate-900/30 p-4 rounded-xl border border-slate-850">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role View:</span>
            
            {/* Developers vs PM Toggle */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setAssigneeType('dev');
                  setFilterAssignee('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${assigneeType === 'dev' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Users size={12} />
                <span>💻 Developers</span>
              </button>
              <button
                onClick={() => {
                  setAssigneeType('pm');
                  setFilterAssignee('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${assigneeType === 'pm' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Briefcase size={12} />
                <span>👔 Product Managers</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterAssignee('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filterAssignee === 'all'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50'
              }`}
            >
              All Tasks <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px] text-slate-400 font-bold">{activePeopleCounts['all']}</span>
            </button>

            {activePeopleList.map(person => (
              <button
                key={person.id}
                onClick={() => setFilterAssignee(person.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                  String(filterAssignee) === String(person.id)
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>{person.name.split(' ')[0]}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px] text-slate-400 font-bold">{activePeopleCounts[person.id]}</span>
              </button>
            ))}

            <button
              onClick={() => setFilterAssignee('unassigned')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filterAssignee === 'unassigned'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50'
              }`}
            >
              Unassigned <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px] text-slate-400 font-bold">{activePeopleCounts['unassigned']}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
        {cols.map(c => {
          const cellTasks = boardTasksByColumn[c.id] || [];
          return (
            <div key={c.id} className="flex flex-col bg-slate-900/10 rounded-2xl border border-slate-850 p-4 h-[calc(100vh-270px)] min-h-[400px]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/40 flex-shrink-0">
                <h3 className="font-bold text-slate-300 text-xs flex items-center gap-2 uppercase tracking-wider">
                  <span className="text-base">{c.icon}</span>
                  <span>{c.label}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full">
                  {cellTasks.length}
                </span>
              </div>

              {/* Column Task Cards */}
              <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin overflow-x-hidden">
                <div className="grid grid-cols-3 gap-2 pb-4">
                  {cellTasks.map(task => {
                    const urgency = task.urgency;
                    const camp = task.campaign;
                    const subCamp = task.subCampaign;
                    const taskDueDate = formatUnixDate(task.due_date);
                    const overdue = isOverdue(task.due_date);

                    return (
                      <div
                        key={task.id}
                        onMouseEnter={(e) => handleTaskHover(e, task)}
                        onMouseLeave={() => setHoveredTask(null)}
                        onClick={() => handleTaskClick(task)}
                        className={`sticky-note-compact ${task.colorClass} cursor-pointer relative transition-all duration-200 group flex flex-col min-h-[110px] p-2 rounded-lg`}
                        style={{ transform: `rotate(${task.rotation}deg)` }}
                      >
                        <div className="sticky-tape-compact" />
                        
                        {/* Semi-transparent Header Bar with Campaign mapping */}
                        <div className="bg-black/15 px-1 py-0.5 rounded text-[7px] font-bold text-white/90 truncate mb-1 select-none flex items-center justify-between gap-1 leading-none">
                          <span className="truncate">
                            {camp ? camp.name.split(' ')[0] : 'QST'} 
                            {subCamp ? ` | ${subCamp.name}` : ''}
                          </span>
                          {subCamp && <span>{subCamp.icon}</span>}
                        </div>

                        <div className="flex items-center justify-between text-[7px] font-bold font-mono text-white/80 leading-none mb-1 select-none">
                          <span>{task.questsId || 'QST-xxx'}</span>
                          {task.demoTrackerId && <span className="opacity-80 font-semibold">{task.demoTrackerId}</span>}
                        </div>
                        
                        {/* Compact title snippet */}
                        <div className="text-[8px] font-bold text-white leading-tight line-clamp-3 select-none mb-1.5">
                          {task.name}
                        </div>

                        {/* Status Label on Card */}
                        <div className="text-[6.5px] bg-white/20 text-white/90 border border-white/10 px-1 py-0.5 rounded font-bold uppercase tracking-wider max-w-max leading-none mb-1.5 truncate">
                          {task.status?.status || 'No Status'}
                        </div>

                        {/* Mini footer */}
                        <div className="flex items-center justify-between text-[7px] text-white/90 font-bold border-t border-white/10 pt-1 leading-none mt-auto">
                          {/* Avatars */}
                          <div className="flex -space-x-1 overflow-hidden">
                            {task.assignees && task.assignees.length > 0 ? (
                              task.assignees.slice(0, 2).map(a => {
                                const initials = getUserInitials(a.username);
                                const avColor = getAvatarBgColor(a.id);
                                return (
                                  <div 
                                    key={a.id} 
                                    className={`w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center text-[6px] font-bold ${avColor}`}
                                    title={a.username || 'Unknown'}
                                  >
                                    {initials}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="uppercase text-[6px]">UN</span>
                            )}
                            {task.assignees && task.assignees.length > 2 && (
                              <div className="w-3.5 h-3.5 rounded-full bg-slate-850 border border-white/20 flex items-center justify-center text-[5.5px] font-bold text-white/80">
                                +{task.assignees.length - 2}
                              </div>
                            )}
                          </div>

                          {/* Due Date Indicator */}
                          {taskDueDate ? (
                            <span className={`text-[6.5px] px-1 py-0.5 rounded leading-none ${overdue ? 'bg-rose-600/90 text-white animate-pulse' : 'bg-black/10 text-white/80'}`}>
                              {overdue ? '🚨 ' : ''}{taskDueDate}
                            </span>
                          ) : (
                            urgency.level !== 'none' && <span>{urgency.icon}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cellTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-25">
                    <span className="text-3xl mb-2">☕</span>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Empty Queue</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip Portal */}
      {hoveredTask && createPortal(
        <div 
          style={{ 
            top: hoverPosition.y, 
            left: hoverPosition.x 
          }} 
          className="fixed w-80 p-4 rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl z-[150] space-y-3 pointer-events-none animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-[10px] font-mono font-bold text-indigo-400">{hoveredTask.questsId || 'QST-xxx'}</span>
            {hoveredTask.demoTrackerId && (
              <span className="text-[10px] font-mono font-semibold text-fuchsia-400">{hoveredTask.demoTrackerId}</span>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200 leading-snug">{hoveredTask.name}</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {hoveredTask.campaign && (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                  {hoveredTask.campaign.name}
                </span>
              )}
              {hoveredTask.subCampaign && (
                <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-850 px-2 py-0.5 rounded-full font-bold">
                  {hoveredTask.subCampaign.icon} {hoveredTask.subCampaign.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] border-t border-slate-900 pt-2 text-slate-450 font-semibold">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-slate-350 uppercase">{hoveredTask.status?.status || '-'}</span>
            </div>
            {hoveredTask.assignees && (
              <div className="flex justify-between">
                <span>Assignees:</span>
                <span className="text-slate-300 font-bold truncate max-w-[150px]">
                  {hoveredTask.assignees.map(a => a.username || 'Unknown').join(', ')}
                </span>
              </div>
            )}
            {hoveredTask.start_date && (
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="text-slate-350">{formatUnixDate(hoveredTask.start_date)}</span>
              </div>
            )}
            {hoveredTask.due_date && (
              <div className="flex justify-between">
                <span>Due Date:</span>
                <span className={`font-bold ${isOverdue(hoveredTask.due_date) ? 'text-rose-400' : 'text-slate-350'}`}>
                  {formatUnixDate(hoveredTask.due_date)} {isOverdue(hoveredTask.due_date) ? '(OVERDUE)' : ''}
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
