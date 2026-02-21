import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Banknote, Bitcoin, Gem, Hexagon, Truck, Store, Package, MapPin, CheckCircle2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { API_BASE, fetchWithAuth } from '../api'

const PAYMENT_METHODS = [
    { id: 'CARD', label: 'Картой', sublabel: 'Telegram Payments', icon: CreditCard, color: 'from-blue-500 to-cyan-500' },
    { id: 'CASH', label: 'При получении', sublabel: 'Наличные', icon: Banknote, color: 'from-green-500 to-emerald-500' },
    { id: 'BITCOIN', label: 'Bitcoin', sublabel: 'BTC', icon: Bitcoin, color: 'from-orange-500 to-amber-500' },
    { id: 'TON', label: 'TON', sublabel: 'Toncoin', icon: Gem, color: 'from-blue-400 to-sky-400' },
    { id: 'ETHEREUM', label: 'Ethereum', sublabel: 'ETH', icon: Hexagon, color: 'from-indigo-500 to-violet-500' },
]

const DELIVERY_METHODS = [
    { id: 'COURIER', label: 'Курьером', sublabel: 'Доставка до двери', icon: Truck, needsAddress: true },
    { id: 'PICKUP', label: 'Самовывоз', sublabel: 'Заберу сам', icon: Store, needsAddress: true },
    { id: 'POST', label: 'Почтой', sublabel: 'Почта России', icon: Package, needsAddress: true },
]

const CRYPTO_WALLETS = {
    BITCOIN: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    TON: 'EQBqGXhEsNrjL9hd9HvWm2aoX9b_Vqjw_sCR6Rh-vYeT7gAa',
    ETHEREUM: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
}

export default function CheckoutPage() {
    const navigate = useNavigate()
    const { items, totalPrice, clearCart } = useCart()
    const { telegramId } = useAuth()

    const [paymentMethod, setPaymentMethod] = useState('')
    const [deliveryMethod, setDeliveryMethod] = useState('')
    const [address, setAddress] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState(null) // null or order object

    if (items.length === 0 && !orderSuccess) {
        navigate('/cart')
        return null
    }

    const selectedDelivery = DELIVERY_METHODS.find(d => d.id === deliveryMethod)
    const isCrypto = ['BITCOIN', 'TON', 'ETHEREUM'].includes(paymentMethod)
    const isCashDisabled = deliveryMethod && deliveryMethod !== 'PICKUP'
    const canSubmit = paymentMethod && deliveryMethod && (!selectedDelivery?.needsAddress || address.trim())

    // Сброс оплаты если выбрали наличные, а потом сменили доставку на не-самовывоз
    const handleDeliveryChange = (id) => {
        setDeliveryMethod(id)
        if (paymentMethod === 'CASH' && id !== 'PICKUP') {
            setPaymentMethod('')
        }
    }

    const handleSubmit = async () => {
        if (!canSubmit) return
        setIsSubmitting(true)

        try {
            const res = await fetchWithAuth(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Id': telegramId
                },
                body: JSON.stringify({
                    items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
                    paymentMethod,
                    deliveryMethod,
                    address: address.trim() || null
                })
            })

            if (res.ok) {
                const order = await res.json()
                setOrderSuccess(order)
                clearCart()
            } else {
                const err = await res.json()
                alert(err.error || 'Ошибка оформления заказа')
            }
        } catch (error) {
            alert(`Сетевая ошибка: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // ===== SUCCESS SCREEN =====
    if (orderSuccess) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-5 animate-fade-in">
                <div className="p-5 rounded-3xl bg-green-500/10 border border-green-500/20 animate-slide-up">
                    <CheckCircle2 className="w-14 h-14 text-green-400" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-100">Заказ оформлен!</h1>
                <p className="text-slate-400 text-sm text-center max-w-xs">
                    Заказ #{orderSuccess.id} создан. {deliveryMethod === 'PICKUP' ? 'Ожидайте уведомления о готовности к выдаче.' : 'Мы свяжемся с вами для подтверждения.'}
                </p>

                <div className="glass rounded-[20px] p-4 w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                        <span>Заказ</span>
                        <span className="text-slate-200 font-bold">#{orderSuccess.id}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Сумма</span>
                        <span className="text-slate-200 font-bold">{orderSuccess.total.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Оплата</span>
                        <span className="text-slate-200">{PAYMENT_METHODS.find(p => p.id === orderSuccess.paymentMethod)?.label}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Доставка</span>
                        <span className="text-slate-200">{DELIVERY_METHODS.find(d => d.id === orderSuccess.deliveryMethod)?.label}</span>
                    </div>
                    {orderSuccess.address && (
                        <div className="flex justify-between text-slate-400">
                            <span>Адрес</span>
                            <span className="text-slate-200 text-right max-w-[60%]">{orderSuccess.address}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-2">
                    <Link
                        to="/"
                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl text-sm transition-all hover:from-violet-500 hover:to-fuchsia-500"
                    >
                        В каталог
                    </Link>
                </div>
            </div>
        )
    }

    // ===== CHECKOUT FORM =====
    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">

            {/* Header */}
            <div className="animate-fade-in flex items-center justify-between">
                <Link to="/cart" className="p-2 rounded-xl glass border-white/10 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400">
                            Оформление
                        </span>
                    </h1>
                </div>
                <div className="w-9" />
            </div>

            {/* Order Summary */}
            <div className="glass rounded-[20px] p-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
                <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">Ваш заказ</h3>
                {items.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-slate-300 truncate flex-1">{item.product.title} × {item.quantity}</span>
                        <span className="text-slate-200 font-semibold ml-3">{(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
                    </div>
                ))}
                <div className="border-t border-white/5 mt-2 pt-2 flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-semibold">Итого</span>
                    <span className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        {totalPrice.toLocaleString('ru-RU')} ₽
                    </span>
                </div>
            </div>

            {/* Payment Method */}
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 ml-1">Способ оплаты</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(pm => {
                        const disabled = pm.id === 'CASH' && isCashDisabled
                        return (
                            <button
                                key={pm.id}
                                onClick={() => !disabled && setPaymentMethod(pm.id)}
                                disabled={disabled}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-[16px] border transition-all duration-200 ${disabled
                                    ? 'opacity-30 cursor-not-allowed glass border-white/5 text-slate-600'
                                    : paymentMethod === pm.id
                                        ? `bg-gradient-to-br ${pm.color} border-transparent text-white shadow-lg`
                                        : 'glass border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                    }`}
                            >
                                <pm.icon className="w-5 h-5" />
                                <span className="text-xs font-semibold">{pm.label}</span>
                                <span className={`text-[9px] ${disabled ? 'text-slate-700' : paymentMethod === pm.id ? 'text-white/70' : 'text-slate-600'}`}>
                                    {disabled ? 'Только самовывоз' : pm.sublabel}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Crypto Wallet Info */}
            {isCrypto && (
                <div className="glass rounded-[20px] p-4 animate-fade-in border border-amber-500/20">
                    <h3 className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-2">Адрес кошелька {paymentMethod}</h3>
                    <div className="bg-black/30 rounded-xl p-3 break-all text-xs text-slate-300 font-mono select-all">
                        {CRYPTO_WALLETS[paymentMethod]}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Переведите {totalPrice.toLocaleString('ru-RU')} ₽ в эквиваленте. Заказ будет подтверждён после проверки транзакции.</p>
                </div>
            )}

            {/* Delivery Method */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 ml-1">Способ получения</h3>
                <div className="grid grid-cols-3 gap-2">
                    {DELIVERY_METHODS.map(dm => (
                        <button
                            key={dm.id}
                            onClick={() => handleDeliveryChange(dm.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-[16px] border transition-all duration-200 ${deliveryMethod === dm.id
                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 border-transparent text-white shadow-lg'
                                : 'glass border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                }`}
                        >
                            <dm.icon className="w-5 h-5" />
                            <span className="text-xs font-semibold">{dm.label}</span>
                            <span className={`text-[9px] ${deliveryMethod === dm.id ? 'text-white/70' : 'text-slate-600'}`}>{dm.sublabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Address */}
            {selectedDelivery?.needsAddress && (
                <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {deliveryMethod === 'PICKUP' ? 'Адрес пункта самовывоза' : 'Адрес доставки'}
                    </label>
                    <input
                        type="text"
                        className="w-full mt-2 px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={deliveryMethod === 'PICKUP' ? 'Например: ул. Ленина, 42' : 'Полный адрес доставки'}
                    />
                </div>
            )}

            {/* Submit */}
            <div className="animate-fade-in pb-6" style={{ animationDelay: '250ms' }}>
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-[0_3px_15px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    <ShoppingBag className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {isSubmitting ? 'Оформляем...' : `Оформить заказ — ${totalPrice.toLocaleString('ru-RU')} ₽`}
                </button>
            </div>
        </div>
    )
}
