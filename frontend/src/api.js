export const API_BASE = 'http://localhost:3000';

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
