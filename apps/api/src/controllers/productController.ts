import { Request, Response } from "express";
import { ProductService } from "../services/productService";
import { publishEvent } from "../events/publisher";
import {
  ProductCreated,
  ProductDeleted,
  ProductUpdated,
  LawStockWarning,
} from "../../../../packages/event-schemas/types";
import { v4 as uuidv4 } from "uuid";

export const ProductController = {
  getAll: async (req: Request, res: Response) => {
    const products = await ProductService.getAll();
    res.status(200).send(products);
  },

  getById: async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const product = await ProductService.getById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.status(200).send(product);
  },

  create: async (req: Request, res: Response) => {
    const { name, description = null, price, quantity, category } = req.body;
    const seller_id = (req as any).sellerId!;
    const id = uuidv4();

    const product = await ProductService.create({
      id,
      name,
      description,
      price,
      quantity,
      category,
      seller_id,
    });

    // Cast product to schema type
    const event: ProductCreated = {
      type: "ProductCreated",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId:seller_id,
      product: product as unknown as ProductCreated["product"],
    };

    publishEvent("ProductCreated", event).catch(console.error);

    if (quantity < 10) {
      const warning: LawStockWarning = {
        type: "LowStockWarning",
        version: "1",
        occurredAt: new Date().toISOString(),
        sellerId: seller_id,
        productId: id,
        quantity,
        threshold: 10,
      };
      publishEvent("LowStockWarning", warning).catch(console.error);
    }

    res.status(201).send(product);
  },

  update: async (req: Request, res: Response) => {
    const { name, description, price, quantity, category } = req.body;
    const sellerId = (req as any).sellerId!;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const existingProduct = await ProductService.getById(productId);
    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    const updatedProduct = await ProductService.update(productId, {
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
      changes: req.body,
    };

    publishEvent("ProductUpdated", event).catch(console.error);
    res.status(200).send(updatedProduct);
  },

  delete: async (req: Request, res: Response) => {
    const sellerId = (req as any).sellerId!;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const deleted = await ProductService.delete(productId);
    if (!deleted) return res.status(404).json({ error: "Product not found" });

    const event: ProductDeleted = {
      type: "ProductDeleted",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      productId,
    };

    publishEvent("ProductDeleted", event).catch(console.error);
    res.status(204).send(deleted);
  },
};
