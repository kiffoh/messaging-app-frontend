import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_SERVER_URL });

let unauthorizedHandler: (() => void) | null = null;

/** Registers the single handler run on a 401; the returned function unregisters it. */
export function onUnauthorized(handler: () => void): () => void {
    unauthorizedHandler = handler;
    return () => {
        if (unauthorizedHandler === handler) unauthorizedHandler = null;
    };
}

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        // A 401 from /auth/* is a wrong password, not an expired session.
        if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
            unauthorizedHandler?.();
        }
        return Promise.reject(error);
    }
);
