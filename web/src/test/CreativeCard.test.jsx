import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreativeCard from '../components/CreativeCard';

const mockCreative = {
  id: 'CR-20260606-1234',
  hook: 'Hook A — Speed',
  concept: 'Pain Point',
  angle: 'Recovery Pain',
  format: 'Video 9:16',
  status: 'Winning',
  roas: 4.2,
  ctr: 3.2,
  preview_url: '',
};

describe('CreativeCard', () => {
  it('hiện hook và concept', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Hook A — Speed')).toBeInTheDocument();
    expect(screen.getByText('Pain Point')).toBeInTheDocument();
  });

  it('hiện ROAS khi có giá trị', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('4.2x')).toBeInTheDocument();
  });

  it('hiện status badge', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Winning')).toBeInTheDocument();
  });

  it('gọi onClick khi click', () => {
    const onClick = vi.fn();
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('Hook A — Speed'));
    expect(onClick).toHaveBeenCalledWith(mockCreative);
  });

  it('hiện border khác màu khi isSelected=true', () => {
    const { container } = render(<CreativeCard creative={mockCreative} isSelected={true} onClick={vi.fn()} />);
    expect(container.firstChild).toHaveClass('border-indigo-400');
  });
});
