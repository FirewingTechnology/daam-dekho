import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Info from '../components/product/Info';
import Header from '../components/Header';
import ModernCompareView from '../components/compare/ModernCompareView';
import { CompareProvider, useCompare } from '../contexts/CompareContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Mock API endpoint for testing
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

// Theme test helper
const ThemeTestConsumer = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="toggle-theme-btn" onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('Mobile Bug Elimination & Functional Regression Suite', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // BUG #1 TEST: Hamburger menu drawer opens, renders nav items visibly, and closes
  it('BUG #1: Mobile Hamburger menu opens visible navigation drawer and closes on toggle/click', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <CompareProvider>
            <Header />
          </CompareProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const menuToggleBtn = screen.getByLabelText('Toggle Navigation Menu');
    expect(menuToggleBtn).toBeInTheDocument();

    // Initially mobile drawer is not open
    expect(screen.queryByText('Start Searching Products')).toBeNull();

    // Open hamburger menu
    await act(async () => {
      fireEvent.click(menuToggleBtn);
    });

    // Drawer is now open with visible navigation items
    const startSearchingBtn = screen.getByText('Start Searching Products');
    expect(startSearchingBtn).toBeInTheDocument();
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Compare').length).toBeGreaterThan(0);

    // Close hamburger menu
    await act(async () => {
      fireEvent.click(menuToggleBtn);
    });

    expect(screen.queryByText('Start Searching Products')).toBeNull();
  });

  // BUG #2 TEST: Clear All immediately re-renders empty state
  it('BUG #2: Clear All immediately re-renders empty state within same cycle', async () => {
    const dummyProducts = [
      { id: 'p1', _id: 'p1', title: 'Product 1', price: '1000' },
      { id: 'p2', _id: 'p2', title: 'Product 2', price: '2000' }
    ];

    const CompareWrapper = () => {
      const { compareList, clearCompare } = useCompare();
      const [localProducts, setLocalProducts] = React.useState(dummyProducts);

      const handleClear = () => {
        clearCompare();
        setLocalProducts([]);
      };

      return (
        <ModernCompareView 
          products={localProducts.length > 0 ? localProducts : compareList} 
          onClear={handleClear}
        />
      );
    };

    render(
      <MemoryRouter>
        <CompareProvider>
          <CompareWrapper />
        </CompareProvider>
      </MemoryRouter>
    );

    // Should initially show comparison view with 2 products
    expect(screen.getByText('Side-by-Side Product Comparison')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();

    // Click "Clear All"
    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    await act(async () => {
      fireEvent.click(clearAllBtn);
    });

    // Immediately renders empty state without page reload
    expect(screen.getByText('No Products Selected for Comparison')).toBeInTheDocument();
    expect(screen.getByText(/Browse & Add Products/)).toBeInTheDocument();
    expect(screen.queryByText('Side-by-Side Product Comparison')).toBeNull();
  });

  // BUG #3 TEST: 5th Product Rejected + Toast Triggered
  it('BUG #3: Attempting 5th product is rejected and triggers warning toast', async () => {
    const warningSpy = vi.spyOn(toast, 'warning').mockImplementation(() => {});

    render(
      <CompareProvider>
        <CompareTestConsumer />
      </CompareProvider>
    );

    const countElem = screen.getByTestId('compare-count');
    expect(countElem.textContent).toBe('0');

    // Add 4 products
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-1'));
      fireEvent.click(screen.getByTestId('add-prod-2'));
      fireEvent.click(screen.getByTestId('add-prod-3'));
      fireEvent.click(screen.getByTestId('add-prod-4'));
    });
    expect(countElem.textContent).toBe('4');

    // Attempt 5th product
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-5'));
    });

    // Remains exactly 4
    expect(countElem.textContent).toBe('4');
    expect(warningSpy).toHaveBeenCalledWith('Maximum 4 products can be compared at a time.');

    warningSpy.mockRestore();
  });

  // DUPLICATE TEST: Duplicate rejected + Toast Triggered
  it('BUG #3 (Duplicate): Duplicate addition is rejected and triggers info toast', async () => {
    const infoSpy = vi.spyOn(toast, 'info').mockImplementation(() => {});

    render(
      <CompareProvider>
        <CompareTestConsumer />
      </CompareProvider>
    );

    const countElem = screen.getByTestId('compare-count');

    // Add P1
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-1'));
    });
    expect(countElem.textContent).toBe('1');

    // Try adding P1 again
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prod-1'));
    });

    expect(countElem.textContent).toBe('1');
    expect(infoSpy).toHaveBeenCalledWith('This product is already in your comparison list.');

    infoSpy.mockRestore();
  });

  // BUG #4 TEST: Dark/Light theme toggle updates DOM class on documentElement and body
  it('BUG #4: Theme toggle synchronizes dark class on documentElement, body and storage', async () => {
    render(
      <ThemeProvider>
        <ThemeTestConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-theme-btn');
    const initialTheme = screen.getByTestId('current-theme').textContent;

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    const newTheme = screen.getByTestId('current-theme').textContent;
    expect(newTheme).not.toBe(initialTheme);

    if (newTheme === 'dark') {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.body.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    } else {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.body.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    }
  });

  // ADDITIONAL REGRESSION: Product image handling in Info.jsx
  it('REGRESSION: Product with multiple images renders thumbnail strip and controls', () => {
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

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

});
