import { query } from "../../db";
import { Product } from "../schemas";

export const ProductModel = {
  async findAll(): Promise<Product[]> {
    const result = await query("SELECT * FROM products ORDER BY name ASC", []);
    return result.rows;
  },

  async findById(id: string): Promise<Product | null> {
    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  async insert(product: Omit<Product, "createdAt" | "updatedAt">): Promise<Product> {
    const result = await query(
      `INSERT INTO products (id, sellerId, name, description, price, quantity, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        product.id,
        product.sellerId,
        product.name,
        product.description ?? null,
        product.price,
        product.quantity,
        product.category,
      ]
    );
    return result.rows[0];
  },

  async updateById(id: string, data: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setQuery = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
    const values = fields.map((field) => (data as any)[field]);

    const result = await query(
      `UPDATE products SET ${setQuery}, updatedAt = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    return result.rows[0] || null;
  },

  async deleteById(id: string): Promise<Product | null> {
    const result = await query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  },
};
