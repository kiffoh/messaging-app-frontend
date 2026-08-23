import type { User } from '../types';

/** Builds the default group name: "alice, bob & carol". */
function nameGroup(members: Pick<User, 'username'>[]): string {
  const groupUsernames = members.map((member) => member.username);
  return (
    groupUsernames.slice(0, groupUsernames.length - 1).join(', ') +
    ' & ' +
    groupUsernames.slice(groupUsernames.length - 1)
  );
}

export default nameGroup;
