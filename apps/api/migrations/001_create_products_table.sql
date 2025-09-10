CREATE TABLE products (
  id UUID PRIMARY KEY,
  sellerId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT now() NOT NULL,
  updatedAt TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX idx_products_seller_id ON products(sellerId);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updatedAt = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_product_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
