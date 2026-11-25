import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../authentication/AuthContext';
import UserProfile from './UserProfile';
import type { AuthContextValue, User } from '../../types';

vi.mock('axios');
vi.mock('../../api', () => ({ api: {}, onUnauthorized: () => () => {} }));const mocked = vi.mocked(axios, true);

const me: User = { id: 1, username: 'alice', photo: null, bio: 'hello there', createdAtTime: '10:00', createdAtDate: '1 Jan' };
const other: User = { id: 2, username: 'bob', photo: null, bio: 'bob bio', createdAtTime: '10:00', createdAtDate: '1 Jan' };

function renderProfile(id: number, group = false) {
    const auth: AuthContextValue = { user: me, loading: false, setUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
    render(
        <AuthContext.Provider value={auth}>
            <MemoryRouter>
                <UserProfile id={id} group={group} />
            </MemoryRouter>
        </AuthContext.Provider>
    );
    return auth;
}

beforeEach(() => {
    vi.resetAllMocks();
    mocked.get.mockImplementation(async (url: string) => {
        if (url.endsWith('/users/usernames')) return { status: 200, data: [{ id: 1, username: 'alice', photo: null }, { id: 2, username: 'bob', photo: null }] };
        return { status: 200, data: other };
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('UserProfile', () => {
    it('shows edit icons on your own profile', async () => {
        renderProfile(1);
        expect(await screen.findByText('hello there')).toBeInTheDocument();
        expect(screen.getAllByAltText('Edit logo')).toHaveLength(3);
    });

    it("hides edit icons on someone else's profile", async () => {
        renderProfile(2);
        expect(await screen.findByText('bob bio')).toBeInTheDocument();
        expect(screen.queryAllByAltText('Edit logo')).toHaveLength(0);
    });

    it('restores the original bio on cancel', async () => {
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[2]);
        await userEvent.clear(screen.getByRole('textbox'));
        await userEvent.type(screen.getByRole('textbox'), 'changed');
        await userEvent.click(screen.getByText('Cancel'));
        expect(screen.getByText('hello there')).toBeInTheDocument();
    });

    it('PUTs only the changed field as FormData on save', async () => {
        mocked.put.mockResolvedValue({ status: 200, data: { ...me, bio: 'new bio' } });
        const auth = renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[2]);
        await userEvent.clear(screen.getByRole('textbox'));
        await userEvent.type(screen.getByRole('textbox'), 'new bio');
        await userEvent.click(screen.getByText('Save'));

        await waitFor(() => expect(mocked.put).toHaveBeenCalledTimes(1));
        const body = mocked.put.mock.calls[0][1] as FormData;
        expect(body).toBeInstanceOf(FormData);
        expect(body.get('bio')).toBe('new bio');
        expect(body.has('username')).toBe(false);
        expect(body.has('photo')).toBe(false);
        expect(mocked.put.mock.calls[0][2]).toBeUndefined();
        await waitFor(() => expect(auth.setUser).toHaveBeenCalled());
        expect(await screen.findByText('new bio')).toBeInTheDocument();
    });

    it('sends a chosen photo as a File under "photo"', async () => {
        mocked.put.mockResolvedValue({ status: 200, data: { ...me, photo: 'https://x/p.png' } });
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        const file = new File(['x'], 'p.png', { type: 'image/png' });
        await userEvent.upload(document.querySelector('input[type=file]') as HTMLInputElement, file);
        await userEvent.click(screen.getByText('Save'));
        await waitFor(() => expect(mocked.put).toHaveBeenCalled());
        expect((mocked.put.mock.calls[0][1] as FormData).get('photo')).toBeInstanceOf(File);
    });

    it('saves other edits when the photo editor is open but no file was chosen', async () => {
        mocked.put.mockResolvedValue({ status: 200, data: { ...me, bio: 'new bio' } });
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getByText('Save'));
        expect(screen.queryByText('Profile picture cannot be empty.')).not.toBeInTheDocument();
        expect(mocked.put).not.toHaveBeenCalled();
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('signs out after deleting your own profile', async () => {
        mocked.delete.mockResolvedValue({ status: 200 });
        const auth = renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getByText('Delete profile'));
        await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    });

    it('rejects a taken username even when the draft matches a listed name', async () => {
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[1]);
        await userEvent.clear(screen.getAllByRole('textbox')[0]);
        await userEvent.type(screen.getAllByRole('textbox')[0], 'bob');
        await userEvent.click(screen.getByText('Save'));
        expect(await screen.findByText('Username is taken.')).toBeInTheDocument();
        expect(mocked.put).not.toHaveBeenCalled();
    });

    it('never uses the cached user on a group route with the same id', async () => {
        mocked.get.mockImplementation(async () => ({
            status: 200,
            data: { id: 1, name: 'Crew', photo: '', bio: 'group bio', directMsg: false, members: [me, other], admins: [other], messages: [] },
        }));
        renderProfile(1, true);
        expect(await screen.findByText('group bio')).toBeInTheDocument();
        expect(mocked.get.mock.calls[0][0]).toContain('/groups/1/profile');
        expect(screen.queryAllByAltText('Edit logo')).toHaveLength(0);
    });
});
