'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    FileSpreadsheet,
    LogOut,
    User,
    ShieldCheck,
    ChevronDown,
    Menu,
    X,
    Building2
} from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

import Logo from '@/app/component/logo/Logo'

interface UserSession {
    id: string
    name: string | null
    email: string
    role: 'SUPER_ADMIN' | 'STANDARD_ADMIN'
    organizationId: string | null
    organizationName: string | null
}

export default function DashboardHeader({ session }: { session: any }) {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const dropdownRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    const user: UserSession = session?.user
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const navLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/records', label: 'Registry', icon: FileSpreadsheet },
    ]

    const dropdownLinks = [
        ...(isSuperAdmin ? [{ href: '/dashboard/super-admin', label: 'Federation Control', icon: ShieldCheck }] : []),
    ]

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
                ? "bg-white/80 backdrop-blur-xl border-b border-gray-100 py-2 shadow-sm"
                : "bg-white py-1 border-b border-transparent"
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Left: Logo & Desktop Nav */}
                    <div className="flex items-center space-x-12">
                        <Link href="/dashboard" className="flex items-center space-x-3 group">
                            <Logo width={isScrolled ? 35 : 42} height={isScrolled ? 35 : 42} text="ADRMS" size={isScrolled ? "md" : "xl"} />
                        </Link>

                        <div className="hidden md:flex space-x-2">
                            {navLinks.map((link) => {
                                const Icon = link.icon
                                const isActive = pathname === link.href
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-2.5 ${isActive
                                            ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                                        <span>{link.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: User Profile & Mobile Toggle */}
                    <div className="flex items-center space-x-6">
                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-4 p-1.5 pl-4 rounded-2xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all duration-300 focus:outline-none"
                            >
                                <div className="flex flex-col items-end hidden sm:flex">
                                    <span className="text-sm font-bold text-gray-900 leading-none">{user?.name || 'Admin'}</span>
                                    <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1.5">{user?.role?.replace('_', ' ')}</span>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900 shadow-sm border border-gray-200">
                                    <User className="h-5 w-5" />
                                </div>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                        className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden"
                                    >
                                        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] truncate">
                                                    {user?.organizationName || 'Master Access'}
                                                </p>
                                            </div>
                                            <p className="text-base font-bold text-gray-900 truncate">{user?.name}</p>
                                            <p className="text-xs text-gray-500 truncate font-medium">{user?.email}</p>
                                        </div>

                                        <div className="p-2">
                                            {dropdownLinks.map((link) => {
                                                const Icon = link.icon
                                                return (
                                                    <Link
                                                        key={link.href}
                                                        href={link.href}
                                                        onClick={() => setIsDropdownOpen(false)}
                                                        className="flex items-center space-x-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl transition-all group"
                                                    >
                                                        <Icon className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                                        <span>{link.label}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>

                                        <div className="p-2 border-t border-gray-50 mt-1">
                                            <form action={logoutAction}>
                                                <button
                                                    type="submit"
                                                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all group"
                                                >
                                                    <LogOut className="h-5 w-5 text-red-300 group-hover:text-red-500 transition-colors" />
                                                    <span>End Session</span>
                                                </button>
                                            </form>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-3 bg-gray-50 text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden border-t border-gray-100 bg-white"
                    >
                        <div className="px-4 py-6 space-y-2">
                            {navLinks.map((link) => {
                                const Icon = link.icon
                                const isActive = pathname === link.href
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center space-x-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${isActive
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="h-6 w-6" />
                                        <span>{link.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
