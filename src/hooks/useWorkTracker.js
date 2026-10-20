import { useState, useEffect, useCallback } from 'react';

export function useWorkTracker() {
  const [tasks, setTasks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [targetAssignees, setTargetAssignees] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stats
  const [campaignStats, setCampaignStats] = useState({});
  const [syncStatus, setSyncStatus] = useState({
    status: 'idle',
    progress: 0,
    message: '',
    totalFetched: 0
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [resTasks, resCampaigns, resAssignees, resDevelopers] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/campaigns'),
        fetch('/api/assignees'),
        fetch('/api/developers')
      ]);

      if (!resTasks.ok) throw new Error('Failed to fetch tasks');
      if (!resCampaigns.ok) throw new Error('Failed to fetch campaigns');
      if (!resAssignees.ok) throw new Error('Failed to fetch assignees');
      if (!resDevelopers.ok) throw new Error('Failed to fetch developers');

      const data = await resTasks.json();
      const campsData = await resCampaigns.json();
      const assigneesData = await resAssignees.json();
      const devsData = await resDevelopers.json();

      setTasks(data);
      setCampaigns(campsData);
      setTargetAssignees(assigneesData);
      setDevelopers(devsData);
      
      // Calculate campaign stats
      const stats = {};
      campsData.forEach(c => {
        // Find all tasks related to this campaign
        const campaignTasks = data.filter(t => {
          const matchesFolder = c.folderNames && t.folder && c.folderNames.includes(t.folder.name);
          const matchesList = c.listIds && t.list && c.listIds.includes(t.list.id);
          const matchesSubId = c.subCampaigns?.some(sc => sc.taskIds?.includes(t.id) || sc.taskIds?.includes(t.parent));
          return matchesFolder || matchesList || matchesSubId;
        });
        
        const total = campaignTasks.length;
        const completed = campaignTasks.filter(t => 
          t.status?.status?.toLowerCase() === 'complete' || 
          t.status?.status?.toLowerCase() === 'dev - deployed'
        ).length;
        
        stats[c.id] = {
          total,
          completed,
          percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
          tasks: campaignTasks
        };
      });
      setCampaignStats(stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refreshData = async () => {
    setLoading(true);
    setSyncStatus({
      status: 'running',
      progress: 0,
      message: 'Starting sync...',
      totalFetched: 0
    });
    
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start sync');
      
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/refresh/status');
          if (!statusRes.ok) throw new Error('Failed to fetch sync status');
          const statusData = await statusRes.json();
          
          setSyncStatus(statusData);
          
          if (statusData.status === 'success') {
            clearInterval(pollInterval);
            await fetchTasks();
            setLoading(false);
            // Keep the success state visible for 2 seconds then reset to idle
            setTimeout(() => {
              setSyncStatus({ status: 'idle', progress: 0, message: '', totalFetched: 0 });
            }, 2000);
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            setError(statusData.message);
            setLoading(false);
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setError(pollErr.message);
          setLoading(false);
          setSyncStatus({
            status: 'error',
            progress: 100,
            message: `Polling failed: ${pollErr.message}`,
            totalFetched: 0
          });
        }
      }, 800);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setSyncStatus({
        status: 'error',
        progress: 100,
        message: `Sync failed: ${err.message}`,
        totalFetched: 0
      });
    }
  };

  const getTasksByAssignee = (assigneeId) => {
    return tasks.filter(t => 
      t.assignees?.some(a => a.id.toString() === assigneeId)
    );
  };

  return {
    tasks,
    loading,
    error,
    campaignStats,
    refreshData,
    getTasksByAssignee,
    TARGET_ASSIGNEES: targetAssignees,
    DEVELOPERS: developers,
    CAMPAIGNS: campaigns,
    syncStatus
  };
}
