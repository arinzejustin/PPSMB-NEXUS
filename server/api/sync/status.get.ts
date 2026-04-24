import { defineEventHandler } from 'h3';

let currentMetrics = {
  unsynced_count: 0,
  unsynced_size_mb: 0,
  last_sync: Date.now()
};

export function updateMetrics(metrics: Partial<typeof currentMetrics>) {
  currentMetrics = { ...currentMetrics, ...metrics };
}

export function getMetrics() {
  return currentMetrics;
}

export default defineEventHandler(() => {
  return currentMetrics;
});
