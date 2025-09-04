import { render, screen, waitFor } from '@testing-library/react';
import NotificationsPanel from '../components/NotificationsPanel';

describe('Low stock alerts rendering', () => {
  test('renders alerts provided as props', async () => {
    const alerts = [
      {
        id: 'a1',
        productId: '1',
        productName: 'Widget',
        quantity: 2,
        timestamp: new Date().toISOString(),
      },
    ];
    render(<NotificationsPanel alerts={alerts} />);

    expect(screen.getByText(/Widget/)).toBeInTheDocument();
    expect(screen.getByText(/low stock/i)).toBeInTheDocument();
  });

  // Basic EventSource mocking example
  test('handles SSE low_stock event', async () => {
    // create a fake EventSource global
    const listeners = {};
    class FakeES {
      url;
      constructor(url) {
        this.url = url;
        setTimeout(() => {
          (listeners['low_stock'] || []).forEach((cb) =>
            cb({ data: JSON.stringify({
              id: 'es1',
              productId: '2',
              productName: 'ESWidget',
              quantity: 1,
              timestamp: new Date().toISOString()
            }) })
          );
        }, 10);
      }
      addEventListener(type, cb) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(cb);
      }
      close() {}
    }
    // @ts-ignore
    global.EventSource = FakeES;

    render(<NotificationsPanel />);

    await waitFor(() => screen.getByText(/ESWidget/));
    expect(screen.getByText(/ESWidget/)).toBeInTheDocument();
  });
});
