import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Info from '../components/product/Info';
import ModernCompareView from '../components/compare/ModernCompareView';
import { CompareProvider, useCompare } from '../contexts/CompareContext';

// Mock API endpoint for testing category requests
vi.mock('../services/api', () => ({
  apiEndpoints: {
    searchProducts: vi.fn(async (params) => {
      if (params?.category === 'Laptop' || params?.category === 'laptops') {
        return { data: { products: [{ id: 'lap1', title: 'MacBook Pro 16' }, { id: 'lap2', title: 'Dell XPS 15' }] } };
      }
      return { data: { products: [] } };
    }),
    getCategories: vi.fn(async () => ({ data: { categories: ['Mobile', 'Laptop', 'Tablets', 'TVs'] } }))
  }
}));

// Test helper component to test CompareContext state and limits
const CompareTestConsumer = () => {
  const { compareList, addToCompare, removeFromCompare, clearCompare } = useCompare();

  const createDummy = (id, title) => ({
    id,
    _id: id,
    title,
    price: '1000',
    vendors: { amazon: { price: 1000 } },
    specifications: { RAM: '8GB' }
  });

  return (
    <div>
      <div data-testid="compare-count">{compareList.length}</div>
      <button 
        data-testid="add-prod-1" 
        onClick={() => addToCompare(createDummy('p1', 'Phone 1'))}
      >
        Add P1
      </button>
      <button 
        data-testid="add-prod-2" 
        onClick={() => addToCompare(createDummy('p2', 'Phone 2'))}
      >
        Add P2
      </button>
      <button 
        data-testid="add-prod-3" 
        onClick={() => addToCompare(createDummy('p3', 'Phone 3'))}
      >
        Add P3
      </button>
      <button 
        data-testid="add-prod-4" 
        onClick={() => addToCompare(createDummy('p4', 'Phone 4'))}
      >
        Add P4
      </button>
      <button 
        data-testid="add-prod-5" 
        onClick={() => addToCompare(createDummy('p5', 'Phone 5'))}
      >
        Add P5
      </button>
      <button 
        data-testid="remove-prod-1" 
        onClick={() => removeFromCompare('p1')}
      >
        Remove P1
      </button>
      <button data-testid="clear-all" onClick={clearCompare}>Clear</button>
    </div>
  );
};

describe('Mobile Bug Elimination & Functional Regression Suite', () => {

  // TEST 1: Product with multiple images renders all available images
  it('TEST 1: Product with multiple images renders thumbnail strip and controls', () => {
    const mockProduct = {
      id: 'prod-multi',
      title: 'Samsung Galaxy A27 5G',
      image_urls: JSON.stringify([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
        'https://example.com/img4.jpg'
      ]),
      vendors: {}
    };

    render(<Info product={mockProduct} />);

    // Primary image & thumbnails should render
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(4);
    // Index indicator 1 / 4
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  // TEST 2: Product with one image does not crash
  it('TEST 2: Product with single image renders safely without crashing or index badge', () => {
    const mockProduct = {
      id: 'prod-single',
      title: 'Single Image Phone',
      image_url: 'https://example.com/single.jpg',
      vendors: {}
    };

    render(<Info product={mockProduct} />);

    expect(screen.getByAltText('Single Image Phone')).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 1/)).toBeNull();
  });

  // TEST 5 & 6 & 7 & 8 & 9 & 10: Compare Context Operations
  it('TEST 5-10: Compare Context manages 1, 2, 4 products, prevents 5th product & duplicates', async () => {
    render(
      <CompareProvider>
        <CompareTestConsumer />
      </CompareProvider>
    );

    const countElem = screen.getByTestId('compare-count');
    expect(countElem.textContent).toBe('0');

    // Add 1 product
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-1'));
    });
    expect(countElem.textContent).toBe('1');

    // Try duplicate addition of P1
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-1'));
    });
    expect(countElem.textContent).toBe('1'); // Duplicate blocked

    // Add 2nd product
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-2'));
    });
    expect(countElem.textContent).toBe('2');

    // Add 3rd and 4th products
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-3'));
      fireEvent.click(screen.getByTestId('add-prod-4'));
    });
    expect(countElem.textContent).toBe('4');

    // Try adding 5th product
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-5'));
    });
    expect(countElem.textContent).toBe('4'); // 5th product blocked

    // Remove 1 product
    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-prod-1'));
    });
    expect(countElem.textContent).toBe('3');
  });

  // TEST 11: Empty compare state renders cleanly
  it('TEST 11: Empty compare state renders clean mobile UI with action button', () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <ModernCompareView products={[]} />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('No Products Selected for Comparison')).toBeInTheDocument();
    expect(screen.getByText(/Browse & Add Products/)).toBeInTheDocument();
  });

});
