import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Image as ImageIcon } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart()

    if (items.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
                <div className="p-4 rounded-2xl glass">
                    <ShoppingCart className="w-10 h-10 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-200">Корзина пуста</h2>
                <p className="text-slate-500 text-sm text-center">Добавьте товары из каталога</p>
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
                            Корзина
                        </span>
                    </h1>
                </div>
                <span className="px-2.5 py-1 rounded-lg glass text-[11px] font-medium text-slate-400 border border-white/5">
                    {totalItems} шт.
                </span>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
                {items.map((item, i) => (
                    <div
                        key={item.product.id}
                        className="glass rounded-[20px] p-4 flex gap-3 animate-fade-in opacity-0"
                        style={{ animationDelay: `${100 + i * 40}ms`, animationFillMode: 'forwards' }}
                    >
                        {/* Image */}
                        <div className="w-20 h-20 shrink-0 rounded-[14px] bg-slate-800/80 overflow-hidden flex items-center justify-center border border-white/5">
                            {item.product.imageUrls ? (
                                <img src={item.product.imageUrls} alt={item.product.title} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-6 h-6 text-slate-600" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-200 text-sm truncate">{item.product.title}</h3>
                                <span className="text-xs text-slate-500">
                                    {item.product.price.toLocaleString('ru-RU')} ₽ за шт.
                                </span>
                            </div>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                    className="p-1.5 rounded-lg glass border-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold text-slate-200 w-8 text-center">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.product.stock}
                                    className="p-1.5 rounded-lg glass border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Price & Delete */}
                        <div className="flex flex-col items-end justify-between shrink-0">
                            <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary & Checkout */}
            <div className="glass rounded-[24px] p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-400 text-sm">Итого</span>
                    <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        {totalPrice.toLocaleString('ru-RU')} ₽
                    </span>
                </div>
                <Link
                    to="/checkout"
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-[0_3px_15px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98] text-sm"
                >
                    <ShoppingBag className="w-4 h-4" />
                    Оформить заказ
                </Link>
            </div>
        </div>
    )
}
