import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Home from './Home';
import { apiEndpoints } from '../services/api';
import { MemoryRouter } from 'react-router-dom';

// Mock the apiEndpoints
vi.mock('../services/api', () => ({
  apiEndpoints: {
    getHomeData: vi.fn(),
  },
}));

// Mock the child components to simplify testing Home
vi.mock('../components/home/ComparePrices', () => ({ default: () => <div>ComparePrices</div> }));
vi.mock('../components/home/CompareNow', () => ({ default: () => <div>CompareNow</div> }));
vi.mock('../components/home/Macbook', () => ({ default: () => <div>MacbookPage</div> }));
vi.mock('../components/home/Xboxconsoles', () => ({ default: () => <div>Xboxconsoles</div> }));
vi.mock('../components/home/Latestnews', () => ({ default: () => <div>Latestnews</div> }));
vi.mock('../components/home/Card', () => ({ default: ({ title }) => <div>Card: {title}</div> }));

describe('Home Component', () => {
  it('renders loading state initially', () => {
    apiEndpoints.getHomeData.mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Daam/i)).toBeInTheDocument();
  });

  it('renders home content after successful fetch', async () => {
    apiEndpoints.getHomeData.mockResolvedValue({
      data: {
        latestProducts: [{ id: 1, title: 'Test Product' }],
        hotPriceDrops: [],
        trendingDeals: [],
      },
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Card: Latest & Popular Products')).toBeInTheDocument();
    });
    expect(screen.getByText('Card: Hot Deals')).toBeInTheDocument();
    expect(screen.getByText('Card: Best Sellers')).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    apiEndpoints.getHomeData.mockRejectedValue(new Error('Fetch failed'));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load products/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });
});
