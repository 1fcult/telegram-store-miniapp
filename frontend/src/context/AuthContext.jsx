import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE, fetchWithAuth } from '../api'

const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        authenticate()
    }, [])

    const authenticate = async () => {
        try {
            // Получаем initData из Telegram WebApp (если запущено из Telegram)
            const tg = window.Telegram?.WebApp
            const initData = tg?.initData || ''

            const res = await fetchWithAuth(`${API_BASE}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            })

            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
                console.log('[AUTH] User authenticated:', data.user)

                // Сообщаем Telegram что приложение готово
                if (tg) {
                    tg.ready()
                    tg.expand()
                }
            } else {
                console.error('[AUTH] Authentication failed')
                setUser(null)
            }
        } catch (error) {
            console.error('[AUTH] Error:', error)
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    const isDev = import.meta.env.VITE_DEV_MODE === 'true';

    const value = {
        user,
        isLoading,
        // Временно даем права всем залогиненным пользователям для тестов в Telegram
        isAdmin: true,
        isCourier: true,
        telegramId: user?.telegramId || ''
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
