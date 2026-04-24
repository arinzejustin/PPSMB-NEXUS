import { defineEventHandler, readBody } from 'h3';
import { updateMetrics } from './status.get';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (body) {
    updateMetrics({
      unsynced_count: body.unsynced_count ?? 0,
      unsynced_size_mb: body.unsynced_size_mb ?? 0,
      last_sync: body.last_sync ?? Date.now()
    });
  }
  return { success: true };
});
