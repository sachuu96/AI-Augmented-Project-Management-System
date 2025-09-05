import { Request, Response } from "express";

const clients: Record<string, Response[]> = {};

/**
 * SSE endpoint — clients subscribe with sellerId
 * Example: GET /events/stream?sellerId=seller-demo
 */
export function sseHandler(req: Request, res: Response) {
  const sellerId = req.query.sellerId as string;
  if (!sellerId) {
    res.status(400).json({ error: "sellerId is required" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Register this client
  if (!clients[sellerId]) clients[sellerId] = [];
  clients[sellerId].push(res);

  // Heartbeat to keep connection alive
  res.write(`event: heartbeat\ndata: "ok"\n\n`);

  req.on("close", () => {
    clients[sellerId] = clients[sellerId]!.filter((c) => c !== res);
  });
}

/**
 * Push an event to all clients for a given seller.
 */
export function pushEvent(event: { type: string; sellerId: string; [k: string]: any }) {
  const sellerClients = clients[event.sellerId] || [];
  if (sellerClients.length === 0) return;

  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  sellerClients.forEach((res) => res.write(payload));
}
