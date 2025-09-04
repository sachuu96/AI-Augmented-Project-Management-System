// src/hooks/useProducts.ts
// TODO: Human in the Loop: Adjust refresh timing, error handling, and caching strategy as needed.

import { useEffect, useState, useCallback } from 'react';
import type { Product, CreateProductInput, UpdateProductInput } from '../api/products';
import * as api from '../api/products';

export default function useProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (input: CreateProductInput) => {
    const created = await api.createProduct(input);
    // simple local update; alternatively re-fetch
    setProducts(prev => prev ? [created, ...prev] : [created]);
    return created;
  };

  const editProduct = async (id: string, input: UpdateProductInput) => {
    const updated = await api.updateProduct(id, input);
    setProducts(prev => (prev ? prev.map(p => (p.id === id ? updated : p)) : [updated]));
    return updated;
  };

  const removeProduct = async (id: string) => {
    await api.deleteProduct(id);
    setProducts(prev => (prev ? prev.filter(p => p.id !== id) : null));
  };

  return { products, loading, error, fetchProducts, addProduct, editProduct, removeProduct };
}
