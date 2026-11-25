import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../api';
import AuthContext from '../../authentication/AuthContext';
import UserProfile from './UserProfile';
import type { AuthContextValue, User } from '../../types';


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
    vi.restoreAllMocks();
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
        if (url === '/users') return { status: 200, data: [{ id: 1, username: 'alice', photo: null }, { id: 2, username: 'bob', photo: null }] };
        return { status: 200, data: other };
    });
    vi.spyOn(api, 'put');
    vi.spyOn(api, 'delete');
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
        vi.mocked(api.put).mockResolvedValue({ status: 200, data: { ...me, bio: 'new bio' } });
        const auth = renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[2]);
        await userEvent.clear(screen.getByRole('textbox'));
        await userEvent.type(screen.getByRole('textbox'), 'new bio');
        await userEvent.click(screen.getByText('Save'));

        await waitFor(() => expect(vi.mocked(api.put)).toHaveBeenCalledTimes(1));
        const body = vi.mocked(api.put).mock.calls[0][1] as FormData;
        expect(body).toBeInstanceOf(FormData);
        expect(body.get('bio')).toBe('new bio');
        expect(body.has('username')).toBe(false);
        expect(body.has('photo')).toBe(false);
        expect(vi.mocked(api.put).mock.calls[0][0]).toBe('/users/1');
        expect(vi.mocked(api.put).mock.calls[0][2]).toBeUndefined();
        await waitFor(() => expect(auth.setUser).toHaveBeenCalled());
        expect(await screen.findByText('new bio')).toBeInTheDocument();
    });

    it('sends a chosen photo as a File under "photo"', async () => {
        vi.mocked(api.put).mockResolvedValue({ status: 200, data: { ...me, photo: 'https://x/p.png' } });
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        const file = new File(['x'], 'p.png', { type: 'image/png' });
        await userEvent.upload(document.querySelector('input[type=file]') as HTMLInputElement, file);
        await userEvent.click(screen.getByText('Save'));
        await waitFor(() => expect(vi.mocked(api.put)).toHaveBeenCalled());
        expect((vi.mocked(api.put).mock.calls[0][1] as FormData).get('photo')).toBeInstanceOf(File);
    });

    it('saves other edits when the photo editor is open but no file was chosen', async () => {
        vi.mocked(api.put).mockResolvedValue({ status: 200, data: { ...me, bio: 'new bio' } });
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getByText('Save'));
        expect(screen.queryByText('Profile picture cannot be empty.')).not.toBeInTheDocument();
        expect(vi.mocked(api.put)).not.toHaveBeenCalled();
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('signs out after deleting your own profile', async () => {
        vi.mocked(api.delete).mockResolvedValue({ status: 204 });
        const auth = renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[0]);
        await userEvent.click(screen.getByText('Delete profile'));
        await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
        expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/users/1');
    });

    it('rejects a taken username even when the draft matches a listed name', async () => {
        renderProfile(1);
        await screen.findByText('hello there');
        await userEvent.click(screen.getAllByAltText('Edit logo')[1]);
        await userEvent.clear(screen.getAllByRole('textbox')[0]);
        await userEvent.type(screen.getAllByRole('textbox')[0], 'bob');
        await userEvent.click(screen.getByText('Save'));
        expect(await screen.findByText('Username is taken.')).toBeInTheDocument();
        expect(vi.mocked(api.put)).not.toHaveBeenCalled();
    });

    it('never uses the cached user on a group route with the same id', async () => {
        vi.mocked(api.get).mockImplementation(async () => ({
            status: 200,
            data: { id: 1, name: 'Crew', photo: '', bio: 'group bio', directMsg: false, members: [me, other], admins: [other], messages: [] },
        }));
        renderProfile(1, true);
        expect(await screen.findByText('group bio')).toBeInTheDocument();
        expect(vi.mocked(api.get).mock.calls[0][0]).toBe('/groups/1');
        expect(screen.queryAllByAltText('Edit logo')).toHaveLength(0);
    });

    it('shows a membership message when a group GET is forbidden', async () => {
        vi.mocked(api.get).mockImplementation(async (url: string) => {
            if (url === '/users') return { status: 200, data: [] };
            throw Object.assign(new Error('x'), { isAxiosError: true, response: { status: 403, data: {} } });
        });
        renderProfile(5, true);
        expect(await screen.findByText('You are not a member of this group.')).toBeInTheDocument();
    });

    it('saves a null bio untouched without sending bio or showing an error', async () => {
        vi.mocked(api.get).mockImplementation(async (url: string) => (
            { status: 200, data: url === '/users' ? [] : { id: 9, name: 'Crew', photo: '', bio: null, directMsg: false, members: [me, other], admins: [me], messages: [] } }
        ));
        renderProfile(9, true);
        await screen.findByText('Crew');
        await userEvent.click(screen.getAllByAltText('Edit logo')[2]);
        await userEvent.click(screen.getByText('Save'));
        expect(screen.queryByText('Bio cannot be empty.')).not.toBeInTheDocument();
        expect(api.put).not.toHaveBeenCalled();
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('hides the default-name line for groups named after the other members', async () => {
        vi.mocked(api.get).mockImplementation(async () => ({
            status: 200,
            data: { id: 9, name: 'bob', photo: '', bio: null, directMsg: false, members: [me, other], admins: [], messages: [] },
        }));
        renderProfile(9, true);
        await screen.findByText('bob');
        expect(screen.getAllByText('bob')).toHaveLength(1);
        expect(screen.queryByText('alice & bob')).not.toBeInTheDocument();
    });
});
