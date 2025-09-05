// src/components/NotificationsPanel.tsx
// Human in the Loop: Adjust event names & payload format if backend changes schema.

import React, { useEffect, useState } from 'react';

export type LowStockEvent = {
  productId: string;
  name?: string;
  quantity: number;
  threshold: number;
  occurredAt?: string;
};

const sellerId = "seller-demo";
const EVENTS_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000") +
  "/events/stream";
const MAX_ITEMS = 50;

export default function NotificationsPanel() {
  const [alerts, setAlerts] = useState<LowStockEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(`${EVENTS_URL}?sellerId=${sellerId}`);

    // Listen for LowStockWarning events (case matches backend emitter)
    es.addEventListener("LowStockWarning", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as LowStockEvent;
        setAlerts((prev) => [data, ...prev].slice(0, MAX_ITEMS));
      } catch (err) {
        console.error("Bad LowStockWarning payload", err);
      }
    });

    // Optional: also listen for generic product events
    es.addEventListener("ProductCreated", (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      console.log("Product created", data);
    });
    es.addEventListener("ProductUpdated", (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      console.log("Product updated", data);
    });
    es.addEventListener("ProductDeleted", (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      console.log("Product deleted", data);
    });

    es.onerror = (err) => {
      console.error("EventSource error", err);
      // TODO: consider reconnect strategy with backoff
    };

    return () => es.close();
  }, []);

  return (
    <aside style={panelStyle}>
      <h4>Low-stock alerts</h4>
      {alerts.length === 0 ? (
        <div>No alerts</div>
      ) : (
        <ul style={{ paddingLeft: 12 }}>
          {alerts.map((a, i) => (
            <li key={a.productId + "-" + i} style={{ marginBottom: 8 }}>
              <strong>{a.name || a.productId}</strong> — {a.quantity} left
              (threshold {a.threshold})
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

const panelStyle: React.CSSProperties = {
  width: 260,
  padding: 12,
  borderLeft: "1px solid #eee",
  background: "#fff9e6",
  minHeight: 200,
};
