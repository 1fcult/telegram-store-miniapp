import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, XCircle, ShoppingBag, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_MAP = {
    PENDING: { label: 'Новый', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
    CONFIRMED: { label: 'Подтверждён', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: CheckCircle2 },
    DELIVERING: { label: 'Доставляется', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Truck },
    COMPLETED: { label: 'Завершён', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
    CANCELLED: { label: 'Отменён', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
}

const PAYMENT_LABELS = {
    CARD: '💳 Картой',
    CASH: '💵 При получении',
    BITCOIN: '₿ Bitcoin',
    TON: '💎 TON',
    ETHEREUM: '⟠ Ethereum',
}

const DELIVERY_LABELS = {
    COURIER: '🚗 Курьером',
    PICKUP: '🏪 Самовывоз',
    POST: '📦 Почтой',
}

export default function OrdersPage() {
    const { telegramId } = useAuth()
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState(null)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/orders`, {
                headers: { 'X-Telegram-Id': telegramId }
            })
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            }
        } catch (error) {
            console.error('Failed to fetch orders', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
                <div className="w-8 h-8 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Загрузка заказов...</p>
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
                <div className="p-4 rounded-2xl glass">
                    <ShoppingBag className="w-10 h-10 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-200">Заказов пока нет</h2>
                <p className="text-slate-500 text-sm text-center">Добавьте товары в корзину и оформите заказ</p>
                <Link
                    to="/"
                    className="mt-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl text-sm transition-all hover:from-violet-500 hover:to-fuchsia-500"
                >
                    Перейти в каталог
                </Link>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">

            {/* Header */}
            <div className="animate-fade-in flex items-center justify-between">
                <Link to="/" className="p-2 rounded-xl glass border-white/10 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400">
                            Мои заказы
                        </span>
                    </h1>
                </div>
                <span className="px-2.5 py-1 rounded-lg glass text-[11px] font-medium text-slate-400 border border-white/5">
                    {orders.length} шт.
                </span>
            </div>

            {/* Orders List */}
            <div className="flex flex-col gap-3">
                {orders.map((order, i) => {
                    const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING
                    const StatusIcon = statusInfo.icon
                    const isExpanded = expandedOrder === order.id

                    return (
                        <div
                            key={order.id}
                            className="glass rounded-[20px] overflow-hidden animate-fade-in opacity-0"
                            style={{ animationDelay: `${50 + i * 40}ms`, animationFillMode: 'forwards' }}
                        >
                            {/* Order header — clickable */}
                            <button
                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                            >
                                {/* Status icon */}
                                <div className={`p-2 rounded-xl border ${statusInfo.color}`}>
                                    <StatusIcon className="w-4 h-4" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-200 text-sm">Заказ #{order.id}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                        <span>{formatDate(order.createdAt)}</span>
                                        <span>•</span>
                                        <span>{order.items.length} {order.items.length === 1 ? 'товар' : order.items.length < 5 ? 'товара' : 'товаров'}</span>
                                    </div>
                                </div>

                                {/* Price + expand */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                        {order.total.toLocaleString('ru-RU')} ₽
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-slate-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="border-t border-white/5 p-4 space-y-3 animate-fade-in">
                                    {/* Items */}
                                    <div>
                                        <h4 className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-2">Товары</h4>
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 py-1.5">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800/80 overflow-hidden flex items-center justify-center border border-white/5 shrink-0">
                                                    {item.product.imageUrls ? (
                                                        <img src={item.product.imageUrls} alt={item.product.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-4 h-4 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm text-slate-300 truncate block">{item.product.title}</span>
                                                    <span className="text-[11px] text-slate-500">{item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽</span>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-200 shrink-0">
                                                    {(item.quantity * item.price).toLocaleString('ru-RU')} ₽
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Details grid */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                        <div className="glass rounded-xl p-2.5">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Оплата</span>
                                            <span className="text-xs text-slate-200 font-medium">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                                        </div>
                                        <div className="glass rounded-xl p-2.5">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Доставка</span>
                                            <span className="text-xs text-slate-200 font-medium">{DELIVERY_LABELS[order.deliveryMethod] || order.deliveryMethod}</span>
                                        </div>
                                        {order.address && (
                                            <div className="glass rounded-xl p-2.5 col-span-2">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Адрес</span>
                                                <span className="text-xs text-slate-200 font-medium">{order.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
