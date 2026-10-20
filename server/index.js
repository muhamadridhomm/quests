import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createDemoTrackerMockServer } from './demoTrackerMockServer.js';

dotenv.config(); // No employer credentials or external data source is configured.

const app = express();
app.use(cors());
app.use(express.json());

// Mount the Mock Demo Tracker API alongside our proxy
app.use('/demo-tracker-api', createDemoTrackerMockServer());


// Simple memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

const idMappingPath = path.join(process.cwd(), 'server', 'data', 'id_mapping.json');

function loadIdMapping() {
  if (fs.existsSync(idMappingPath)) {
    return JSON.parse(fs.readFileSync(idMappingPath, 'utf-8'));
  }
  return { mappings: [], lastQuestsIdSequence: 0 };
}

function saveIdMapping(data) {
  fs.writeFileSync(idMappingPath, JSON.stringify(data, null, 2));
}

function processTasksWithQuestsId(tasks) {
  const mappingData = loadIdMapping();
  const campaignsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'campaigns.json'), 'utf-8'));
  
  const allDemoTrackerMappings = {};
  campaignsData.forEach(c => {
    if (c.demoTrackerMappings) {
      Object.assign(allDemoTrackerMappings, c.demoTrackerMappings);
    }
  });

  const mappings = mappingData.mappings;
  let lastSeq = mappingData.lastQuestsIdSequence;
  let updated = false;

  const result = tasks.map(task => {
    let mapping = mappings.find(m => m.workTrackerId === task.id);
    const expectedDemoTrackerId = allDemoTrackerMappings[task.id] || null;

    if (!mapping) {
      lastSeq++;
      mapping = {
        questsId: `QST-${lastSeq.toString().padStart(3, '0')}`,
        workTrackerId: task.id,
        demoTrackerId: expectedDemoTrackerId
      };
      mappings.push(mapping);
      updated = true;
    } else if (expectedDemoTrackerId && mapping.demoTrackerId !== expectedDemoTrackerId) {
      mapping.demoTrackerId = expectedDemoTrackerId;
      updated = true;
    }

    return {
      ...task,
      questsId: mapping.questsId,
      demoTrackerId: mapping.demoTrackerId
    };
  });

  if (updated) {
    mappingData.lastQuestsIdSequence = lastSeq;
    saveIdMapping(mappingData);
  }
  return result;
}

// Check local file if available
const localDataPath = path.join(process.cwd(), 'all_tasks.json');
const demoDataPath = path.join(process.cwd(), 'server', 'data', 'demo_tasks.json');
function ensureLocalTasks() {
  if (!fs.existsSync(localDataPath) && fs.existsSync(demoDataPath)) fs.copyFileSync(demoDataPath, localDataPath);
}

app.get('/api/tasks', async (req, res) => {
  try {
    const cached = getCached('all_tasks');
    if (cached) return res.json(cached);

    ensureLocalTasks();
    if (fs.existsSync(localDataPath)) {
      const data = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
      const processedData = processTasksWithQuestsId(data);
      setCache('all_tasks', processedData);
      return res.json(processedData);
    }
    
    res.status(404).json({ error: 'Data not found locally, please run fetcher' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/assign', (req, res) => {
  try {
    const { assigneeId } = req.body;
    const taskId = req.params.id;
    
    // Load the synthetic, local-only portfolio tasks.
    ensureLocalTasks();
    let tasks = getCached('all_tasks');
    if (!tasks && fs.existsSync(localDataPath)) {
      tasks = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
    }
    if (!tasks) return res.status(404).json({ error: 'No tasks loaded' });

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

    // Load assignees reference to build user object
    const assignees = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'assignees.json'), 'utf-8'));
    const user = assignees.find(a => String(a.id) === String(assigneeId));
    
    if (user) {
      tasks[taskIndex].assignees = [{
        id: user.id,
        username: user.name,
        color: "#6366f1",
        initials: user.name.substring(0, 2).toUpperCase()
      }];
    } else {
      tasks[taskIndex].assignees = []; // Unassign if null or not found
    }

    setCache('all_tasks', tasks);
    
    // Save to file since this is a mock update
    if (fs.existsSync(localDataPath)) {
      const originalTasks = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
      const origIndex = originalTasks.findIndex(t => t.id === taskId);
      if (origIndex !== -1) {
        originalTasks[origIndex].assignees = tasks[taskIndex].assignees;
        fs.writeFileSync(localDataPath, JSON.stringify(originalTasks, null, 2));
      }
    }
    
    res.json({ success: true, task: tasks[taskIndex] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dispatch/suggest/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { taskContext, developers } = req.body;
    // taskContext should have { name, description }
    // developers should have { id, name, workloadCount, role }

    let ai;
    try {
      ai = getAIClient();
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const prompt = `
      You are an Engineering Manager AI. Your job is to suggest the best developer to assign to the following task.
      
      TASK TO ASSIGN:
      Title: ${taskContext.name}
      Description: ${taskContext.description || 'No description provided.'}
      
      AVAILABLE DEVELOPERS (Current Workload / Max WIP 5):
      ${developers.map(d => `- ${d.name} (ID: ${d.id}): ${d.workloadCount}/5 tasks`).join('\n')}
      
      INSTRUCTIONS:
      1. Analyze the task title and description.
      2. Choose the best developer from the list above based on who has the lowest current workload to prevent burnout.
      3. Return a JSON object EXACTLY in this format:
      {
        "suggestedAssigneeId": "123456",
        "justification": "Short reason why they were chosen (e.g. lowest workload)."
      }
      Do not include markdown blocks or any other text, just the raw JSON.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    let rawText = result.text.trim();
    if (rawText.startsWith('```json')) rawText = rawText.slice(7);
    if (rawText.startsWith('```')) rawText = rawText.slice(3);
    if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);

    const suggestion = JSON.parse(rawText.trim());
    res.json(suggestion);

  } catch (err) {
    console.error('Suggest Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'campaigns.json'), 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/assignees', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'assignees.json'), 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/developers', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'developers.json'), 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let currentSyncStatus = {
  status: 'idle', // 'idle' | 'running' | 'success' | 'error'
  progress: 0,
  message: '',
  totalFetched: 0
};

app.get('/api/refresh/status', (req, res) => {
  res.json(currentSyncStatus);
});

app.post('/api/refresh', async (req, res) => {
  if (currentSyncStatus.status === 'running') return res.status(409).json({ error: 'Refresh already in progress' });
  currentSyncStatus = { status: 'running', progress: 15, message: 'Loading synthetic demo tasks...', totalFetched: 0 };
  try {
    ensureLocalTasks();
    const raw = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
    currentSyncStatus = { status: 'running', progress: 70, message: 'Preparing local dashboard data...', totalFetched: raw.length };
    const processed = processTasksWithQuestsId(raw);
    setCache('all_tasks', processed);
    currentSyncStatus = { status: 'success', progress: 100, message: `Demo data ready (${processed.length} sample tasks).`, totalFetched: processed.length };
    res.json({ success: true, demo: true, count: processed.length });
  } catch (err) {
    currentSyncStatus = { status: 'error', progress: 100, message: `Demo refresh failed: ${err.message}`, totalFetched: 0 };
    res.status(500).json({ error: currentSyncStatus.message });
  }
});

app.get('/api/config', (req, res) => {
  const config = loadConfig();
  // Don't send the full API key for security, just whether it's configured
  res.json({
    geminiConfigured: !!config.geminiApiKey && config.geminiApiKey.length > 5
  });
});

app.post('/api/config', (req, res) => {
  const { geminiApiKey } = req.body;
  const config = loadConfig();
  if (geminiApiKey !== undefined) {
    config.geminiApiKey = geminiApiKey;
  }
  saveConfig(config);
  res.json({ success: true });
});

// Helper to get AI instance
function getAIClient() {
  const config = loadConfig();
  if (!config.geminiApiKey) {
    throw new Error('Gemini API Key is not configured. Please set it in Settings.');
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

// Requests Database Helpers
const requestsDataPath = path.join(process.cwd(), 'server', 'data', 'requests.json');
function loadRequests() {
  if (fs.existsSync(requestsDataPath)) {
    return JSON.parse(fs.readFileSync(requestsDataPath, 'utf-8'));
  }
  return [];
}
function saveRequests(data) {
  fs.writeFileSync(requestsDataPath, JSON.stringify(data, null, 2));
}

// Intake Portal Endpoints
app.get('/api/requests', (req, res) => {
  res.json(loadRequests());
});

app.post('/api/requests', (req, res) => {
  const { type, title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
  
  const requests = loadRequests();
  const newRequest = {
    id: `REQ-${Date.now()}`,
    type,
    title,
    description,
    status: 'Pending Triage',
    createdAt: new Date().toISOString(),
    aiTriage: null
  };
  
  requests.push(newRequest);
  saveRequests(requests);
  res.status(201).json(newRequest);
});

app.put('/api/requests/:id/status', (req, res) => {
  const { status } = req.body;
  const requests = loadRequests();
  const reqIdx = requests.findIndex(r => r.id === req.params.id);
  
  if (reqIdx === -1) return res.status(404).json({ error: 'Request not found' });
  
  requests[reqIdx].status = status;
  
  // If status is 'Approved', convert to Work tracker task & assign QST-XXX
  if (status === 'Approved') {
    const processedData = getCached('all_tasks') || [];
    const maxQst = processedData.reduce((max, t) => {
      const qstMatch = t.quests_id?.match(/QST-(\d+)/);
      if (qstMatch) return Math.max(max, parseInt(qstMatch[1]));
      return max;
    }, 0);
    const newQstId = `QST-${String(maxQst + 1).padStart(3, '0')}`;
    
    const newTask = {
      id: `mock-${Date.now()}`,
      quests_id: newQstId,
      name: `[${requests[reqIdx].type.toUpperCase()}] ${requests[reqIdx].title}`,
      description: requests[reqIdx].description,
      status: { status: 'to do', color: '#d3d3d3' },
      date_created: Date.now().toString(),
      assignees: [],
      tags: [{ name: 'intake' }],
      url: '#',
      list: { id: 'mock', name: 'Intake Backlog' }
    };
    
    processedData.push(newTask);
    setCache('all_tasks', processedData);
    
    // Also mock mapping it in ID registry
    const idMappingPath = path.join(process.cwd(), 'server', 'data', 'id_mapping.json');
    if (fs.existsSync(idMappingPath)) {
      const mapping = JSON.parse(fs.readFileSync(idMappingPath, 'utf-8'));
      mapping.push({ workTracker_id: newTask.id, quests_id: newQstId, mapped_at: new Date().toISOString() });
      fs.writeFileSync(idMappingPath, JSON.stringify(mapping, null, 2));
    }
  }
  
  saveRequests(requests);
  res.json(requests[reqIdx]);
});

app.post('/api/requests/triage/:id', async (req, res) => {
  try {
    const requests = loadRequests();
    const reqIdx = requests.findIndex(r => r.id === req.params.id);
    
    if (reqIdx === -1) return res.status(404).json({ error: 'Request not found' });
    const targetReq = requests[reqIdx];

    let ai;
    try {
      ai = getAIClient();
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const prompt = `
      You are an expert Engineering Manager performing triage on an incoming product request.
      Please evaluate the following request:
      
      Title: ${targetReq.title}
      Type: ${targetReq.type}
      Description: ${targetReq.description}
      
      Provide a JSON response with the following format exactly:
      {
        "priority": "High" | "Medium" | "Low",
        "category": "Frontend" | "Backend" | "Design" | "DevOps" | "Other",
        "assessment": "A brief 2-3 sentence summary of your triage assessment, including potential impact or complexity.",
        "recommendedAction": "Approve" | "Reject" | "Needs More Info"
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    // Attempt to parse the JSON response from the AI
    let aiResult;
    try {
      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: response.text });
    }

    requests[reqIdx].aiTriage = aiResult;
    saveRequests(requests);
    
    res.json(requests[reqIdx]);
  } catch (err) {
    console.error('AI Triage Error:', err);
    res.status(500).json({ error: err.message });
  }
});



// AI Summarization endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { taskId, description, name, type } = req.body;
    
    let ai;
    try {
      ai = getAIClient();
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    
    if (!description || description.trim() === '') {
      return res.json({ summary: 'No description provided to summarize.' });
    }

    // Check cache first for summaries
    const cacheKey = `summary_${taskId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const prompt = `
      You are an expert project manager and technical translator.
      Please read the following ${type} description for "${name}". 
      Explain the technical details into something easily understandable by a non-technical person. 
      Keep it brief, max 2-3 short paragraphs. Highlight what the actual goal/outcome is.
      
      Original Description:
      ${description}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const summary = response.text;
    const result = { summary };
    
    setCache(cacheKey, result); // Cache to avoid re-generating frequently
    res.json(result);
  } catch (err) {
    console.error('AI Summarize Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Quests Proxy Server listening on port ${port}`);
});
