import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Specs from './Specs';

describe('Specs Component & Placeholder Filtering', () => {
  it('filters out Default and Unspecified placeholder strings', () => {
    const mockProduct = {
      specifications: {
        'Brand': 'Samsung',
        'Model': 'Galaxy S25 Ultra',
        'Color': 'Default',
        'Colour': 'Unspecified',
        'RAM': '12 GB'
      }
    };

    render(<Specs product={mockProduct} />);

    // Brand and RAM should render
    expect(screen.getByText('Samsung')).toBeInTheDocument();
    expect(screen.getByText('12 GB')).toBeInTheDocument();

    // Placeholder strings 'Default' and 'Unspecified' must NOT render
    expect(screen.queryByText('Default')).toBeNull();
    expect(screen.queryByText('Unspecified')).toBeNull();
  });

  it('renders valid colors like Titanium Gray and Lavender', () => {
    const mockProduct = {
      specifications: {
        'Brand': 'Apple',
        'Color': 'Natural Titanium'
      }
    };

    render(<Specs product={mockProduct} />);

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Natural Titanium')).toBeInTheDocument();
  });
});
