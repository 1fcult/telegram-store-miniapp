import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE, fetchWithAuth } from '../api'

const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [authError, setAuthError] = useState(null)

    const authenticate = useCallback(async () => {
        try {
            const tg = window.Telegram?.WebApp
            const initData = tg?.initData || ''

            const isDev = import.meta.env.VITE_DEV_MODE === 'true'

            // В продакшене без Telegram initData — сразу ошибка
            if (!initData && !isDev) {
                console.warn('[AUTH] No initData — not running inside Telegram')
                setAuthError('not_telegram')
                setIsLoading(false)
                return
            }

            const res = await fetch(`${API_BASE}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            })

            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
                setAuthError(null)
                console.log('[AUTH] ✅ User authenticated:', data.user?.username, '| role:', data.user?.role)
                if (tg) {
                    tg.ready()
                    tg.expand()
                }
            } else {
                console.error('[AUTH] ❌ Authentication failed', res.status)
                setUser(null)
                setAuthError('failed')
            }
        } catch (error) {
            console.error('[AUTH] ❌ Error:', error)
            setUser(null)
            setAuthError('network')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        authenticate()
    }, [authenticate])

    const isDev = import.meta.env.VITE_DEV_MODE === 'true'

    const value = {
        user,
        isLoading,
        authError,
        isAdmin: user?.role === 'ADMIN' || isDev,
        isCourier: user?.role === 'COURIER' || user?.role === 'ADMIN' || isDev,
        telegramId: user?.telegramId || '',
        balance: user?.balance ?? 0,
        refetchUser: authenticate
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
