// src/api/products.ts
// Human in the Loop: confirm baseUrl, SellerId header retrieval (from env or auth), and error handling strategy.

export type Product = {
  id: string;
  sellerId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function sellerHeader() {
  // Human in the Loop: Replace this with your actual auth / seller id retrieval (cookie, localStorage, or auth provider).
  const sellerId = localStorage.getItem("X-Seller-Id") || "seller-demo";
  return { "X-Seller-Id": sellerId };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
    throw new Error(json.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "GET",
    headers: {
      ...sellerHeader(),
      Accept: "application/json",
    },
  });
  return handleResponse(res);
}

export async function createProduct(
  input: CreateProductInput
): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: {
      ...sellerHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return handleResponse(res);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      ...sellerHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return handleResponse(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "DELETE",
    headers: {
      ...sellerHeader(),
    },
  });
  return handleResponse(res);
}
