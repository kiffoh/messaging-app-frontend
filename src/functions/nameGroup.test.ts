import { describe, expect, it } from 'vitest';
import nameGroup from './nameGroup';

describe('nameGroup', () => {
  it('joins three members with commas and an ampersand', () => {
    expect(nameGroup([{ username: 'alice' }, { username: 'bob' }, { username: 'carol' }])).toBe('alice, bob & carol');
  });

  it('joins two members with an ampersand', () => {
    expect(nameGroup([{ username: 'alice' }, { username: 'bob' }])).toBe('alice & bob');
  });
});
