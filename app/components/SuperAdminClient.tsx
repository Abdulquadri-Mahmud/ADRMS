'use client'

import { useState, useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, Trash2, Shield, User, Lock, Loader2, Building2, Key, Eye, X, Info, AlertTriangle, Check } from 'lucide-react'
import { createAdmin, deleteAdmin } from '../actions/super-admin'
import { Modal } from './ui/Modal'
import { motion, AnimatePresence } from 'framer-motion'

function AdminDetailRow({ label, value, icon, highlight = false }: { label: string, value: string, icon: React.ReactNode, highlight?: boolean }) {
    return (
        <div className="flex items-center space-x-4 group/row">
            <div className={`p-3 rounded-2xl transition-colors ${highlight ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400 group-hover/row:bg-white group-hover/row:shadow-md'}`}>
                {icon}
            </div>
            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                <div className={`text-sm font-bold ${highlight ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</div>
            </div>
        </div>
    )
}

export default function SuperAdminClient({
    admins,
    currentUserId
}: {
    admins: any[],
    currentUserId: string
}) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedAdmin, setSelectedAdmin] = useState<any>(null)
    const [alertConfig, setAlertConfig] = useState<{
        show: boolean,
        title: string,
        message: string,
        type: 'info' | 'error' | 'confirm',
        onConfirm?: () => void,
        confirmText?: string,
        cancelText?: string
    }>({ show: false, title: '', message: '', type: 'info' })
    const [state, formAction] = useActionState(createAdmin, { success: false, message: '' })

    useEffect(() => {
        if (state.success) {
            setIsModalOpen(false)
        }
    }, [state.success])

    const handleDelete = async (id: string) => {
        setAlertConfig({
            show: true,
            title: 'Confirm Deletion',
            message: 'Are you sure you want to delete this admin account? This action cannot be undone and will revoke their dashboard access permanently.',
            type: 'confirm',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, show: false }))
                try {
                    await deleteAdmin(id)
                } catch (error: any) {
                    setAlertConfig({
                        show: true,
                        title: 'Operational Error',
                        message: error.message || 'We encountered a problem while trying to delete this account.',
                        type: 'error'
                    })
                }
            }
        })
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Access Control</h1>
                    <p className="text-gray-500 mt-2 max-w-2xl text-lg font-medium leading-relaxed">
                        Authorize Jamaat administrators. Super Admins can seed Standard Admins permanently linked
                        to their respective organizations.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-gray-900/10 active:scale-95 text-sm font-black uppercase tracking-widest"
                >
                    <Plus className="h-4 w-4 mr-2 stroke-[3]" />
                    Register Admin
                </button>
            </div>

            <div className="bg-white shadow-sm rounded-[2.5rem] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-50">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Administrator</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Organization (Jamaat)</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Access Role</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {admins.map((admin, i) => (
                                <tr key={admin._id || admin.id || i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-white group-hover:shadow-md transition-all">
                                                {admin.name?.charAt(0) || 'A'}
                                            </div>
                                            <div>
                                                <div className="text-base font-bold text-gray-900">{admin.name}</div>
                                                <div className="text-xs text-gray-400 font-medium">{admin.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center text-sm font-bold text-gray-600">
                                            <Building2 className="w-4 h-4 mr-2 text-gray-300" />
                                            {admin.organization?.name || <span className="text-gray-300 italic">No Org Assigned</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center ${admin.role === 'SUPER_ADMIN'
                                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            }`}>
                                            <Shield className="w-3 h-3 mr-1.5" />
                                            {admin.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-2">
                                        <button
                                            onClick={() => setSelectedAdmin(admin)}
                                            className="p-3 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            title="View Details"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                        {admin._id !== currentUserId && (
                                            <button
                                                onClick={() => handleDelete(admin._id)}
                                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Account"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedAdmin && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAdmin(null)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-10 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
                                <button
                                    onClick={() => setSelectedAdmin(null)}
                                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                                <div className="flex items-center space-x-6">
                                    <div className="h-20 w-20 rounded-3xl bg-white/10 flex items-center justify-center text-4xl font-black backdrop-blur-md border border-white/10">
                                        {selectedAdmin.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black">{selectedAdmin.name}</h3>
                                        <div className="flex items-center mt-1 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                            <Shield className="w-3 h-3 mr-2 text-emerald-500" />
                                            {selectedAdmin.role.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 gap-6">
                                    <AdminDetailRow label="Primary Email" value={selectedAdmin.email} icon={<User className="w-4 h-4" />} />
                                    <AdminDetailRow
                                        label="Organization"
                                        value={selectedAdmin.organization?.name || 'Central Headquaters'}
                                        icon={<Building2 className="w-4 h-4" />}
                                    />
                                    <AdminDetailRow
                                        label="Account Status"
                                        value="Active & Authorized"
                                        icon={<Key className="w-4 h-4" />}
                                        highlight
                                    />
                                </div>
                                <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <span>Added: {new Date(selectedAdmin.createdAt).toLocaleDateString()}</span>
                                    <span>ID: ...{selectedAdmin._id.slice(-6)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision New Admin">
                <div className="mb-8 p-6 bg-emerald-900 rounded-3xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300 mb-2 font-black">Security Protocol</p>
                        <p className="text-sm font-medium leading-relaxed opacity-90">
                            Standard Admins follow the rule:
                            <span className="block mt-2 font-bold bg-white/10 p-2 rounded-lg border border-white/10">
                                Password = [Jamaat Name] + [Number]
                            </span>
                        </p>
                    </div>
                </div>

                <form action={formAction} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                            <div className="relative">
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Enter Admin Full Name"
                                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold"
                                />
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Jama'at (Organization)</label>
                            <div className="relative">
                                <input
                                    name="organizationName"
                                    type="text"
                                    required
                                    placeholder="e.g. Lagos Jama'at"
                                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold placeholder:text-gray-300"
                                />
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password Suffix (#)</label>
                            <div className="relative">
                                <input
                                    name="passwordNumber"
                                    type="number"
                                    required
                                    placeholder="e.g. 123"
                                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold"
                                />
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Assign Role</label>
                            <div className="relative">
                                <select
                                    name="role"
                                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-black text-sm appearance-none cursor-pointer"
                                >
                                    <option value="STANDARD_ADMIN">Standard Administrator</option>
                                    <option value="SUPER_ADMIN">Federation Super Admin</option>
                                </select>
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {state.message && (
                        <div className={`p-5 rounded-2xl border text-sm font-bold ${state.success
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-red-50 border-red-100 text-red-700'}`}>
                            {state.message}
                        </div>
                    )}

                    <div className="flex justify-end pt-6">
                        <SubmitButton />
                    </div>
                </form>
            </Modal>
        </div>
    )
}

function NotificationModal({ config, onClose }: { config: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm md:rounded-[2rem] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 p-8 text-center"
            >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${config.type === 'error' ? 'bg-red-50 text-red-600' :
                    config.type === 'confirm' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                    }`}>
                    {config.type === 'error' ? <AlertTriangle className="w-8 h-8" /> :
                        config.type === 'confirm' ? <Info className="w-8 h-8" /> :
                            <Check className="w-8 h-8" />}
                </div>

                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">{config.title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{config.message}</p>

                <div className="flex flex-col space-y-3">
                    {config.type === 'confirm' ? (
                        <>
                            <button
                                onClick={config.onConfirm}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-lg"
                            >
                                {config.confirmText || 'Yes, Proceed'}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all"
                            >
                                {config.cancelText || 'Cancel'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all"
                        >
                            Dismiss
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto inline-flex justify-center py-4 px-10 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-emerald-600 focus:outline-none transition-all shadow-xl shadow-gray-900/10 disabled:opacity-50"
        >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finalize Registration'}
        </button>
    )
}
