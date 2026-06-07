import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

const mockProps = {
  brands: ['Nike', 'Adidas'],
  selectedBrand: null,
  selectedProduct: null,
  selectedConcept: null,
  tree: {},
  onSelectBrand: vi.fn(),
  onSelectProduct: vi.fn(),
  onSelectConcept: vi.fn(),
  onAddBrand: vi.fn(),
};

describe('Sidebar', () => {
  it('hiện danh sách brands', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText('Nike')).toBeInTheDocument();
    expect(screen.getByText('Adidas')).toBeInTheDocument();
  });

  it('gọi onSelectBrand khi click brand', () => {
    const onSelectBrand = vi.fn();
    render(<Sidebar {...mockProps} onSelectBrand={onSelectBrand} />);
    fireEvent.click(screen.getByText('Nike'));
    expect(onSelectBrand).toHaveBeenCalledWith('Nike');
  });

  it('hiện product tree khi brand được chọn', () => {
    render(<Sidebar {...mockProps} selectedBrand="Nike" tree={{ 'Running': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('hiện concept list khi product được chọn', () => {
    render(<Sidebar {...mockProps} selectedBrand="Nike" selectedProduct="Running"
      tree={{ 'Running': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Pain Point')).toBeInTheDocument();
    expect(screen.getByText('Social Proof')).toBeInTheDocument();
  });
});
