// AuthContext.tsx
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'react-router-dom';
import type { AuthContextValue, AuthUser, TokenClaims } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const location = useLocation();

    // TODO(refactor F15/F16): when does this effect run, and what does it set `user` to?
    // Now find the other places in the app that call setUser. Do they agree?
    useEffect(() => {
        const checkUserValidity = () => {
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    const decodedToken = jwtDecode<TokenClaims>(token);
                    const currentTime = Date.now() / 1000; // Current time in seconds

                    // Check if the token has expired
                    if (decodedToken.exp < currentTime) {
                        // Token expired
                        localStorage.removeItem('token');
                        setUser(null);
                    } else {
                        // Token is valid
                        setUser(decodedToken);
                    }
                } catch (error) {
                    console.error('Error decoding token:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
        }
        checkUserValidity();
    }, [location]);

    // Sign out function
    const signOut = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // TODO(refactor F10): UserProfile lists this function in a dependency array. Is it the
    // same value on every render of this provider? What follows from that?
    const checkTokenValidity = (): boolean => {
        const token = localStorage.getItem('token');

        if (token) { // Need to check if token still valid
            const decodedToken = jwtDecode<TokenClaims>(token);
            const currentTime = Date.now() / 1000; // Current time in seconds

            // Check if the token has expired
            if (decodedToken.exp < currentTime) {
                // Token expired
                localStorage.removeItem('token');
                return false
            } else {
                // Token is valid
                return true
            }
        } else {
            // No token means user not signed in
            return false
        }
    }

    return (
        <AuthContext.Provider value={{ user, setUser, signOut, checkTokenValidity }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
