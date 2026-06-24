import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';

const defaultProps = {
  brands: ['Curacoro', 'BrandB'],
  selectedBrand: null,
  selectedProduct: null,
  selectedConcept: null,
  tree: {},
  onSelectBrand: vi.fn(),
  onSelectProduct: vi.fn(),
  onSelectConcept: vi.fn(),
  onAddBrand: vi.fn(),
  userEmail: 'test@example.com',
  onLogout: vi.fn(),
  sidebarOpen: false,
  onToggleSidebar: vi.fn(),
};

describe('Sidebar', () => {
  it('renders brand avatars in collapsed state', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTitle('Curacoro')).toBeInTheDocument();
    expect(screen.getByTitle('BrandB')).toBeInTheDocument();
  });

  it('calls onSelectBrand when brand avatar clicked', () => {
    const onSelectBrand = vi.fn();
    render(<Sidebar {...defaultProps} onSelectBrand={onSelectBrand} />);
    fireEvent.click(screen.getByTitle('Curacoro'));
    expect(onSelectBrand).toHaveBeenCalledWith('Curacoro');
  });

  it('calls onToggleSidebar when toggle button clicked', () => {
    const onToggleSidebar = vi.fn();
    render(<Sidebar {...defaultProps} onToggleSidebar={onToggleSidebar} />);
    fireEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('shows brand name labels when expanded', () => {
    render(<Sidebar {...defaultProps} sidebarOpen={true} />);
    expect(screen.getByText('Curacoro')).toBeInTheDocument();
  });

  it('shows product tree when brand selected and expanded', () => {
    render(<Sidebar {...defaultProps} sidebarOpen={true} selectedBrand="Curacoro"
      tree={{ 'Serum C': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Serum C')).toBeInTheDocument();
  });

  it('calls onLogout when logout button clicked', () => {
    const onLogout = vi.fn();
    render(<Sidebar {...defaultProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByLabelText('Đăng xuất'));
    expect(onLogout).toHaveBeenCalled();
  });
});
