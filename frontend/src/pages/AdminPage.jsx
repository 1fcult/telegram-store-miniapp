import { useState, useEffect } from 'react'
import { PlusCircle, Image as ImageIcon, Tag, AlignLeft, Package, Sparkles, Folder, Store, Pencil, Trash2, X, ArrowLeft, ChevronRight, Users, ShoppingCart, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'

export default function AdminPage() {
    const { telegramId } = useAuth()
    const authHeaders = { 'X-Telegram-Id': telegramId }

    const [activeTab, setActiveTab] = useState('inventory')
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [shops, setShops] = useState([])
    const [users, setUsers] = useState([])
    const [orders, setOrders] = useState([])
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [notification, setNotification] = useState({ show: false, message: '', type: '' })

    // Product form
    const [form, setForm] = useState({ title: '', price: '', stock: '', description: '', imageUrls: '', categoryId: '', shopId: '' })
    const [imageFile, setImageFile] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null) // null = creating, object = editing
    const [showProductForm, setShowProductForm] = useState(false)
    const [inventoryNavPath, setInventoryNavPath] = useState([])

    // Category form
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingCategory, setEditingCategory] = useState(null)
    const [editCategoryName, setEditCategoryName] = useState('')

    // Shop form
    const [newShopName, setNewShopName] = useState('')
    const [newShopImageFile, setNewShopImageFile] = useState(null)
    const [editingShop, setEditingShop] = useState(null)
    const [editShopName, setEditShopName] = useState('')
    const [editShopImageFile, setEditShopImageFile] = useState(null)

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(null) // { type: 'product'|'category'|'shop', id, title }

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchShops()
        fetchUsers()
        fetchOrders()
    }, [])

    const notify = (message, type = 'success') => {
        setNotification({ show: true, message, type })
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000)
    }

    const fetchProducts = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/products?all=true`)
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

    const fetchUsers = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/users`, {
                headers: authHeaders
            })
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Failed to fetch users', error)
        }
    }

    const fetchOrders = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/orders/all`, {
                headers: authHeaders
            })
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            }
        } catch (error) {
            console.error('Failed to fetch orders', error)
        }
    }

    const handleUpdateOrder = async (orderId, newStatus, newCourierId) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/orders/${orderId}/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ status: newStatus, courierId: newCourierId })
            })
            if (res.ok) {
                notify('Заказ успешно обновлен!')
                fetchOrders()
                if (selectedOrder && selectedOrder.id === orderId) {
                    const updatedOrder = await res.json()
                    setSelectedOrder(updatedOrder)
                }
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка обновления', 'error')
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ role: newRole })
            })
            if (res.ok) {
                notify('Роль успешно обновлена!')
                fetchUsers()
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка', 'error')
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    // ========== PRODUCT CRUD ==========

    const openCreateProduct = () => {
        const currentNavShop = inventoryNavPath.length > 0 ? inventoryNavPath[0] : null
        const currentNavParent = inventoryNavPath.length > 1 ? inventoryNavPath[inventoryNavPath.length - 1] : null
        setEditingProduct(null)
        setForm({
            title: '', price: '', stock: '', description: '', imageUrls: '',
            categoryId: currentNavParent ? String(currentNavParent.id) : '',
            shopId: currentNavShop ? String(currentNavShop.id) : ''
        })
        setImageFile(null)
        setShowProductForm(true)
    }

    const openEditProduct = (product) => {
        setEditingProduct(product)
        setForm({
            title: product.title,
            price: String(product.price),
            stock: String(product.stock ?? 0),
            description: product.description || '',
            imageUrls: product.imageUrls || '',
            categoryId: product.categoryId ? String(product.categoryId) : '',
            shopId: product.shopId ? String(product.shopId) : ''
        })
        setImageFile(null)
        setShowProductForm(true)
    }

    const handleProductSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            let finalImageUrl = form.imageUrls

            if (imageFile) {
                const formData = new FormData()
                formData.append('image', imageFile)
                const uploadRes = await fetchWithAuth(`${API_BASE}/api/upload`, {
                    method: 'POST',
                    headers: { ...authHeaders },
                    body: formData
                })
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json()
                    finalImageUrl = uploadData.url
                }
            }

            const body = JSON.stringify({
                title: form.title,
                price: form.price,
                stock: form.stock,
                description: form.description,
                imageUrls: finalImageUrl,
                categoryId: form.categoryId,
                shopId: form.shopId || undefined
            })

            const url = editingProduct
                ? `${API_BASE}/api/products/${editingProduct.id}`
                : `${API_BASE}/api/products`

            const res = await fetchWithAuth(url, {
                method: editingProduct ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body
            })

            if (res.ok) {
                notify(editingProduct ? 'Товар обновлён!' : 'Товар добавлен!')
                setShowProductForm(false)
                fetchProducts()
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка', 'error')
            }
        } catch (error) {
            notify(`Сетевая ошибка: ${error.message}`, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteProduct = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/products/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            })
            if (res.ok) {
                notify('Товар удалён!')
                fetchProducts()
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка удаления', 'error')
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
        setDeleteConfirm(null)
    }

    // ========== CATEGORY CRUD ==========

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return
        const currentNavShop = inventoryNavPath.length > 0 ? inventoryNavPath[0] : null
        const currentNavParent = inventoryNavPath.length > 1 ? inventoryNavPath[inventoryNavPath.length - 1] : null

        try {
            const res = await fetchWithAuth(`${API_BASE}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    name: newCategoryName.trim(),
                    shopId: currentNavShop ? currentNavShop.id : undefined,
                    parentId: currentNavParent ? currentNavParent.id : undefined
                })
            })
            if (res.ok) {
                notify('Категория создана!')
                setNewCategoryName('')
                fetchCategories()
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    const handleUpdateCategory = async (id) => {
        if (!editCategoryName.trim()) return
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    name: editCategoryName.trim()
                })
            })
            if (res.ok) {
                notify('Категория обновлена!')
                setEditingCategory(null)
                fetchCategories()
                fetchProducts() // refresh product category labels
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    const handleDeleteCategory = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/categories/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            })
            if (res.ok) {
                notify('Категория удалена!')
                fetchCategories()
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка удаления', 'error')
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
        setDeleteConfirm(null)
    }

    // ========== SHOP CRUD ==========

    const uploadShopImage = async (file) => {
        const formData = new FormData()
        formData.append('image', file)
        const uploadRes = await fetchWithAuth(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: formData
        })
        if (uploadRes.ok) {
            const data = await uploadRes.json()
            return data.url
        }
        return null
    }

    const handleCreateShop = async () => {
        if (!newShopName.trim()) return
        try {
            let finalImageUrl = null
            if (newShopImageFile) {
                finalImageUrl = await uploadShopImage(newShopImageFile)
            }

            const res = await fetchWithAuth(`${API_BASE}/api/shops`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ name: newShopName.trim(), imageUrl: finalImageUrl })
            })
            if (res.ok) {
                notify('Магазин создан!')
                setNewShopName('')
                setNewShopImageFile(null)
                fetchShops()
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    const handleUpdateShop = async (shop) => {
        if (!editShopName.trim()) return
        try {
            let finalImageUrl = shop.imageUrl
            if (editShopImageFile) {
                finalImageUrl = await uploadShopImage(editShopImageFile)
            }

            const res = await fetchWithAuth(`${API_BASE}/api/shops/${shop.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ name: editShopName.trim(), imageUrl: finalImageUrl })
            })
            if (res.ok) {
                notify('Магазин обновлен!')
                setEditingShop(null)
                setEditShopImageFile(null)
                fetchShops()
                fetchCategories()
                fetchProducts()
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
    }

    const handleDeleteShop = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/shops/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            })
            if (res.ok) {
                notify('Направление удалено!')
                fetchShops()
            } else {
                const err = await res.json()
                notify(err.error || 'Ошибка удаления', 'error')
            }
        } catch (error) {
            notify(`Ошибка: ${error.message}`, 'error')
        }
        setDeleteConfirm(null)
    }

    // ========== RENDER ==========

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
                            Панель администратора
                        </span>
                    </h1>
                </div>
                <div className="w-9" /> {/* spacer */}
            </div>

            {/* Notification */}
            {notification.show && (
                <div className={`p-3 rounded-xl text-sm font-medium border animate-fade-in ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {notification.message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
                {[
                    { id: 'inventory', label: 'Каталог', icon: Package, count: products.length + categories.length },
                    { id: 'orders', label: 'Заказы', icon: ShoppingCart, count: orders.length },
                    { id: 'shops', label: 'Направления', icon: Store, count: shops.length },
                    { id: 'users', label: 'Сотрудники', icon: Users, count: users.length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-[0_2px_12px_rgba(168,85,247,0.3)]'
                            : 'glass border-white/10 text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ===== INVENTORY TAB ===== */}
            {activeTab === 'inventory' && !showProductForm && (() => {
                const currentNavShop = inventoryNavPath.length > 0 ? inventoryNavPath[0] : null
                const currentNavParent = inventoryNavPath.length > 1 ? inventoryNavPath[inventoryNavPath.length - 1] : null

                if (!currentNavShop) {
                    return (
                        <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <h3 className="text-slate-300 font-medium mb-1 mt-1 uppercase text-xs tracking-wider">Выберите направление:</h3>
                            {shops.map((s, i) => (
                                <button
                                    key={s.id}
                                    onClick={() => setInventoryNavPath([{ id: s.id, name: s.name, type: 'shop' }])}
                                    className="glass rounded-[16px] px-4 py-4 flex items-center justify-between hover:border-fuchsia-500/30 transition-all group"
                                    style={{ animationDelay: `${150 + i * 40}ms`, animationFillMode: 'forwards' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                                            <Store className="w-5 h-5 text-fuchsia-400" />
                                        </div>
                                        <span className="text-slate-200 font-medium">{s.name}</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                            {shops.length === 0 && (
                                <p className="text-slate-500 text-center py-4">Нет направлений. Создайте их во вкладке "Направления".</p>
                            )}
                        </div>
                    )
                }

                // Determine which categories inside this shop to display
                const displayedCategories = categories.filter(c =>
                    c.shopId === currentNavShop.id &&
                    (currentNavParent ? c.parentId === currentNavParent.id : c.parentId === null)
                )

                // Determine products
                const displayedProducts = products.filter(p =>
                    p.shopId === currentNavShop.id &&
                    (currentNavParent ? p.categoryId === currentNavParent.id : p.categoryId === null)
                )

                return (
                    <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        {/* Nav Breadcrumbs */}
                        <div className="flex items-center gap-2 mb-1 pb-3 border-b border-white/10 overflow-x-auto scrollbar-hide shrink-0">
                            <button
                                onClick={() => setInventoryNavPath([])}
                                className="flex shrink-0 items-center justify-center p-1.5 rounded-lg glass hover:text-white transition-colors"
                            >
                                <Store className="w-4 h-4 text-slate-400" />
                            </button>
                            {inventoryNavPath.map((item, index) => (
                                <div key={index} className="flex items-center gap-2 shrink-0">
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                    <button
                                        onClick={() => setInventoryNavPath(inventoryNavPath.slice(0, index + 1))}
                                        className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${index === inventoryNavPath.length - 1 ? 'text-fuchsia-400 bg-fuchsia-500/10' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        {item.name}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Top Controls: Add Product & Add Category */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={openCreateProduct}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-[0_3px_15px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" /> Новый товар
                            </button>
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder={currentNavParent ? `Подкатегория в '${currentNavParent.name}'...` : `Категория в '${currentNavShop.name}'...`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                />
                                <button
                                    onClick={handleCreateCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 text-sm shrink-0"
                                    title="Создать категорию"
                                >
                                    <Folder className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Categories List */}
                        {displayedCategories.length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 ml-1">Категории</h4>
                                {displayedCategories.map((c, i) => (
                                    <div
                                        key={c.id}
                                        className="glass rounded-[16px] px-4 py-3 flex items-center gap-3 animate-fade-in opacity-0"
                                        style={{ animationDelay: `${150 + i * 40}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <Folder className="w-4 h-4 text-fuchsia-400 shrink-0" />

                                        {editingCategory === c.id ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-1.5 glass-input rounded-lg outline-none text-sm"
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(c.id)}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleUpdateCategory(c.id)} className="px-3 py-1.5 bg-violet-600/30 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-600/50 transition-colors">
                                                    Ок
                                                </button>
                                                <button onClick={() => setEditingCategory(null)} className="px-2 py-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1 flex flex-col cursor-pointer" onClick={() => setInventoryNavPath([...inventoryNavPath, { id: c.id, name: c.name, type: 'category' }])}>
                                                    <span className="text-sm text-slate-200 font-medium group-hover:text-fuchsia-300 transition-colors">{c.name}</span>
                                                    <span className="text-[10px] text-fuchsia-400 opacity-80 mt-0.5">Вложенных: {categories.filter(sub => sub.parentId === c.id).length}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategory(c.id);
                                                            setEditCategoryName(c.name);
                                                        }}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm({ type: 'category', id: c.id, title: c.name })}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setInventoryNavPath([...inventoryNavPath, { id: c.id, name: c.name, type: 'category' }])}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-fuchsia-400 transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Products List */}
                        {displayedProducts.length > 0 && (
                            <div className="flex flex-col gap-3 mt-2">
                                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 ml-1">Товары</h4>
                                {displayedProducts.map((p, i) => (
                                    <div
                                        key={p.id}
                                        className="glass rounded-[20px] p-4 flex gap-3 animate-fade-in opacity-0"
                                        style={{ animationDelay: `${200 + i * 40}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <div className="w-16 h-16 shrink-0 rounded-[14px] bg-slate-800/80 overflow-hidden flex items-center justify-center border border-white/5">
                                            {p.imageUrls ? (
                                                <img src={p.imageUrls} alt={p.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-200 truncate text-sm">{p.title}</h3>
                                            </div>
                                            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mt-0.5">
                                                {p.price.toLocaleString('ru-RU')} ₽
                                            </span>
                                            <span className={`text-[10px] font-medium mt-0.5 ${p.stock > 0 ? 'text-slate-500' : 'text-red-400'}`}>
                                                {p.stock > 0 ? `В наличии: ${p.stock} шт.` : 'Нет в наличии'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => openEditProduct(p)}
                                                className="p-2 rounded-xl glass border-white/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm({ type: 'product', id: p.id, title: p.title })}
                                                className="p-2 rounded-xl glass border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {displayedCategories.length === 0 && displayedProducts.length === 0 && (
                            <div className="py-12 text-center text-slate-500 glass rounded-[20px] border-dashed border-2 border-white/5 mt-4">
                                Здесь пока пусто. Добавьте категорию или товар!
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* ===== PRODUCT FORM (Create/Edit) ===== */}
            {activeTab === 'inventory' && showProductForm && (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <button
                        onClick={() => setShowProductForm(false)}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Назад к списку
                    </button>

                    <div className="glass rounded-[24px] p-5 sm:p-6 shadow-2xl shadow-black/50">
                        <h2 className="text-lg font-bold mb-4 text-slate-200">
                            {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                        </h2>
                        <form onSubmit={handleProductSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> Название
                                </label>
                                <input
                                    required type="text"
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Название товара"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center text-[7px] font-bold">₽</div> Цена
                                </label>
                                <input
                                    required type="number"
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <Package className="w-3 h-3" /> Количество (stock)
                                </label>
                                <input
                                    required type="number" min="0"
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                                    value={form.stock}
                                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <Folder className="w-3 h-3" /> Категория
                                </label>
                                <select
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm text-slate-100 appearance-none cursor-pointer"
                                    value={form.categoryId}
                                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                >
                                    <option value="" className="text-slate-800 bg-slate-100/90">Без категории</option>
                                    {categories.filter(c => form.shopId ? String(c.shopId) === String(form.shopId) : true).map(c => (
                                        <option key={c.id} value={String(c.id)} className="text-slate-800 bg-slate-100/90">{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <Store className="w-3 h-3" /> Направление (Магазин)
                                </label>
                                <select
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm text-slate-100 appearance-none cursor-pointer"
                                    value={form.shopId}
                                    onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                                >
                                    <option value="" className="text-slate-800 bg-slate-100/90">Без направления</option>
                                    {shops.map(s => (
                                        <option key={s.id} value={String(s.id)} className="text-slate-800 bg-slate-100/90">{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <ImageIcon className="w-3 h-3" /> Фотография
                                </label>
                                {editingProduct && form.imageUrls && !imageFile && (
                                    <div className="relative h-28 rounded-xl overflow-hidden glass border border-white/10 mb-2">
                                        <img src={form.imageUrls} alt="Current" className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <span className="absolute bottom-2 left-3 text-[10px] text-slate-300">Текущее изображение</span>
                                    </div>
                                )}
                                <input
                                    type="file" accept="image/*"
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-400 hover:file:bg-violet-600/30 file:cursor-pointer text-slate-400"
                                    onChange={(e) => { if (e.target.files?.[0]) setImageFile(e.target.files[0]) }}
                                />
                                {imageFile && (
                                    <div className="mt-2 relative h-28 rounded-xl overflow-hidden glass border border-white/10">
                                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover opacity-90" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <AlignLeft className="w-3 h-3" /> Описание
                                </label>
                                <textarea
                                    className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500 resize-none"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Описание товара..."
                                />
                            </div>

                            <button
                                type="submit" disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-[0_3px_15px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98] disabled:opacity-70"
                            >
                                <PlusCircle className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                                {isSubmitting ? 'Сохраняем...' : (editingProduct ? 'Сохранить изменения' : 'Создать товар')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== SHOPS TAB ===== */}
            {activeTab === 'shops' && (
                <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <div className="glass rounded-[20px] p-4 flex gap-2">
                        <input
                            type="text"
                            placeholder="Новое направление..."
                            className="flex-1 px-4 py-3 glass-input rounded-xl outline-none text-sm placeholder-slate-500"
                            value={newShopName}
                            onChange={(e) => setNewShopName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateShop()}
                        />
                        <label className={`cursor-pointer px-4 py-3 glass border-white/10 rounded-xl transition-all flex items-center justify-center ${newShopImageFile ? 'text-fuchsia-400 border-fuchsia-500/50 bg-fuchsia-500/10' : 'text-slate-400 hover:text-fuchsia-400 hover:border-fuchsia-500/30'}`}>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) setNewShopImageFile(e.target.files[0]) }}
                            />
                            <ImageIcon className="w-4 h-4" />
                        </label>
                        <button
                            onClick={handleCreateShop}
                            disabled={!newShopName.trim()}
                            className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap text-sm"
                        >
                            <PlusCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Shops list */}
                    {shops.map((s, i) => (
                        <div
                            key={s.id}
                            className="glass rounded-[16px] px-4 py-3 flex items-center gap-3 animate-fade-in opacity-0"
                            style={{ animationDelay: `${150 + i * 40}ms`, animationFillMode: 'forwards' }}
                        >
                            <Store className="w-4 h-4 text-fuchsia-400 shrink-0" />

                            {editingShop === s.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-1.5 glass-input rounded-lg outline-none text-sm"
                                        value={editShopName}
                                        onChange={(e) => setEditShopName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateShop(s)}
                                        autoFocus
                                    />
                                    <label className={`cursor-pointer px-3 py-1.5 glass border-white/10 rounded-lg transition-all flex items-center justify-center ${editShopImageFile || s.imageUrl ? 'text-violet-400 border-violet-500/50 bg-violet-500/10' : 'text-slate-400 hover:text-violet-400'}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => { if (e.target.files?.[0]) setEditShopImageFile(e.target.files[0]) }}
                                        />
                                        <ImageIcon className="w-3.5 h-3.5" />
                                    </label>
                                    <button onClick={() => handleUpdateShop(s)} className="px-3 py-1.5 bg-violet-600/30 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-600/50 transition-colors">
                                        Ок
                                    </button>
                                    <button onClick={() => { setEditingShop(null); setEditShopImageFile(null) }} className="px-2 py-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 flex gap-3 items-center">
                                        {s.imageUrl && (
                                            <div className="w-8 h-8 rounded-lg overflow-hidden glass border border-white/5 shrink-0 flex items-center justify-center bg-black/50 p-1">
                                                <img src={s.imageUrl} alt={s.name} className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <span className="text-sm text-slate-200 font-medium">{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingShop(s.id);
                                                setEditShopName(s.name);
                                                setEditShopImageFile(null);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm({ type: 'shop', id: s.id, title: s.name })}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {shops.length === 0 && (
                        <div className="py-10 text-center text-slate-500 glass rounded-[20px] border-dashed border-2 border-white/5">
                            Направлений пока нет.
                        </div>
                    )}
                </div>
            )}

            {/* ===== ORDERS TAB ===== */}
            {activeTab === 'orders' && (
                <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    {orders.map((o, i) => (
                        <div
                            key={o.id}
                            onClick={() => setSelectedOrder(o)}
                            className="glass rounded-[20px] p-5 flex flex-col gap-3 cursor-pointer hover:border-violet-500/30 transition-all duration-300 group"
                            style={{ animationDelay: `${150 + i * 40}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl text-white ${o.status === 'PENDING' ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' :
                                            o.status === 'DELIVERING' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' :
                                                o.status === 'COMPLETED' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
                                                    'bg-slate-500/20 border border-slate-500/30'
                                        }`}>
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-sm">Заказ #{o.id}</h3>
                                        <p className="text-[11px] text-slate-500">{new Date(o.createdAt).toLocaleString('ru-RU')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                        {o.total.toLocaleString('ru-RU')} ₽
                                    </span>
                                    <p className="text-[11px] font-medium mt-0.5 text-slate-400">
                                        {o.paymentMethod === 'CARD' ? '💳 Картой' : '💵 Наличными'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[120px]">{o.user?.name || o.user?.username || 'Клиент'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-medium">
                                    {o.courier ? (
                                        <span className="text-violet-400 flex items-center gap-1 bg-violet-500/10 px-2 py-1 rounded-md border border-violet-500/20">
                                            <Truck className="w-3.5 h-3.5" /> {o.courier.name || o.courier.username}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <Truck className="w-3.5 h-3.5" /> Нет курьера
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="py-10 text-center text-slate-500 glass rounded-[20px] border-dashed border-2 border-white/5">
                            Заказов пока нет.
                        </div>
                    )}
                </div>
            )}

            {/* ===== USERS TAB ===== */}
            {activeTab === 'users' && (
                <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    {users.map((u, i) => (
                        <div
                            key={u.id}
                            className="glass rounded-[20px] p-4 flex flex-col gap-3 animate-fade-in opacity-0"
                            style={{ animationDelay: `${150 + i * 40}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 shrink-0 rounded-[12px] bg-slate-800/80 overflow-hidden flex items-center justify-center border border-white/5">
                                        <Users className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-200 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-[300px]">
                                            {u.name || (u.username ? `@${u.username}` : `User ${u.id}`)}
                                        </h3>
                                        {u.username && (
                                            <p className="text-[11px] text-slate-500">@{u.username}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500">ID: {u.id}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                                <label className="text-xs text-slate-400 font-medium">Роль:</label>
                                <select
                                    className="flex-1 px-3 py-2 glass-input rounded-xl outline-none text-sm text-slate-200 appearance-none cursor-pointer"
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                >
                                    <option value="CLIENT" className="bg-slate-800">🧑‍💼 Клиент</option>
                                    <option value="COURIER" className="bg-slate-800">🚗 Курьер</option>
                                    <option value="ADMIN" className="bg-slate-800">👑 Администратор</option>
                                </select>
                            </div>
                        </div>
                    ))}

                    {users.length === 0 && (
                        <div className="py-10 text-center text-slate-500 glass rounded-[20px] border-dashed border-2 border-white/5">
                            Сотрудников пока нет.
                        </div>
                    )}
                </div>
            )}

            {/* ===== DELETE CONFIRMATION MODAL ===== */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
                    <div
                        className="relative glass rounded-[24px] p-6 max-w-sm w-full border border-white/10 shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200">Удалить?</h3>
                            <p className="text-slate-400 text-sm">
                                «{deleteConfirm.title}» будет удалён навсегда.
                            </p>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-2.5 rounded-xl glass border-white/10 text-slate-300 font-medium text-sm hover:bg-white/5 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={() => {
                                        if (deleteConfirm.type === 'product') handleDeleteProduct(deleteConfirm.id)
                                        else if (deleteConfirm.type === 'category') handleDeleteCategory(deleteConfirm.id)
                                        else if (deleteConfirm.type === 'shop') handleDeleteShop(deleteConfirm.id)
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors"
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ===== ORDER DETAIL MODAL ===== */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
                    <div
                        className="relative w-full sm:max-w-md bg-[#0d1321] sm:rounded-[28px] rounded-t-[28px] border border-white/10 overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 glass bg-white/5">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <Package className="w-5 h-5 text-fuchsia-400" />
                                Окно заказа #{selectedOrder.id}
                            </h2>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full glass hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-6 scrollbar-hide">
                            {/* Client Info */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> Клиент
                                </h3>
                                <div className="glass p-3 rounded-xl border border-white/5 text-sm space-y-1">
                                    <p><span className="text-slate-400">Имя:</span> <span className="text-slate-200">{selectedOrder.user?.name || 'Нет'}</span></p>
                                    <p><span className="text-slate-400">Username:</span> <span className="text-slate-200">{selectedOrder.user?.username ? `@${selectedOrder.user.username}` : 'Нет'}</span></p>
                                    <p><span className="text-slate-400">ID:</span> <span className="text-slate-200">{selectedOrder.user?.id}</span></p>
                                    {selectedOrder.address && (
                                        <p className="pt-2 mt-2 border-t border-white/5"><span className="text-slate-400">Адрес:</span> <span className="text-slate-200 font-medium">{selectedOrder.address}</span></p>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                                    <ShoppingCart className="w-3.5 h-3.5" /> Товары
                                </h3>
                                <div className="glass rounded-xl border border-white/5 overflow-hidden">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="p-3 border-b border-white/5 last:border-0 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800/80 shrink-0 overflow-hidden flex items-center justify-center">
                                                {item.product.imageUrls ? (
                                                    <img src={item.product.imageUrls} alt="" className="w-full h-full object-cover" />
                                                ) : <ImageIcon className="w-4 h-4 text-slate-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200 truncate">{item.product.title}</p>
                                                <p className="text-xs text-slate-400">{item.quantity} шт. x {item.price} ₽</p>
                                            </div>
                                            <div className="text-sm font-bold text-slate-300 shrink-0">
                                                {(item.quantity * item.price).toLocaleString('ru-RU')} ₽
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3 bg-fuchsia-500/5 flex items-center justify-between border-t border-white/10">
                                        <span className="text-sm font-medium text-slate-400">Итого к оплате:</span>
                                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                            {selectedOrder.total.toLocaleString('ru-RU')} ₽
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="space-y-3 pt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase ml-1">Статус заказа</label>
                                    <select
                                        className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm text-slate-200 appearance-none font-medium"
                                        value={selectedOrder.status}
                                        onChange={(e) => handleUpdateOrder(selectedOrder.id, e.target.value, selectedOrder.courierId)}
                                    >
                                        <option value="PENDING" className="bg-slate-800">⏳ Ожидает (PENDING)</option>
                                        <option value="CONFIRMED" className="bg-slate-800">✅ Подтвержден (CONFIRMED)</option>
                                        <option value="DELIVERING" className="bg-slate-800">🚚 Доставляется (DELIVERING)</option>
                                        <option value="COMPLETED" className="bg-slate-800">🎉 Завершен (COMPLETED)</option>
                                        <option value="CANCELLED" className="bg-slate-800">❌ Отменен (CANCELLED)</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase ml-1">Назначить курьера</label>
                                    <select
                                        className="w-full px-4 py-3 glass-input rounded-xl outline-none text-sm text-slate-200 appearance-none font-medium"
                                        value={selectedOrder.courierId || ''}
                                        onChange={(e) => handleUpdateOrder(selectedOrder.id, selectedOrder.status, e.target.value)}
                                    >
                                        <option value="" className="bg-slate-800 text-slate-400">Не назначен</option>
                                        {users.filter(u => u.role === 'COURIER').map(c => (
                                            <option key={c.id} value={c.id} className="bg-slate-800">
                                                {c.name || `@${c.username}`} (ID: {c.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
