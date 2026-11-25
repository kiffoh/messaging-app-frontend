import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api, onUnauthorized } from '../api';
import type { AuthContextValue, TokenClaims, User } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

/** The claims of a usable token, or null when it is missing, undecodable or expired. */
function readClaims(token: string | null): TokenClaims | null {
    if (!token) return null;
    try {
        const claims = jwtDecode<TokenClaims>(token);
        return claims.exp > Date.now() / 1000 ? claims : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('token');
        const claims = readClaims(token);

        if (token && !claims) localStorage.removeItem('token');

        if (!claims) {
            setLoading(false);
            return;
        }

        api.get<User>(`/users/${claims.id}`)
            .then(response => { if (!cancelled) setUser(response.data); })
            .catch(() => { /* a failed fetch counts as signed out */ })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, []);

    const signIn = useCallback((token: string, signedInUser: User) => {
        localStorage.setItem('token', token);
        setUser(signedInUser);
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
    }, []);

    useEffect(() => onUnauthorized(signOut), [signOut]);

    const value = useMemo(
        () => ({ user, loading, setUser, signIn, signOut }),
        [user, loading, signIn, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
