import request from "supertest";
import { createApp } from "../src/index";

const app = createApp();

jest.mock("../src/services/productService", () => ({
  ProductService: {
    getAll: jest.fn(() => [
      {
        id: "p1",
        name: "Test Product",
        category: "catA",
        quantity: 10,
        price: 12.5,
        seller_id: "seller-demo",
      },
    ]),
    getById: jest.fn((id: string) =>
      id === "p1"
        ? {
            id: "p1",
            name: "Test Product",
            category: "catA",
            quantity: 10,
            price: 12.5,
            seller_id: "seller-demo",
          }
        : null
    ),
    create: jest.fn((data) => ({
      id: "p2",
      ...data,
    })),
    update: jest.fn((id: string, data) => ({
      id,
      ...data,
    })),
    delete: jest.fn((id: string) => ({
      id,
    })),
  },
}));

describe("Products API", () => {
  it("GET /products returns list", async () => {
    const res = await request(app).get("/products").set("X-Seller-Id", "seller-demo");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("name", "Test Product");
  });

  it("GET /products/:id returns single product", async () => {
    const res = await request(app).get("/products/p1").set("X-Seller-Id", "seller-demo");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "p1");
  });

  it("POST /products creates product", async () => {
    const res = await request(app)
      .post("/products")
      .set("X-Seller-Id", "seller-demo")
      .send({ name: "NewProd", category: "catB", quantity: 5, price: 22.67 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("PUT /products/:id updates product", async () => {
    const res = await request(app)
      .put("/products/p1")
      .set("X-Seller-Id", "seller-demo")
      .send({ name: "Updated Product", quantity: 20 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", "Updated Product");
  });

  it("DELETE /products/:id deletes product", async () => {
    const res = await request(app)
      .delete("/products/p1")
      .set("X-Seller-Id", "seller-demo");

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});
