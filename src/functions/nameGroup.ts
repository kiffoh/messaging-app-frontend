import type { User } from '../types';

/** Builds the default group name: "alice, bob & carol". */
function nameGroup(members: Pick<User, 'username'>[]): string {
  const usernames = members.map((member) => member.username);
  if (usernames.length < 2) return usernames[0] ?? '';
  return `${usernames.slice(0, -1).join(', ')} & ${usernames[usernames.length - 1]}`;
}

export default nameGroup;
