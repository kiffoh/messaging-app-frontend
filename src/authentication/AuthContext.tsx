import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import type { AuthContextValue, TokenClaims, User } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

const backendURL = import.meta.env.VITE_SERVER_URL;

async function fetchProfile(id: number): Promise<User> {
    const response = await axios.get<User>(`${backendURL}/users/${id}/profile`);
    return response.data;
}

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

        fetchProfile(claims.id)
            .then(profile => { if (!cancelled) setUser(profile); })
            .catch(() => { /* a failed fetch counts as signed out */ })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, []);

    const signIn = useCallback(async (token: string) => {
        const claims = readClaims(token);
        if (!claims) throw new Error('Received an invalid token.');
        const profile = await fetchProfile(claims.id);
        localStorage.setItem('token', token);
        setUser(profile);
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, setUser, signIn, signOut }),
        [user, loading, signIn, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
