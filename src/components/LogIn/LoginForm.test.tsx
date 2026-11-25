import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { api, onUnauthorized } from '../../api';
import { AuthProvider } from '../../authentication/AuthContext';
import LogIn from './LoginForm';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });

async function submitWith(status: number, data: object) {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('x', 'ERR_BAD_REQUEST', config, null, { data, status, statusText: '', headers: {}, config });
    };
    render(<MemoryRouter><AuthProvider><LogIn /></AuthProvider></MemoryRouter>);
    // replaces the provider's sign-out handler so a stray call is observable
    const handler = vi.fn();
    onUnauthorized(handler);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'kiff');
    await userEvent.type(screen.getByPlaceholderText('*********'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));
    return handler;
}

describe('LogIn errors', () => {
    it('shows the invalid-credentials message on 401 without signing out', async () => {
        const handler = await submitWith(401, { message: 'nope' });
        expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
        expect(handler).not.toHaveBeenCalled();
    });

    it('shows the server message on 429', async () => {
        await submitWith(429, { message: 'Too many attempts, please try again later.' });
        expect(await screen.findByText('Too many attempts, please try again later.')).toBeInTheDocument();
    });
});
