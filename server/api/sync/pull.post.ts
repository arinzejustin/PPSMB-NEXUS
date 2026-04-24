import { defineEventHandler, readBody } from 'h3';
import axios from 'axios';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { tableName, lastSyncTime, token } = body;

  try {
    const apiUrl = process.env.API_URL || 'https://api.axiolot.com.ng';
    const response = await axios.post(`${apiUrl}/sync/pull`, {
      table: tableName,
      last_sync: lastSyncTime
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return { success: true, records: response.data.records || [] };
  } catch (err: any) {
    console.error('Sync pull failed:', err.message);
    // Return empty records if Go API is not reachable to prevent crashing
    return { success: true, records: [], warning: 'Go API failed or not reachable' };
  }
});
