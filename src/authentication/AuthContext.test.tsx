import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { api } from '../api';
import { AuthProvider } from './AuthContext';
import useAuth from './useAuth';

const profile = { id: 7, username: 'kiff', photo: null, bio: 'hi', contacts: [] };

function makeToken(claims: object) {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.sig`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function stub401() {
    api.defaults.adapter = async config => {
        throw new AxiosError('x', 'ERR_BAD_REQUEST', config, null, { data: {}, status: 401, statusText: '', headers: {}, config });
    };
}

const originalAdapter = api.defaults.adapter;

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
    vi.spyOn(api, 'get').mockResolvedValue({ status: 200, data: profile });
});

afterEach(() => {
    vi.restoreAllMocks();
    api.defaults.adapter = originalAdapter;
});

describe('AuthProvider', () => {
    it('loads the profile for a valid token and stops loading', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 }));
        renderProvider();

        expect(screen.getByText('loading')).toBeInTheDocument();
        expect(await screen.findByText('user:kiff')).toBeInTheDocument();
        expect(auth.user).toEqual(profile);
        expect(api.get).toHaveBeenCalledWith('/users/7');
    });

    it('signs out and removes an expired token', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() - 10 }));
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('signs out and removes a garbage token without throwing', async () => {
        localStorage.setItem('token', 'not-a-jwt');
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('treats a failed profile fetch as signed out', async () => {
        localStorage.setItem('token', makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 }));
        vi.spyOn(api, 'get').mockRejectedValue(new Error('network'));
        renderProvider();

        expect(await screen.findByText('anonymous')).toBeInTheDocument();
    });

    it('is anonymous with no token', async () => {
        renderProvider();
        expect(await screen.findByText('anonymous')).toBeInTheDocument();
    });

    it('signIn stores the token and sets the user without fetching; signOut clears both', async () => {
        renderProvider();
        await screen.findByText('anonymous');

        act(() => auth.signIn('tok', profile));
        expect(auth.user).toEqual(profile);
        expect(localStorage.getItem('token')).toBe('tok');
        expect(api.get).not.toHaveBeenCalled();

        const before = auth.signOut;
        act(() => auth.signOut());
        expect(auth.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(auth.signOut).toBe(before);
    });

    it('signs out when the 401 handler fires', async () => {
        renderProvider();
        await screen.findByText('anonymous');
        act(() => auth.signIn('tok', profile));

        stub401();
        await expect(api.delete('/groups/1')).rejects.toBeTruthy();

        await waitFor(() => expect(auth.user).toBeNull());
        expect(localStorage.getItem('token')).toBeNull();
    });
});
