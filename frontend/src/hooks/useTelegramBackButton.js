import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useTelegramBackButton() {
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const tg = window.Telegram?.WebApp
        if (!tg) return

        const handleBack = () => {
            navigate(-1)
        }

        // Если мы на главной (Каталог), скрываем кнопку. Иначе показываем.
        if (location.pathname === '/') {
            tg.BackButton.hide()
        } else {
            tg.BackButton.show()
        }

        tg.BackButton.onClick(handleBack)

        return () => {
            tg.BackButton.offClick(handleBack)
            tg.BackButton.hide()
        }
    }, [navigate, location.pathname])
}
