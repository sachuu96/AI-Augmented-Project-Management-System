// src/components/ProductTable.tsx
// TODO: Human in the Loop: check actions accessibility (keyboard), confirm confirmation UX for delete.

import React from 'react';
import type { Product } from '../api/products';

type Props = {
  products: Product[] | null;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
};

export default function ProductTable({ products, onEdit, onDelete, loading }: Props) {
  if (loading) return <div>Loading products...</div>;
  if (!products || products.length === 0) return <div>No products yet.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>Name</th>
          <th style={th}>Price</th>
          <th style={th}>Quantity</th>
          <th style={th}>Category</th>
          <th style={th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
            <td style={td}>{p.name}</td>
            <td style={td}>{p.price}</td>
            <td style={td}>{p.quantity}</td>
            <td style={td}>{p.category}</td>
            <td style={td}>
              <button onClick={() => onEdit(p)} style={{ marginRight: 8 }}>Edit</button>
              <button onClick={async () => {
                const ok = confirm(`Delete "${p.name}"?`);
                if (!ok) return;
                try {
                  await onDelete(p.id);
                } catch (err) {
                  console.error(err);
                  alert('Failed to delete');
                }
              }}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 4px' };
const td: React.CSSProperties = { padding: '8px 4px' };
