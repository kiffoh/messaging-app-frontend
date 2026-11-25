import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { api } from '../../api';
import { AuthProvider } from '../../authentication/AuthContext';
import SignUpForm from './SignUpForm';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });

describe('SignUp errors', () => {
    it('shows the server message on 429', async () => {
        api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
            throw new AxiosError('x', 'ERR_BAD_REQUEST', config, null, {
                data: { message: 'Too many sign-ups, slow down.' }, status: 429, statusText: '', headers: {}, config,
            });
        };
        render(<MemoryRouter><AuthProvider><SignUpForm /></AuthProvider></MemoryRouter>);
        await userEvent.type(screen.getByPlaceholderText('Username'), 'kiff');
        await userEvent.type(screen.getByPlaceholderText('*********'), 'pw');
        await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(await screen.findByText('Too many sign-ups, slow down.')).toBeInTheDocument();
    });
});
