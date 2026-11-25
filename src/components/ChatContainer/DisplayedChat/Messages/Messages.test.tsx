import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AuthContext from '../../../../authentication/AuthContext';
import Messages from './Messages';
import type { AuthContextValue, Chat, User } from '../../../../types';

// Messages reads the variable at import time, and .env may not define it (CI).
vi.hoisted(() => vi.stubEnv('VITE_DEFAULT_PICTURE', '/default.png'));

const me: User = { id: 1, username: 'alice', photo: null, bio: null };
const auth: AuthContextValue = { user: me, loading: false, setUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };

const chat: Chat = {
    id: 1, name: 'c', photo: '', bio: null, directMsg: false, members: [me], admins: [],
    messages: [{
        id: 1, groupId: 1, content: null, authorId: null, photoUrl: null,
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }],
};

function Where() {
    return <p data-testid="where">{useLocation().pathname}</p>;
}

describe('Messages', () => {
    it('renders a message whose author was deleted with the default avatar and no profile link', async () => {
        render(
            <AuthContext.Provider value={auth}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes><Route path="*" element={<><Messages displayedChat={chat} setError={vi.fn()} /><Where /></>} /></Routes>
                </MemoryRouter>
            </AuthContext.Provider>,
        );
        const avatar = screen.getByAltText('recipient-photo');
        expect(avatar).toHaveAttribute('src', '/default.png');
        await userEvent.click(avatar);
        expect(screen.getByTestId('where').textContent).toBe('/');
    });
});
