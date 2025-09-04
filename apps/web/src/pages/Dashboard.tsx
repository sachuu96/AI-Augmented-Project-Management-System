// src/pages/Dashboard.tsx
// TODO: Human in the Loop: confirm toast mechanism (I use a tiny local approach below). Consider swapping for a toasting lib if allowed.

import  { useState, useCallback } from 'react';
import useProducts from '../hooks/useProducts';
import ProductTable from '../components/ProductTable';
import ProductModal from '../components/ProductModal';
import NotificationsPanel from '../components/NotificationsPanel';
import type { CreateProductInput } from '../api/products';

const LOW_STOCK_THRESHOLD = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5);

export default function Dashboard() {
  const { products, loading, fetchProducts, addProduct, editProduct, removeProduct } = useProducts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);

  const pushToast = useCallback((msg: string) => {
    setToasts(t => [...t, msg]);
    setTimeout(() => setToasts(t => t.slice(1)), 3000);
  }, []);

  const handleAddClick = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onSave = async (input: CreateProductInput, id?: string) => {
    if (id) {
      const updated = await editProduct(id, input);
      pushToast('Product updated');
      if (updated.quantity < LOW_STOCK_THRESHOLD) {
        pushToast(`Low stock: ${updated.name} (${updated.quantity})`);
        // Backend should also emit SSE; we show an immediate toast for UX
      }
    } else {
      const created = await addProduct(input);
      pushToast('Product created');
      if (created.quantity < LOW_STOCK_THRESHOLD) {
        pushToast(`Low stock: ${created.name} (${created.quantity})`);
      }
    }
    // refresh from server to ensure canonical state
    await fetchProducts();
  };

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16 }}>
      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2>Products</h2>
          <div>
            <button onClick={handleAddClick}>Add product</button>
          </div>
        </div>
        <ProductTable
          products={products}
          loading={loading}
          onEdit={(p) => { setEditing(p); setModalOpen(true); }}
          onDelete={async (id) => {
            await removeProduct(id);
            pushToast('Product deleted');
            await fetchProducts();
          }}
        />
      </main>

      <div style={{ width: 280 }}>
        <NotificationsPanel />
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSave}
        productToEdit={editing}
      />

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 12, right: 12 }}>
        {toasts.map((t, i) => (
          <div key={i} style={{ background: '#333', color: 'white', padding: '8px 12px', marginBottom: 8, borderRadius: 4 }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
