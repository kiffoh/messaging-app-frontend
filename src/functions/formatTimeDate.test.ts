import { describe, expect, it } from 'vitest';
import formatDateTime from './formatTimeDate';

describe('formatDateTime', () => {
  it('formats an ISO string as UTC DD-MM-YYYY and HH:MM', () => {
    expect(formatDateTime('2024-03-05T09:07:00Z')).toEqual({ date: '05-03-2024', time: '09:07' });
  });
});
