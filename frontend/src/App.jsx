import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import CatalogPage from './pages/CatalogPage'
import AdminPage from './pages/AdminPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import CourierPage from './pages/CourierPage'
import { Shield, Loader2, Truck, Bot } from 'lucide-react'

function AppRoutes() {
  const { user, isLoading, isAdmin, isCourier, authError } = useAuth()

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
        <p className="text-slate-400 text-sm">Авторизация...</p>
      </div>
    )
  }

  // Если не Telegram или ошибка — показываем экран
  if (!user) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-5 animate-fade-in px-4 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(217,70,239,0.3))', border: '1px solid rgba(139,92,246,0.4)' }}>
          <Bot className="w-10 h-10 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Откройте через Telegram</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {authError === 'not_telegram'
              ? 'Это приложение работает только внутри Telegram. Откройте бота и нажмите кнопку «Открыть магазин».'
              : 'Не удалось авторизоваться. Попробуйте открыть магазин через бота ещё раз.'}
          </p>
        </div>
        <a
          href="https://t.me/antsocial_bot"
          className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
        >
          Открыть в Telegram
        </a>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route
        path="/admin"
        element={
          isAdmin
            ? <AdminPage />
            : <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
              <Shield className="w-12 h-12 text-orange-400" />
              <h2 className="text-xl font-bold text-slate-200">Только для администраторов</h2>
              <p className="text-slate-400 text-sm">У вас нет прав для доступа к этой странице.</p>
            </div>
        }
      />
      <Route
        path="/courier"
        element={
          isCourier
            ? <CourierPage />
            : <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
              <Truck className="w-12 h-12 text-violet-400" />
              <h2 className="text-xl font-bold text-slate-200">Только для курьеров</h2>
              <p className="text-slate-400 text-sm">У вас нет прав для доступа к этой странице.</p>
            </div>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen font-sans relative flex flex-col items-center py-8 px-4 sm:px-6 overflow-hidden bg-[#0a0f1c] text-slate-100 selection:bg-fuchsia-500/30">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
          <div className="w-full z-10">
            <AppRoutes />
          </div>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
