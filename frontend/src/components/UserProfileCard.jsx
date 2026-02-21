import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Shield, Truck, Wallet, User, Crown } from 'lucide-react'

const ROLE_CONFIG = {
    PRESIDENT: { label: 'Президент', icon: Crown, gradient: 'from-yellow-400 to-amber-500', glow: 'rgba(234,179,8,0.3)', border: 'rgba(234,179,8,0.25)', text: '#fbbf24' },
    ADMIN: { label: 'Администратор', icon: Shield, gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
    COURIER: { label: 'Курьер', icon: Truck, gradient: 'from-blue-400 to-cyan-500', glow: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
    CLIENT: { label: 'Клиент', icon: User, gradient: 'from-slate-400 to-slate-500', glow: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.1)', text: '#94a3b8' },
}

export default function UserProfileCard() {
    const { user, isPresident, isAdmin, isCourier, balance } = useAuth()

    if (!user) return null

    const role = isPresident ? 'PRESIDENT' : isAdmin ? 'ADMIN' : isCourier ? 'COURIER' : 'CLIENT'
    const cfg = ROLE_CONFIG[role]
    const RoleIcon = cfg.icon
    const avatarUrl = user.photoUrl || null
    const displayName = user.name || 'Пользователь'
    const username = user.username ? `@${user.username}` : null

    const panelLink = isPresident ? '/president' : isAdmin ? '/admin' : isCourier ? '/courier' : null
    const panelLabel = isPresident ? '👑 Панель' : isAdmin ? '🛡 Панель' : '🚚 Панель'

    return (
        <div className="w-full animate-fade-in mb-2" style={{ animationDelay: '50ms' }}>
            <div
                className="relative overflow-hidden rounded-2xl p-4"
                style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
                    border: `1px solid ${cfg.border}`,
                    boxShadow: `0 4px 24px ${cfg.glow}, 0 1px 0 rgba(255,255,255,0.06) inset`,
                }}
            >
                {/* Animated shimmer top line */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.text}55, transparent)` }} />

                {/* Background glow orb */}
                <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
                />

                <div className="relative flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                        <div
                            className="w-14 h-14 rounded-2xl overflow-hidden"
                            style={{ boxShadow: `0 0 0 2px ${cfg.border}, 0 4px 12px rgba(0,0,0,0.3)` }}
                        >
                            {avatarUrl
                                ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                : <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${cfg.gradient}`}>
                                    <User className="w-7 h-7 text-white/80" />
                                </div>
                            }
                        </div>
                        {/* Role icon badge */}
                        <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${cfg.text}dd, ${cfg.text}88)`, boxShadow: `0 0 8px ${cfg.glow}` }}
                        >
                            <RoleIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                    </div>

                    {/* Name + role */}
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-100 text-base leading-tight truncate">{displayName}</p>
                        {username && <p className="text-xs truncate mt-0.5" style={{ color: cfg.text + 'bb' }}>{username}</p>}
                        <div
                            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: cfg.glow, border: `1px solid ${cfg.border}`, color: cfg.text }}
                        >
                            <RoleIcon className="w-3 h-3" />
                            {cfg.label}
                        </div>
                    </div>

                    {/* Right side: balance + panel link */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {/* Balance */}
                        <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                                    {balance.toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-0.5">бонусы</p>
                        </div>

                        {/* Panel button */}
                        {panelLink && (
                            <Link
                                to={panelLink}
                                className="text-xs px-3 py-1 rounded-xl font-semibold transition-all press-scale"
                                style={{
                                    background: cfg.glow,
                                    border: `1px solid ${cfg.border}`,
                                    color: cfg.text,
                                    boxShadow: `0 2px 8px ${cfg.glow}`
                                }}
                            >
                                {panelLabel}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
