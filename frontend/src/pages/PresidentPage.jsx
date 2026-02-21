import { useState, useEffect, useCallback } from 'react'
import { Crown, Users, Store, ShoppingCart, Package, ArrowLeft, Plus, Trash2, Pencil, X, Check, ChevronDown, Shield, Truck, User, Search, CheckSquare, Square, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE, fetchWithAuth } from '../api'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
    CLIENT: { label: 'Клиент', icon: User, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)' },
    ADMIN: { label: 'Администратор', icon: Shield, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
    COURIER: { label: 'Курьер', icon: Truck, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)' },
    PRESIDENT: { label: 'Президент', icon: Crown, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
}

const STATUS = {
    PENDING: { l: 'Ожидает', c: '#fbbf24', bg: 'rgba(251,191,36,0.1)', br: 'rgba(251,191,36,0.2)' },
    CONFIRMED: { l: 'Подтверждён', c: '#60a5fa', bg: 'rgba(96,165,250,0.1)', br: 'rgba(96,165,250,0.2)' },
    DELIVERING: { l: 'Доставка', c: '#a78bfa', bg: 'rgba(167,139,250,0.1)', br: 'rgba(167,139,250,0.2)' },
    COMPLETED: { l: 'Выполнен', c: '#34d399', bg: 'rgba(52,211,153,0.1)', br: 'rgba(52,211,153,0.2)' },
    CANCELLED: { l: 'Отменён', c: '#f87171', bg: 'rgba(248,113,113,0.1)', br: 'rgba(248,113,113,0.2)' },
}

// Haptic feedback via Telegram WebApp
const haptic = (type = 'light') => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type) } catch { }
}

// ===== Sub-components =====

function TabBar({ tabs, active, onChange }) {
    return (
        <div className="grid gap-1 p-1" style={{
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18,
        }}>
            {tabs.map(tab => {
                const isActive = active === tab.id
                const Icon = tab.icon
                return (
                    <button
                        key={tab.id}
                        onClick={() => { haptic(); onChange(tab.id) }}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-[14px] text-[11px] font-bold transition-all duration-200 press-scale"
                        style={{
                            background: isActive ? 'rgba(124,58,237,0.25)' : 'transparent',
                            border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                            color: isActive ? '#c4b5fd' : 'rgba(148,163,184,0.7)',
                            boxShadow: isActive ? '0 2px 12px rgba(124,58,237,0.2)' : 'none',
                        }}
                    >
                        <Icon className="w-[18px] h-[18px]" style={{ strokeWidth: isActive ? 2.2 : 1.8 }} />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

function RoleBadge({ role, small }) {
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.CLIENT
    const Icon = cfg.icon
    return (
        <span className="inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap"
            style={{
                padding: small ? '3px 8px' : '4px 10px',
                fontSize: small ? 10 : 11,
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
            }}
        >
            <Icon style={{ width: small ? 10 : 11, height: small ? 10 : 11 }} />
            {cfg.label}
        </span>
    )
}

function StatusBadge({ status }) {
    const s = STATUS[status] || STATUS.PENDING
    return (
        <span className="inline-flex items-center rounded-full font-semibold"
            style={{ padding: '3px 9px', fontSize: 10, color: s.c, background: s.bg, border: `1px solid ${s.br}` }}
        >
            {s.l}
        </span>
    )
}

// Premium multi-shop chip selector
function ShopChipSelector({ shops, selected, onChange }) {
    const toggle = (id) => {
        haptic('light')
        onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
    }
    if (!shops.length) return <p className="text-xs text-slate-500 italic">Направления не созданы</p>

    return (
        <div className="flex flex-wrap gap-2">
            {shops.map(shop => {
                const isOn = selected.includes(shop.id)
                return (
                    <button
                        key={shop.id}
                        onClick={() => toggle(shop.id)}
                        className="flex items-center gap-1.5 rounded-2xl text-xs font-semibold transition-all duration-200 press-scale"
                        style={{
                            padding: '8px 14px',
                            minHeight: 36,
                            background: isOn ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isOn ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            color: isOn ? '#c4b5fd' : '#64748b',
                            boxShadow: isOn ? '0 0 12px rgba(124,58,237,0.2)' : 'none',
                        }}
                    >
                        {isOn
                            ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
                            : <Square className="w-3.5 h-3.5" />
                        }
                        {shop.name}
                    </button>
                )
            })}
        </div>
    )
}

// Notification Toast
function Toast({ notification }) {
    if (!notification) return null
    const isErr = notification.type === 'error'
    return (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down"
            style={{
                background: isErr ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                border: `1px solid ${isErr ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
                borderRadius: 16,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: isErr ? '0 4px 20px rgba(239,68,68,0.15)' : '0 4px 20px rgba(52,211,153,0.15)',
                backdropFilter: 'blur(20px)',
            }}
        >
            {isErr ? <X className="w-4 h-4 text-red-400 shrink-0" /> : <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span className="text-sm font-medium" style={{ color: isErr ? '#fca5a5' : '#6ee7b7' }}>{notification.msg}</span>
        </div>
    )
}

// Card wrapper
function Card({ children, className = '', style = {} }) {
    return (
        <div className={`rounded-2xl ${className}`}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', ...style }}
        >
            {children}
        </div>
    )
}

// Input
function Input({ ...props }) {
    return (
        <input
            className="w-full rounded-2xl px-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
            style={{
                height: 44,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
            {...props}
        />
    )
}

// Primary button
function Btn({ children, onClick, disabled, style = {}, variant = 'primary' }) {
    const base = variant === 'primary'
        ? { background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }
        : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
    return (
        <button
            onClick={() => { haptic('medium'); onClick?.() }}
            disabled={disabled}
            className="flex items-center justify-center gap-2 rounded-2xl text-sm font-bold press-scale transition-all duration-200 disabled:opacity-40"
            style={{ height: 44, paddingLeft: 20, paddingRight: 20, ...base, ...style }}
        >
            {children}
        </button>
    )
}

// ============================================================
export default function PresidentPage() {
    const { user } = useAuth()
    const [active, setActive] = useState('staff')
    const [notif, setNotif] = useState(null)

    const [users, setUsers] = useState([])
    const [shops, setShops] = useState([])
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([])
    const [couriers, setCouriers] = useState([])

    const [staffSearch, setStaffSearch] = useState('')
    const [editingUser, setEditingUser] = useState(null)
    const [editRole, setEditRole] = useState('')
    const [editShopIds, setEditShopIds] = useState([])

    const [newShopName, setNewShopName] = useState('')
    const [newShopDesc, setNewShopDesc] = useState('')
    const [editingShop, setEditingShop] = useState(null)
    const [isSavingShop, setIsSavingShop] = useState(false)

    const [orderSearch, setOrderSearch] = useState('')
    const [orderStatus, setOrderStatus] = useState('ALL')
    const [expandedOrder, setExpandedOrder] = useState(null)

    const notify = useCallback((msg, type = 'success') => {
        setNotif({ msg, type }); setTimeout(() => setNotif(null), 3500)
    }, [])

    const fetchAll = useCallback(async () => {
        const [u, s, o, p] = await Promise.all([
            fetchWithAuth(`${API_BASE}/api/users`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/shops`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/orders/all`).catch(() => null),
            fetchWithAuth(`${API_BASE}/api/products?all=true`).catch(() => null),
        ])
        if (u?.ok) { const d = await u.json(); setUsers(d); setCouriers(d.filter(x => ['COURIER', 'ADMIN'].includes(x.role))) }
        if (s?.ok) { const d = await s.json(); setShops(d) }
        if (o?.ok) { const d = await o.json(); setOrders(d.sort((a, b) => b.id - a.id)) }
        if (p?.ok) { const d = await p.json(); setProducts(d.sort((a, b) => b.id - a.id)) }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    // ---- Staff ----
    const openEdit = (u) => {
        haptic('light')
        setEditingUser(u)
        setEditRole(u.role)
        setEditShopIds(u.adminShops?.map(as => as.shopId) || [])
    }

    const saveRole = async () => {
        haptic('medium')
        const body = { role: editRole, shopIds: editRole === 'ADMIN' ? editShopIds : [] }
        const r = await fetchWithAuth(`${API_BASE}/api/users/${editingUser.id}/role`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        })
        if (r.ok) {
            notify('Роль обновлена')
            setEditingUser(null)
            const ur = await fetchWithAuth(`${API_BASE}/api/users`)
            if (ur.ok) { const d = await ur.json(); setUsers(d); setCouriers(d.filter(x => ['COURIER', 'ADMIN'].includes(x.role))) }
        } else { const e = await r.json(); notify(e.error || 'Ошибка', 'error') }
    }

    // ---- Shops ----
    const createShop = async () => {
        if (!newShopName.trim()) return
        haptic('medium')
        setIsSavingShop(true)
        const r = await fetchWithAuth(`${API_BASE}/api/shops`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newShopName.trim(), description: newShopDesc.trim() })
        })
        setIsSavingShop(false)
        if (r.ok) { notify('Направление создано'); setNewShopName(''); setNewShopDesc(''); fetchAll() }
        else { const e = await r.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const deleteShop = async (id) => {
        haptic('heavy')
        const r = await fetchWithAuth(`${API_BASE}/api/shops/${id}`, { method: 'DELETE' })
        if (r.ok) { notify('Направление удалено'); fetchAll() }
        else { const e = await r.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const saveShop = async () => {
        haptic('medium')
        const r = await fetchWithAuth(`${API_BASE}/api/shops/${editingShop.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: editingShop.name, description: editingShop.description, status: editingShop.status })
        })
        if (r.ok) { notify('Сохранено'); setEditingShop(null); fetchAll() }
        else { const e = await r.json(); notify(e.error || 'Ошибка', 'error') }
    }

    // ---- Orders ----
    const updateOrder = async (orderId, status, courierId) => {
        haptic('medium')
        const r = await fetchWithAuth(`${API_BASE}/api/orders/${orderId}/admin`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, courierId })
        })
        if (r.ok) { notify('Заказ обновлён'); setExpandedOrder(null); fetchAll() }
        else { const e = await r.json(); notify(e.error || 'Ошибка', 'error') }
    }

    const filtUsers = users.filter(u =>
        !staffSearch ||
        u.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        u.username?.toLowerCase().includes(staffSearch.toLowerCase())
    )

    const filtOrders = orders.filter(o => {
        const matchStatus = orderStatus === 'ALL' || o.status === orderStatus
        const matchSearch = !orderSearch || o.id.toString().includes(orderSearch) || o.user?.name?.toLowerCase().includes(orderSearch.toLowerCase())
        return matchStatus && matchSearch
    })

    const TABS = [
        { id: 'staff', label: 'Команда', icon: Users },
        { id: 'shops', label: 'Направления', icon: Store },
        { id: 'orders', label: 'Заказы', icon: ShoppingCart },
        { id: 'products', label: 'Товары', icon: Package },
    ]

    return (
        <div className="w-full flex flex-col gap-4 animate-fade-in">
            <Toast notification={notif} />

            {/* Header */}
            <div className="flex items-center justify-between pt-1">
                <Link to="/" className="flex items-center justify-center press-scale"
                    style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                </Link>

                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl animate-float"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,179,8,0.1))', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                        <Crown className="w-4 h-4 text-yellow-400" />
                    </div>
                    <h1 className="text-base font-black text-slate-100">Панель президента</h1>
                </div>

                <button onClick={fetchAll} className="flex items-center justify-center press-scale"
                    style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                    <Sparkles className="w-4 h-4 text-violet-400" />
                </button>
            </div>

            {/* Tab Bar */}
            <TabBar tabs={TABS} active={active} onChange={setActive} />

            {/* ========== STAFF ========== */}
            {active === 'staff' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                        <Input placeholder="Поиск..." style={{ paddingLeft: 44 }} value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Всего', val: users.length, color: '#c4b5fd' },
                            { label: 'Админы', val: users.filter(u => u.role === 'ADMIN').length, color: '#fbbf24' },
                            { label: 'Курьеры', val: users.filter(u => u.role === 'COURIER').length, color: '#60a5fa' },
                        ].map(s => (
                            <Card key={s.label} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                            </Card>
                        ))}
                    </div>

                    {/* User list */}
                    {filtUsers.map((u, i) => {
                        const isMe = u.id === user?.id
                        const isEditing = editingUser?.id === u.id
                        const adminShops = u.adminShops || []
                        return (
                            <Card key={u.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms`, overflow: 'hidden' }}>
                                {/* Main row */}
                                <div className="flex items-center gap-3 p-3.5">
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden"
                                            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                            {u.photoUrl
                                                ? <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-violet-400" /></div>
                                            }
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-200 truncate leading-tight">{u.name || 'Без имени'}</p>
                                        <p className="text-xs text-slate-500 truncate">{u.username ? `@${u.username}` : `ID: ${u.telegramId}`}</p>
                                        {adminShops.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {adminShops.map(as => (
                                                    <span key={as.shopId} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                                        style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                        {as.shop?.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Badge + edit */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <RoleBadge role={u.role} small />
                                        {!isMe && (
                                            <button
                                                onClick={() => isEditing ? setEditingUser(null) : openEdit(u)}
                                                className="flex items-center justify-center press-scale rounded-xl"
                                                style={{ width: 36, height: 36, background: isEditing ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            >
                                                {isEditing ? <X className="w-4 h-4 text-violet-400" /> : <Pencil className="w-4 h-4 text-slate-400" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Edit panel */}
                                {isEditing && (
                                    <div className="px-3.5 pb-3.5 flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in">
                                        {/* Role selector */}
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Роль</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['CLIENT', 'ADMIN', 'COURIER'].map(r => {
                                                    const cfg = ROLE_CONFIG[r]
                                                    const Icon = cfg.icon
                                                    const isActive = editRole === r
                                                    return (
                                                        <button key={r}
                                                            onClick={() => { haptic(); setEditRole(r) }}
                                                            className="flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-bold press-scale transition-all"
                                                            style={{
                                                                background: isActive ? cfg.bg : 'rgba(255,255,255,0.04)',
                                                                border: `1px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.07)'}`,
                                                                color: isActive ? cfg.color : '#475569',
                                                                boxShadow: isActive ? `0 0 16px ${cfg.bg}` : 'none',
                                                            }}
                                                        >
                                                            <Icon className="w-5 h-5" />
                                                            {cfg.label.split(' ')[0]}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Multi-shop selector for ADMIN */}
                                        {editRole === 'ADMIN' && (
                                            <div className="animate-fade-in">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Направления</p>
                                                <ShopChipSelector
                                                    shops={shops}
                                                    selected={editShopIds}
                                                    onChange={setEditShopIds}
                                                />
                                                {editShopIds.length > 0 && (
                                                    <p className="text-[10px] text-violet-400 mt-2">
                                                        Выбрано {editShopIds.length} из {shops.length}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Btn onClick={saveRole} style={{ flex: 1 }}>
                                                <Check className="w-4 h-4" /> Сохранить
                                            </Btn>
                                            <Btn variant="ghost" onClick={() => setEditingUser(null)} style={{ width: 80 }}>
                                                Отмена
                                            </Btn>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                    {!filtUsers.length && (
                        <div className="text-center py-12 text-slate-600 text-sm">Пользователей нет</div>
                    )}
                </div>
            )}

            {/* ========== SHOPS ========== */}
            {active === 'shops' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                    {/* Add form */}
                    <Card style={{ padding: 16 }}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                                <Plus className="w-4 h-4 text-violet-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-300">Новое направление</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Input placeholder="Название" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                            <Input placeholder="Описание (необязательно)" value={newShopDesc} onChange={e => setNewShopDesc(e.target.value)} />
                            <Btn onClick={createShop} disabled={isSavingShop || !newShopName.trim()}>
                                {isSavingShop ? '...' : 'Создать'}
                            </Btn>
                        </div>
                    </Card>

                    {/* Shops list */}
                    {shops.map((s, i) => (
                        <Card key={s.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, overflow: 'hidden' }}>
                            {editingShop?.id === s.id ? (
                                <div className="p-4 flex flex-col gap-2">
                                    <Input value={editingShop.name} onChange={e => setEditingShop(p => ({ ...p, name: e.target.value }))} />
                                    <Input placeholder="Описание" value={editingShop.description || ''} onChange={e => setEditingShop(p => ({ ...p, description: e.target.value }))} />
                                    <select className="w-full rounded-2xl px-4 text-sm text-slate-200 outline-none"
                                        style={{ height: 44, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        value={editingShop.status} onChange={e => setEditingShop(p => ({ ...p, status: e.target.value }))}>
                                        <option value="ACTIVE">Активно</option>
                                        <option value="INACTIVE">Неактивно</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <Btn onClick={saveShop} style={{ flex: 1 }}><Check className="w-4 h-4" /> Сохранить</Btn>
                                        <Btn variant="ghost" onClick={() => setEditingShop(null)} style={{ width: 80 }}>Отмена</Btn>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4">
                                    <div className="w-12 h-12 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
                                        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                        {s.imageUrl
                                            ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                                            : <Store className="w-6 h-6 text-violet-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-200 truncate">{s.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{s.description || 'Нет описания'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                                style={s.status === 'ACTIVE'
                                                    ? { color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }
                                                    : { color: '#64748b', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                                                {s.status === 'ACTIVE' ? 'Активно' : 'Неактивно'}
                                            </span>
                                            <span className="text-[10px] text-slate-600">
                                                {products.filter(p => p.shopId === s.id).length} товаров
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={() => { haptic(); setEditingShop({ ...s }) }}
                                            className="flex items-center justify-center press-scale rounded-xl"
                                            style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <Pencil className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button onClick={() => deleteShop(s.id)}
                                            className="flex items-center justify-center press-scale rounded-xl"
                                            style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* ========== ORDERS ========== */}
            {active === 'orders' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { l: 'Новых', v: orders.filter(o => o.status === 'PENDING').length, c: '#fbbf24' },
                            { l: 'В пути', v: orders.filter(o => o.status === 'DELIVERING').length, c: '#a78bfa' },
                            { l: 'Готово', v: orders.filter(o => o.status === 'COMPLETED').length, c: '#34d399' },
                        ].map(s => (
                            <Card key={s.l} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <p className="text-xl font-black" style={{ color: s.c }}>{s.v}</p>
                                <p className="text-[10px] text-slate-500">{s.l}</p>
                            </Card>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                            <Input placeholder="Поиск..." style={{ paddingLeft: 44 }} value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                        </div>
                        <select
                            className="rounded-2xl px-3 text-sm text-slate-200 outline-none shrink-0"
                            style={{ height: 44, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                            value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                            <option value="ALL">Все</option>
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                        </select>
                    </div>

                    {/* Orders */}
                    {filtOrders.map((o, i) => {
                        const expanded = expandedOrder === o.id
                        return (
                            <Card key={o.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms`, overflow: 'hidden' }}>
                                <button
                                    className="w-full flex items-center gap-3 p-4 press-scale text-left"
                                    onClick={() => { haptic('light'); setExpandedOrder(expanded ? null : o.id) }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-slate-200">#{o.id}</span>
                                            <StatusBadge status={o.status} />
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {o.user?.name} · {o.total?.toLocaleString('ru-RU')} ₽
                                        </p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
                                </button>

                                {expanded && (
                                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in">
                                        {o.items?.map(item => (
                                            <div key={item.id} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 truncate mr-3">{item.product?.title}</span>
                                                <span className="text-slate-500 shrink-0">{item.quantity} × {item.price?.toLocaleString('ru-RU')} ₽</span>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1 font-bold">Статус</p>
                                                <select className="w-full rounded-2xl px-3 text-xs text-slate-200 outline-none"
                                                    style={{ height: 40, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                    defaultValue={o.status}
                                                    onChange={e => updateOrder(o.id, e.target.value, o.courierId)}>
                                                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1 font-bold">Курьер</p>
                                                <select className="w-full rounded-2xl px-3 text-xs text-slate-200 outline-none"
                                                    style={{ height: 40, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                    defaultValue={o.courierId || ''}
                                                    onChange={e => updateOrder(o.id, o.status, e.target.value || null)}>
                                                    <option value="">— Не назначен</option>
                                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                    {!filtOrders.length && <div className="text-center py-12 text-slate-600 text-sm">Заказов нет</div>}
                </div>
            )}

            {/* ========== PRODUCTS ========== */}
            {active === 'products' && (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { l: 'Товаров', v: products.length, c: '#c4b5fd' },
                            { l: 'Магазинов', v: shops.length, c: '#fbbf24' },
                        ].map(s => (
                            <Card key={s.l} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
                                <p className="text-xs text-slate-500">{s.l}</p>
                            </Card>
                        ))}
                    </div>

                    {shops.map(shop => {
                        const ps = products.filter(p => p.shopId === shop.id)
                        if (!ps.length) return null
                        return (
                            <div key={shop.id}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Store className="w-3.5 h-3.5 text-slate-500" />
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{shop.name}</p>
                                    <span className="text-xs text-slate-700 ml-auto">{ps.length} шт.</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {ps.map((p, i) => (
                                        <Card key={p.id} className="animate-fade-in overflow-hidden" style={{ animationDelay: `${i * 40}ms` }}>
                                            {p.imageUrls
                                                ? <img src={p.imageUrls} alt={p.title} className="w-full aspect-square object-cover" />
                                                : <div className="w-full aspect-square flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.06)' }}>
                                                    <Package className="w-8 h-8 text-slate-700" />
                                                </div>}
                                            <div className="p-3">
                                                <p className="text-xs font-bold text-slate-300 line-clamp-2 leading-snug">{p.title}</p>
                                                <p className="text-xs font-black mt-1" style={{ color: '#a78bfa' }}>{p.price.toLocaleString('ru-RU')} ₽</p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    <Link to="/admin" className="flex items-center justify-center gap-2 press-scale rounded-2xl text-sm font-bold"
                        style={{ height: 48, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}
                        onClick={() => haptic('light')}>
                        <Package className="w-4 h-4" /> Полное управление товарами
                    </Link>
                </div>
            )}
        </div>
    )
}
