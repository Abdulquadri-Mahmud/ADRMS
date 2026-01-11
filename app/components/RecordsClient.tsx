'use client'

import { useState, useTransition, useEffect } from 'react'
import {
    Search,
    Plus,
    Download,
    Users,
    Receipt,
    Building2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Filter,
    X,
    Loader2,
    CheckCircle2,
    Trash2,
    Pencil,
    AlertTriangle,
    Info,
    Check
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import { createChandaAmRecord, createTajnidRecord, deleteRecords, createMultipleRecords, updateChandaAmRecord, updateTajnidRecord, getAllRecordsForExport } from '../actions/records'

const MAJLIS_OPTIONS = ['ATFAL', 'KHUDDAM', 'ANSARULLAH', 'LAJNAH', 'NASIRAT']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CHANDA_FUNDS = [
    { id: 'chandaAam', name: "Chanda'Am" },
    { id: 'chandaWasiyyat', name: 'Wasiyyat' },
    { id: 'jalsaSalana', name: 'Jalsa Salana' },
    { id: 'tarikiJadid', name: 'Tariki Jadid' },
    { id: 'waqfiJadid', name: 'Waqfi Jadid' },
    { id: 'welfareFund', name: 'Welfare Fund' },
    { id: 'zakat', name: 'Zakat' },
    { id: 'fitrana', name: 'Fitrana' },
    { id: 'mosqueDonation', name: 'Mosque Donation' },
    { id: 'mta', name: 'MTA' },
    { id: 'scholarship', name: 'Scholarship' },
    { id: 'zakatulFitr', name: 'Zakatul-Fitr' },
    { id: 'tabligh', name: 'Tabligh' },
    { id: 'sadakat', name: 'Sadakat' },
    { id: 'centinaryKhilafat', name: 'Centinary Khilafat' },
    { id: 'bilalFund', name: 'Bilal Fund' },
    { id: 'yatamaFund', name: 'Yatama Fund' },
    { id: 'localFund', name: 'Local Fund' },
    { id: 'miscellanous', name: 'Miscellaneous' },
    { id: 'maryamFund', name: 'Maryam Fund' },
]

export default function RecordsClient({
    records,
    total,
    searchParams
}: {
    records: any[],
    total: number,
    searchParams: { q?: string, page?: string, type?: string, month?: string, majlis?: string }
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const currentType = searchParams.type || 'chanda'
    const currentPage = Number(searchParams.page) || 1
    const totalPages = Math.ceil(total / 20)

    const [searchTerm, setSearchTerm] = useState(searchParams.q || '')
    const [isNewModalOpen, setIsNewModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [selectedMember, setSelectedMember] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [alertConfig, setAlertConfig] = useState<{
        show: boolean,
        title: string,
        message: string,
        type: 'info' | 'error' | 'confirm',
        onConfirm?: () => void,
        confirmText?: string,
        cancelText?: string
    }>({ show: false, title: '', message: '', type: 'info' })

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(window.location.search)
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) params.delete(key)
            else params.set(key, value)
        })
        startTransition(() => {
            router.replace(`?${params.toString()}`)
        })
    }

    const handleSearch = (term: string) => {
        setSearchTerm(term)
        updateParams({ q: term || null, page: '1' })
    }

    const setType = (type: string) => {
        setSearchTerm('')
        updateParams({ type, page: '1', q: null, month: null, majlis: null })
    }

    const handleFilterChange = (key: string, value: string) => {
        updateParams({ [key]: value || null, page: '1' })
    }

    const handlePageChange = (page: number) => {
        updateParams({ page: String(page) })
    }

    const handleDeleteSelected = async () => {
        setAlertConfig({
            show: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete ${selectedIds.length} records? This action cannot be undone.`,
            type: 'confirm',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, show: false }))
                setIsDeleting(true)
                const res = await deleteRecords(selectedIds, currentType as any)
                if (res.success) {
                    setSelectedIds([])
                    router.refresh()
                } else {
                    setAlertConfig({
                        show: true,
                        title: 'Deletion Failed',
                        message: res.message || 'An error occurred while deleting records.',
                        type: 'error'
                    })
                }
                setIsDeleting(false)
            }
        })
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = (ids: string[]) => {
        setSelectedIds(prev =>
            prev.length === ids.length ? [] : ids
        )
    }

    const exportExcel = async () => {
        setIsExporting(true)
        try {
            const allRecords = await getAllRecordsForExport(
                currentType as any,
                searchParams.q,
                { month: searchParams.month, majlis: searchParams.majlis }
            )

            // Clean up records for export (remove internal meta fields)
            const exportData = allRecords.map((record: any) => {
                const { _id, organizationId, adminId, createdAt, updatedAt, organization, ...clean } = record

                // Format the user-facing date if it exists
                if (clean.date) {
                    try {
                        clean.date = new Date(clean.date).toLocaleDateString('en-GB')
                    } catch (e) {
                        // Keep as is if invalid
                    }
                }

                // For ChandaAm, we might want to ensure totalNgn is at the end or near the front
                // but for now, just removing the meta fields is what was requested
                return clean
            })

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Export")
            XLSX.writeFile(wb, `${currentType}_universal_export_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (err) {
            console.error(err)
            setAlertConfig({
                show: true,
                title: 'Export Error',
                message: 'We encountered an issue while generating your Excel file. Please try again.',
                type: 'error'
            })
        } finally {
            setIsExporting(false)
        }
    }

    const tabs = [
        { id: 'chanda', name: 'ChandaAm', icon: Receipt },
        { id: 'tajnid', name: 'Tajnid', icon: Users },
    ]

    return (
        <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/80 backdrop-blur-sm md:rounded-2xl rounded-xl w-fit border border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setType(tab.id)
                            setSelectedIds([])
                        }}
                        className={`flex items-center space-x-2 md:px-6 px-4 py-2.5 md:rounded-xl rounded-lg text-sm font-black transition-all duration-300 ${currentType === tab.id
                            ? 'bg-white text-emerald-600 border border-emerald-100'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                            }`}
                    >
                        <tab.icon className={`w-4 h-4 ${currentType === tab.id ? 'text-emerald-500' : ''}`} />
                        <span>{tab.name}</span>
                    </button>
                ))}
            </div>

            {/* Header / Sub-actions */}
            <div className="bg-white md:p-6 p-3 md:rounded-[2rem] rounded-2xl border border-gray-100">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:max-w-3xl">
                        <div className="relative flex-[2]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${currentType === 'chanda' ? 'Chanda Am' : 'Tajnid'} records...`}
                                className="w-full pl-14 pr-6 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="relative flex-1">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                                onChange={(e) => handleFilterChange(currentType === 'chanda' ? 'month' : 'majlis', e.target.value)}
                                value={currentType === 'chanda' ? (searchParams.month || '') : (searchParams.majlis || '')}
                            >
                                <option value="">All {currentType === 'chanda' ? 'Months' : 'Majlis'}</option>
                                {(currentType === 'chanda' ? MONTHS : MAJLIS_OPTIONS).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <AnimatePresence>
                            {selectedIds.length > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={handleDeleteSelected}
                                    disabled={isDeleting}
                                    className="flex-1 lg:flex-none inline-flex items-center justify-center px-6 py-3.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-sm border border-red-100"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Delete ({selectedIds.length})
                                </motion.button>
                            )}
                        </AnimatePresence>
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm active:scale-95"
                        >
                            <Plus className="w-4 h-4 mr-2 stroke-[3]" />
                            Add New
                        </button>
                        <button
                            onClick={exportExcel}
                            disabled={isExporting}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2 text-emerald-600" />}
                            {isExporting ? 'Exporting...' : 'Export All'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white md:rounded-[2rem] rounded-2xl border border-gray-100 overflow-hidden transition-all duration-500">
                <div className="overflow-x-auto relative">
                    {isPending && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
                        </div>
                    )}
                    {currentType === 'chanda' && (
                        <ChandaTable
                            records={records}
                            onView={setSelectedMember}
                            onEdit={setEditingRecord}
                            selectedIds={selectedIds}
                            onSelect={toggleSelect}
                            onSelectAll={() => toggleSelectAll(records.map(r => r._id))}
                        />
                    )}
                    {currentType === 'tajnid' && (
                        <TajnidTable
                            records={records}
                            onView={setSelectedMember}
                            onEdit={setEditingRecord}
                            selectedIds={selectedIds}
                            onSelect={toggleSelect}
                            onSelectAll={() => toggleSelectAll(records.map(r => r._id))}
                        />
                    )}
                </div>

                {records.length === 0 && !isPending && (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                            <Search className="w-10 h-10 text-gray-200" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">No records found</h4>
                        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto italic">We couldn't find any {currentType} records matching your current filters.</p>
                    </div>
                )}

                {/* Pagination */}
                {total > 20 && (
                    <div className="px-8 py-6 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                            Showing <span className="text-emerald-600">{(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, total)}</span> of {total}
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === i + 1
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {i + 1}
                                </button>
                            )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {(isNewModalOpen || editingRecord) && (
                    <RecordModal
                        type={currentType}
                        initialData={editingRecord}
                        onClose={() => {
                            setIsNewModalOpen(false)
                            setEditingRecord(null)
                        }}
                        refresh={() => router.refresh()}
                    />
                )}
                {selectedMember && (
                    <MemberDetailModal
                        record={selectedMember}
                        type={currentType}
                        onClose={() => setSelectedMember(null)}
                    />
                )}
                {alertConfig.show && (
                    <NotificationModal
                        config={alertConfig}
                        onClose={() => setAlertConfig(prev => ({ ...prev, show: false }))}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function ChandaTable({ records, onView, onEdit, selectedIds, onSelect, onSelectAll }: any) {
    return (
        <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
                <tr>
                    <th className="px-6 py-4 text-left">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={records.length > 0 && selectedIds.length === records.length}
                            onChange={onSelectAll}
                        />
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contributor Details</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ID & Receipt</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Month</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Organization</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount Paid</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {records.map((r: any) => (
                    <tr key={r._id} className={`hover:bg-emerald-50/20 transition-colors group ${selectedIds.includes(r._id) ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-6 py-4">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                checked={selectedIds.includes(r._id)}
                                onChange={() => onSelect(r._id)}
                            />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                    {r.name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{r.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{new Date(r.date || r.createdAt).toLocaleDateString('en-GB')}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-700">#{r.chandaNumber || 'N/A'}</div>
                            <div className="text-[11px] font-mono text-gray-400">{r.receiptNo || 'NO RECEIPT'}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-wider group-hover:bg-white transition-colors">{r.monthPaidFor || '---'}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500 font-medium">
                                <Building2 className="w-3.5 h-3.5 mr-2 text-gray-300" />
                                {r.organization?.name || '---'}
                            </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                            <div className="font-black text-emerald-600 text-lg">
                                ₦{Number(r.totalNgn).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right flex justify-end space-x-2">
                            <button
                                onClick={() => onView(r)}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onEdit(r)}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function TajnidTable({ records, onView, onEdit, selectedIds, onSelect, onSelectAll }: any) {
    return (
        <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
                <tr>
                    <th className="px-6 py-4 text-left">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={records.length > 0 && selectedIds.length === records.length}
                            onChange={onSelectAll}
                        />
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Member Info</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">IDS & Wasiyyat</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Majlis / Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Election / Academic</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {records.map((r: any) => (
                    <tr key={r._id} className={`hover:bg-blue-50/20 transition-colors group ${selectedIds.includes(r._id) ? 'bg-blue-50/10' : ''}`}>
                        <td className="px-6 py-4">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedIds.includes(r._id)}
                                onChange={() => onSelect(r._id)}
                            />
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    {(r.surname?.charAt(0) || 'T').toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{r.surname} {r.otherNames}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center">
                                        <span className="bg-gray-200 px-1.5 py-0.5 rounded mr-2 text-[8px]">{r.sn || 'SN-NA'}</span>
                                        {r.title || 'MEMBER'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-700">C#: {r.chandaNo || '---'}</div>
                            <div className="text-[11px] font-mono text-gray-400">W: {r.wasiyyatNo || 'NO'}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest block w-fit mb-1">{r.majlis || '---'}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{r.presence || 'ACTIVE'}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">E: {r.election || 'NA'}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">{r.academicStatus || 'NA'}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right flex justify-end space-x-2">
                            <button
                                onClick={() => onView(r)}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onEdit(r)}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function MemberDetailModal({ record, onClose, type }: { record: any, onClose: () => void, type: string }) {
    const isTajnid = type === 'tajnid'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                className="relative bg-white w-full max-w-2xl md:rounded-[2.5rem] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100"
            >
                <div className={`md:px-10 px-6 md:py-12 py-8 text-white relative flex-shrink-0 ${isTajnid ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-emerald-600 to-teal-700'}`}>
                    <button onClick={onClose} className="absolute md:right-8 right-4 md:top-8 top-4 md:p-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-6">
                        <div className="md:w-20 w-16 md:h-20 h-16 bg-white/10 rounded-2xl flex items-center justify-center md:text-3xl text-2xl font-black backdrop-blur-md">
                            {(isTajnid ? record.surname : record.name)?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="md:text-3xl text-xl font-black tracking-tight">
                                {isTajnid ? `${record.surname} ${record.otherNames}` : record.name}
                            </h3>
                            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">
                                {isTajnid ? `${record.title || 'MEMBER'} • ${record.majlis}` : `Financial Record • ${record.monthPaidFor || '---'}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="md:p-10 p-6 overflow-y-auto bg-gray-50/50 flex-1">
                    {isTajnid ? (
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Identification</label>
                                <div className="space-y-6">
                                    <DetailRow label="S/N" value={record.sn} />
                                    <DetailRow label="Chanda #" value={record.chandaNo} />
                                    <DetailRow label="Wasiyyat #" value={record.wasiyyatNo} />
                                    <DetailRow label="Election Status" value={record.election} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Member Context</label>
                                <div className="space-y-6">
                                    <DetailRow label="Presence" value={record.presence} />
                                    <DetailRow label="Academic Status" value={record.academicStatus} />
                                    <DetailRow label="Date of Birth" value={record.dateOfBirth ? new Date(record.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'} />
                                </div>
                            </div>
                            <div className="col-span-2 pt-8 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Contact Info</label>
                                <div className="grid grid-cols-2 gap-8">
                                    <DetailRow label="Phone" value={record.phone} />
                                    <DetailRow label="Email" value={record.email} />
                                    <div className="col-span-2">
                                        <DetailRow label="Address / Jama'at" value={record.address} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-3 gap-6">
                                <DetailRow label="Total Amount" value={`₦${Number(record.totalNgn).toLocaleString('en-GB')}`} highlight />
                                <DetailRow label="Chanda Number" value={record.chandaNumber} />
                                <DetailRow label="Receipt #" value={record.receiptNo} />
                            </div>

                            <div className="pt-8 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">Financial Breakdown</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                                    <DetailRow label="Chanda Aam" value={`₦${record.chandaAam || 0}`} />
                                    <DetailRow label="Wasiyyat" value={`₦${record.chandaWasiyyat || 0}`} />
                                    <DetailRow label="Jalsa Salana" value={`₦${record.jalsaSalana || 0}`} />
                                    <DetailRow label="Tariki Jadid" value={`₦${record.tarikiJadid || 0}`} />
                                    <DetailRow label="Waqfi Jadid" value={`₦${record.waqfiJadid || 0}`} />
                                    <DetailRow label="Welfare Fund" value={`₦${record.welfareFund || 0}`} />
                                    <DetailRow label="Zakat" value={`₦${record.zakat || 0}`} />
                                    <DetailRow label="Fitrana" value={`₦${record.fitrana || 0}`} />
                                    <DetailRow label="Mosque Donation" value={`₦${record.mosqueDonation || 0}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="md:px-10 px-6 py-5 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <Building2 className="w-4 h-4 mr-2" />
                        {record.organization?.name}
                    </div>
                    <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">Recorded: {new Date(record.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
            </motion.div>
        </div>
    )
}

function DetailRow({ label, value, highlight }: { label: string, value: any, highlight?: boolean }) {
    return (
        <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{label}</p>
            <p className={`font-bold transition-all ${highlight ? 'text-2xl text-emerald-600 font-black' : 'text-gray-900 group-hover:text-blue-600'}`}>
                {value || '---'}
            </p>
        </div>
    )
}

function RecordModal({ type, initialData, onClose, refresh }: { type: string, initialData?: any, onClose: () => void, refresh: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [mode, setMode] = useState<'single' | 'multiple'>(initialData ? 'single' : 'single') // Force single for editing

    useEffect(() => {
        if (initialData && type === 'chanda') {
            const breakdown: { type: string, amount: number }[] = []
            CHANDA_FUNDS.forEach(fund => {
                if (initialData[fund.id] && Number(initialData[fund.id]) > 0) {
                    breakdown.push({ type: fund.id, amount: Number(initialData[fund.id]) })
                }
            })
            if (breakdown.length > 0) {
                setSingleBreakdown(breakdown)
            }
        }
    }, [initialData, type])
    const [multipleRecords, setMultipleRecords] = useState<any[]>([{}])
    const [singleBreakdown, setSingleBreakdown] = useState<{ type: string, amount: number }[]>([{ type: 'chandaAam', amount: 0 }])

    const handleAddRow = () => setMultipleRecords(prev => [...prev, type === 'chanda' ? { breakdown: [{ type: 'chandaAam', amount: 0 }] } : {}])
    const handleRemoveRow = (index: number) => setMultipleRecords(prev => prev.filter((_, i) => i !== index))

    const handleUpdateRow = (index: number, field: string, value: any) => {
        setMultipleRecords(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    const handleUpdateBreakdown = (recordIndex: number, breakdownIndex: number, field: 'type' | 'amount', value: any) => {
        if (mode === 'single') {
            setSingleBreakdown(prev => {
                const next = [...prev]
                next[breakdownIndex] = { ...next[breakdownIndex], [field]: field === 'amount' ? Number(value) : value }
                return next
            })
        } else {
            setMultipleRecords(prev => {
                const next = [...prev]
                const recordBreakdown = [...(next[recordIndex].breakdown || [])]
                recordBreakdown[breakdownIndex] = { ...recordBreakdown[breakdownIndex], [field]: field === 'amount' ? Number(value) : value }
                next[recordIndex].breakdown = recordBreakdown
                return next
            })
        }
    }

    const handleAddBreakdownItem = (recordIndex?: number) => {
        if (mode === 'single') {
            setSingleBreakdown(prev => [...prev, { type: 'chandaAam', amount: 0 }])
        } else if (recordIndex !== undefined) {
            setMultipleRecords(prev => {
                const next = [...prev]
                const recordBreakdown = [...(next[recordIndex].breakdown || []), { type: 'chandaAam', amount: 0 }]
                next[recordIndex].breakdown = recordBreakdown
                return next
            })
        }
    }

    const handleRemoveBreakdownItem = (breakdownIndex: number, recordIndex?: number) => {
        if (mode === 'single') {
            setSingleBreakdown(prev => prev.filter((_, i) => i !== breakdownIndex))
        } else if (recordIndex !== undefined) {
            setMultipleRecords(prev => {
                const next = [...prev]
                const recordBreakdown = (next[recordIndex].breakdown || []).filter((_: any, i: number) => i !== breakdownIndex)
                next[recordIndex].breakdown = recordBreakdown
                return next
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')

        let res;
        if (mode === 'single') {
            const formData = new FormData(e.currentTarget)
            if (type === 'chanda') {
                // Reset fund fields to 0 before adding breakdown
                CHANDA_FUNDS.forEach(fund => {
                    formData.set(fund.id, '0')
                })
                // Flatten breakdown into individual fields for FormData
                singleBreakdown.forEach(item => {
                    const currentVal = Number(formData.get(item.type)) || 0
                    formData.set(item.type, String(currentVal + item.amount))
                })
                const total = singleBreakdown.reduce((sum, item) => sum + item.amount, 0)
                formData.set('totalNgn', String(total))
            }

            if (initialData) {
                res = type === 'chanda' ? await updateChandaAmRecord(initialData._id, formData) : await updateTajnidRecord(initialData._id, formData)
            } else {
                res = type === 'chanda' ? await createChandaAmRecord(formData) : await createTajnidRecord(formData)
            }
        } else {
            const formattedRecords = multipleRecords.map(rec => {
                if (type === 'chanda') {
                    const breakdownObj: any = {}
                    let total = 0
                    rec.breakdown?.forEach((item: any) => {
                        breakdownObj[item.type] = (breakdownObj[item.type] || 0) + item.amount
                        total += item.amount
                    })
                    return { ...rec, ...breakdownObj, totalNgn: total, breakdown: undefined }
                }
                return rec
            })
            res = await createMultipleRecords(formattedRecords, type as any)
        }

        if (res.success) {
            setSuccess(true)
            setTimeout(() => {
                refresh()
                onClose()
            }, 1000)
        } else {
            setError(res.message || 'Something went wrong')
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative bg-white w-full ${mode === 'multiple' ? 'max-w-6xl' : 'max-w-4xl'} md:rounded-[2.5rem] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 transition-all duration-300`}
            >
                {success ? (
                    <div className="md:p-20 p-10 text-center space-y-6">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10" />
                        </motion.div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Records Secured</h2>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Database synchronization complete</p>
                    </div>
                ) : (
                    <>
                        <div className="md:px-8 px-3 md:py-3 py-4 border-b border-gray-100 flex items-center flex-wrap gap-3 justify-between bg-gray-50/30">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{initialData ? 'Update Registry Entry' : 'Manual Registry Entry'}</h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                    {type === 'chanda' ? (initialData ? 'Edit Contribution' : 'Financial Chanda Am') : (initialData ? 'Edit Member Info' : 'Member Tajnid Record')}
                                </p>
                            </div>
                            <div className="flex  items-center space-x-4">
                                {!initialData && (
                                    <div className="flex flex-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                                        <button
                                            onClick={() => setMode('single')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'single' ? 'bg-white text-emerald-600 border border-emerald-100' : 'text-gray-500'}`}
                                        >
                                            Single
                                        </button>
                                        <button
                                            onClick={() => setMode('multiple')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'multiple' ? 'bg-white text-emerald-600 border border-emerald-100' : 'text-gray-500'}`}
                                        >
                                            Multiple
                                        </button>
                                    </div>
                                )}
                                <button onClick={onClose} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="md:p-8 p-6 overflow-y-auto space-y-6 flex-1">
                            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{error}</div>}

                            {mode === 'single' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {type === 'chanda' ? (
                                        <>
                                            <div className="md:col-span-2">
                                                <Input label="Full Name" name="name" required placeholder="Member Name" defaultValue={initialData?.name} />
                                            </div>
                                            <Input label="Chanda Number" name="chandaNumber" placeholder="e.g. 1234" defaultValue={initialData?.chandaNumber} />
                                            <Input label="Receipt Number" name="receiptNo" placeholder="REC-001" defaultValue={initialData?.receiptNo} />
                                            <div className="md:col-span-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 font-medium ml-1">Month</label>
                                                <select name="monthPaidFor" defaultValue={initialData?.monthPaidFor} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm">
                                                    <option value="">Select Month</option>
                                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <Input label="Date" name="date" type="date" defaultValue={initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : ''} />
                                            <div className="md:col-span-2 space-y-4">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Financial Breakdown</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddBreakdownItem()}
                                                        className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 flex items-center"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Fund
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {singleBreakdown.map((item, idx) => (
                                                        <div key={idx} className="flex items-end space-x-3 group/item">
                                                            <div className="flex-1">
                                                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Fund Type</label>
                                                                <select
                                                                    value={item.type}
                                                                    onChange={(e) => handleUpdateBreakdown(0, idx, 'type', e.target.value)}
                                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm"
                                                                >
                                                                    {CHANDA_FUNDS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="w-32">
                                                                <MiniInput
                                                                    label="Amount"
                                                                    type="number"
                                                                    value={item.amount}
                                                                    onChange={(v: string) => handleUpdateBreakdown(0, idx, 'amount', v)}
                                                                />
                                                            </div>
                                                            {singleBreakdown.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveBreakdownItem(idx)}
                                                                    className="p-2 mb-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-gray-900">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Calculated</span>
                                                    <span className="text-xl font-black tabular-nums">₦{singleBreakdown.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-GB')}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Input label="S/N" name="sn" placeholder="e.g. 11" defaultValue={initialData?.sn} />
                                            <Input label="Title" name="title" placeholder="BRO / MR" defaultValue={initialData?.title} />
                                            <Input label="Surname" name="surname" required placeholder="Last Name" defaultValue={initialData?.surname} />
                                            <Input label="Other Names" name="otherNames" placeholder="First & Middle Names" defaultValue={initialData?.otherNames} />
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 font-medium">Majlis</label>
                                                <select name="majlis" defaultValue={initialData?.majlis} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm">
                                                    <option value="">Select Majlis</option>
                                                    {MAJLIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <Input label="Presence" name="presence" placeholder="LOCAL" defaultValue={initialData?.presence} />
                                            <Input label="Election" name="election" placeholder="NA / APV" defaultValue={initialData?.election} />
                                            <Input label="Academic Status" name="academicStatus" placeholder="GRAD / UNDERGRAD" defaultValue={initialData?.academicStatus} />
                                            <Input label="Chanda #" name="chandaNo" defaultValue={initialData?.chandaNo} />
                                            <Input label="Wasiyyat #" name="wasiyyatNo" defaultValue={initialData?.wasiyyatNo} />
                                            <Input label="Phone" name="phone" defaultValue={initialData?.phone} />
                                            <Input label="Email" name="email" type="email" defaultValue={initialData?.email} />
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
                                        {multipleRecords.map((rec, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 bg-gray-50 rounded-2xl border border-gray-200 relative group/row"
                                            >
                                                {type === 'chanda' ? (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                            <div className="md:col-span-2">
                                                                <MiniInput label="Full Name" value={rec.name} onChange={(v: string) => handleUpdateRow(i, 'name', v)} required />
                                                            </div>
                                                            <MiniInput label="Chanda #" value={rec.chandaNumber} onChange={(v: string) => handleUpdateRow(i, 'chandaNumber', v)} />
                                                            <MiniInput label="Receipt" value={rec.receiptNo} onChange={(v: string) => handleUpdateRow(i, 'receiptNo', v)} />
                                                            <div className="flex flex-col space-y-1">
                                                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Month</label>
                                                                <select
                                                                    value={rec.monthPaidFor}
                                                                    onChange={(e) => handleUpdateRow(i, 'monthPaidFor', e.target.value)}
                                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 transition-colors"
                                                                >
                                                                    <option value="">Select</option>
                                                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/50 p-4 rounded-xl space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Financial Breakdown</h4>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddBreakdownItem(i)}
                                                                    className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center"
                                                                >
                                                                    <Plus className="w-2.5 h-2.5 mr-1" /> Add Fund
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {(rec.breakdown || []).map((b: any, bIdx: number) => (
                                                                    <div key={bIdx} className="flex items-end space-x-2 bg-white border border-gray-100 p-2 rounded-lg relative group/b">
                                                                        <div className="flex-1">
                                                                            <select
                                                                                value={b.type}
                                                                                onChange={(e) => handleUpdateBreakdown(i, bIdx, 'type', e.target.value)}
                                                                                className="w-full bg-transparent text-[10px] font-bold outline-none border-b border-gray-100 focus:border-emerald-500"
                                                                            >
                                                                                {CHANDA_FUNDS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div className="w-20">
                                                                            <input
                                                                                type="number"
                                                                                value={b.amount}
                                                                                onChange={(e) => handleUpdateBreakdown(i, bIdx, 'amount', e.target.value)}
                                                                                className="w-full bg-transparent text-[10px] font-black text-right outline-none placeholder:text-gray-300"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        {(rec.breakdown || []).length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveBreakdownItem(bIdx, i)}
                                                                                className="absolute -right-2 -top-2 w-4 h-4 bg-white border border-gray-100 text-gray-300 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/b:opacity-100 transition-opacity"
                                                                            >
                                                                                <X className="w-2 h-2" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-gray-100">
                                                                <span className="text-gray-400 uppercase tracking-widest">Total Amount</span>
                                                                <span className="text-gray-900">₦{(rec.breakdown || []).reduce((sum: number, b: any) => sum + (b.amount || 0), 0).toLocaleString('en-GB')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <MiniInput label="Date" type="date" value={rec.date} onChange={(v: string) => handleUpdateRow(i, 'date', v)} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                                        <MiniInput label="S/N" value={rec.sn} onChange={(v: string) => handleUpdateRow(i, 'sn', v)} />
                                                        <MiniInput label="Title" value={rec.title} onChange={(v: string) => handleUpdateRow(i, 'title', v)} />
                                                        <MiniInput label="Surname" value={rec.surname} onChange={(v: string) => handleUpdateRow(i, 'surname', v)} required />
                                                        <MiniInput label="Others" value={rec.otherNames} onChange={(v: string) => handleUpdateRow(i, 'otherNames', v)} />
                                                        <div className="flex flex-col space-y-1">
                                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Majlis</label>
                                                            <select
                                                                value={rec.majlis}
                                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateRow(i, 'majlis', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 transition-colors"
                                                            >
                                                                <option value="">Select</option>
                                                                {MAJLIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        </div>
                                                        <MiniInput label="Presence" value={rec.presence} onChange={(v: string) => handleUpdateRow(i, 'presence', v)} />
                                                        <MiniInput label="Election" value={rec.election} onChange={(v: string) => handleUpdateRow(i, 'election', v)} />
                                                        <MiniInput label="Academic" value={rec.academicStatus} onChange={(v: string) => handleUpdateRow(i, 'academicStatus', v)} />
                                                        <MiniInput label="Chanda #" value={rec.chandaNo} onChange={(v: string) => handleUpdateRow(i, 'chandaNo', v)} />
                                                        <MiniInput label="Wasiyyat #" value={rec.wasiyyatNo} onChange={(v: string) => handleUpdateRow(i, 'wasiyyatNo', v)} />
                                                        <MiniInput label="Phone" value={rec.phone} onChange={(v: string) => handleUpdateRow(i, 'phone', v)} />
                                                        <MiniInput label="Email" type="email" value={rec.email} onChange={(v: string) => handleUpdateRow(i, 'email', v)} />
                                                    </div>
                                                )}
                                                {multipleRecords.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveRow(i)}
                                                        className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-all flex items-center justify-center text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Another Record
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-gray-900 text-white md:rounded-2xl rounded-xl font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-widest"
                            >
                                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (initialData ? 'UPDATE RECORD' : (mode === 'single' ? 'SAVE RECORD' : `SAVE ${multipleRecords.length} RECORDS`))}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    )
}

function Input({ label, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">{label}</label>
            <input
                {...props}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm placeholder:text-gray-300"
            />
        </div>
    )
}

function MiniInput({ label, value, onChange, type = "text", ...props }: any) {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                {...props}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 transition-colors"
            />
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
