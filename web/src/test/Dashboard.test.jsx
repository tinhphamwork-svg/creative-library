import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../components/Dashboard';

const mockCache = {
  Curacoro: [
    { id: '1', status: 'Winning', roas: '4.2', spend: '1200' },
    { id: '2', status: 'Winning', roas: '3.8', spend: '800' },
    { id: '3', status: 'Testing', roas: '', spend: '200' },
  ],
};

describe('Dashboard', () => {
  it('renders brand cards for each brand', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText('Curacoro')).toBeInTheDocument();
  });

  it('shows winning count from cache', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText('2 winning')).toBeInTheDocument();
  });

  it('calls onSelectBrand when brand card clicked', () => {
    const onSelectBrand = vi.fn();
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={onSelectBrand} onActionsToggle={vi.fn()} />);
    fireEvent.click(screen.getByText('Curacoro'));
    expect(onSelectBrand).toHaveBeenCalledWith('Curacoro');
  });

  it('shows pending actions strip when actions exist', () => {
    const actions = [{ id: '1', action: 'Scale', creative_id: 'CRC-001', brand: 'Curacoro' }];
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={actions}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText(/1 pending action/)).toBeInTheDocument();
  });

  it('does not show actions strip when no actions', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.queryByText(/pending action/)).not.toBeInTheDocument();
  });

  it('shows empty state when no brands', () => {
    render(<Dashboard brands={[]} cache={{}} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText(/No brands yet/)).toBeInTheDocument();
  });
});
