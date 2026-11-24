import { describe, expect, it } from 'vitest';
import filterByUsername from './filterByUsername';

const users = [{ username: 'alice' }, { username: 'bob' }];

describe('filterByUsername', () => {
  it('returns everything for an empty or whitespace query', () => {
    expect(filterByUsername(users, '')).toBe(users);
    expect(filterByUsername(users, '   ')).toBe(users);
  });

  it('matches case-insensitively', () => {
    expect(filterByUsername(users, 'BO')).toEqual([{ username: 'bob' }]);
  });

  it('returns [] when nothing matches', () => {
    expect(filterByUsername(users, 'zed')).toEqual([]);
  });
});
