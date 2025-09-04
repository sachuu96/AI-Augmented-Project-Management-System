interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
    quantity: number;
    category: string;
  }

  const products: Product[] = [];
  
  export const ProductService = {
    getAll: () => products,
    getById: (id: string) => products.find(p => p.id === id),
    create: (product: Product) => {
      products.push(product);
      return product;
    },
    update: (id: string, data: Partial<Product>) => {
      const product = products.find(p => p.id === id);
      if (product) Object.assign(product, data);
      return product;
    },
    delete: (id: string) => {
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) return products.splice(index, 1)[0];
      return null;
    }
  };
  