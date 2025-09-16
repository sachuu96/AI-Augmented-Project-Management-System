import { Worker } from "worker_threads";
import path from "path";
import { Event } from "../schemas/index";
import { getBatchConfig } from "./batchConfig";

type EventType =
  | "ProductCreated"
  | "ProductUpdated"
  | "ProductDeleted"
  | "LowStockWarning";

interface PendingEvent {
  type: EventType;
  payload: Event;
  resolve: () => void;
  reject: (error: Error) => void;
}

class BatchEventPublisher {
  private worker: Worker | null = null;
  private pendingEvents: PendingEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private config = getBatchConfig();

  private getWorker() {
    if (!this.worker) {
      this.worker = new Worker(path.resolve(__dirname, "worker.ts"));
    }
    return this.worker;
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.config.PRODUCER.BATCH_TIMEOUT_MS);
  }

  private async flushBatch(): Promise<void> {
    if (this.pendingEvents.length === 0) return;

    const eventsToProcess = [...this.pendingEvents];
    this.pendingEvents = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Group events by type for batch processing
      const eventsByType = new Map<EventType, { type: EventType; payload: Event }[]>();
      
      eventsToProcess.forEach(event => {
        if (!eventsByType.has(event.type)) {
          eventsByType.set(event.type, []);
        }
        eventsByType.get(event.type)!.push({
          type: event.type,
          payload: event.payload
        });
      });

      // Send batches for each event type
      const batchPromises: Promise<void>[] = [];
      
      for (const [type, events] of eventsByType) {
        const batchPromise = this.sendBatch(type, events);
        batchPromises.push(batchPromise);
      }

      await Promise.all(batchPromises);

      // Resolve all pending promises
      eventsToProcess.forEach(event => event.resolve());
      
      console.log(`[BatchPublisher] Successfully sent batch of ${eventsToProcess.length} messages across ${eventsByType.size} topics`);
      
    } catch (error) {
      console.error('[BatchPublisher] Failed to send batch:', error);
      
      // Reject all pending promises
      eventsToProcess.forEach(event =>
        event.reject(error instanceof Error ? error : new Error('Batch send failed'))
      );
    }
  }

  private sendBatch(type: EventType, events: { type: EventType; payload: Event }[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const workerInstance = this.getWorker();
      const correlationId = `batch-${type}-${Date.now()}-${Math.random()}`;

      const handleMessage = (msg: any) => {
        if (msg.correlationId !== correlationId) return;

        if (msg.success) {
          resolve();
        } else {
          reject(new Error(msg.error || "Unknown worker failure"));
        }
        workerInstance.off("message", handleMessage);
      };

      workerInstance.on("message", handleMessage);
      workerInstance.postMessage({
        correlationId,
        type: 'batch',
        batchType: type,
        events: events
      });
    });
  }

  async publishEvent(type: EventType, payload: Event): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pendingEvents.push({
        type,
        payload,
        resolve,
        reject,
      });

      // Flush immediately if batch is full
      if (this.pendingEvents.length >= this.config.PRODUCER.BATCH_SIZE) {
        setImmediate(() => this.flushBatch());
      }
      // Flush immediately if we've reached max batch size (safety limit)
      else if (this.pendingEvents.length >= this.config.PRODUCER.MAX_BATCH_SIZE) {
        setImmediate(() => this.flushBatch());
      }
      // Otherwise schedule a flush
      else {
        this.scheduleBatchFlush();
      }
    });
  }

  // Force flush for graceful shutdown
  async forceFlush(): Promise<void> {
    await this.flushBatch();
  }

  // Get batch status for monitoring
  getBatchStatus() {
    return {
      pendingEvents: this.pendingEvents.length,
      batchSize: this.config.PRODUCER.BATCH_SIZE,
      batchTimeout: this.config.PRODUCER.BATCH_TIMEOUT_MS,
      maxBatchSize: this.config.PRODUCER.MAX_BATCH_SIZE,
      hasScheduledFlush: this.batchTimer !== null,
    };
  }

  // Get metrics for monitoring
  getMetrics() {
    return {
      pending_batch_messages: this.pendingEvents.length,
      batch_size_configured: this.config.PRODUCER.BATCH_SIZE,
      batch_timeout_ms: this.config.PRODUCER.BATCH_TIMEOUT_MS,
      max_batch_size: this.config.PRODUCER.MAX_BATCH_SIZE,
      has_scheduled_flush: this.batchTimer !== null ? 1 : 0,
    };
  }
}

// Singleton instance
const batchPublisher = new BatchEventPublisher();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[BatchPublisher] Received SIGTERM, flushing remaining messages...');
  await batchPublisher.forceFlush();
});

process.on('SIGINT', async () => {
  console.log('[BatchPublisher] Received SIGINT, flushing remaining messages...');
  await batchPublisher.forceFlush();
});

/**
 * Publish an event using optimized batch processing.
 * Events are collected and sent in batches for better performance and KEDA scaling.
 */
export const publishEvent = (type: EventType, payload: Event): Promise<void> => {
  return batchPublisher.publishEvent(type, payload);
};

// Export batch publisher instance for metrics
export { batchPublisher };

// Legacy support - keeping the same interface
export { publishEvent as default };
