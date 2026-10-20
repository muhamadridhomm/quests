import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getTaskUrgency, getTaskCampaign } from '../utils';
import { Users, Flame, ShieldAlert, Clock, BarChart3, Filter, CheckCircle2, AlertCircle, ChevronDown, X, Settings } from 'lucide-react';

// Group tasks using the synthetic folder name
function getTaskGroup(task) {
  const folder = task.folder?.name?.toLowerCase() || '';
  if (folder.includes('product')) return { id: 'product', name: 'Product Team', color: 'bg-indigo-500', text: 'text-indigo-400' };
  if (folder.includes('platform')) return { id: 'platform', name: 'Platform Team', color: 'bg-sky-500', text: 'text-sky-400' };
  if (folder.includes('data')) return { id: 'data', name: 'Data Team', color: 'bg-emerald-500', text: 'text-emerald-400' };
  if (folder.includes('operations')) return { id: 'operations', name: 'Operations Team', color: 'bg-rose-500', text: 'text-rose-400' };
  if (folder.includes('support')) return { id: 'support', name: 'Support Team', color: 'bg-purple-500', text: 'text-purple-400' };
  if (folder.includes('shared')) return { id: 'shared', name: 'Shared Services', color: 'bg-amber-500', text: 'text-amber-400' };
  return { id: 'other', name: 'Other', color: 'bg-slate-500', text: 'text-slate-400' };
}

const DEPARTMENTS = [
  { id: 'product', name: 'Product Team', color: 'bg-indigo-500', text: 'text-indigo-400' },
  { id: 'platform', name: 'Platform Team', color: 'bg-sky-500', text: 'text-sky-400' },
  { id: 'data', name: 'Data Team', color: 'bg-emerald-500', text: 'text-emerald-450' },
  { id: 'operations', name: 'Operations Team', color: 'bg-rose-500', text: 'text-rose-400' },
  { id: 'support', name: 'Platform & Cyber', color: 'bg-purple-500', text: 'text-purple-400' },
  { id: 'shared', name: 'Shared Services', color: 'bg-amber-500', text: 'text-amber-400' }
];

const DEV_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#84cc16', // lime
  '#a855f7', // fuchsia
];

function DonutChart({ data, title, totalLabel }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  let currentOffset = 0;
  
  return (
    <div className="flex flex-col items-center">
      <h4 className="text-slate-300 font-bold mb-4 text-sm uppercase tracking-wider">{title}</h4>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {total === 0 ? (
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="18" />
          ) : (
            data.map((slice, i) => {
              if (slice.value === 0) return null;
              const percentage = slice.value / total;
              const strokeDasharray = `${percentage * 251.2} 251.2`;
              const strokeDashoffset = -currentOffset * 251.2;
              currentOffset += percentage;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                >
                  <title>{slice.label}: {slice.value}</title>
                </circle>
              );
            })
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-200">{total}</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{totalLabel}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400 max-w-[220px]">
         {data.map(slice => slice.value > 0 && (
           <div key={slice.label} className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }} />
             <span className="truncate max-w-[60px]" title={slice.label}>{slice.label.split(' ')[0]}</span>
           </div>
         ))}
      </div>
    </div>
  );
}

function StackedBarChart({ data, title, totalLabel }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1); 

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="text-slate-300 font-bold mb-4 text-sm uppercase tracking-wider">{title}</h4>
      <div className="flex items-end justify-around gap-1 w-full h-64 border-b border-slate-700/50 pb-2 px-1 pt-4">
        {data.map((col, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full">
            {/* Background track taking full remaining height */}
            <div className="relative w-full max-w-[24px] bg-slate-800/30 rounded-t flex flex-col justify-end group flex-1">
              
              {/* Actual stacked bar scaling up to maxTotal */}
              <div className="flex flex-col justify-end w-full" style={{ height: `${(col.total / maxTotal) * 100}%` }}>
                {col.stacks.map((stack, j) => {
                  if (stack.value === 0) return null;
                  const pct = (stack.value / col.total) * 100;
                  return (
                    <div 
                      key={j} 
                      title={`${col.label} - ${stack.name}: ${stack.value}`}
                      className={`w-full hover:brightness-125 hover:opacity-90 transition-all cursor-pointer border-t border-slate-900/60 ${stack.colorClass} ${j === 0 ? 'rounded-t' : ''}`}
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
              
              {col.total > 0 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10 pointer-events-none">
                  {col.total}
                </div>
              )}
            </div>
            
            <span className="text-[9px] font-bold text-slate-400 rotate-[-45deg] origin-top-left translate-y-2 w-full max-w-[24px] truncate block text-center" title={col.label}>
              {col.label.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-10"></div>
    </div>
  );
}

function DashboardSettingsDropdown({ algorithmMode, setAlgorithmMode, selectedRole, setSelectedRole }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 text-xs font-bold transition-all h-full"
      >
        <Settings size={14} className={isOpen ? 'text-indigo-400' : ''} />
        Settings
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-100">
            
            {/* Algorithm Settings */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Algorithm</span>
              <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                <button 
                  onClick={() => setAlgorithmMode('static')}
                  className={`flex-1 whitespace-nowrap px-2 py-1.5 rounded-md text-xs font-bold transition-all ${algorithmMode === 'static' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setAlgorithmMode('dynamic')}
                  className={`flex-1 whitespace-nowrap px-2 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${algorithmMode === 'dynamic' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Dynamic
                </button>
              </div>
            </div>

            {/* Role Settings */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Personnel Role</span>
              <div className="flex flex-col gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                {['Product Manager', 'Project Manager', 'Developer'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedRole === r ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// Multi-select dropdown utility component
function MultiSelectDropdown({ label, options, selectedValues, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl text-slate-200 text-sm font-semibold transition-all focus:outline-none"
      >
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}:</span>
        <span className="truncate max-w-[120px]">
          {selectedValues.length === 0 
            ? 'None' 
            : selectedValues.length === options.length 
              ? 'All' 
              : options.filter(o => selectedValues.includes(o.value)).map(o => o.label).join(', ')}
        </span>
        {selectedValues.length > 0 && selectedValues.length < options.length && (
          <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown size={14} className="text-slate-500 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <button onClick={handleSelectAll} className="hover:text-slate-300">Select All</button>
              <button onClick={handleClearAll} className="hover:text-slate-300">Clear</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {options.map(opt => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-900/50 cursor-pointer text-slate-300 hover:text-slate-100 text-xs font-semibold select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.value)}
                      className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 w-4 h-4"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function WorkloadDashboard({ tasks, developers, CAMPAIGNS, onSelectTask }) {
  // Filters States
  const [selectedCampaigns, setSelectedCampaigns] = useState(CAMPAIGNS.map(c => c.id));
  const [selectedStatuses, setSelectedStatuses] = useState(['blocked', 'inprogress', 'todo', 'done', 'cancelled']);
  const [selectedRole, setSelectedRole] = useState('Developer'); // 'Product Manager' | 'Project Manager' | 'Developer'
  
  // Chart View Toggle State
  const [chartView, setChartView] = useState('pie'); // 'pie' | 'bar'

  // Algorithm Toggle State
  const [algorithmMode, setAlgorithmMode] = useState('static'); // 'static' | 'dynamic'

  // Interactive Modal State
  const [taskModal, setTaskModal] = useState(null); // { title: string, tasks: Array }

  // Campaign options for multi-select
  const campaignOptions = useMemo(() => {
    return CAMPAIGNS.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }));
  }, [CAMPAIGNS]);

  // Status options for multi-select
  const statusOptions = [
    { value: 'blocked', label: '⚠️ Blocked / At Risk' },
    { value: 'inprogress', label: '🍳 In Kitchen (WIP)' },
    { value: 'todo', label: '📥 To Do / Backlog' },
    { value: 'done', label: '🍽️ Served (Done)' },
    { value: 'cancelled', label: '🚫 Cancelled' }
  ];

  // Map Work tracker status to our 5 categories
  const getStatusCategory = (statusStr) => {
    const s = statusStr?.toLowerCase() || '';
    if (s.includes('cancel')) return 'cancelled';
    if (s.includes('blocked') || s.includes('risk') || s.includes('hold')) return 'blocked';
    if (s.includes('progress') || s.includes('ready') || s.includes('testing')) return 'inprogress';
    if (['complete', 'dev - deployed'].includes(s)) return 'done';
    return 'todo';
  };

  // Filter tasks based on campaign and status multi-selections
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Campaign Filter
      const camp = getTaskCampaign(t, CAMPAIGNS);
      const matchesCampaign = camp ? selectedCampaigns.includes(camp.id) : false;
      if (!matchesCampaign) return false;

      // 2. Status Filter
      const cat = getStatusCategory(t.status?.status);
      return selectedStatuses.includes(cat);
    });
  }, [tasks, selectedCampaigns, selectedStatuses, CAMPAIGNS]);

  // 1. Process developer data based on filtered tasks
  const developerData = useMemo(() => {
    const formatDevName = (name) => {
      if (!name) return 'Unknown';
      return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const mappedDevelopers = developers.map(dev => {
      const formattedName = formatDevName(dev.name);

      const nameLower = formattedName.toLowerCase();
      let role = 'Developer';
      let sortWeight = 3;
      
      if (nameLower.includes('maulana falithurrahman') || nameLower.includes('muhamad ridho maulana mustaqim') || nameLower.includes('farid arifiyanto')) {
        role = 'Product Manager';
        sortWeight = 1;
      } else if (nameLower.includes('raissa syafira') || nameLower.includes('choirur rochman')) {
        role = 'Project Manager';
        sortWeight = 2;
      }

      // Find all tasks assigned to this developer
      const devTasks = filteredTasks.filter(t => 
        t.assignees?.some(a => String(a.id) === String(dev.id))
      );

      // Status categories
      const todo = devTasks.filter(t => getStatusCategory(t.status?.status) === 'todo').length;
      const inprogress = devTasks.filter(t => getStatusCategory(t.status?.status) === 'inprogress').length;
      const done = devTasks.filter(t => getStatusCategory(t.status?.status) === 'done').length;
      const blocked = devTasks.filter(t => getStatusCategory(t.status?.status) === 'blocked').length;
      const cancelled = devTasks.filter(t => getStatusCategory(t.status?.status) === 'cancelled').length;

      // Urgency categories
      const highUrgency = devTasks.filter(t => {
        const u = getTaskUrgency(t);
        return u.level === 'high';
      }).length;
      const mediumUrgency = devTasks.filter(t => {
        const u = getTaskUrgency(t);
        return u.level === 'medium';
      }).length;
      const lowUrgency = devTasks.filter(t => {
        const u = getTaskUrgency(t);
        return u.level === 'low' || u.level === 'normal';
      }).length;

      // Team group breakdown counts
      const deptBreakdown = { product: 0, platform: 0, data: 0, operations: 0, support: 0, shared: 0, other: 0 };
      const wipDeptBreakdown = { product: 0, platform: 0, data: 0, operations: 0, support: 0, shared: 0, other: 0 };
      const doneDeptBreakdown = { product: 0, platform: 0, data: 0, operations: 0, support: 0, shared: 0, other: 0 };
      
      let wipHigh = 0, wipMedium = 0, wipLow = 0;
      let doneHigh = 0, doneMedium = 0, doneLow = 0;
      let blockedCount = 0;

      devTasks.forEach(t => {
        const dept = getTaskGroup(t);
        const status = getStatusCategory(t.status?.status);
        const urgency = getTaskUrgency(t).level;
        
        deptBreakdown[dept.id] = (deptBreakdown[dept.id] || 0) + 1;
        
        if (status === 'inprogress') {
          wipDeptBreakdown[dept.id] = (wipDeptBreakdown[dept.id] || 0) + 1;
          if (urgency === 'high') wipHigh++;
          else if (urgency === 'medium') wipMedium++;
          else wipLow++;
        }
        else if (status === 'done') {
          doneDeptBreakdown[dept.id] = (doneDeptBreakdown[dept.id] || 0) + 1;
          if (urgency === 'high') doneHigh++;
          else if (urgency === 'medium') doneMedium++;
          else doneLow++;
        }
        else if (status === 'blocked') {
          blockedCount++;
        }
      });

      // Task Difficulty Scoring (High=2.5, Med=1.5, Low/Normal=1)
      const wipLoadScore = (wipHigh * 2.5) + (wipMedium * 1.5) + (wipLow * 1.0);
      const doneThroughputScore = (doneHigh * 2.5) + (doneMedium * 1.5) + (doneLow * 1.0);

      // Existing Static Assessment (Weighted WIP >= 5, or Blocked/HighUrgency >= 2)
      const staticAtRisk = (blockedCount + wipHigh) >= 2 || wipLoadScore >= 5;

      // Experimental Dynamic Assessment (Research-based Flow Metrics)
      // Conservative scaling factor of 0.3
      const capacityLimit = Math.max(3, doneThroughputScore * 0.3);
      const dynamicAtRisk = (blockedCount >= 2) || (wipLoadScore > capacityLimit);

      const atRisk = algorithmMode === 'dynamic' ? dynamicAtRisk : staticAtRisk;

      return {
        ...dev,
        name: formattedName,
        role,
        sortWeight,
        tasks: devTasks,
        totalCount: devTasks.length,
        statusBreakdown: { todo, inprogress, done, blocked, cancelled },
        urgencyBreakdown: { high: highUrgency, medium: mediumUrgency, low: lowUrgency },
        deptBreakdown,
        wipDeptBreakdown,
        doneDeptBreakdown,
        atRisk,
        wipLoadScore,
        capacityLimit
      };
    });

    return mappedDevelopers
      .filter(dev => dev.role === selectedRole)
      .sort((a, b) => {
        if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
        return b.tasks.length - a.tasks.length; // secondary sort by task count
      });
  }, [filteredTasks, developers, algorithmMode, selectedRole]);

  // 2. Global workload stats
  const stats = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const activeTasks = filteredTasks.filter(t => getStatusCategory(t.status?.status) === 'inprogress').length;

    const devsWithTasks = developerData.filter(d => d.totalCount > 0);
    const avgWorkload = devsWithTasks.length === 0 ? 0 : Math.round((totalTasks / developers.length) * 10) / 10;

    // Find developer with most tasks
    let maxTasks = -1;
    let mostLoadedDev = 'None';
    developerData.forEach(d => {
      if (d.totalCount > maxTasks) {
        maxTasks = d.totalCount;
        mostLoadedDev = d.name;
      }
    });

    // Burnout risk count
    const burnoutRiskCount = developerData.filter(d => d.atRisk).length;

    return {
      totalTasks,
      activeTasks,
      avgWorkload,
      mostLoadedDev: maxTasks > 0 ? `${mostLoadedDev} (${maxTasks} tasks)` : 'None',
      burnoutRiskCount
    };
  }, [filteredTasks, developerData, developers]);

  // 3. Prepare Chart Data for Developers
  const chartData = useMemo(() => {
    const onProgressData = [];
    const doneData = [];
    const totalData = [];
    
    const onProgressBar = [];
    const doneBar = [];
    const totalBar = [];

    developerData.forEach((dev, idx) => {
      // Pie chart data
      const color = DEV_COLORS[idx % DEV_COLORS.length];
      if (dev.statusBreakdown.inprogress > 0) onProgressData.push({ label: dev.name, value: dev.statusBreakdown.inprogress, color });
      if (dev.statusBreakdown.done > 0) doneData.push({ label: dev.name, value: dev.statusBreakdown.done, color });
      if (dev.totalCount > 0) totalData.push({ label: dev.name, value: dev.totalCount, color });

      // Bar chart data format
      const buildStacks = (breakdown) => {
        return DEPARTMENTS.map(dept => ({
          name: dept.name,
          colorClass: dept.color,
          value: breakdown[dept.id] || 0
        })).filter(s => s.value > 0);
      };

      if (dev.statusBreakdown.inprogress > 0) onProgressBar.push({ label: dev.name, total: dev.statusBreakdown.inprogress, stacks: buildStacks(dev.wipDeptBreakdown) });
      if (dev.statusBreakdown.done > 0) doneBar.push({ label: dev.name, total: dev.statusBreakdown.done, stacks: buildStacks(dev.doneDeptBreakdown) });
      if (dev.totalCount > 0) totalBar.push({ label: dev.name, total: dev.totalCount, stacks: buildStacks(dev.deptBreakdown) });
    });

    return { onProgressData, doneData, totalData, onProgressBar, doneBar, totalBar };
  }, [developerData]);

  // 4. Collect active WIP tasks across developers for the "Live Feed"
  const activeWipTasks = useMemo(() => {
    const list = [];
    filteredTasks.forEach(t => {
      if (getStatusCategory(t.status?.status) === 'inprogress') {
        const isDevAssigned = t.assignees?.some(a => developers.some(d => String(d.id) === String(a.id)));
        if (isDevAssigned) {
          list.push(t);
        }
      }
    });
    return list.sort((a, b) => {
      const urgencyWeights = { 'high': 3, 'medium': 2, 'low': 1, 'normal': 0, 'none': -1 };
      const uA = urgencyWeights[getTaskUrgency(a).level] || 0;
      const uB = urgencyWeights[getTaskUrgency(b).level] || 0;
      return uB - uA;
    }).slice(0, 5);
  }, [filteredTasks, developers]);

  const formatUnixDate = (ms) => {
    if (!ms) return '-';
    const d = new Date(parseInt(ms));
    return d.toLocaleDateString();
  };

  const handleOpenTask = (task) => {
    setTaskModal(null); // Close modal
    const subtasks = tasks.filter(t => t.parent === task.id);
    onSelectTask(task, subtasks); // Open drawer
  };

  return (
    <div className="animate-slide-up flex flex-col h-full space-y-8 pb-12">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <BarChart3 className="text-purple-500" size={32} /> Developer Load Dashboard
          </h2>
          <p className="text-slate-400">Analyze developer capacity, task distributions, and folder allocations across IT Operations.</p>
        </div>

        {/* Multi-Select Filters Panel */}
        <div className="flex flex-wrap items-center justify-end gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-850">
          <MultiSelectDropdown
            label="Campaigns"
            options={campaignOptions}
            selectedValues={selectedCampaigns}
            onChange={setSelectedCampaigns}
          />
          <MultiSelectDropdown
            label="Statuses"
            options={statusOptions}
            selectedValues={selectedStatuses}
            onChange={setSelectedStatuses}
          />
          <DashboardSettingsDropdown 
            algorithmMode={algorithmMode} 
            setAlgorithmMode={setAlgorithmMode}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full filter blur-3xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtered Active WIP</span>
            <Clock className="text-indigo-400" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.activeTasks}</div>
          <div className="text-xs text-slate-500 mt-2">Active tasks currently tracked</div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full filter blur-3xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Load</span>
            <Users className="text-purple-400" size={20} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.avgWorkload}</div>
          <div className="text-xs text-slate-500 mt-2">Tasks per developer</div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full filter blur-3xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Highest Load</span>
            <Flame className="text-amber-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-100 truncate">{stats.mostLoadedDev}</div>
          <div className="text-xs text-slate-500 mt-2">Developer with most assignments</div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 ${stats.burnoutRiskCount > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10'} rounded-full filter blur-3xl transition-all`} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Burnout Alerts</span>
            <ShieldAlert className={stats.burnoutRiskCount > 0 ? 'text-rose-400' : 'text-emerald-400'} size={20} />
          </div>
          <div className={`text-3xl font-bold ${stats.burnoutRiskCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {stats.burnoutRiskCount}
          </div>
          <div 
            className="text-xs text-slate-400 mt-2 underline decoration-dashed decoration-slate-600 cursor-help"
            title={algorithmMode === 'dynamic' ? 'Overload if Blocked >= 2 OR Weighted WIP > (3 or DoneTasks * 0.3)' : 'Overload if Blocked+HighWIP >= 2 OR Weighted WIP >= 5'}
          >
            Formula: {algorithmMode === 'dynamic' ? 'Dynamic Capacity (Flow)' : 'Static Thresholds'}
          </div>
        </div>
      </div>

      {/* Developer Comparison Charts */}
      <div className="glass-card p-6 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={18} /> Developer Load Distribution
          </h3>
          
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800/80">
            <button 
              onClick={() => setChartView('pie')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'pie' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Pie Chart
            </button>
            <button 
              onClick={() => setChartView('bar')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'bar' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Stacked Bar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {chartView === 'pie' ? (
            <>
              <DonutChart data={chartData.onProgressData} title="On Progress (WIP)" totalLabel="Tasks" />
              <DonutChart data={chartData.doneData} title="Tasks Done" totalLabel="Tasks" />
              <DonutChart data={chartData.totalData} title="All Tasks" totalLabel="Tasks" />
            </>
          ) : (
            <>
              <StackedBarChart data={chartData.onProgressBar} title="On Progress (WIP)" totalLabel="Tasks" />
              <StackedBarChart data={chartData.doneBar} title="Tasks Done" totalLabel="Tasks" />
              <StackedBarChart data={chartData.totalBar} title="All Tasks" totalLabel="Tasks" />
            </>
          )}
        </div>
      </div>

      {/* Main Charts & Allocation Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Distribution Chart */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col h-[550px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
            <h3 className="text-lg font-bold text-slate-200">
              📊 Contributor allocation by team
            </h3>
            <span className="text-xs text-slate-450 italic">Click segments to inspect</span>
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {developerData.map(dev => {
              const total = dev.totalCount || 1;

              // Calculate percentages for each team group
              const wBss = Math.round((dev.deptBreakdown.product / total) * 100);
              const wOss = Math.round((dev.deptBreakdown.platform / total) * 100);
              const wEss = Math.round((dev.deptBreakdown.data / total) * 100);
              const wItsm = Math.round((dev.deptBreakdown.operations / total) * 100);
              const wItpc = Math.round((dev.deptBreakdown.support / total) * 100);
              const wMaint = Math.round((dev.deptBreakdown.shared / total) * 100);
              const wOther = Math.round((dev.deptBreakdown.other / total) * 100);

              // Progress bar segments for status
              const wTodo = Math.round((dev.statusBreakdown.todo / total) * 100);
              const wInprogress = Math.round((dev.statusBreakdown.inprogress / total) * 100);
              const wDone = Math.round((dev.statusBreakdown.done / total) * 100);
              const wBlocked = Math.round((dev.statusBreakdown.blocked / total) * 100);
              const wCancelled = Math.round((dev.statusBreakdown.cancelled / total) * 100);

              return (
                <div key={dev.id} className="p-4 rounded-xl border border-slate-800/40 bg-slate-900/10 hover:bg-slate-900/30 transition-all space-y-3.5">
                  {/* Name and Count */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${dev.atRisk ? 'bg-rose-500 animate-ping' : 'bg-purple-400'}`} />
                      <div className="flex flex-col">
                        <span>{dev.name}</span>
                        {dev.role !== 'Developer' && <span className="text-[10px] font-normal text-slate-400 leading-none">{dev.role}</span>}
                      </div>
                      {dev.atRisk && (
                        <span 
                          className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider cursor-help"
                          title={algorithmMode === 'dynamic' ? `Capacity Limit: ${dev.capacityLimit?.toFixed(1) || 3.0} | Current Load: ${dev.wipLoadScore?.toFixed(1) || 0}` : `Static Rules Flagged Overload (WIP Load: ${dev.wipLoadScore?.toFixed(1) || 0})`}
                        >
                          Overloaded
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => setTaskModal({ title: `${dev.name} - All Assigned Tasks`, tasks: dev.tasks })}
                      className="text-xs text-slate-400 font-bold bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {dev.totalCount} Tasks Assigned
                    </button>
                  </div>

                  {/* Allocation by team (Product, Data, Platform, etc.) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400">
                      <span>TEAM WORKLOAD</span>
                      <span className="font-mono">
                        {[
                          dev.deptBreakdown.product > 0 && `Product (${dev.deptBreakdown.product})`,
                          dev.deptBreakdown.data > 0 && `Data (${dev.deptBreakdown.data})`,
                          dev.deptBreakdown.platform > 0 && `Platform (${dev.deptBreakdown.platform})`,
                          dev.deptBreakdown.operations > 0 && `Operations (${dev.deptBreakdown.operations})`,
                          dev.deptBreakdown.support > 0 && `Support Team (${dev.deptBreakdown.support})`,
                          dev.deptBreakdown.shared > 0 && `Maint (${dev.deptBreakdown.shared})`
                        ].filter(Boolean).join(' | ')}
                      </span>
                    </div>

                    {dev.totalCount > 0 ? (
                      <div className="w-full bg-slate-850 h-5 rounded-lg overflow-hidden flex border border-slate-800/80 p-0.5 relative group">
                        {dev.deptBreakdown.product > 0 && (
                          <div 
                            style={{ width: `${wBss}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Product Team Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'product') })}
                            className="bg-indigo-500 h-full rounded-l hover:opacity-80 transition-all cursor-pointer"
                            title={`Product Team: ${dev.deptBreakdown.product} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.data > 0 && (
                          <div 
                            style={{ width: `${wEss}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Data Team Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'data') })}
                            className="bg-emerald-500 h-full hover:opacity-80 transition-all cursor-pointer"
                            title={`Data Team: ${dev.deptBreakdown.data} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.platform > 0 && (
                          <div 
                            style={{ width: `${wOss}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Platform Team Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'platform') })}
                            className="bg-sky-500 h-full hover:opacity-80 transition-all cursor-pointer"
                            title={`Platform Team: ${dev.deptBreakdown.platform} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.operations > 0 && (
                          <div 
                            style={{ width: `${wItsm}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Operations Team Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'operations') })}
                            className="bg-rose-500 h-full hover:opacity-80 transition-all cursor-pointer"
                            title={`Operations Team: ${dev.deptBreakdown.operations} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.support > 0 && (
                          <div 
                            style={{ width: `${wItpc}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Platform & Cyber Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'support') })}
                            className="bg-purple-500 h-full hover:opacity-80 transition-all cursor-pointer"
                            title={`Platform & Cyber: ${dev.deptBreakdown.support} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.shared > 0 && (
                          <div 
                            style={{ width: `${wMaint}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Shared Services tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'shared') })}
                            className="bg-amber-500 h-full rounded-r hover:opacity-80 transition-all cursor-pointer"
                            title={`shared & Ops: ${dev.deptBreakdown.shared} tasks (Click to view)`}
                          />
                        )}
                        {dev.deptBreakdown.other > 0 && (
                          <div 
                            style={{ width: `${wOther}%` }}
                            onClick={() => setTaskModal({ title: `${dev.name} - Other Tasks`, tasks: dev.tasks.filter(t => getTaskGroup(t).id === 'other') })}
                            className="bg-slate-500 h-full hover:opacity-80 transition-all cursor-pointer"
                            title={`Other: ${dev.deptBreakdown.other} tasks (Click to view)`}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full bg-slate-850 h-5 rounded-lg flex items-center justify-center border border-slate-800/40 p-0.5">
                        <span className="text-[9px] text-slate-650 uppercase font-bold tracking-widest">No Assigned Tasks</span>
                      </div>
                    )}
                  </div>

                  {/* Task Status Progress Bar */}
                  {dev.totalCount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>TASK PROGRData STATE (CLICK TO FILTER)</span>
                        <span>{dev.statusBreakdown.inprogress} WIP / {dev.statusBreakdown.blocked} Blocked / {dev.statusBreakdown.done} Done / {dev.statusBreakdown.cancelled} Cancelled</span>
                      </div>
                      <div className="w-full bg-slate-850 h-3 rounded overflow-hidden flex border border-slate-800/40 p-0.5 cursor-pointer">
                        {dev.statusBreakdown.blocked > 0 && (
                          <div 
                            style={{ width: `${wBlocked}%` }} 
                            onClick={() => setTaskModal({ title: `${dev.name} - Blocked Tasks`, tasks: dev.tasks.filter(t => getStatusCategory(t.status?.status) === 'blocked') })}
                            className="bg-rose-500 h-full hover:opacity-80 transition-all" 
                            title={`Blocked: ${dev.statusBreakdown.blocked} tasks`}
                          />
                        )}
                        {dev.statusBreakdown.inprogress > 0 && (
                          <div 
                            style={{ width: `${wInprogress}%` }} 
                            onClick={() => setTaskModal({ title: `${dev.name} - WIP (In Kitchen) Tasks`, tasks: dev.tasks.filter(t => getStatusCategory(t.status?.status) === 'inprogress') })}
                            className="bg-indigo-500 h-full hover:opacity-80 transition-all" 
                            title={`WIP: ${dev.statusBreakdown.inprogress} tasks`}
                          />
                        )}
                        {dev.statusBreakdown.todo > 0 && (
                          <div 
                            style={{ width: `${wTodo}%` }} 
                            onClick={() => setTaskModal({ title: `${dev.name} - To Do (Backlog) Tasks`, tasks: dev.tasks.filter(t => getStatusCategory(t.status?.status) === 'todo') })}
                            className="bg-slate-600 h-full hover:opacity-80 transition-all" 
                            title={`To Do: ${dev.statusBreakdown.todo} tasks`}
                          />
                        )}
                        {dev.statusBreakdown.done > 0 && (
                          <div 
                            style={{ width: `${wDone}%` }} 
                            onClick={() => setTaskModal({ title: `${dev.name} - Done (Served) Tasks`, tasks: dev.tasks.filter(t => getStatusCategory(t.status?.status) === 'done') })}
                            className="bg-emerald-500 h-full hover:opacity-80 transition-all" 
                            title={`Served: ${dev.statusBreakdown.done} tasks`}
                          />
                        )}
                        {dev.statusBreakdown.cancelled > 0 && (
                          <div 
                            style={{ width: `${wCancelled}%` }} 
                            onClick={() => setTaskModal({ title: `${dev.name} - Cancelled Tasks`, tasks: dev.tasks.filter(t => getStatusCategory(t.status?.status) === 'cancelled') })}
                            className="bg-slate-500 h-full hover:opacity-80 transition-all" 
                            title={`Cancelled: ${dev.statusBreakdown.cancelled} tasks`}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Team group Chart Legend */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800/60 justify-center text-xs font-semibold shrink-0 mt-4">
            {DEPARTMENTS.map(dept => (
              <div key={dept.id} className="flex items-center gap-1.5 text-slate-450">
                <div className={`w-3 h-3 ${dept.color} rounded`} />
                <span>{dept.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency Heatmap matrix */}
        <div className="glass-card p-6 flex flex-col h-[550px]">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 shrink-0">
            🚨 Urgency Heatmap
          </h3>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {developerData.map(dev => (
              <div key={dev.id} className="space-y-2">
                <div className="text-xs font-bold text-slate-300 truncate">
                  {dev.name}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    onClick={() => dev.urgencyBreakdown.high > 0 && setTaskModal({ title: `${dev.name} - High Urgency Tasks`, tasks: dev.tasks.filter(t => getTaskUrgency(t).level === 'high') })}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      dev.urgencyBreakdown.high > 0 
                        ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 hover:bg-rose-500/20 cursor-pointer' 
                        : 'bg-slate-900/30 border-slate-850 text-slate-500'
                    }`}
                  >
                    <span className="text-base font-bold">{dev.urgencyBreakdown.high}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">High</span>
                  </div>
                  <div 
                    onClick={() => dev.urgencyBreakdown.medium > 0 && setTaskModal({ title: `${dev.name} - Medium Urgency Tasks`, tasks: dev.tasks.filter(t => getTaskUrgency(t).level === 'medium') })}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      dev.urgencyBreakdown.medium > 0 
                        ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20 cursor-pointer' 
                        : 'bg-slate-900/30 border-slate-850 text-slate-500'
                    }`}
                  >
                    <span className="text-base font-bold">{dev.urgencyBreakdown.medium}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Medium</span>
                  </div>
                  <div 
                    onClick={() => dev.urgencyBreakdown.low > 0 && setTaskModal({ title: `${dev.name} - Normal Urgency Tasks`, tasks: dev.tasks.filter(t => ['low', 'normal'].includes(getTaskUrgency(t).level)) })}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      dev.urgencyBreakdown.low > 0 
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer' 
                        : 'bg-slate-900/30 border-slate-850 text-slate-500'
                    }`}
                  >
                    <span className="text-base font-bold">{dev.urgencyBreakdown.low}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Normal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Active Feed (What developers are doing right now) */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 mb-5 flex items-center gap-2">
          <Clock className="text-indigo-400" size={18} /> Active Work Stream (Top 5 Urgent WIP)
        </h3>

        {activeWipTasks.length === 0 ? (
          <div className="text-center p-8 text-slate-500 italic">
            No developers are currently working on active tasks matching filters.
          </div>
        ) : (
          <div className="space-y-4">
            {activeWipTasks.map(task => {
              const subtasks = tasks.filter(t => t.parent === task.id);
              const urgency = getTaskUrgency(task);
              const dept = getTaskGroup(task);
              return (
                <div 
                  key={task.id}
                  onClick={() => onSelectTask(task, subtasks)}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-400">{task.questsId || 'QST'}</span>
                      {task.demoTrackerId && <span className="text-xs font-mono font-semibold text-fuchsia-400">{task.demoTrackerId}</span>}
                      <span className={`text-[10px] ${dept.color} text-slate-950 font-bold px-2 py-0.5 rounded`}>
                        {dept.name}
                      </span>
                      <span className="text-xs bg-slate-800 border border-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {task.status?.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-200 leading-snug">{task.name}</h4>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-slate-500 font-semibold shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-650 uppercase font-bold tracking-widest">Assignee</span>
                      <span className="text-slate-300 font-bold">{task.assignees?.map(a => a.username).join(', ') || 'Unassigned'}</span>
                    </div>
                    {task.start_date && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-650 uppercase font-bold tracking-widest">Start Date</span>
                        <span className="text-slate-350">{formatUnixDate(task.start_date)}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-650 uppercase font-bold tracking-widest">Due Date</span>
                        <span className="text-slate-350">{formatUnixDate(task.due_date)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 bg-black/20 p-2 rounded-lg border border-slate-800/40">
                      <span>{urgency.icon}</span>
                      <span className="uppercase text-[9px] font-bold text-slate-400">{urgency.label.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task List Modal Popup */}
      {taskModal && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-4xl w-full max-h-[85vh] flex flex-col p-6 border border-slate-800 shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setTaskModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 p-2 rounded-lg transition-colors focus:outline-none"
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div className="pr-12 border-b border-slate-850 pb-4 mb-5">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="text-indigo-400" size={20} /> {taskModal.title}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Found {taskModal.tasks.length} tasks. Click any task to inspect details.</p>
            </div>

            {/* Tasks List Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar min-h-[250px]">
              {taskModal.tasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic">No tasks found matching this criteria.</div>
              ) : (
                taskModal.tasks.map(task => {
                  const urgency = getTaskUrgency(task);
                  const dept = getTaskGroup(task);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleOpenTask(task)}
                      className="p-3.5 rounded-xl border border-slate-850 bg-slate-900/10 hover:bg-slate-900/50 hover:border-slate-800 transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-indigo-400">{task.questsId || 'QST'}</span>
                          {task.demoTrackerId && <span className="text-[10px] font-mono font-semibold text-fuchsia-400">{task.demoTrackerId}</span>}
                          <span className={`text-[9px] ${dept.color} text-slate-950 font-bold px-1.5 py-0.5 rounded`}>
                            {dept.name}
                          </span>
                          <span className="text-[10px] bg-slate-800 border border-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {task.status?.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm leading-snug truncate max-w-[500px]">{task.name}</h4>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-[11px] text-slate-450 font-semibold">
                        {task.due_date && (
                          <div className="hidden md:flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Due Date</span>
                            <span>{formatUnixDate(task.due_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg border border-slate-850">
                          <span>{urgency.icon}</span>
                          <span className="uppercase text-[9px] font-bold text-slate-450">{urgency.label.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-850 pt-4 mt-5 flex justify-end text-xs text-slate-500">
              <span>Press ESC or click outside to close</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
