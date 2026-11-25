import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { api, onUnauthorized } from './api';

const originalAdapter = api.defaults.adapter;

function stub(status: number) {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const response = { data: {}, status, statusText: '', headers: {}, config };
        if (status >= 400) {
            throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response);
        }
        return response;
    });
    api.defaults.adapter = adapter;
    return adapter;
}

beforeEach(() => localStorage.clear());
afterEach(() => { api.defaults.adapter = originalAdapter; });

describe('api', () => {
    it('sends the stored token as a bearer header', async () => {
        const adapter = stub(200);
        localStorage.setItem('token', 'abc');
        await api.get('/groups');
        expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer abc');
    });

    it('sends no Authorization header without a token', async () => {
        const adapter = stub(200);
        await api.get('/groups');
        expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBeFalsy();
    });

    it('calls the handler once on a 401 and still rejects', async () => {
        stub(401);
        const handler = vi.fn();
        const off = onUnauthorized(handler);
        await expect(api.get('/groups')).rejects.toBeInstanceOf(AxiosError);
        expect(handler).toHaveBeenCalledTimes(1);
        off();
    });

    it('ignores a 401 from /auth/login', async () => {
        stub(401);
        const handler = vi.fn();
        const off = onUnauthorized(handler);
        await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
        expect(handler).not.toHaveBeenCalled();
        off();
    });

    it('does not call an unregistered handler', async () => {
        stub(401);
        const handler = vi.fn();
        onUnauthorized(handler)();
        await expect(api.get('/groups')).rejects.toBeInstanceOf(AxiosError);
        expect(handler).not.toHaveBeenCalled();
    });

    it('a stale unregister does not clear a newer handler', async () => {
        stub(401);
        const first = vi.fn();
        const second = vi.fn();
        const offFirst = onUnauthorized(first);
        const offSecond = onUnauthorized(second);
        offFirst();
        await expect(api.get('/groups')).rejects.toBeInstanceOf(AxiosError);
        expect(second).toHaveBeenCalledTimes(1);
        offSecond();
    });
});
