export function getTaskUrgency(task) {
  const status = task.status?.status?.toLowerCase() || '';
  
  // Terminal states don't need action
  if (['complete', 'dev - deployed', 'cancelled', 'on hold'].includes(status)) {
    return { level: 'none', label: 'Resolved / Complete', color: 'slate', icon: '✅' };
  }
  
  const now = Date.now();
  const dueDate = task.due_date ? parseInt(task.due_date) : null;
  
  // Explicitly blocked/at risk
  if (status.includes('blocked') || status.includes('at risk')) {
    return { level: 'high', label: 'Blocked / At Risk', color: 'rose', icon: '🚨' };
  }
  
  if (dueDate) {
    const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 0) {
      return { level: 'high', label: 'Overdue (Action Required)', color: 'rose', icon: '🔴' };
    }
    if (daysUntilDue <= 3) {
      return { level: 'medium', label: 'Due Soon (Needs Attention)', color: 'amber', icon: '🟡' };
    }
    if (daysUntilDue <= 7) {
      return { level: 'low', label: 'Action Soon', color: 'sky', icon: '🔵' };
    }
  }
  
  return { level: 'normal', label: 'On Track', color: 'emerald', icon: '🟢' };
}

export function getUrgencyBadgeColor(color) {
  const map = {
    'rose': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'amber': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'sky': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'emerald': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'slate': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };
  return map[color] || map.slate;
}

export function sortTasks(tasks, sortBy) {
  return [...tasks].sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'dueDate') {
      const dateA = a.due_date ? parseInt(a.due_date) : Infinity;
      const dateB = b.due_date ? parseInt(b.due_date) : Infinity;
      return dateA - dateB;
    }
    if (sortBy === 'status') {
      const statusA = a.status?.status || '';
      const statusB = b.status?.status || '';
      return statusA.localeCompare(statusB);
    }
    if (sortBy === 'urgency') {
      const urgencyWeights = { 'high': 4, 'medium': 3, 'low': 2, 'normal': 1, 'none': 0 };
      const levelA = getTaskUrgency(a).level;
      const levelB = getTaskUrgency(b).level;
      return (urgencyWeights[levelB] || 0) - (urgencyWeights[levelA] || 0);
    }
    return 0; // default
  });
}

export function getTaskCampaign(task, campaigns) {
  if (!task || !campaigns) return null;
  return campaigns.find(c => 
    (c.folderNames && task.folder && c.folderNames.includes(task.folder.name)) ||
    (c.listIds && task.list && c.listIds.includes(task.list.id)) ||
    c.subCampaigns?.some(sc => sc.taskIds?.includes(task.id) || sc.taskIds?.includes(task.parent))
  );
}

export function getTaskSubCampaign(task, campaign) {
  if (!task || !campaign) return null;
  const sub = campaign.subCampaigns?.find(sc => {
    // 1. Match by explicit taskIds
    if (sc.taskIds?.includes(task.id) || sc.taskIds?.includes(task.parent)) return true;
    
    // 2. Match by keywords (case-insensitive)
    const name = task.name?.toLowerCase() || '';
    if (sc.keywords && sc.keywords.some(kw => name.includes(kw.toLowerCase()))) return true;
    
    return false;
  });
  
  if (sub) return sub;
  
  // Return default "Other" category nested under the campaign
  return { id: `other_${campaign.id}`, name: `Other ${campaign.name}`, icon: '📁' };
}
