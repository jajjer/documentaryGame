import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
        title: 'Hoop Dreams',
        images: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
        ],
        altTitles: ['Hoop Dreams'],
        year: 1994,
      }),
  }),
  getDocs: vi.fn().mockResolvedValue({
    docs: [{ id: '2026-03-02' }, { id: '2026-03-09' }],
  }),
}));

vi.mock('./firebase', () => ({
  db: {},
  analytics: null,
}));

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders DocuFrame brand', async () => {
    render(<App />);
    expect(screen.getByText('DocuFrame')).toBeInTheDocument();
    expect(screen.getByText(/Weekly documentary guessing game/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText((c) => c.includes('Loading') && c.includes('documentary'))).toBeInTheDocument();
  });

  it('renders puzzle after load', async () => {
    render(<App />);
    await screen.findByPlaceholderText(/Type or pick a documentary/, {}, { timeout: 3000 });
    expect(screen.getByText(/Guess the documentary in 5 frames/)).toBeInTheDocument();
  });

  it('shows week selector dropdown', () => {
    render(<App />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('has Guess and Skip buttons when playing', async () => {
    render(<App />);
    await screen.findByPlaceholderText(/Type or pick a documentary/, {}, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
  });

  it('has Reset this week button', async () => {
    render(<App />);
    await screen.findByPlaceholderText(/Type or pick a documentary/, {}, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Reset this week/i })).toBeInTheDocument();
  });
});
