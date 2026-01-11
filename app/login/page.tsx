'use client'

import { useState, useActionState } from 'react'
import { loginAction } from '../actions/auth'
import { Key, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../component/logo/Logo'

// Initial state for the form
const initialState = {
    message: '',
    errors: undefined
}

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(loginAction, initialState)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6">
            <div className="max-w-md w-full md:p-10 p-6 bg-white md:rounded-[2.5rem] rounded-2xl border border-gray-100">
                <div className="text-center">
                    <div className="flex items-center justify-center scale-110 mb-2">
                        <Logo width={45} height={45} text="ADRMS" size="xl" />
                    </div>
                    <h2 className="mt-6 text-2xl font-black text-gray-900 uppercase tracking-tighter">
                        Administrative Access
                    </h2>
                    <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                        Gateway to the Blockchain Registry
                    </p>
                </div>

                <form action={formAction} className="mt-10 space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-1.5">Identifier</label>
                            <input
                                name="identifier"
                                type="text"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm placeholder:text-gray-300"
                                placeholder="Email or Organization Name"
                            />
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-1.5">Security Key</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm placeholder:text-gray-300 pr-12"
                                    placeholder="Enter secure password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {state?.message && (
                        <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold text-center rounded-lg border border-red-100">{state.message}</div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-4 bg-gray-900 text-white md:rounded-xl rounded-lg font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-widest"
                    >
                        {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Authenticate'}
                    </button>
                </form>
            </div>
        </div>
    )
}
