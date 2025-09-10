import { Product } from "../schemas";
import { ProductModel } from "../models/ProductModel";

export const ProductService = {
  async getAll(): Promise<Product[]> {
    try {
      return await ProductModel.findAll();
    } catch (err) {
      console.error("[ProductService.getAll] Error:", err);
      throw new Error("Failed to fetch products");
    }
  },

  async getById(id: string): Promise<Product | null> {
    try {
      return await ProductModel.findById(id);
    } catch (err) {
      console.error("[ProductService.getById] Error:", err);
      throw new Error("Failed to fetch product by ID");
    }
  },

  async create(product: Omit<Product, "createdAt" | "updatedAt">): Promise<Product> {
    try {
      const created = await ProductModel.insert(product);
      return {
        ...created,
        description: created.description ?? null,
      };
    } catch (err) {
      console.error("[ProductService.create] Error:", err);
      throw new Error("Failed to create product");
    }
  },

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      return await ProductModel.updateById(id, data);
    } catch (err) {
      console.error("[ProductService.update] Error:", err);
      throw new Error("Failed to update product");
    }
  },

  async delete(id: string): Promise<Product | null> {
    try {
      return await ProductModel.deleteById(id);
    } catch (err) {
      console.error("[ProductService.delete] Error:", err);
      throw new Error("Failed to delete product");
    }
  },
};
