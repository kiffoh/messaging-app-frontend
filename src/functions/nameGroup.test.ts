import { describe, expect, it } from 'vitest';
import nameGroup from './nameGroup';

describe('nameGroup', () => {
  it('joins three members with commas and an ampersand', () => {
    expect(nameGroup([{ username: 'alice' }, { username: 'bob' }, { username: 'carol' }])).toBe('alice, bob & carol');
  });

  it('joins two members with an ampersand', () => {
    expect(nameGroup([{ username: 'alice' }, { username: 'bob' }])).toBe('alice & bob');
  });

  it('returns an empty string for no members', () => {
    expect(nameGroup([])).toBe('');
  });

  it('returns the username for a single member', () => {
    expect(nameGroup([{ username: 'alice' }])).toBe('alice');
  });
});
