import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentWeekId,
  getWeekLabel,
  getAvailableWeeks,
  normalizeTitle,
} from './utils';

describe('normalizeTitle', () => {
  it('lowercases input', () => {
    expect(normalizeTitle('THE LAST DANCE')).toBe('last dance');
  });

  it('strips leading articles', () => {
    expect(normalizeTitle('The Last Dance')).toBe('last dance');
    expect(normalizeTitle('A Documentary')).toBe('documentary');
    expect(normalizeTitle('An Inconvenient Truth')).toBe('inconvenient truth');
  });

  it('removes punctuation', () => {
    expect(normalizeTitle("Won't You Be My Neighbor?")).toBe('wont you be my neighbor');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeTitle('Hoop   Dreams')).toBe('hoop dreams');
  });

  it('trims whitespace', () => {
    expect(normalizeTitle('  Free Solo  ')).toBe('free solo');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });
});

describe('getWeekLabel', () => {
  it('formats week ID as label', () => {
    expect(getWeekLabel('2026-03-02')).toBe('Week of 03/02/2026');
    expect(getWeekLabel('2025-12-25')).toBe('Week of 12/25/2025');
  });
});

describe('getCurrentWeekId', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Monday of current week for a Friday', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00')); // Friday noon local
    const { id, label } = getCurrentWeekId();
    expect(id).toBe('2026-03-02'); // Monday of that week
    expect(label).toBe('Week of 03/02/2026');
  });

  it('returns Monday of current week for a Monday', () => {
    vi.setSystemTime(new Date('2026-03-02T12:00:00')); // Monday noon local
    const { id, label } = getCurrentWeekId();
    expect(id).toBe('2026-03-02');
    expect(label).toBe('Week of 03/02/2026');
  });

  it('returns id in YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00'));
    const { id } = getCurrentWeekId();
    expect(id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getAvailableWeeks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns requested number of weeks', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00'));
    const weeks = getAvailableWeeks(5);
    expect(weeks).toHaveLength(5);
  });

  it('first week is current week', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00'));
    const weeks = getAvailableWeeks(3);
    expect(weeks[0].id).toBe('2026-03-02');
    expect(weeks[0].label).toBe('Week of 03/02/2026');
  });

  it('weeks go backwards in time', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00'));
    const weeks = getAvailableWeeks(3);
    expect(weeks[1].id).toBe('2026-02-23');
    expect(weeks[2].id).toBe('2026-02-16');
  });

  it('each week has id and label', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:00'));
    const weeks = getAvailableWeeks(2);
    weeks.forEach((w) => {
      expect(w).toHaveProperty('id');
      expect(w).toHaveProperty('label');
      expect(getWeekLabel(w.id)).toBe(w.label);
    });
  });
});
