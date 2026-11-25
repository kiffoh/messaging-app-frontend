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

    it('signIn stores the token, fetches the full profile with it, then sets the user', async () => {
        const token = makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 });
        let authorization: unknown;
        api.defaults.adapter = async config => {
            authorization = config.headers.get('Authorization');
            return { data: { ...profile, contacts: [{ id: 2, username: 'bob' }] }, status: 200, statusText: 'OK', headers: {}, config };
        };
        vi.mocked(api.get).mockRestore();
        renderProvider();
        await screen.findByText('anonymous');

        await act(() => auth.signIn(token));
        expect(authorization).toBe(`Bearer ${token}`);
        expect(auth.user?.contacts).toHaveLength(1);
        expect(localStorage.getItem('token')).toBe(token);

        const before = auth.signOut;
        act(() => auth.signOut());
        expect(auth.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(auth.signOut).toBe(before);
    });

    it('signIn rejects and removes the token when the profile fetch fails', async () => {
        renderProvider();
        await screen.findByText('anonymous');
        vi.spyOn(api, 'get').mockRejectedValue(new Error('network'));

        const token = makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 });
        await expect(act(() => auth.signIn(token))).rejects.toThrow('network');
        expect(localStorage.getItem('token')).toBeNull();
        expect(auth.user).toBeNull();
    });

    it('signIn rejects an invalid token before storing it', async () => {
        renderProvider();
        await screen.findByText('anonymous');

        await expect(act(() => auth.signIn('garbage'))).rejects.toThrow();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('signs out when the 401 handler fires', async () => {
        renderProvider();
        await screen.findByText('anonymous');
        await act(() => auth.signIn(makeToken({ id: 7, username: 'kiff', photo: null, exp: nowSeconds() + 3600 })));

        stub401();
        await expect(api.delete('/groups/1')).rejects.toBeTruthy();

        await waitFor(() => expect(auth.user).toBeNull());
        expect(localStorage.getItem('token')).toBeNull();
    });
});
