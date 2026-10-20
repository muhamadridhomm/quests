import axios from 'axios';

// A simple client wrapper around our mock local Demo Tracker API
// In the future, just swap the baseURL and auth headers to the real one
export class DemoTrackerClient {
  constructor(baseURL = 'http://localhost:3001/demo-tracker-api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
        // Add real Authorization header here later:
        // 'Authorization': `Bearer ${process.env.DEMO_TRACKER_API_TOKEN}`
      }
    });
  }

  // Find a task in DemoTracker by its QUESTS ID
  async findTaskByQuestsId(questsId) {
    try {
      const resp = await this.client.get(`/tasks/search?questsId=${questsId}`);
      if (resp.data && resp.data.length > 0) {
        return resp.data[0];
      }
      return null;
    } catch (err) {
      console.error(`Demo Tracker API Error (findTaskByQuestsId): ${err.message}`);
      return null;
    }
  }

  // Create a new task in DemoTracker
  async createTask(questsId, name, campaignId, status) {
    try {
      const resp = await this.client.post('/tasks', {
        questsId,
        name,
        campaignId,
        status
      });
      return resp.data;
    } catch (err) {
      console.error(`Demo Tracker API Error (createTask): ${err.message}`);
      return null;
    }
  }

  // Update an existing task in DemoTracker
  async updateTaskStatus(demoTrackerId, status) {
    try {
      const resp = await this.client.put(`/tasks/${demoTrackerId}`, {
        status
      });
      return resp.data;
    } catch (err) {
      console.error(`Demo Tracker API Error (updateTaskStatus): ${err.message}`);
      return null;
    }
  }
}
