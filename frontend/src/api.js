export const API_BASE = import.meta.env.VITE_API_BASE || 'https://178-72-165-215.nip.io';

export const fetchWithAuth = async (url, options = {}) => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    const headers = new Headers(options.headers || {});

    if (initData) {
        headers.set('Authorization', `tma ${initData}`);
    }

    return fetch(url, {
        ...options,
        headers
    });
};
