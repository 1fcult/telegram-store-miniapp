import { useState, useEffect } from 'react'
import { Crown, Users, Store, ShoppingCart, Package, ArrowLeft, Plus, Trash2, Pencil, X, Check, ChevronDown, UserCheck, UserX, Shield, Truck, User, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
    CLIENT: { label: 'Клиент', icon: User, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    ADMIN: { label: 'Администратор', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    COURIER: { label: 'Курьер', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    PRESIDENT: { label: 'Президент', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
}

const STATUS_LABELS = {
    PENDING: { label: 'Ожидает', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    CONFIRMED: { label: 'Подтверждён', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    DELIVERING: { label: 'Доставляется', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    COMPLETED: { label: 'Выполнен', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    CANCELLED: { label: 'Отменён', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

export default function PresidentPage() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('staff')
    const [notification, setNotification] = useState(null)

    // Data
    const [users, setUsers] = useState([])
    const [shops, setShops] = useState([])
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])

    // Staff tab state
    const [staffSearch, setStaffSearch] = useState('')
    const [editingUser, setEditingUser] = useState(null)
    const [editRole, setEditRole] = useState('')
    const [editAssignedShopId, setEditAssignedShopId] = useState('')

    // Shops tab state
    const [newShopName, setNewShopName] = useState('')
    const [newShopDesc, setNewShopDesc] = useState('')
    const [isAddingShop, setIsAddingShop] = useState(false)
    const [editingShop, setEditingShop] = useState(null)

    // Orders tab state
    const [orderSearch, setOrderSearch] = useState('')
    const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [couriers, setCouriers] = useState([])

    const notify = (msg, type = 'success') => {
        setNotification({ msg, type })
        setTimeout(() => setNotification(null), 3500)
    }

    useEffect(() => { fetchAll() }, [])

    const fetchAll = async () => {
        const [usersRes, shopsRes, ordersRes, productsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE}/api/users`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/shops`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/orders/all`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/products?all=true`).catch(() => null),
        ])
        if (usersRes?.ok) { const d = await usersRes.json(); setUsers(d); setCouriers(d.filter(u => ['COURIER', 'ADMIN'].includes(u.role))) }
        if (shopsRes?.ok) { const d = await shopsRes.json(); setShops(d) }
        if (ordersRes?.ok) { const d = await ordersRes.json(); setOrders(d.sort((a, b) => b.id - a.id)) }
        if (productsRes?.ok) { const d = await productsRes.json(); setProducts(d.sort((a, b) => b.id - a.id)) }
    }

    // ===== STAFF =====
    const saveUserRole = async () => {
        if (!editingUser) return
        const body = { role: editRole }
        if (editRole === 'ADMIN' && editAssignedShopId) body.assignedShopId = parseInt(editAssignedShopId)
        if (editRole !== 'ADMIN') body.assignedShopId = null

        const res = await fetchWithAuth(`${API_BASE}/api/users/${editingUser.id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        if (res.ok) {
            notify('Роль обновлена')
            setEditingUser(null)
            const usersRes = await fetchWithAuth(`${API_BASE}/api/users`)
            if (usersRes.ok) { const d = await usersRes.json(); setUsers(d); setCouriers(d.filter(u => ['COURIER', 'ADMIN'].includes(u.role))) }
        } else {
            const err = await res.json()
            notify(err.error || 'Ошибка', 'error')
        }
    }

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        u.username?.toLowerCase().includes(staffSearch.toLowerCase())
    )

    // ===== SHOPS =====
    const createShop = async () => {
        if (!newShopName.trim()) return
        setIsAddingShop(true)
        const res = await fetchWithAuth(`${API_BASE}/api/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newShopName.trim(), description: newShopDesc.trim() })
        })
        setIsAddingShop(false)
        if (res.ok) { notify('Направление создано'); setNewShopName(''); setNewShopDesc(''); const shopsRes = await fetchWithAuth(`${API_BASE}/api/shops`); if (shopsRes.ok) setShops(await shopsRes.json()) }
        else { const e = await res.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const deleteShop = async (id) => {
        const res = await fetchWithAuth(`${API_BASE}/api/shops/${id}`, { method: 'DELETE' })
        if (res.ok) { notify('Удалено'); const shopsRes = await fetchWithAuth(`${API_BASE}/api/shops`); if (shopsRes.ok) setShops(await shopsRes.json()) }
        else { const e = await res.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const saveShop = async () => {
        if (!editingShop) return
        const res = await fetchWithAuth(`${API_BASE}/api/shops/${editingShop.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: editingShop.name, description: editingShop.description, status: editingShop.status })
        })
        if (res.ok) { notify('Сохранено'); setEditingShop(null); const shopsRes = await fetchWithAuth(`${API_BASE}/api/shops`); if (shopsRes.ok) setShops(await shopsRes.json()) }
        else { const e = await res.json(); notify(e.error || 'Ошибка', 'error') }
    }

    // ===== ORDERS =====
    const updateOrder = async (orderId, status, courierId) => {
        const res = await fetchWithAuth(`${API_BASE}/api/orders/${orderId}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, courierId })
        })
        if (res.ok) { notify('Заказ обновлён'); fetchAll(); setSelectedOrder(null) }
        else { const e = await res.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const filteredOrders = orders.filter(o => {
        const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter
        const search = orderSearch.toLowerCase()
        const matchesSearch = !search || o.id.toString().includes(search) || o.user?.name?.toLowerCase().includes(search)
        return matchesStatus && matchesSearch
    })

    const TABS = [
        { id: 'staff', label: 'Сотрудники', icon: Users },
        { id: 'shops', label: 'Направления', icon: Store },
        { id: 'orders', label: 'Заказы', icon: ShoppingCart },
        { id: 'products', label: 'Товары', icon: Package },
    ]

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 animate-fade-in">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                    {notification.type === 'error' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {notification.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" /> Каталог
                </Link>
                <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h1 className="text-lg font-bold text-slate-100">Панель президента</h1>
                </div>
                <div className="w-20" />
            </div>

            {/* Tab Bar */}
            <div className="grid grid-cols-4 gap-1 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ==================== STAFF TAB ==================== */}
            {activeTab === 'staff' && (
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 outline-none focus:border-yellow-500/40 transition-colors"
                            placeholder="Поиск по имени или @username..."
                            value={staffSearch}
                            onChange={e => setStaffSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        {filteredUsers.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Нет пользователей</p>}
                        {filteredUsers.map(u => {
                            const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.CLIENT
                            const IconC = roleInfo.icon
                            const isEditing = editingUser?.id === u.id
                            const isSelf = u.id === user?.id

                            return (
                                <div key={u.id} className="rounded-2xl p-3.5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="flex items-center gap-3">
                                        {u.photoUrl ? (
                                            <img src={u.photoUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 ring-1 ring-white/10">
                                                <User className="w-5 h-5 text-slate-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-200 truncate">{u.name || 'Без имени'}</p>
                                            <p className="text-xs text-slate-500 truncate">{u.username ? `@${u.username}` : `ID: ${u.telegramId}`}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${roleInfo.bg} ${roleInfo.color}`}>
                                                <IconC className="w-3 h-3" /> {roleInfo.label}
                                            </span>
                                            {!isSelf && (
                                                <button
                                                    onClick={() => { setEditingUser(u); setEditRole(u.role); setEditAssignedShopId(u.assignedShopId ? String(u.assignedShopId) : '') }}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline edit */}
                                    {isEditing && (
                                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                            <div className="grid grid-cols-2 gap-2">
                                                {['CLIENT', 'ADMIN', 'COURIER'].map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setEditRole(r)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${editRole === r ? `${ROLE_LABELS[r].bg} ${ROLE_LABELS[r].color} border-current` : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
                                                    >
                                                        {(() => { const I = ROLE_LABELS[r].icon; return <I className="w-3.5 h-3.5" /> })()}
                                                        {ROLE_LABELS[r].label}
                                                    </button>
                                                ))}
                                            </div>

                                            {editRole === 'ADMIN' && (
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Направление для администратора</label>
                                                    <select
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                                                        value={editAssignedShopId}
                                                        onChange={e => setEditAssignedShopId(e.target.value)}
                                                    >
                                                        <option value="">— Без ограничения —</option>
                                                        {shops.map(s => (
                                                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button onClick={saveUserRole} className="flex-1 py-2 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-xs font-semibold hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-1">
                                                    <Check className="w-3.5 h-3.5" /> Сохранить
                                                </button>
                                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors">
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Assigned shop info */}
                                    {u.role === 'ADMIN' && u.assignedShop && (
                                        <p className="text-xs text-amber-400/70 flex items-center gap-1">
                                            <Store className="w-3 h-3" /> Направление: <span className="font-semibold">{u.assignedShop.name}</span>
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ==================== SHOPS TAB ==================== */}
            {activeTab === 'shops' && (
                <div className="flex flex-col gap-3">
                    {/* Add Shop Form */}
                    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-400" /> Новое направление</h3>
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-yellow-500/40 transition-colors"
                            placeholder="Название направления"
                            value={newShopName}
                            onChange={e => setNewShopName(e.target.value)}
                        />
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-yellow-500/40 transition-colors"
                            placeholder="Описание (необязательно)"
                            value={newShopDesc}
                            onChange={e => setNewShopDesc(e.target.value)}
                        />
                        <button
                            onClick={createShop}
                            disabled={isAddingShop || !newShopName.trim()}
                            className="py-2.5 rounded-xl text-sm font-semibold text-yellow-300 border border-yellow-500/30 bg-yellow-500/15 hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
                        >
                            {isAddingShop ? 'Создание...' : 'Создать направление'}
                        </button>
                    </div>

                    {/* Shops list */}
                    <div className="flex flex-col gap-2">
                        {shops.map(shop => (
                            <div key={shop.id} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {editingShop?.id === shop.id ? (
                                    <>
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-yellow-500/40"
                                            value={editingShop.name}
                                            onChange={e => setEditingShop(s => ({ ...s, name: e.target.value }))}
                                        />
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none"
                                            placeholder="Описание"
                                            value={editingShop.description || ''}
                                            onChange={e => setEditingShop(s => ({ ...s, description: e.target.value }))}
                                        />
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                                            value={editingShop.status}
                                            onChange={e => setEditingShop(s => ({ ...s, status: e.target.value }))}
                                        >
                                            <option value="ACTIVE">Активно</option>
                                            <option value="INACTIVE">Неактивно</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button onClick={saveShop} className="flex-1 py-2 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-xs font-semibold hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Сохранить</button>
                                            <button onClick={() => setEditingShop(null)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-xs font-semibold">Отмена</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {shop.imageUrl
                                            ? <img src={shop.imageUrl} alt={shop.name} className="w-12 h-12 rounded-xl object-cover" />
                                            : <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center"><Store className="w-6 h-6 text-yellow-400" /></div>
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-200 truncate">{shop.name}</p>
                                            {shop.description && <p className="text-xs text-slate-500 truncate">{shop.description}</p>}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${shop.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>
                                                    {shop.status === 'ACTIVE' ? 'Активно' : 'Неактивно'}
                                                </span>
                                                <span className="text-xs text-slate-600">
                                                    {products.filter(p => p.shopId === shop.id).length} товаров
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setEditingShop({ ...shop })} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteShop(shop.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ==================== ORDERS TAB ==================== */}
            {activeTab === 'orders' && (
                <div className="flex flex-col gap-3">
                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 outline-none" placeholder="Поиск заказа..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                        </div>
                        <select
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                            value={orderStatusFilter}
                            onChange={e => setOrderStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Все</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Новых', value: orders.filter(o => o.status === 'PENDING').length, color: 'text-yellow-400' },
                            { label: 'В доставке', value: orders.filter(o => o.status === 'DELIVERING').length, color: 'text-violet-400' },
                            { label: 'Выполнено', value: orders.filter(o => o.status === 'COMPLETED').length, color: 'text-emerald-400' },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Orders list */}
                    {filteredOrders.map(order => (
                        <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                                className="w-full flex items-center gap-3 p-4 text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-slate-200">#{order.id}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_LABELS[order.status]?.color}`}>
                                            {STATUS_LABELS[order.status]?.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        {order.user?.name || 'Клиент'} · {order.total?.toLocaleString('ru-RU')} ₽
                                    </p>
                                    {order.courier && <p className="text-xs text-violet-400 truncate">🚚 {order.courier.name}</p>}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${selectedOrder?.id === order.id ? 'rotate-180' : ''}`} />
                            </button>

                            {selectedOrder?.id === order.id && (
                                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/5 pt-3">
                                    {/* Order items */}
                                    {order.items?.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between text-xs text-slate-400">
                                                    <span className="truncate">{item.product?.title}</span>
                                                    <span className="ml-2 shrink-0">{item.quantity} × {item.price?.toLocaleString('ru-RU')} ₽</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Status change */}
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Статус</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none"
                                                defaultValue={order.status}
                                                onChange={e => updateOrder(order.id, e.target.value, order.courierId)}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                        {/* Courier assign */}
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Курьер</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none"
                                                defaultValue={order.courierId || ''}
                                                onChange={e => updateOrder(order.id, order.status, e.target.value || null)}
                                            >
                                                <option value="">— Не назначен —</option>
                                                {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 space-y-0.5">
                                        <p>Способ оплаты: <span className="text-slate-400">{order.paymentMethod}</span></p>
                                        <p>Доставка: <span className="text-slate-400">{order.deliveryMethod}</span></p>
                                        {order.address && <p>Адрес: <span className="text-slate-400">{order.address}</span></p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredOrders.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Заказов нет</p>}
                </div>
            )}

            {/* ==================== PRODUCTS TAB ==================== */}
            {activeTab === 'products' && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Товаров', value: products.length },
                            { label: 'Направлений', value: shops.length },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className="text-2xl font-bold text-yellow-400">{s.value}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Products grouped by shop */}
                    {shops.map(shop => {
                        const shopProducts = products.filter(p => p.shopId === shop.id)
                        if (shopProducts.length === 0) return null
                        return (
                            <div key={shop.id} className="flex flex-col gap-2">
                                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                    <Store className="w-3.5 h-3.5" /> {shop.name}
                                    <span className="ml-auto text-slate-600 normal-case font-normal">{shopProducts.length} шт.</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {shopProducts.map(p => (
                                        <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            {p.imageUrls
                                                ? <img src={p.imageUrls} alt={p.title} className="w-full aspect-square object-cover" />
                                                : <div className="w-full aspect-square flex items-center justify-center text-slate-700"><Package className="w-8 h-8" /></div>
                                            }
                                            <div className="p-2">
                                                <p className="text-xs font-semibold text-slate-200 line-clamp-2">{p.title}</p>
                                                <p className="text-xs text-yellow-400 font-bold mt-0.5">{p.price.toLocaleString('ru-RU')} ₽</p>
                                                <p className="text-xs text-slate-600">Остаток: {p.stock}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    <div className="mt-2">
                        <Link
                            to="/admin"
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
                        >
                            <Package className="w-4 h-4" /> Управление товарами (Панель администратора)
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
