import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Sparkles, Users, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getTaskUrgency } from '../utils';
import { ProgressRing, StatusBadge } from './UI';

export function DispatchBoard() {
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragError, setDragError] = useState(null);
  
  // AI Suggestion State
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestedTask, setSuggestedTask] = useState(null);
  
  // Overload Warning State
  const [pendingAssignment, setPendingAssignment] = useState(null);

  const fetchTasksAndAssignees = async () => {
    try {
      const [tasksRes, assigneesRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/assignees')
      ]);
      const tasksData = await tasksRes.json();
      const assigneesData = await assigneesRes.json();
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setAssignees(Array.isArray(assigneesData) ? assigneesData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndAssignees();
  }, []);

  const getUnassignedTasks = () => tasks.filter(t => !t.assignees || t.assignees.length === 0);
  const getTasksForAssignee = (id) => tasks.filter(t => t.assignees?.some(a => String(a.id) === String(id)));

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const targetAssigneeId = destination.droppableId === 'backlog' ? null : destination.droppableId;
    
    // Check WIP Limits
    if (targetAssigneeId) {
      const currentLoad = getTasksForAssignee(targetAssigneeId).length;
      if (currentLoad >= 5) {
        setPendingAssignment({
          taskId: draggableId,
          assigneeId: targetAssigneeId,
          assigneeName: assignees.find(a => String(a.id) === String(targetAssigneeId))?.name || 'Developer'
        });
        return;
      }
    }

    await performAssignment(draggableId, targetAssigneeId);
  };

  const performAssignment = async (taskId, targetAssigneeId) => {
    // Optimistic Update
    const task = tasks.find(t => t.id === taskId);
    const prevAssignees = task.assignees;
    
    let user;
    if (targetAssigneeId) {
      user = assignees.find(a => String(a.id) === String(targetAssigneeId));
    }
    
    const newAssignees = user ? [{
      id: user.id,
      username: user.name,
      color: "#6366f1",
      initials: user.name.substring(0, 2).toUpperCase()
    }] : [];

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: newAssignees } : t));
    
    // API Call
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: targetAssigneeId })
      });
      if (!res.ok) throw new Error('Failed to assign');
    } catch (err) {
      console.error(err);
      setDragError("Failed to reassign task");
      // Revert Optimistic
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: prevAssignees } : t));
    }
  };

  const suggestAssignee = async (task) => {
    setSuggesting(true);
    setSuggestedTask(task);
    setSuggestion(null);

    const devs = assignees.map(a => ({
      id: a.id,
      name: a.name,
      workloadCount: getTasksForAssignee(a.id).length
    }));

    try {
      const res = await fetch(`/api/dispatch/suggest/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContext: { name: task.name, description: task.description },
          developers: devs
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestion(data);
    } catch (err) {
      console.error(err);
      alert("Failed to get suggestion: " + err.message);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading Dispatch Board...</div>;

  return (
    <div className="animate-slide-up p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <Users className="text-indigo-400" /> Smart Dispatch Board
          </h2>
          <p className="text-slate-400">Drag and drop tasks from the backlog to available developers. AI can suggest the best fit.</p>
        </div>
      </div>

      {dragError && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center justify-between">
          <span>{dragError}</span>
          <button onClick={() => setDragError(null)}><X size={16}/></button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* LEFT: BACKLOG */}
          <div className="w-1/3 flex flex-col glass-card border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-lg">Intake Backlog</h3>
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold">
                {getUnassignedTasks().length}
              </span>
            </div>
            
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className={`flex-1 overflow-y-auto p-4 space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-500/5' : 'bg-slate-900/40'}`}
                >
                  {getUnassignedTasks().map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg transition-transform ${snapshot.isDragging ? 'rotate-2 scale-105 z-50 ring-2 ring-indigo-500' : 'hover:border-slate-500'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 rounded">{task.quests_id || task.id.substring(0, 8)}</span>
                            <StatusBadge status={task.status?.status || 'to do'} />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-3">{task.name}</h4>
                          
                          <button 
                            onClick={() => suggestAssignee(task)}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold rounded transition-colors border border-indigo-500/30"
                          >
                            <Sparkles size={14} /> AI Suggestion
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* RIGHT: DEVELOPER POOL */}
          <div className="w-2/3 flex flex-col bg-slate-900/20 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
             <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-lg">Developer Capacity (Max WIP 5)</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {assignees.map(dev => {
                  const devTasks = getTasksForAssignee(dev.id);
                  const loadPercent = Math.min((devTasks.length / 5) * 100, 100);
                  const isOverloaded = devTasks.length >= 5;
                  
                  return (
                    <div key={dev.id} className={`glass-card border flex flex-col h-full rounded-2xl overflow-hidden shadow-lg ${isOverloaded ? 'border-rose-500/40' : 'border-slate-700/50'}`}>
                      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md`} style={{ backgroundColor: "#6366f1" }}>
                            {dev.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-200">{dev.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">{devTasks.length} / 5 Tasks</span>
                              {isOverloaded && <AlertTriangle size={12} className="text-rose-400" />}
                            </div>
                          </div>
                        </div>
                        <ProgressRing percentage={loadPercent} size={40} strokeWidth={4} colorClass={isOverloaded ? "text-rose-500" : (loadPercent >= 80 ? "text-amber-500" : "text-emerald-500")} />
                      </div>
                      
                      <Droppable droppableId={String(dev.id)}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className={`flex-1 p-3 space-y-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-500/10' : 'bg-transparent'}`}
                          >
                            {devTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-md transition-transform ${snapshot.isDragging ? 'rotate-2 scale-105 z-50 ring-2 ring-indigo-500' : 'hover:border-slate-500'}`}
                                  >
                                    <div className="text-xs font-semibold text-slate-300 truncate">{task.name}</div>
                                    <div className="flex justify-between items-center mt-2">
                                      <span className="text-[10px] font-mono text-slate-500">{task.quests_id || task.id.substring(0, 8)}</span>
                                      <StatusBadge status={task.status?.status || 'to do'} />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {devTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">Drop tasks here</div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* AI Suggestion Modal */}
      {(suggesting || suggestion) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-400" />
                AI Task Routing
              </h2>
              {suggestion && (
                <button onClick={() => { setSuggestion(null); setSuggestedTask(null); }} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="p-6">
              {suggesting ? (
                <div className="flex flex-col items-center py-8">
                  <Sparkles size={40} className="text-indigo-400 animate-pulse mb-4" />
                  <p className="text-slate-300 font-medium text-center">Analyzing task complexity and developer workloads...</p>
                </div>
              ) : suggestion ? (
                <div>
                  <div className="mb-4">
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Task</h4>
                    <p className="text-sm text-slate-200 bg-slate-800 p-3 rounded-lg border border-slate-700">{suggestedTask?.name}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1"><ShieldCheck size={14}/> Recommended Assignee</h4>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-emerald-600 flex-shrink-0 mt-1">
                        {assignees.find(a => String(a.id) === String(suggestion.suggestedAssigneeId))?.name?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-emerald-400">
                          {assignees.find(a => String(a.id) === String(suggestion.suggestedAssigneeId))?.name || 'Unknown Developer'}
                        </p>
                        <p className="text-sm text-slate-300 mt-2 italic border-l-2 border-emerald-500/30 pl-3">
                          "{suggestion.justification}"
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button 
                      onClick={() => { setSuggestion(null); setSuggestedTask(null); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        performAssignment(suggestedTask.id, suggestion.suggestedAssigneeId);
                        setSuggestion(null);
                        setSuggestedTask(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
                    >
                      <CheckCircle2 size={16}/> Accept Suggestion
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Overload Warning Modal */}
      {pendingAssignment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-rose-500/20 p-2 rounded-full text-rose-400">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-100">WIP Limit Warning</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm mb-4">
                You are about to assign a task to <span className="font-bold text-white">{pendingAssignment.assigneeName}</span>. 
                They are already at or above their maximum Work-In-Progress (WIP) limit of 5 tasks.
              </p>
              <p className="text-slate-400 text-xs italic mb-6">
                Assigning this task may lead to context switching and burnout. Are you sure you want to proceed?
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setPendingAssignment(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel Assignment
                </button>
                <button 
                  onClick={() => {
                    performAssignment(pendingAssignment.taskId, pendingAssignment.assigneeId);
                    setPendingAssignment(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center gap-2"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
