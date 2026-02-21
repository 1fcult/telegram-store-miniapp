import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Shield, Truck, Wallet, User } from 'lucide-react'

export default function UserProfileCard() {
    const { user, isAdmin, isCourier, balance } = useAuth()

    if (!user) return null

    const avatarUrl = user.photoUrl || null
    const displayName = user.name || 'Пользователь'
    const username = user.username ? `@${user.username}` : ''

    return (
        <div className="w-full max-w-lg mx-auto mb-4">
            <div
                className="relative flex items-center gap-4 px-4 py-3 rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(217,70,239,0.1) 100%)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    backdropFilter: 'blur(16px)',
                }}
            >
                {/* Декоративный блик */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

                {/* Аватар */}
                <div className="flex-shrink-0">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-violet-500/50"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-violet-500/50"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                            <User className="w-6 h-6 text-white" />
                        </div>
                    )}
                </div>

                {/* Имя и username */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate text-sm">{displayName}</p>
                    {username && (
                        <p className="text-xs text-violet-400 truncate">{username}</p>
                    )}
                    {/* Бейджи ролей */}
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Shield className="w-3 h-3" /> Админ
                            </span>
                        )}
                        {isCourier && !isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <Truck className="w-3 h-3" /> Курьер
                            </span>
                        )}
                    </div>
                </div>

                {/* Баланс */}
                <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 justify-end">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-400">
                            {balance.toLocaleString('ru-RU')} ₽
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Бонусный счёт</p>

                    {/* Ссылки на панели */}
                    <div className="flex gap-2 mt-1.5 justify-end">
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                            >
                                Админ
                            </Link>
                        )}
                        {isCourier && (
                            <Link
                                to="/courier"
                                className="text-xs px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                            >
                                Курьер
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
