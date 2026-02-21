import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Truck, CheckCircle2, Navigation, PackageOpen, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_MAP = {
    PENDING: { label: 'Новый заказ', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    CONFIRMED: { label: 'Ожидает курьера', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    DELIVERING: { label: 'В пути', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    COMPLETED: { label: 'Доставлен', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

const PAYMENT_LABELS = {
    CARD: 'Картой онлайн',
    CASH: 'Наличными при получении',
    BITCOIN: 'Bitcoin',
    TON: 'TON',
    ETHEREUM: 'Ethereum',
}

export default function CourierPage() {
    const { telegramId } = useAuth()
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        fetchCourierOrders()
    }, [])

    const fetchCourierOrders = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/courier/orders`, {
                headers: { 'X-Telegram-Id': telegramId }
            })
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            }
        } catch (error) {
            console.error('Failed to fetch courier orders', error)
        } finally {
            setIsLoading(false)
        }
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        if (isUpdating) return
        setIsUpdating(true)
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/courier/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Id': telegramId
                },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                // Мягко обновляем локальный стейт, чтобы меню не схлопывалось с ошибками
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

                // Если заказ завершен, закрываем расширенную панель
                if (newStatus === 'COMPLETED') {
                    setExpandedOrder(null);
                }

                // Фоново подтягиваем свежие данные
                fetchCourierOrders();
            } else {
                alert('Ошибка при обновлении статуса')
            }
        } catch (error) {
            console.error('Network error', error)
        } finally {
            setIsUpdating(false)
        }
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleString('ru-RU', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
        })
    }

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
                <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Загрузка заказов...</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="animate-fade-in flex items-center justify-between">
                <Link to="/" className="p-2 rounded-xl glass border-white/10 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400">
                            Панель курьера
                        </span>
                    </h1>
                </div>
                <div className="w-9" />
            </div>

            {/* Orders list */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center py-10 glass rounded-[20px] border-dashed border-2 border-white/5">
                    <Truck className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-slate-400">Нет доступных заказов для доставки.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {orders.map((order, i) => {
                        const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.CONFIRMED
                        const isExpanded = expandedOrder === order.id

                        // Собираем уникальные магазины для точек самовывоза
                        const shopsMap = {}
                        if (order.items && Array.isArray(order.items)) {
                            order.items.forEach(item => {
                                if (item.product && item.product.shop) {
                                    shopsMap[item.product.shop.id] = item.product.shop
                                }
                            })
                        }
                        const pickupShops = Object.values(shopsMap)

                        return (
                            <div
                                key={order.id}
                                className="glass rounded-[20px] overflow-hidden animate-fade-in opacity-0 flex flex-col"
                                style={{ animationDelay: `${100 + i * 40}ms`, animationFillMode: 'forwards' }}
                            >
                                {/* Header Card */}
                                <div
                                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${statusInfo.color}`}>
                                        <PackageOpen className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-200 text-base">Заказ #{order.id}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                                            <span>Оформлен: {formatDate(order.createdAt)}</span>
                                            {order.address && (
                                                <span className="truncate text-slate-300">Куда: {order.address}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                            {order.total.toLocaleString('ru-RU')} ₽
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-slate-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-500" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 bg-black/40 p-5 flex flex-col gap-6">

                                        {/* Маршрут */}
                                        <div className="flex flex-col gap-4 relative">
                                            {/* Вертикальная линия маршрута */}
                                            <div className="absolute left-4 top-5 bottom-5 w-px bg-gradient-to-b from-fuchsia-500/50 to-violet-500/50" />

                                            {/* Откуда забрать */}
                                            <div className="flex gap-4 relative z-10">
                                                <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.3)] border border-fuchsia-500/50 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-4 h-4 text-fuchsia-400" />
                                                </div>
                                                <div className="flex-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-fuchsia-400 uppercase font-bold tracking-wider mb-1 block">Откуда забрать:</span>
                                                    {pickupShops.length > 0 ? (
                                                        <div className="flex flex-col gap-2 relative">
                                                            {pickupShops.map(shop => (
                                                                <div key={shop.id} className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                                                                    {shop.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-medium text-slate-200">Главный склад</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Куда доставить */}
                                            <div className="flex gap-4 relative z-10">
                                                <div className="w-8 h-8 rounded-full bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-500/50 flex items-center justify-center shrink-0">
                                                    <Navigation className="w-4 h-4 text-violet-400" />
                                                </div>
                                                <div className="flex-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider mb-1 block">Куда доставить:</span>
                                                    <p className="text-sm font-medium text-slate-200 leading-relaxed">
                                                        {order.address || 'Адрес не указан (Самовывоз?)'}
                                                    </p>
                                                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-semibold text-slate-400">Клиент:</span>
                                                            <span className="text-xs text-slate-200">{order.user?.name || 'Без имени'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-semibold text-slate-400">Оплата:</span>
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                                                                <CreditCard className="w-3 h-3 text-emerald-400" />
                                                                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Товары */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Состав заказа</h4>
                                            <div className="flex flex-col gap-2">
                                                {order.items?.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                                        <div className="w-10 h-10 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center shrink-0">
                                                            {item.product?.imageUrls ? (
                                                                <img src={item.product.imageUrls} alt="Product" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <PackageOpen className="w-4 h-4 text-slate-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col">
                                                            <span className="text-xs font-medium text-slate-200 truncate">{item.product?.title || 'Неизвестный товар'}</span>
                                                            <span className="text-[10px] text-slate-500">{item.quantity} шт. × {(item.price || 0).toLocaleString('ru-RU')} ₽</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-300 pr-2">
                                                            {((item.quantity || 0) * (item.price || 0)).toLocaleString('ru-RU')} ₽
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Действия */}
                                        <div className="pt-2 flex gap-3">
                                            {order.status === 'PENDING' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'CONFIRMED'); }}
                                                    disabled={isUpdating}
                                                    className="flex-1 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl shadow-[0_3px_15px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Принять заказ
                                                </button>
                                            )}
                                            {order.status === 'CONFIRMED' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'DELIVERING'); }}
                                                    disabled={isUpdating}
                                                    className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm rounded-xl shadow-[0_3px_20px_rgba(168,85,247,0.4)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                                >
                                                    {isUpdating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Truck className="w-5 h-5" />}
                                                    Забрать заказ
                                                </button>
                                            )}
                                            {order.status === 'DELIVERING' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'COMPLETED'); }}
                                                    disabled={isUpdating}
                                                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm rounded-xl shadow-[0_3px_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Заказ доставлен
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
