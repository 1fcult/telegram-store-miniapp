import { useState, useEffect } from 'react'
import { Search, ShoppingBag, X, Image as ImageIcon, ChevronRight, Settings, ShoppingCart, Plus, Check, Package, Store, ArrowLeft, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import UserProfileCard from '../components/UserProfileCard'

export default function CatalogPage() {
    const { user, isAdmin, isCourier } = useAuth()
    const { addToCart, isInCart, totalItems } = useCart()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [shops, setShops] = useState([])
    const [selectedShop, setSelectedShop] = useState(null)
    const [categoryPath, setCategoryPath] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Animation states
    const [animatingButtons, setAnimatingButtons] = useState({})
    const [floatingPlus, setFloatingPlus] = useState([])
    const [cartBump, setCartBump] = useState(false)

    useEffect(() => {
        Promise.all([fetchProducts(), fetchCategories(), fetchShops()]).finally(() => setIsLoading(false))
    }, [])

    useEffect(() => {
        if (totalItems > 0) {
            setCartBump(true)
            const t = setTimeout(() => setCartBump(false), 400)
            return () => clearTimeout(t)
        }
    }, [totalItems])

    const fetchProducts = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/products`)
            const data = await res.json()
            setProducts(data.sort((a, b) => b.id - a.id))
        } catch (error) {
            console.error('Failed to fetch products', error)
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/categories`)
            const data = await res.json()
            setCategories(data)
        } catch (error) {
            console.error('Failed to fetch categories', error)
        }
    }

    const fetchShops = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/shops`)
            const data = await res.json()
            setShops(data)
        } catch (error) {
            console.error('Failed to fetch shops', error)
        }
    }

    const currentParentId = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1].id : null

    const displayedCategories = selectedShop && !searchQuery
        ? categories.filter(c => c.shopId === selectedShop.id && c.parentId === currentParentId)
        : []

    const displayedProducts = products.filter(p => {
        if (searchQuery) {
            const matchesShop = selectedShop ? (p.shopId === selectedShop.id || (!p.shopId && selectedShop.name === 'ASG')) : true
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesShop && matchesSearch
        }

        if (selectedShop) {
            const isShopMatch = p.shopId === selectedShop.id || (!p.shopId && selectedShop.name === 'ASG')
            const isCategoryMatch = currentParentId ? p.categoryId === currentParentId : (!p.categoryId)
            return isShopMatch && isCategoryMatch
        }

        return false
    })

    return (
        <div className="w-full flex flex-col gap-5">

            {/* User Profile Card */}
            <UserProfileCard />

            {/* Store Header */}
            <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 animate-float"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(217,70,239,0.2))', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 8px 32px rgba(124,58,237,0.25)' }}>
                    <ShoppingBag className="w-7 h-7 text-fuchsia-400" />
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-1">
                    <span className="gradient-text-animate">Каталог</span>
                </h1>
                <p className="text-slate-500 text-sm">
                    {user ? `Привет, ${user.name?.split(' ')[0] || 'друг'}! 👋` : 'Лучшие товары для вас'}
                </p>
                <Link
                    to="/orders"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 press-scale transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Package className="w-3.5 h-3.5" /> Мои заказы
                </Link>
            </div>

            {/* Search Bar */}
            <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        className="w-full pl-11 pr-5 py-3 glass-input rounded-2xl transition-all duration-300 outline-none text-[14px] placeholder-slate-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск товаров..."
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="aspect-[4/5] skeleton" />
                            <div className="p-3 space-y-2">
                                <div className="h-3 skeleton rounded-full w-3/4" />
                                <div className="h-4 skeleton rounded-full w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (!selectedShop && !searchQuery) ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <h2 className="text-lg font-bold text-slate-200 tracking-wide">Направления</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {shops.map((shop, i) => (
                            <button
                                key={shop.id}
                                onClick={() => setSelectedShop(shop)}
                                className="card-premium rounded-2xl p-5 flex items-center justify-between text-left group"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <div className={`rounded-2xl flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110 ${shop.imageUrl ? 'w-14 h-14' : 'w-14 h-14 bg-fuchsia-500/10 border border-fuchsia-500/20'}`}>
                                        {shop.imageUrl
                                            ? <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover rounded-2xl" />
                                            : <Store className="w-7 h-7 text-fuchsia-400" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-slate-200 group-hover:text-fuchsia-300 transition-colors truncate">{shop.name}</h3>
                                        {shop.description && (
                                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">{shop.description}</p>
                                        )}
                                        <p className="text-slate-500 text-[10px] mt-1.5 font-medium uppercase tracking-wider">{categories.filter(c => c.shopId === shop.id).length} категорий</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                // --- CATALOG VIEW FOR SELECTED SHOP & SEARCH ---
                <div className="flex flex-col gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    {/* Breadcrumbs */}
                    {!searchQuery && selectedShop && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-hide shrink-0">
                                <button
                                    onClick={() => { setSelectedShop(null); setCategoryPath([]); }}
                                    className="flex shrink-0 items-center justify-center p-2 rounded-xl glass hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                                </button>
                                <button
                                    onClick={() => setCategoryPath([])}
                                    className={`text-sm font-bold px-3 py-1.5 rounded-xl transition-colors shrink-0 ${categoryPath.length === 0 ? 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 shadow-[0_2px_10px_rgba(168,85,247,0.2)]' : 'text-slate-400 hover:text-slate-200 glass border-white/5'}`}
                                >
                                    {selectedShop.name}
                                </button>
                                {categoryPath.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 shrink-0">
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                        <button
                                            onClick={() => setCategoryPath(categoryPath.slice(0, index + 1))}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-xl transition-colors ${index === categoryPath.length - 1 ? 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 shadow-[0_2px_10px_rgba(168,85,247,0.2)]' : 'text-slate-400 hover:text-slate-200 glass border-white/5'}`}
                                        >
                                            {item.name}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchQuery && (
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-200">
                                Результаты поиска
                            </h2>
                            <span className="text-slate-500 text-xs font-medium px-2 py-1 glass rounded-lg">{displayedProducts.length} найдено</span>
                        </div>
                    )}

                    {/* Subcategories Grid */}
                    {displayedCategories.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-[11px] uppercase font-bold tracking-wider text-slate-500 ml-1">Разделы</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {displayedCategories.map((c, i) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setCategoryPath([...categoryPath, c])}
                                        className="glass rounded-[20px] p-4 flex flex-col items-center justify-center gap-2 hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(168,85,247,0.1)] group text-center"
                                        style={{ animationDelay: `${(i * 40)}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <Package className="w-8 h-8 text-fuchsia-400 group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                                        <span className="font-semibold text-slate-200 text-sm group-hover:text-fuchsia-300 transition-colors">{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Grid */}
                    {displayedProducts.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between ml-1">
                                <h3 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Товары</h3>
                                <span className="text-slate-500 text-xs font-medium">{displayedProducts.length} шт.</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {displayedProducts.map((p, i) => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedProduct(p)}
                                        className="glass rounded-[20px] overflow-hidden cursor-pointer group hover:border-white/15 transition-all duration-300 animate-fade-in opacity-0 hover:shadow-lg hover:shadow-violet-500/5 flex flex-col"
                                        style={{ animationDelay: `${200 + (i * 40)}ms`, animationFillMode: 'forwards' }}
                                    >
                                        {/* Image */}
                                        <div className="aspect-[4/5] bg-slate-800/60 overflow-hidden relative shrink-0">
                                            {p.imageUrls ? (
                                                <img
                                                    src={p.imageUrls}
                                                    alt={p.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-10 h-10 text-slate-700" />
                                                </div>
                                            )}
                                            {p.category && (
                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-md text-[9px] font-medium text-fuchsia-300 border border-fuchsia-500/20 shadow-sm leading-tight max-w-[90%] truncate">
                                                    {p.category.name}
                                                </span>
                                            )}
                                            {p.stock > 0 && p.stock <= 5 && (
                                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-orange-500/80 backdrop-blur-sm text-[10px] font-bold text-white shadow-sm">
                                                    Осталось {p.stock}
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="font-semibold text-slate-200 text-[13px] line-clamp-2 leading-tight flex-1 group-hover:text-white transition-colors">{p.title}</h3>
                                            <div className="mt-3 flex items-center justify-between shrink-0 relative">
                                                <span className="text-[15px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                                    {p.price.toLocaleString('ru-RU')} ₽
                                                </span>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(p);
                                                            setAnimatingButtons(prev => ({ ...prev, [p.id]: true }));
                                                            setFloatingPlus(prev => [...prev, { id: Math.random(), productId: p.id }]);
                                                            setTimeout(() => setAnimatingButtons(prev => ({ ...prev, [p.id]: false })), 300);
                                                        }}
                                                        className={`p-1.5 rounded-[10px] transition-all relative ${isInCart(p.id)
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                            : 'glass border-white/10 text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-violet-600 hover:to-fuchsia-600 hover:border-transparent hover:shadow-[0_2px_10px_rgba(168,85,247,0.3)] shadow-sm'
                                                            } ${animatingButtons[p.id] ? 'animate-pop' : ''}`}
                                                    >
                                                        {isInCart(p.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                    </button>
                                                    {/* Floating +1 animation */}
                                                    {floatingPlus.filter(f => f.productId === p.id).map(f => (
                                                        <span
                                                            key={f.id}
                                                            className="absolute bottom-full right-0 mb-1 pointer-events-none text-fuchsia-400 font-bold text-[11px] animate-float-up z-20"
                                                            onAnimationEnd={() => setFloatingPlus(prev => prev.filter(item => item.id !== f.id))}
                                                        >
                                                            +1
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {displayedCategories.length === 0 && displayedProducts.length === 0 && (
                        <div className="py-16 text-center text-slate-500 glass rounded-[24px] border-dashed border-2 border-white/5 mx-1">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
                            {searchQuery ? 'Ничего не найдено по вашему запросу.' : 'Здесь пока пусто.'}
                        </div>
                    )}
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={() => setSelectedProduct(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

                    {/* Modal */}
                    <div
                        className="relative w-full sm:max-w-md bg-[#0d1321] sm:rounded-[28px] rounded-t-[28px] border border-white/10 overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Image */}
                        <div className="aspect-[4/3] bg-slate-800/60 overflow-hidden relative">
                            {selectedProduct.imageUrls ? (
                                <img
                                    src={selectedProduct.imageUrls}
                                    alt={selectedProduct.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-16 h-16 text-slate-700" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1321] via-transparent to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="p-5 -mt-8 relative z-10">
                            {selectedProduct.category && (
                                <span className="inline-block px-3 py-1 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 text-[11px] font-semibold mb-3 border border-fuchsia-500/20">
                                    {selectedProduct.category.name}
                                </span>
                            )}

                            <h2 className="text-xl font-bold text-slate-100 mb-2">{selectedProduct.title}</h2>

                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                {selectedProduct.description || 'Описание товара не указано.'}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div>
                                    <span className="text-xs text-slate-500">Цена</span>
                                    <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                        {selectedProduct.price.toLocaleString('ru-RU')} ₽
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        addToCart(selectedProduct);
                                        setAnimatingButtons(prev => ({ ...prev, [`modal_${selectedProduct.id}`]: true }));
                                        setTimeout(() => setAnimatingButtons(prev => ({ ...prev, [`modal_${selectedProduct.id}`]: false })), 300);
                                    }}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${isInCart(selectedProduct.id)
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_3px_15px_rgba(168,85,247,0.3)]'
                                        } ${animatingButtons[`modal_${selectedProduct.id}`] ? 'animate-pop' : ''}`}
                                >
                                    {isInCart(selectedProduct.id) ? (
                                        <><Check className="w-4 h-4" /> В корзине</>
                                    ) : (
                                        <><ShoppingCart className="w-4 h-4" /> В корзину</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Floating Cart Badge */}
            {totalItems > 0 && (
                <Link
                    to="/cart"
                    className={`fixed bottom-6 right-4 z-40 flex items-center gap-2 px-5 py-3.5 text-white font-bold rounded-2xl press-scale animate-fade-in-scale ${cartBump ? 'animate-bump' : ''}`}
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                        boxShadow: '0 8px 32px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                    }}
                >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm">{totalItems}</span>
                </Link>
            )}
        </div>
    )
}
