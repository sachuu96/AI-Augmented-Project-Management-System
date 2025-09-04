// src/components/ProductModal.tsx
// TODO: Human in the Loop: Validate form constraints (min price/quantity) and adjust UX (inline validation / accessibility).

import React, { useState, useEffect } from 'react';
import type { CreateProductInput, Product } from '../api/products';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateProductInput, id?: string) => Promise<void>;
  productToEdit?: Product | null;
};

export default function ProductModal({ open, onClose, onSave, productToEdit }: Props) {
  const [form, setForm] = useState<CreateProductInput>({
    name: '',
    description: '',
    price: 0,
    quantity: 0,
    category: '',
  });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(productToEdit);

  useEffect(() => {
    if (productToEdit) {
      setForm({
        name: productToEdit.name,
        description: productToEdit.description || '',
        price: productToEdit.price,
        quantity: productToEdit.quantity,
        category: productToEdit.category,
      });
    } else {
      setForm({
        name: '',
        description: '',
        price: 0,
        quantity: 0,
        category: '',
      });
    }
  }, [productToEdit, open]);

  if (!open) return null;

  const handleChange = (k: keyof CreateProductInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [k]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, productToEdit?.id);
      onClose();
    } catch (err) {
      // Human in the Loop: consider exposing error to user via toast
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={backdropStyle}>
      <form onSubmit={handleSubmit} style={modalStyle}>
        <h3>{isEdit ? 'Edit Product' : 'Add Product'}</h3>
        <label>
          Name
          <input value={form.name} onChange={handleChange('name')} required minLength={1} />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={handleChange('description')} />
        </label>
        <label>
          Price
          <input type="number" value={form.price} onChange={handleChange('price')} min={0} step="0.01" required />
        </label>
        <label>
          Quantity
          <input type="number" value={form.quantity} onChange={handleChange('quantity')} min={0} required />
        </label>
        <label>
          Category
          <input value={form.category} onChange={handleChange('category')} required />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.2)', zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: 480, padding: 16, background: 'white', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8,
};
