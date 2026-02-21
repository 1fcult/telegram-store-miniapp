import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../api'

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

            // Если нет Telegram WebApp и нет dev режима — реально открыт в браузере
            if (!tg && !isDev) {
                setAuthError('not_telegram')
                setIsLoading(false)
                return
            }

            // Пытаемся авторизоваться
            const res = await fetch(`${API_BASE}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            })

            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
                setAuthError(null)
                console.log('[AUTH] ✅ User:', data.user?.username, '| role:', data.user?.role)
                if (tg) {
                    tg.ready()
                    tg.expand()
                }
            } else {
                // Авторизация не прошла, но мы в Telegram — показываем ошибку
                console.error('[AUTH] ❌ Failed', res.status)
                setUser(null)
                setAuthError('failed')
            }
        } catch (error) {
            console.error('[AUTH] ❌ Network error:', error)
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
        isPresident: user?.role === 'PRESIDENT' || isDev,
        isAdmin: ['ADMIN', 'PRESIDENT'].includes(user?.role) || isDev,
        isCourier: ['COURIER', 'ADMIN', 'PRESIDENT'].includes(user?.role) || isDev,
        telegramId: user?.telegramId || '',
        balance: user?.balance ?? 0,
        assignedShopId: user?.assignedShopId ?? null,
        adminShopIds: user?.adminShops?.map(as => as.shopId) ?? [],
        refetchUser: authenticate
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
