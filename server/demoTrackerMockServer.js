import express from 'express';
import fs from 'fs';
import path from 'path';

// Mock DB path
const dbPath = path.join(process.cwd(), 'server', 'data', 'demo_tracker_db.json');

// Initialize mock DB if it doesn't exist
function initDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ campaigns: [], tasks: [] }, null, 2));
  }
}

function readDb() {
  initDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Generate a random ID to mimic what DemoTracker might do
function generateId() {
  return 'DEMO-' + Math.floor(100000 + Math.random() * 900000);
}

export function createDemoTrackerMockServer() {
  const router = express.Router();
  
  router.use(express.json());

  // --- Campaign Endpoints ---
  
  // Get all campaigns
  router.get('/campaigns', (req, res) => {
    const db = readDb();
    res.json(db.campaigns);
  });

  // Get specific campaign
  router.get('/campaigns/:id', (req, res) => {
    const db = readDb();
    const campaign = db.campaigns.find(c => c.id === req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  });

  // Create campaign
  router.post('/campaigns', (req, res) => {
    const db = readDb();
    const newCampaign = {
      id: generateId(),
      name: req.body.name || 'Untitled Campaign',
      status: req.body.status || 'Draft',
      createdAt: new Date().toISOString()
    };
    db.campaigns.push(newCampaign);
    writeDb(db);
    res.status(201).json(newCampaign);
  });
  
  // Update campaign
  router.put('/campaigns/:id', (req, res) => {
    const db = readDb();
    const idx = db.campaigns.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Campaign not found' });
    
    db.campaigns[idx] = { ...db.campaigns[idx], ...req.body, id: req.params.id };
    writeDb(db);
    res.json(db.campaigns[idx]);
  });

  // --- Task Endpoints ---
  
  // Create task within a campaign
  router.post('/tasks', (req, res) => {
    const db = readDb();
    const newTask = {
      id: generateId(),
      campaignId: req.body.campaignId || null,
      name: req.body.name || 'Untitled Task',
      status: req.body.status || 'Open',
      questsId: req.body.questsId || null,
      createdAt: new Date().toISOString()
    };
    db.tasks.push(newTask);
    writeDb(db);
    res.status(201).json(newTask);
  });
  
  // Get task by Quests ID (used for looking up if it exists already)
  router.get('/tasks/search', (req, res) => {
    const questsId = req.query.questsId;
    if (!questsId) return res.status(400).json({ error: 'Missing questsId query param' });
    
    const db = readDb();
    const tasks = db.tasks.filter(t => t.questsId === questsId);
    res.json(tasks);
  });
  
  // Update task status
  router.put('/tasks/:id', (req, res) => {
    const db = readDb();
    const idx = db.tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    db.tasks[idx] = { ...db.tasks[idx], ...req.body, id: req.params.id };
    writeDb(db);
    res.json(db.tasks[idx]);
  });

  return router;
}
