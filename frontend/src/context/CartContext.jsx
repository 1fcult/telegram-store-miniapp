import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function useCart() {
    return useContext(CartContext)
}

const CART_KEY = 'miniapp_cart'

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadCart)

    useEffect(() => {
        saveCart(items)
    }, [items])

    const addToCart = (product, quantity = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.product.id === product.id)
            if (existing) {
                // Don't exceed stock
                const newQty = Math.min(existing.quantity + quantity, product.stock)
                return prev.map(i =>
                    i.product.id === product.id ? { ...i, quantity: newQty } : i
                )
            }
            return [...prev, { product, quantity: Math.min(quantity, product.stock) }]
        })
    }

    const removeFromCart = (productId) => {
        setItems(prev => prev.filter(i => i.product.id !== productId))
    }

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId)
            return
        }
        setItems(prev =>
            prev.map(i =>
                i.product.id === productId
                    ? { ...i, quantity: Math.min(quantity, i.product.stock) }
                    : i
            )
        )
    }

    const clearCart = () => {
        setItems([])
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
    const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

    const isInCart = (productId) => items.some(i => i.product.id === productId)

    const value = {
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isInCart
    }

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    )
}
