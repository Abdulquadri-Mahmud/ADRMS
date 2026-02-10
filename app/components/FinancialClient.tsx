'use client'

import { useState, useTransition } from 'react'
import {
    Search,
    Plus,
    Download,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Filter,
    X,
    Loader2,
    CheckCircle2,
    Trash2,
    Pencil,
    Wallet,
    BarChart3,
    ArrowUpCircle,
    ArrowDownCircle,
    Package,
    Building2,
    Calendar
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
    createFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecords,
    createMultipleFinancialRecords,
    getAllFinancialRecordsForExport,
} from '../actions/financial'
import {
    FINANCIAL_CATEGORIES,
    PAYMENT_METHODS
} from '@/app/lib/financial-constants'

const TRANSACTION_TYPES = [
    { id: 'INCOME', label: 'Income', icon: TrendingUp, color: 'emerald' },
    { id: 'EXPENSE', label: 'Expense', icon: TrendingDown, color: 'red' },
    { id: 'PURCHASE', label: 'Purchase', icon: ShoppingCart, color: 'amber' }
]

// Export column definitions
const EXPORT_COLUMNS = [
    { id: 'transactionDate', label: 'Date' },
    { id: 'type', label: 'Type' },
    { id: 'category', label: 'Category' },
    { id: 'description', label: 'Description' },
    { id: 'amount', label: 'Amount (NGN)' },
    { id: 'vendor', label: 'Vendor/Payee' },
    { id: 'receiptNo', label: 'Receipt No' },
    { id: 'paymentMethod', label: 'Payment Method' },
    { id: 'reference', label: 'Reference' },
]

export default function FinancialClient({
    records,
    total,
    summary,
    organizations,
    searchParams
}: {
    records: any[],
    total: number,
    summary: {
        totalIncome: number,
        totalExpenses: number,
        totalPurchases: number,
        netBalance: number,
        recordCount: number
    },
    organizations?: any[],
    searchParams: {
        q?: string,
        page?: string,
        type?: string,
        category?: string,
        dateFrom?: string,
        dateTo?: string,
        orgId?: string
    }
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const currentPage = Number(searchParams.page) || 1
    const totalPages = Math.ceil(total / 20)

    const [searchTerm, setSearchTerm] = useState(searchParams.q || '')
    const [isNewModalOpen, setIsNewModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [selectedRecord, setSelectedRecord] = useState<any>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportFilters, setExportFilters] = useState({
        type: '',
        category: '',
        dateFrom: '',
        dateTo: ''
    })
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [alertConfig, setAlertConfig] = useState<{
        show: boolean,
        title: string,
        message: string,
        type: 'info' | 'error' | 'confirm',
        onConfirm?: () => void
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

    const handleFilterChange = (key: string, value: string) => {
        updateParams({ [key]: value || null, page: '1' })
    }

    const handlePageChange = (page: number) => {
        updateParams({ page: String(page) })
    }

    const handleOrgChange = (orgId: string) => {
        updateParams({ orgId: orgId || null, page: '1' })
    }

    const handleDeleteSelected = async () => {
        setAlertConfig({
            show: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete ${selectedIds.length} record(s)? This action cannot be undone.`,
            type: 'confirm',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, show: false }))
                setIsDeleting(true)
                const res = await deleteFinancialRecords(selectedIds)
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

    const exportExcel = async (customFilters?: typeof exportFilters, customColumns?: string[]) => {
        setIsExporting(true)
        try {
            const filters: any = {}
            if (customFilters?.type) filters.type = customFilters.type
            if (customFilters?.category) filters.category = customFilters.category
            if (customFilters?.dateFrom) filters.dateFrom = customFilters.dateFrom
            if (customFilters?.dateTo) filters.dateTo = customFilters.dateTo
            if (searchParams.orgId) filters.orgId = searchParams.orgId

            const allRecords = await getAllFinancialRecordsForExport(searchParams.q, filters)

            const processedData: any[] = []

            allRecords.forEach((record: any) => {
                const formattedDate = record.transactionDate
                    ? new Date(record.transactionDate).toLocaleDateString('en-GB')
                    : ''

                const fullRecord: any = {
                    'Date': formattedDate,
                    'Type': record.type || '',
                    'Category': record.category || '',
                    'Description': record.description || '',
                    'Amount (NGN)': record.amount || 0,
                    'Vendor/Payee': record.vendor || '',
                    'Receipt No': record.receiptNo || '',
                    'Payment Method': record.paymentMethod || '',
                    'Reference': record.reference || '',
                }

                if (customColumns && customColumns.length > 0) {
                    const filtered: any = {}
                    EXPORT_COLUMNS.forEach(col => {
                        if (customColumns.includes(col.id)) {
                            filtered[col.label] = fullRecord[col.label]
                        }
                    })
                    processedData.push(filtered)
                } else {
                    processedData.push(fullRecord)
                }
            })

            // Add summary row
            if (processedData.length > 0) {
                processedData.push({})
                processedData.push({
                    'Date': 'SUMMARY',
                    'Type': '',
                    'Category': '',
                    'Description': '',
                    'Amount (NGN)': allRecords.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
                })
            }

            const ws = XLSX.utils.json_to_sheet(processedData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Financial Records")

            const fileName = `financial_export_${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(wb, fileName)

            setShowExportModal(false)
        } catch (err) {
            console.error(err)
            setAlertConfig({
                show: true,
                title: 'Export Error',
                message: 'Failed to generate Excel file. Please try again.',
                type: 'error'
            })
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Income"
                    value={summary.totalIncome}
                    icon={ArrowDownCircle}
                    color="emerald"
                />
                <StatCard
                    title="Total Expenses"
                    value={summary.totalExpenses}
                    icon={ArrowUpCircle}
                    color="red"
                />
                <StatCard
                    title="Total Purchases"
                    value={summary.totalPurchases}
                    icon={Package}
                    color="amber"
                />
                <StatCard
                    title="Net Balance"
                    value={summary.netBalance}
                    icon={Wallet}
                    color={summary.netBalance >= 0 ? 'emerald' : 'red'}
                />
            </div>

            {/* Filters and Actions */}
            <div className="bg-white md:p-6 p-3 md:rounded-[2rem] rounded-2xl border border-gray-100">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                        {organizations && organizations.length > 0 && (
                            <div className="relative flex-1 min-w-[200px]">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                                    onChange={(e) => handleOrgChange(e.target.value)}
                                    value={searchParams.orgId || ''}
                                >
                                    <option value="">All Organizations</option>
                                    {organizations.map(org => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="relative flex-[2]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                className="w-full pl-14 pr-6 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="relative flex-1">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                value={searchParams.type || ''}
                            >
                                <option value="">All Types</option>
                                {TRANSACTION_TYPES.map(type => (
                                    <option key={type.id} value={type.id}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex-1">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                value={searchParams.category || ''}
                            >
                                <option value="">All Categories</option>
                                {Object.entries(FINANCIAL_CATEGORIES).flatMap(([type, categories]) =>
                                    categories.map(cat => (
                                        <option key={`${type}-${cat}`} value={cat}>{cat}</option>
                                    ))
                                )}
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
                            onClick={() => setShowExportModal(true)}
                            disabled={isExporting}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2 text-emerald-600" />}
                            {isExporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white md:rounded-[2rem] rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto relative">
                    {isPending && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
                        </div>
                    )}
                    <FinancialTable
                        records={records}
                        onView={setSelectedRecord}
                        onEdit={setEditingRecord}
                        selectedIds={selectedIds}
                        onSelect={toggleSelect}
                        onSelectAll={() => toggleSelectAll(records.map(r => r._id))}
                    />
                </div>

                {records.length === 0 && !isPending && (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                            <Wallet className="w-10 h-10 text-gray-200" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">No financial records found</h4>
                        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto italic">Start tracking your organization's finances by adding a new record.</p>
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
                        initialData={editingRecord}
                        onClose={() => {
                            setIsNewModalOpen(false)
                            setEditingRecord(null)
                        }}
                        refresh={() => router.refresh()}
                    />
                )}
                {selectedRecord && (
                    <DetailModal
                        record={selectedRecord}
                        onClose={() => setSelectedRecord(null)}
                    />
                )}
                {alertConfig.show && (
                    <NotificationModal
                        config={alertConfig}
                        onClose={() => setAlertConfig(prev => ({ ...prev, show: false }))}
                    />
                )}
                {showExportModal && (
                    <ExportModal
                        onClose={() => setShowExportModal(false)}
                        onExport={exportExcel}
                        isExporting={isExporting}
                        exportFilters={exportFilters}
                        setExportFilters={setExportFilters}
                        selectedColumns={selectedColumns}
                        setSelectedColumns={setSelectedColumns}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }: {
    title: string,
    value: number,
    icon: any,
    color: 'emerald' | 'red' | 'amber'
}) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        red: 'bg-red-50 text-red-600 border-red-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100'
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">
                        ₦{value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    )
}

// Financial Table Component
function FinancialTable({ records, onView, onEdit, selectedIds, onSelect, onSelectAll }: any) {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'INCOME': return 'bg-emerald-50 text-emerald-600'
            case 'EXPENSE': return 'bg-red-50 text-red-600'
            case 'PURCHASE': return 'bg-amber-50 text-amber-600'
            default: return 'bg-gray-50 text-gray-600'
        }
    }

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
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Description</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
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
                            <div className="text-sm font-bold text-gray-900">
                                {new Date(r.transactionDate).toLocaleDateString('en-GB')}
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getTypeColor(r.type)}`}>
                                {r.type}
                            </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-700">{r.category}</div>
                        </td>
                        <td className="px-6 py-5">
                            <div className="text-sm text-gray-600 max-w-xs truncate">{r.description}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="font-black text-emerald-600 text-lg">
                                ₦{Number(r.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right flex justify-end space-x-2">
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

// RecordModal Component (Create/Edit)
function RecordModal({ initialData, onClose, refresh }: {
    initialData?: any,
    onClose: () => void,
    refresh: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<any>({})
    const [selectedType, setSelectedType] = useState(initialData?.type || 'INCOME')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrors({})

        const formData = new FormData(e.currentTarget)
        // Ensure type is set from state if not in form implicitly (though hidden input handles this)
        formData.set('type', selectedType)

        const res = initialData
            ? await updateFinancialRecord(initialData._id, formData)
            : await createFinancialRecord(formData)

        if (res.success) {
            refresh()
            onClose()
        } else {
            setErrors(res.errors || {})
        }
        setIsSubmitting(false)
    }

    const categories = FINANCIAL_CATEGORIES[selectedType as keyof typeof FINANCIAL_CATEGORIES] || []

    const getTypeStyles = (typeId: string) => {
        const isSelected = selectedType === typeId
        switch (typeId) {
            case 'INCOME':
                return isSelected
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'hover:bg-gray-50 text-gray-600 border-transparent'
            case 'EXPENSE':
                return isSelected
                    ? 'bg-red-100 text-red-700 border-red-200 shadow-sm'
                    : 'hover:bg-gray-50 text-gray-600 border-transparent'
            case 'PURCHASE':
                return isSelected
                    ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm'
                    : 'hover:bg-gray-50 text-gray-600 border-transparent'
            default:
                return ''
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
            >
                <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                            {initialData ? 'Edit Record' : 'New Entry'}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {initialData ? 'Update transaction details' : 'Add a new financial transaction'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Transaction Type Segmented Control */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                            Transaction Type
                        </label>
                        <div className="grid grid-cols-3 gap-3 p-1.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                            {TRANSACTION_TYPES.map(type => {
                                const Icon = type.icon
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setSelectedType(type.id)}
                                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 ${getTypeStyles(type.id)}`}
                                    >
                                        <Icon className={`w-6 h-6 ${selectedType === type.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                        <span className="text-xs font-bold tracking-wide">{type.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                        <input type="hidden" name="type" value={selectedType} />
                        {errors.type && <p className="text-red-500 text-xs mt-2 font-medium flex items-center"><X className="w-3 h-3 mr-1" />{errors.type}</p>}
                    </div>

                    <div className="space-y-6">
                        {/* Primary Info Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-bold">₦</span>
                                    </div>
                                    <input
                                        type="number"
                                        name="amount"
                                        step="0.01"
                                        defaultValue={initialData?.amount || ''}
                                        className="w-full pl-9 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-lg text-gray-900 placeholder:text-gray-300 placeholder:font-medium"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                {errors.amount && <p className="text-red-500 text-xs font-medium">{errors.amount}</p>}
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        name="transactionDate"
                                        defaultValue={initialData?.transactionDate ? new Date(initialData.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                        className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-gray-900"
                                        required
                                    />
                                </div>
                                {errors.transactionDate && <p className="text-red-500 text-xs font-medium">{errors.transactionDate}</p>}
                            </div>
                        </div>

                        {/* Category & Description */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Filter className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <select
                                        name="category"
                                        defaultValue={initialData?.category || ''}
                                        className="w-full pl-10 pr-10 py-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-gray-900 appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                {errors.category && <p className="text-red-500 text-xs font-medium">{errors.category}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    defaultValue={initialData?.description || ''}
                                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium resize-none text-gray-900 placeholder:text-gray-300"
                                    placeholder="What is this transaction for?"
                                    required
                                />
                                {errors.description && <p className="text-red-500 text-xs font-medium">{errors.description}</p>}
                            </div>
                        </div>

                        {/* Additional Details Accordion/Section */}
                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                Additional Details (Optional)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">Receipt No</label>
                                    <input
                                        type="text"
                                        name="receiptNo"
                                        defaultValue={initialData?.receiptNo || ''}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-sm font-medium"
                                        placeholder="E.g. #12345"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">Payment Method</label>
                                    <div className="relative">
                                        <select
                                            name="paymentMethod"
                                            defaultValue={initialData?.paymentMethod || ''}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-sm font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Method</option>
                                            {PAYMENT_METHODS.map(method => (
                                                <option key={method} value={method}>{method}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">Vendor / Payee</label>
                                    <input
                                        type="text"
                                        name="vendor"
                                        defaultValue={initialData?.vendor || ''}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-sm font-medium"
                                        placeholder="Name of person/company"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">Reference</label>
                                    <input
                                        type="text"
                                        name="reference"
                                        defaultValue={initialData?.reference || ''}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-sm font-medium"
                                        placeholder="E.g. Bank Ref"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold disabled:opacity-50 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {initialData ? 'Save Changes' : 'Create Record'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}

// Detail Modal Component
function DetailModal({ record, onClose }: { record: any, onClose: () => void }) {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'INCOME': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
            case 'EXPENSE': return 'bg-red-50 text-red-600 border-red-100'
            case 'PURCHASE': return 'bg-amber-50 text-amber-600 border-amber-100'
            default: return 'bg-gray-50 text-gray-600 border-gray-100'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl"
            >
                <div className="border-b border-gray-100 px-8 py-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">Transaction Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider border ${getTypeColor(record.type)}`}>
                            {record.type}
                        </span>
                        <div className="text-right">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount</p>
                            <p className="text-3xl font-black text-emerald-600">
                                ₦{Number(record.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <DetailField label="Category" value={record.category} />
                        <DetailField label="Date" value={new Date(record.transactionDate).toLocaleDateString('en-GB')} />
                        <DetailField label="Receipt No" value={record.receiptNo || 'N/A'} />
                        <DetailField label="Payment Method" value={record.paymentMethod || 'N/A'} />
                        <DetailField label="Vendor/Payee" value={record.vendor || 'N/A'} />
                        <DetailField label="Reference" value={record.reference || 'N/A'} />
                    </div>

                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-gray-700 font-medium">{record.description}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

function DetailField({ label, value }: { label: string, value: string }) {
    return (
        <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-gray-900 font-bold">{value}</p>
        </div>
    )
}

// Notification Modal Component
function NotificationModal({ config, onClose }: {
    config: {
        title: string,
        message: string,
        type: 'info' | 'error' | 'confirm',
        onConfirm?: () => void
    },
    onClose: () => void
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
                <div className="text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${config.type === 'error' ? 'bg-red-50' : config.type === 'confirm' ? 'bg-amber-50' : 'bg-emerald-50'
                        }`}>
                        {config.type === 'error' ? (
                            <X className="w-8 h-8 text-red-600" />
                        ) : config.type === 'confirm' ? (
                            <Loader2 className="w-8 h-8 text-amber-600" />
                        ) : (
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        )}
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">{config.title}</h3>
                    <p className="text-gray-600 font-medium mb-6">{config.message}</p>

                    <div className="flex gap-3">
                        {config.type === 'confirm' ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={config.onConfirm}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold"
                                >
                                    Confirm
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold"
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

// Export Modal Component
function ExportModal({ onClose, onExport, isExporting, exportFilters, setExportFilters, selectedColumns, setSelectedColumns }: any) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between rounded-t-3xl">
                    <h2 className="text-2xl font-black text-gray-900">Export Financial Records</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Filters */}
                    <div>
                        <h3 className="text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Filters</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2">Type</label>
                                <select
                                    value={exportFilters.type}
                                    onChange={(e) => setExportFilters({ ...exportFilters, type: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                >
                                    <option value="">All Types</option>
                                    {TRANSACTION_TYPES.map(type => (
                                        <option key={type.id} value={type.id}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2">Category</label>
                                <select
                                    value={exportFilters.category}
                                    onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                >
                                    <option value="">All Categories</option>
                                    {Object.entries(FINANCIAL_CATEGORIES).flatMap(([type, categories]) =>
                                        categories.map(cat => (
                                            <option key={`${type}-${cat}`} value={cat}>{cat}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2">Date From</label>
                                <input
                                    type="date"
                                    value={exportFilters.dateFrom}
                                    onChange={(e) => setExportFilters({ ...exportFilters, dateFrom: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2">Date To</label>
                                <input
                                    type="date"
                                    value={exportFilters.dateTo}
                                    onChange={(e) => setExportFilters({ ...exportFilters, dateTo: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Column Selection */}
                    <div>
                        <h3 className="text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Columns to Export</h3>
                        <p className="text-xs text-gray-500 mb-3">Leave empty to export all columns</p>
                        <div className="grid grid-cols-2 gap-3">
                            {EXPORT_COLUMNS.map(col => (
                                <label key={col.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedColumns([...selectedColumns, col.id])
                                            } else {
                                                setSelectedColumns(selectedColumns.filter((c: string) => c !== col.id))
                                            }
                                        }}
                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onExport(exportFilters, selectedColumns.length > 0 ? selectedColumns : undefined)}
                            disabled={isExporting}
                            className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold disabled:opacity-50 flex items-center justify-center"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export to Excel
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
