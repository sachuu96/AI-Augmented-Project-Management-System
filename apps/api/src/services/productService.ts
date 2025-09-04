interface Product {
    id: number;
    name: string;
    price: number;
  }
  
  const products: Product[] = [];
  
  export const ProductService = {
    getAll: () => products,
    getById: (id: number) => products.find(p => p.id === id),
    create: (product: Product) => {
      products.push(product);
      return product;
    },
    update: (id: number, data: Partial<Product>) => {
      const product = products.find(p => p.id === id);
      if (product) Object.assign(product, data);
      return product;
    },
    delete: (id: number) => {
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) return products.splice(index, 1)[0];
      return null;
    }
  };
  