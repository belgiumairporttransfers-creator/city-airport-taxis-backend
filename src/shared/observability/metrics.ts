interface MetricSnapshot {
  requests: {
    total: number;
    errors: number;
    slow: number;
  };
  redis: {
    cacheHits: number;
    cacheMisses: number;
  };
  socket: {
    connections: number;
    disconnects: number;
  };
}

const metrics: MetricSnapshot = {
  requests: { total: 0, errors: 0, slow: 0 },
  redis: { cacheHits: 0, cacheMisses: 0 },
  socket: { connections: 0, disconnects: 0 },
};

export const incrementRequestCount = (): void => {
  metrics.requests.total += 1;
};

export const incrementErrorCount = (): void => {
  metrics.requests.errors += 1;
};

export const incrementSlowRequestCount = (): void => {
  metrics.requests.slow += 1;
};

export const incrementCacheHit = (): void => {
  metrics.redis.cacheHits += 1;
};

export const incrementCacheMiss = (): void => {
  metrics.redis.cacheMisses += 1;
};

export const incrementSocketConnection = (): void => {
  metrics.socket.connections += 1;
};

export const incrementSocketDisconnect = (): void => {
  metrics.socket.disconnects += 1;
};

export const getMetricsSnapshot = (): MetricSnapshot => ({
  requests: { ...metrics.requests },
  redis: { ...metrics.redis },
  socket: { ...metrics.socket },
});

export const resetMetrics = (): void => {
  metrics.requests = { total: 0, errors: 0, slow: 0 };
  metrics.redis = { cacheHits: 0, cacheMisses: 0 };
  metrics.socket = { connections: 0, disconnects: 0 };
};

export const SLOW_REQUEST_THRESHOLD_MS = 1000;
