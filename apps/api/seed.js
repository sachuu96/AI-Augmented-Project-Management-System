import { query } from "./db.js";

async function createTableIfNotExists() {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      quantity INT NOT NULL CHECK (quantity >= 0),
      category VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Trigger to auto-update updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ LANGUAGE 'plpgsql';

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname='update_product_updated_at'
      ) THEN
        CREATE TRIGGER update_product_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
      END IF;
    END$$;
  `);
  console.log("Products table ensured.");
}

async function seed() {
  await createTableIfNotExists();

  const products = [
    { sellerId: "seller-1", name: "T-Shirt", description: "Cotton t-shirt", price: 19.99, quantity: 100, category: "Clothing" },
    { sellerId: "seller-2", name: "Laptop", description: "15-inch laptop", price: 999.99, quantity: 20, category: "Electronics" },
    { sellerId: "seller-1", name: "Coffee Mug", description: "Ceramic mug", price: 9.99, quantity: 50, category: "Kitchen" },
  ];

  for (const p of products) {
    await query(
      `INSERT INTO products (seller_id, name, description, price, quantity, category)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [p.sellerId, p.name, p.description, p.price, p.quantity, p.category]
    );
  }

  console.log("Seed completed!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
