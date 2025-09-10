import { query } from "./db";

async function createTableIfNotExists() {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      sellerId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL CHECK (price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      category TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT NOW() NOT NULL,
      updatedAt TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Trigger to auto-update updatedAt
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updatedAt = NOW();
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
    { sellerId: "seller-demo", name: "T-Shirt", description: "Cotton t-shirt", price: 19.99, quantity: 100, category: "Clothing" },
    { sellerId: "seller-demo", name: "Laptop", description: "15-inch laptop", price: 999.99, quantity: 20, category: "Electronics" },
    { sellerId: "seller-demo", name: "Coffee Mug", description: "Ceramic mug", price: 9.99, quantity: 50, category: "Kitchen" },
  ];

  for (const p of products) {
    await query(
      `INSERT INTO products (id, sellerId, name, description, price, quantity, category)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [p.sellerId, p.name, p.description, p.price, p.quantity, p.category]
    );
  }

  console.log("Seed completed!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
