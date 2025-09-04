import { Request, Response } from 'express';
import { ProductService } from '../services/productService';

export const ProductController = {
  getAll: (req: Request, res: Response) => {
    res.json(ProductService.getAll());
  },

  getById: (req: Request, res: Response) => {
    const product = ProductService.getById(Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  },

  create: (req: Request, res: Response) => {
    const { name, price } = req.body;
    const sellerId = (req as any).sellerId;
    const product = ProductService.create({ id: Date.now(), name, price });
    res.status(201).json({ ...product, sellerId });
  },

  update: (req: Request, res: Response) => {
    const updated = ProductService.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  },

  delete: (req: Request, res: Response) => {
    const deleted = ProductService.delete(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json(deleted);
  }
};
