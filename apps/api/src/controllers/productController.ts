import { Request, Response } from "express";
import { ProductService } from "../services/productService";
import { publishEvent } from "../events/publisher";
import { ProductCreated, ProductDeleted, ProductUpdated, LowStockWarning } from "../schemas/index";
import { v4 as uuidv4 } from "uuid";

function errorResponse(res: Response, code: number, message: string) {
  return res.status(code).json({ message });
}

export const ProductController = {
  getAll: async (req: Request, res: Response) => {
    const products = await ProductService.getAll();
    res.status(200).json(products);
  },


  create: async (req: Request, res: Response) => {
    const {
      name,
      description,
      price,
      quantity,
      category,
    } = req.body;
    const sellerId = req.header("X-Seller-Id");
    if (!sellerId)
      return errorResponse(res, 400, "X-Seller-Id header is required");

    const id = uuidv4();
    const product = await ProductService.create({
      id,
      sellerId,
      name,
      description,
      price,
      quantity,
      category,
    });


    const event : ProductCreated = {
      type: "ProductCreated",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      product,
    };
    publishEvent("ProductCreated", event).catch(console.error);

    if (quantity < 10) {
      const warning : LowStockWarning = {
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
    const { id } = req.params;
    if (!id) return errorResponse(res, 400, "Product ID is required");

    const sellerId = req.header("X-Seller-Id")!;
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) return errorResponse(res, 404, "Product not found");

    const updatedProduct = await ProductService.update(id, req.body);
    if (!updatedProduct) return errorResponse(res, 404, "Product not found");

    const event : ProductUpdated= {
      type: "ProductUpdated",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      product: updatedProduct,
      changes: req.body,
    };
    publishEvent("ProductUpdated", event).catch(console.error);

    if (req.body.quantity !== undefined && req.body.quantity < 10) {
      const warning : LowStockWarning = {
        type: "LowStockWarning",
        version: "1",
        occurredAt: new Date().toISOString(),
        sellerId,
        productId: id,
        quantity: req.body.quantity,
        threshold: 10,
      };
      publishEvent("LowStockWarning", warning).catch(console.error);
    }

    res.status(200).json(updatedProduct);
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return errorResponse(res, 400, "Product ID is required");

    const sellerId = req.header("X-Seller-Id")!;
    const deleted = await ProductService.delete(id);
    if (!deleted) return errorResponse(res, 404, "Product not found");

    const event : ProductDeleted= {
      type: "ProductDeleted",
      version: "1",
      occurredAt: new Date().toISOString(),
      sellerId,
      productId: id,
    };
    publishEvent("ProductDeleted", event).catch(console.error);

    res.status(204).send();
  },
};
