import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../pages/Dashboard';

// mock the API module
jest.mock('../api/products', () => {
  let products = [
    { id: '1', name: 'A', description: '', price: 10, quantity: 10, category: 'c1' },
  ];
  return {
    fetchProducts: jest.fn(async () => products),
    createProduct: jest.fn(async (p) => {
      const created = { id: Math.random().toString(36).slice(2), ...p };
      products = [created, ...products];
      return created;
    }),
    updateProduct: jest.fn(async (id, p) => {
      products = products.map((x) => (x.id === id ? { ...x, ...p } : x));
      return products.find((x) => x.id === id);
    }),
    deleteProduct: jest.fn(async (id) => {
      products = products.filter((x) => x.id !== id);
    }),
  };
});

describe('Add and edit product flows', () => {
  test('adds a product', async () => {
    render(<Dashboard />);
    // wait for initial load
    await waitFor(() => expect(screen.getByText('Products Dashboard')).toBeInTheDocument());

    userEvent.click(screen.getByText('Add product'));
    await waitFor(() => screen.getByRole('dialog'));

    userEvent.type(screen.getByLabelText(/Name/i), 'New Product');
    userEvent.type(screen.getByLabelText(/Price/i), '12.5');
    userEvent.type(screen.getByLabelText(/Quantity/i), '3');
    userEvent.click(screen.getByText('Save'));

    // Save triggers alert; ensure table refreshes (the mocked API prepends product)
    await waitFor(() => screen.getByText('New Product'));
    expect(screen.getByText('New Product')).toBeInTheDocument();
  });

  test('edits a product', async () => {
    render(<Dashboard />);
    // wait for product to show
    await waitFor(() => screen.getByText('A'));

    userEvent.click(screen.getAllByText('Edit')[0]); // edit first row
    await waitFor(() => screen.getByRole('dialog'));

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput.value).toBe('A');
    userEvent.clear(nameInput);
    userEvent.type(nameInput, 'A Updated');

    userEvent.click(screen.getByText('Save'));
    await waitFor(() => screen.getByText('A Updated'));
  });
});
