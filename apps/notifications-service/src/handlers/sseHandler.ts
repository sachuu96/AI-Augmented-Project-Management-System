import { Request, Response } from 'express';
import { Event } from '@project/shared';

// Store active SSE connections
const sseConnections = new Set<Response>();

/**
 * SSE connection handler
 */
export function handleSSEConnection(req: Request, res: Response): void {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Add connection to active connections
  sseConnections.add(res);
  console.log(`📡 [SSEHandler] New SSE connection established. Active connections: ${sseConnections.size}`);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to notifications stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send periodic heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseConnections.delete(res);
    console.log(`📡 [SSEHandler] SSE connection closed. Active connections: ${sseConnections.size}`);
  });

  req.on('error', (error) => {
    console.error('📡 [SSEHandler] SSE connection error:', error);
    clearInterval(heartbeatInterval);
    sseConnections.delete(res);
  });
}

/**
 * Broadcast event to all connected SSE clients
 */
export function broadcastEvent(event: Event): void {
  if (sseConnections.size === 0) {
    console.log('📡 [SSEHandler] No active SSE connections to broadcast to');
    return;
  }

  const eventData = JSON.stringify({
    ...event,
    broadcastTimestamp: new Date().toISOString()
  });

  const deadConnections: Response[] = [];

  // Send to all active connections
  sseConnections.forEach((res) => {
    try {
      if (res.destroyed) {
        deadConnections.push(res);
        return;
      }

      res.write(`data: ${eventData}\n\n`);
    } catch (error) {
      console.error('📡 [SSEHandler] Error sending to SSE client:', error);
      deadConnections.push(res);
    }
  });

  // Clean up dead connections
  deadConnections.forEach((res) => {
    sseConnections.delete(res);
  });

  if (deadConnections.length > 0) {
    console.log(`📡 [SSEHandler] Cleaned up ${deadConnections.length} dead connections`);
  }

  console.log(`📡 [SSEHandler] Broadcasted ${event.type} event to ${sseConnections.size} clients`);
}

/**
 * Get SSE connection statistics
 */
export function getSSEStats() {
  return {
    activeConnections: sseConnections.size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Close all SSE connections (for graceful shutdown)
 */
export function closeAllSSEConnections(): void {
  console.log(`📡 [SSEHandler] Closing ${sseConnections.size} SSE connections...`);
  
  sseConnections.forEach((res) => {
    try {
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({
          type: 'shutdown',
          message: 'Server is shutting down',
          timestamp: new Date().toISOString()
        })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error('📡 [SSEHandler] Error closing SSE connection:', error);
    }
  });

  sseConnections.clear();
  console.log('📡 [SSEHandler] All SSE connections closed');
}