import type { AuthUser, User } from '../types';

/** Narrows the AuthUser union to the branch that carries contacts. Goes away with the union. */
export function contactsOf(user: AuthUser): User[] {
    return 'contacts' in user && user.contacts ? user.contacts : [];
}
