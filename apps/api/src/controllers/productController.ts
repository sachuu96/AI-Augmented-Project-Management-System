import { Request, Response } from "express";
import { ProductService } from "../services/productService";
import { publishEvent } from "../events/publisher";
import {
  ProductCreated,
  ProductDeleted,
  ProductUpdated,
  LawStockWarning,
} from "../../../../packages/event-schemas/types";

export const ProductController = {
  getAll: (req: Request, res: Response) => {
    res.json(ProductService.getAll());
  },

  getById: (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const product = ProductService.getById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(product);
  },

  create: async (req: Request, res: Response) => {
    const { name, description = null, price, quantity, category } = req.body;
    const sellerId = (req as any).sellerId!;
    const id = Date.now().toString();

    const product = ProductService.create({
      id,
      name,
      description,
      price,
      quantity,
      category,
    });

    // Cast product to schema type
    const event: ProductCreated = {
      type: "ProductCreated",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      product: product as unknown as ProductCreated["product"],
    };

    publishEvent("ProductCreated", event).catch(console.error);

    if (quantity < 10) {
      const warning: LawStockWarning = {
        type: "LowStockWarning",
        version: "1",
        occurredAt: new Date().toISOString(),
        sellerId,
        productId: id,
        quantity,
        threshold: 10,
      };
      publishEvent("LowStockWarning", warning).catch(console.error);
    }

    res.status(201).json(product);
  },

  update: async (req: Request, res: Response) => {
    const { name, description, price, quantity, category } = req.body;
    const sellerId = (req as any).sellerId!;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const existingProduct = ProductService.getById(productId);
    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    const updatedProduct = ProductService.update(productId, {
      name,
      description,
      price,
      quantity,
      category,
    });

    const event: ProductUpdated = {
      type: "ProductUpdated",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      product: !updatedProduct as unknown as ProductUpdated["product"],
      changes : req.body,
    };

    publishEvent("ProductUpdated", event).catch(console.error);
    res.json(updatedProduct);
  },

  delete: async (req: Request, res: Response) => {
    const sellerId = (req as any).sellerId!;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const deleted = ProductService.delete(productId);
    if (!deleted) return res.status(404).json({ error: "Product not found" });

    const event: ProductDeleted = {
      type: "ProductDeleted",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      productId,
    };

    publishEvent("ProductDeleted", event).catch(console.error);
    res.json(deleted);
  },
};
