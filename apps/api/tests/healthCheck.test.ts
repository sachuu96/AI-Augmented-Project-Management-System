import request from 'supertest';
import { createApp } from '../src/index';

// Mock the batch publisher
jest.mock('../src/events/publisher', () => ({
  batchPublisher: {
    getBatchStatus: jest.fn(() => ({
      pendingEvents: 5,
      batchSize: 50,
      batchTimeout: 500,
      maxBatchSize: 200,
      hasScheduledFlush: true,
    })),
    getMetrics: jest.fn(() => ({
      pending_batch_messages: 5,
      batch_size_configured: 50,
      batch_timeout_ms: 500,
      max_batch_size: 200,
      has_scheduled_flush: 1,
      is_connected: 1,
    })),
  },
}));

describe('Health Check Endpoints', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
      });

      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status with service checks', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
        checks: {
          batchPublisher: {
            status: 'ready',
            pendingEvents: expect.any(Number),
            batchSize: expect.any(Number),
          },
          database: {
            status: 'ready',
          },
          kafka: {
            status: 'ready',
          },
        },
      });

      expect(response.body.checks.batchPublisher.pendingEvents).toBe(5);
      expect(response.body.checks.batchPublisher.batchSize).toBe(50);
    });

    it('should return 503 when batch publisher fails', async () => {
      // Mock batch publisher to throw error
      const { batchPublisher } = require('../src/events/publisher');
      batchPublisher.getBatchStatus.mockImplementationOnce(() => {
        throw new Error('Batch publisher not available');
      });

      const response = await request(app)
        .get('/ready')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'not ready',
        timestamp: expect.any(String),
        error: 'Batch publisher not available',
      });
    });
  });

  describe('GET /live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /startup', () => {
    it('should return started status when uptime > 10 seconds', async () => {
      // Mock process.uptime to return > 10
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => 15);

      const response = await request(app)
        .get('/startup')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'started',
        timestamp: expect.any(String),
        uptime: 15,
      });

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should return 503 when uptime < 10 seconds', async () => {
      // Mock process.uptime to return < 10
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => 5);

      const response = await request(app)
        .get('/startup')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'starting',
        timestamp: expect.any(String),
        uptime: 5,
      });

      // Restore original function
      process.uptime = originalUptime;
    });
  });

  describe('GET /metrics', () => {
    it('should return comprehensive metrics including batch processing', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        uptime: expect.any(Number),
        memory: {
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number),
        },
        cpu: {
          user: expect.any(Number),
          system: expect.any(Number),
        },
        timestamp: expect.any(String),
        version: expect.any(String),
        batch: {
          pending_batch_messages: 5,
          batch_size_configured: 50,
          batch_timeout_ms: 500,
          max_batch_size: 200,
          has_scheduled_flush: 1,
          is_connected: 1,
        },
        system: {
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
          pid: expect.any(Number),
        },
      });
    });

    it('should return fallback metrics when batch publisher fails', async () => {
      // Mock batch publisher to throw error
      const { batchPublisher } = require('../src/events/publisher');
      batchPublisher.getMetrics.mockImplementationOnce(() => {
        throw new Error('Batch publisher error');
      });

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        uptime: expect.any(Number),
        memory: expect.any(Object),
        cpu: expect.any(Object),
        timestamp: expect.any(String),
        version: expect.any(String),
        error: 'Batch publisher not available',
      });

      expect(response.body.batch).toBeUndefined();
    });
  });

  describe('GET /metrics/prometheus', () => {
    it('should return Prometheus format metrics', async () => {
      const response = await request(app)
        .get('/metrics/prometheus')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      
      const metricsText = response.text;
      
      // Check for required Prometheus metrics
      expect(metricsText).toContain('pending_batch_messages{job="api"} 5');
      expect(metricsText).toContain('batch_processing_connected{job="api"} 1');
      expect(metricsText).toContain('batch_size_configured{job="api"} 50');
      expect(metricsText).toContain('batch_timeout_ms{job="api"} 500');
      expect(metricsText).toContain('batch_has_scheduled_flush{job="api"} 1');
      expect(metricsText).toContain('process_uptime_seconds{job="api"}');
      expect(metricsText).toContain('nodejs_memory_usage_bytes{type="rss",job="api"}');
      expect(metricsText).toContain('nodejs_memory_usage_bytes{type="heapTotal",job="api"}');
      expect(metricsText).toContain('nodejs_memory_usage_bytes{type="heapUsed",job="api"}');
      expect(metricsText).toContain('nodejs_memory_usage_bytes{type="external",job="api"}');
      expect(metricsText).toContain('nodejs_version_info{version="');
      
      // Check for proper Prometheus format
      expect(metricsText).toContain('# HELP pending_batch_messages');
      expect(metricsText).toContain('# TYPE pending_batch_messages gauge');
    });

    it('should return fallback Prometheus metrics when batch publisher fails', async () => {
      // Mock batch publisher to throw error
      const { batchPublisher } = require('../src/events/publisher');
      batchPublisher.getMetrics.mockImplementationOnce(() => {
        throw new Error('Batch publisher error');
      });

      const response = await request(app)
        .get('/metrics/prometheus')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      
      const metricsText = response.text;
      
      // Should contain fallback metrics
      expect(metricsText).toContain('process_uptime_seconds{job="api"}');
      expect(metricsText).toContain('nodejs_memory_usage_bytes{type="rss",job="api"}');
      expect(metricsText).toContain('batch_publisher_error{job="api"} 1');
      
      // Should not contain batch-specific metrics
      expect(metricsText).not.toContain('pending_batch_messages');
      expect(metricsText).not.toContain('batch_processing_connected');
    });
  });

  describe('Health Check Integration', () => {
    it('should provide consistent timestamps across endpoints', async () => {
      const startTime = Date.now();
      
      const [healthResponse, readyResponse, liveResponse] = await Promise.all([
        request(app).get('/health'),
        request(app).get('/ready'),
        request(app).get('/live'),
      ]);
      
      const endTime = Date.now();
      
      // All timestamps should be within the test execution window
      [healthResponse, readyResponse, liveResponse].forEach(response => {
        const timestamp = new Date(response.body.timestamp).getTime();
        expect(timestamp).toBeGreaterThanOrEqual(startTime);
        expect(timestamp).toBeLessThanOrEqual(endTime);
      });
    });

    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should provide different uptime values over time', async () => {
      const response1 = await request(app).get('/health');
      
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response2 = await request(app).get('/health');

      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });
  });
});