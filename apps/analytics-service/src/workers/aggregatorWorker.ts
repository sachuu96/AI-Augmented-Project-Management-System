import { parentPort } from "worker_threads";
import { Event } from '@project/shared';

// In-memory aggregates (in production, use Redis or a database)
let aggregates = {
  totalProducts: 0,
  totalEvents: 0,
  eventsByType: {} as Record<string, number>,
  productsByStatus: {
    created: 0,
    updated: 0,
    deleted: 0,
    lowStock: 0,
  },
  hourlyStats: {} as Record<string, number>,
};

/**
 * Process event and update aggregates
 */
function processEvent(event: Event) {
  try {
    // Update total events
    aggregates.totalEvents++;

    // Update events by type
    if (!aggregates.eventsByType[event.type]) {
      aggregates.eventsByType[event.type] = 0;
    }
    aggregates.eventsByType[event.type]++;

    // Update hourly stats
    const hour = new Date(event.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (!aggregates.hourlyStats[hour]) {
      aggregates.hourlyStats[hour] = 0;
    }
    aggregates.hourlyStats[hour]++;

    // Update product-specific stats
    switch (event.type) {
      case 'ProductCreated':
        aggregates.totalProducts++;
        aggregates.productsByStatus.created++;
        break;
      case 'ProductUpdated':
        aggregates.productsByStatus.updated++;
        break;
      case 'ProductDeleted':
        aggregates.totalProducts = Math.max(0, aggregates.totalProducts - 1);
        aggregates.productsByStatus.deleted++;
        break;
      case 'LowStockWarning':
        aggregates.productsByStatus.lowStock++;
        break;
    }

    // Clean up old hourly stats (keep only last 24 hours)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
    Object.keys(aggregates.hourlyStats).forEach(hour => {
      if (hour < cutoffTime) {
        delete aggregates.hourlyStats[hour];
      }
    });

    console.log(`[AggregatorWorker] Processed ${event.type} event, total events: ${aggregates.totalEvents}`);
    
    // Send updated aggregates back to main thread
    parentPort?.postMessage({
      type: "aggregatesUpdated",
      aggregates: { ...aggregates },
    });

  } catch (error) {
    console.error('[AggregatorWorker] Error processing event:', error);
    parentPort?.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get current aggregates
 */
function getCurrentAggregates() {
  return { ...aggregates };
}

/**
 * Reset aggregates (for testing or maintenance)
 */
function resetAggregates() {
  aggregates = {
    totalProducts: 0,
    totalEvents: 0,
    eventsByType: {},
    productsByStatus: {
      created: 0,
      updated: 0,
      deleted: 0,
      lowStock: 0,
    },
    hourlyStats: {},
  };
  
  parentPort?.postMessage({
    type: "aggregatesReset",
    aggregates: { ...aggregates },
  });
}

// Handle messages from main thread
parentPort?.on("message", (message) => {
  try {
    switch (message.type) {
      case "processEvent":
        processEvent(message.event);
        break;
      case "getAggregates":
        parentPort?.postMessage({
          type: "currentAggregates",
          aggregates: getCurrentAggregates(),
        });
        break;
      case "resetAggregates":
        resetAggregates();
        break;
      default:
        // Handle direct event processing (legacy support)
        if (message.id && message.type && message.timestamp) {
          processEvent(message as Event);
        } else {
          console.warn('[AggregatorWorker] Unknown message type:', message.type);
        }
        break;
    }
  } catch (error) {
    console.error('[AggregatorWorker] Error handling message:', error);
    parentPort?.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send initial status
parentPort?.postMessage({
  type: "workerReady",
  aggregates: getCurrentAggregates(),
});

console.log('[AggregatorWorker] Worker thread started and ready');