import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { AuthProvider } from './AuthContext';
import useAuth from './useAuth';

vi.mock('axios');

const profile = { id: 7, username: 'kiff', photo: null, bio: 'hi', contacts: [] };

function makeToken(claims: object) {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.sig`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

let auth: ReturnType<typeof useAuth>;

function Probe() {
    auth = useAuth();
    return <p>{auth.loading ? 'loading' : auth.user ? `user:${auth.user.username}` : 'anonymous'}</p>;
}

function renderProvider() {
    return render(<AuthProvider><Probe /></AuthProvider>);
}

beforeEach(() => {
    localStorage.clear();
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: profile });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('AuthProvider', () => {
    it('loads the profile for a valid token and stops loading', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 }));
        renderProvider();

        expect(screen.getByText('loading')).toBeInTheDocument();
        expect(await screen.findByText('user:kiff')).toBeInTheDocument();
        expect(auth.user).toEqual(profile);
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/users/7/profile'));
    });

    it('signs out and removes an expired token', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() - 10 }));
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('signs out and removes a garbage token without throwing', async () => {
        localStorage.setItem('token', 'not-a-jwt');
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('treats a failed profile fetch as signed out', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 }));
        vi.mocked(axios.get).mockRejectedValue(new Error('network'));
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
    });

    it('is anonymous with no token', async () => {
        renderProvider();
        expect(await screen.findByText('anonymous')).toBeInTheDocument();
    });

    it('signIn stores the token and loads the user; signOut clears both', async () => {
        renderProvider();
        await screen.findByText('anonymous');

        await act(() => auth.signIn(makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 })));
        await waitFor(() => expect(auth.user).toEqual(profile));
        expect(localStorage.getItem('token')).not.toBeNull();

        const before = auth.signOut;
        act(() => auth.signOut());
        expect(auth.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(auth.signOut).toBe(before);
    });
});
