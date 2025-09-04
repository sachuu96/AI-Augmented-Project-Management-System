import { query } from "../../db";

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  quantity: number;
  category: string;
  seller_id: string;
}

export const ProductService = {
  async getAll() {
    const result = await query("SELECT * FROM products ORDER BY name ASC", []);
    return result.rows;
  },

  async getById(id: string): Promise<Product | null> {
    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  async create(product: Product): Promise<Product> {
    const result = await query(
      `INSERT INTO products (id, name, price, description, quantity, category, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        product.id,
        product.name,
        product.price,
        product.description ?? null,
        product.quantity,
        product.category,
        product.seller_id
      ]
    );
    return result.rows[0];
  },

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      const existing = await this.getById(id);
      return existing;
    }

    const setQuery = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
    const values = fields.map((field) => (data as any)[field]);

    const result = await query(
      `UPDATE products SET ${setQuery} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<Product | null> {
    const result = await query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
    return result.rows[0] || null;
  },
};
