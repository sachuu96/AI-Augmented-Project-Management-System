// src/components/NotificationsPanel.tsx
// TODO: Human in the Loop: Confirm event format from backend. If backend uses WebSocket, replace EventSource with WebSocket.

import React, { useEffect, useState } from 'react';

export type LowStockEvent = {
  productId: string;
  name: string;
  quantity: number;
  threshold: number;
  timestamp?: string;
};

const EVENTS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/events/stream';
const MAX_ITEMS = 50;

export default function NotificationsPanel() {
  const [alerts, setAlerts] = useState<LowStockEvent[]>([]);

  useEffect(() => {
    // Server-Sent Events (SSE) via EventSource
    const es = new EventSource(EVENTS_URL);

    es.addEventListener('low_stock_alert', (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as LowStockEvent;
        setAlerts(prev => [data, ...prev].slice(0, MAX_ITEMS));
      } catch (err) {
        console.error('Bad event payload', err);
      }
    });

    es.onerror = (err) => {
      console.error('EventSource error', err);
      // Human in the Loop: consider reconnect strategy / backoff here
    };

    return () => es.close();
  }, []);

  return (
    <aside style={panelStyle}>
      <h4>Low-stock alerts</h4>
      {alerts.length === 0 ? <div>No alerts</div> : (
        <ul style={{ paddingLeft: 12 }}>
          {alerts.map((a, i) => (
            <li key={a.productId + '-' + i} style={{ marginBottom: 8 }}>
              <strong>{a.name}</strong> — {a.quantity} left (threshold {a.threshold})
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

const panelStyle: React.CSSProperties = {
  width: 260, padding: 12, borderLeft: '1px solid #eee', background: '#fff9e6', minHeight: 200,
};
