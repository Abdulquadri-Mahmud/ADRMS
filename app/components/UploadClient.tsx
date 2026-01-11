'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    FileSpreadsheet,
    Loader2,
    X,
    FileCheck,
    Users,
    Receipt,
    ChevronRight,
    Search
} from 'lucide-react'
import {
    bulkInsertChandaAmRecords,
    bulkInsertTajnidRecords
} from '../actions/import'

interface SheetResult {
    name: string
    success: number
    failed: number
    status: 'pending' | 'processing' | 'completed' | 'error'
    message?: string
}

type ImportType = 'CHANDA' | 'TAJNID'

export default function UploadClient() {
    const [file, setFile] = useState<File | null>(null)
    const [sheets, setSheets] = useState<{ name: string; rows: any[]; headerIdx: number }[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [sheetResults, setSheetResults] = useState<SheetResult[]>([])
    const [selectedType, setSelectedType] = useState<ImportType | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const findHeaderRow = (rows: any[][]) => {
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            if (rows[i] && rows[i].filter(cell => cell).length > 5) {
                return i
            }
        }
        return 0
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setSheetResults([])
        setSelectedType(null)

        const reader = new FileReader()
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })

            const extractedSheets = wb.SheetNames.map(name => {
                const ws = wb.Sheets[name]
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
                const headerIdx = findHeaderRow(rawRows)
                const data = XLSX.utils.sheet_to_json(ws, { range: headerIdx })
                return { name, rows: data, headerIdx }
            })

            setSheets(extractedSheets)
            setSheetResults(wb.SheetNames.map(name => ({
                name,
                success: 0,
                failed: 0,
                status: 'pending'
            })))
        }
        reader.readAsBinaryString(selectedFile)
    }

    const mapChandaRow = (row: any) => {
        return {
            chandaNumber: String(row['Chanda Number'] || row['CHANDA ID#'] || row['Chanda No'] || ''),
            name: row['NAMES'] || row['Names'] || row['Name'] || '',
            receiptNo: String(row['RECEIPT NO'] || row['Receipt No'] || ''),
            date: row['DATE'] || row['Date'],
            monthPaidFor: row['MonthPaidFor'] || '',
            chandaAam: parseFloat(row['Chanda Aam']) || 0,
            chandaWasiyyat: parseFloat(row['Chanda Wasiyyat']) || 0,
            jalsaSalana: parseFloat(row['Jalsa Salana']) || 0,
            tarikiJadid: parseFloat(row['Tariki Jadid']) || 0,
            waqfiJadid: parseFloat(row['Waqfi Jadid']) || 0,
            welfareFund: parseFloat(row['Welfare Fund']) || 0,
            scholarship: parseFloat(row['Scholarship']) || 0,
            zakatulFitr: parseFloat(row['Zakatul-Fitr']) || 0,
            tabligh: parseFloat(row['Tabligh']) || 0,
            zakat: parseFloat(row['Zakat']) || 0,
            sadakat: parseFloat(row['Sadakat']) || 0,
            fitrana: parseFloat(row['Fitrana']) || 0,
            mosqueDonation: parseFloat(row['Moaque Donation']) || parseFloat(row['Mosque Donation']) || 0,
            mta: parseFloat(row['MTA']) || 0,
            centinaryKhilafat: parseFloat(row['Centinary Khilafat']) || 0,
            wasiyyatHissanJaidad: parseFloat(row['Wasiyyat_Hissan_Jaidad']) || 0,
            bilalFund: parseFloat(row['Bilal Fund']) || 0,
            yatamaFund: parseFloat(row['Yatama Fund']) || 0,
            localFund: parseFloat(row['Local Fund']) || 0,
            miscellaneous: parseFloat(row['Miscellaneous']) || 0,
            maryamFund: parseFloat(row['Maryam Fund']) || 0,
            totalNgn: parseFloat(row['TOTAL (NGN)'] || row['Sub Total']) || 0,
        }
    }

    const mapTajnidRow = (row: any) => {
        return {
            sn: String(row['S/N'] || ''),
            surname: row['SURNAME'] || '',
            otherNames: row['OTHER NAMES'] || '',
            title: row['TITLE'] || '',
            majlis: row['MAJLIS'] || '',
            refName: row['Ref Name'] || '',
            chandaNo: String(row['CHANDA #'] || ''),
            wasiyyatNo: String(row['WASIYYAT #'] || ''),
            presence: row['PRESENCE'] || '',
            family: row['FAMILY'] || '',
            election: row['election'] || '',
            updatedOnPortal: row['Updated on portal'] || '',
            academicStatus: row['acada'] || '',
            dateOfBirth: row['DoB'],
            email: row['Email'] || '',
            address: row["Jama'at"] || '',
        }
    }

    const startImport = async () => {
        if (!selectedType) return
        setIsUploading(true)

        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i]
            setSheetResults(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'processing' } : s))

            try {
                let result
                if (selectedType === 'CHANDA') {
                    const mapped = sheet.rows.map(mapChandaRow)
                    result = await bulkInsertChandaAmRecords(mapped)
                } else {
                    const mapped = sheet.rows.map(mapTajnidRow)
                    result = await bulkInsertTajnidRecords(mapped)
                }

                if (result.success) {
                    setSheetResults(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'completed', success: result.count || 0 } : s))
                } else {
                    setSheetResults(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', message: result.error } : s))
                }
            } catch (err) {
                console.error(err)
                setSheetResults(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', message: 'System Error' } : s))
            }
        }

        setIsUploading(false)
    }

    const reset = () => {
        setFile(null)
        setSheets([])
        setSheetResults([])
        setSelectedType(null)
        setIsUploading(false)
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {!file ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-emerald-500/10 md:rounded-[2.5rem] rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white border-2 border-dashed border-gray-100 md:rounded-[2.5rem] rounded-2xl md:p-16 p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/20 transition-all duration-500">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                        />
                        <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                            <Upload className="h-12 w-12 text-emerald-600" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Upload Master Registry</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed">
                            Bring your spreadsheet to life. We support multi-sheet Excel files for Chanda Am and Tajnid records.
                        </p>

                        <div className="flex items-center justify-center space-x-8">
                            <div className="flex items-center text-sm font-black text-gray-400 uppercase tracking-widest">
                                <FileCheck className="w-5 h-5 mr-2 text-emerald-500" />
                                XLSX Only
                            </div>
                            <div className="flex items-center text-sm font-black text-gray-400 uppercase tracking-widest">
                                <Search className="w-5 h-5 mr-2 text-blue-500" />
                                Smart Parsing
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: File Info & Type Selection */}
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white md:rounded-[2.5rem] rounded-2xl md:p-8 p-6 border border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="p-4 bg-emerald-50 rounded-2xl">
                                    <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                                </div>
                                {!isUploading && (
                                    <button onClick={reset} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-all">
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                            <h4 className="font-black text-xl text-gray-900 truncate mb-1">{file.name}</h4>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • {sheets.length} Sheets</p>

                            <div className="mt-10 space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Select Record Category</label>

                                <button
                                    onClick={() => setSelectedType('CHANDA')}
                                    className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all group ${selectedType === 'CHANDA'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md shadow-emerald-500/10'
                                        : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-emerald-200'}`}
                                >
                                    <div className={`p-3 rounded-xl mr-4 ${selectedType === 'CHANDA' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400'}`}>
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-base">Chanda Am</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Financial Returns</div>
                                    </div>
                                    {selectedType === 'CHANDA' && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />}
                                </button>

                                <button
                                    onClick={() => setSelectedType('TAJNID')}
                                    className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all group ${selectedType === 'TAJNID'
                                        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md shadow-blue-500/10'
                                        : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-blue-200'}`}
                                >
                                    <div className={`p-3 rounded-xl mr-4 ${selectedType === 'TAJNID' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400'}`}>
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-base">Tajnid Records</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Membership Records</div>
                                    </div>
                                    {selectedType === 'TAJNID' && <CheckCircle2 className="ml-auto h-5 w-5 text-blue-600" />}
                                </button>
                            </div>

                            <button
                                onClick={startImport}
                                disabled={isUploading || !selectedType}
                                className="w-full mt-10 flex items-center justify-center px-8 py-5 bg-gray-900 text-white md:rounded-[2rem] rounded-xl font-black text-sm hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-gray-900 transition-all active:scale-95 group"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                        COMMITTING TO DATABASE...
                                    </>
                                ) : (
                                    <>
                                        PROCEED WITH IMPORT
                                        <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </div>

                    {/* Right Panel: Sheet Progress */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Processing Queue</h5>
                            <span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-500">{sheets.length} SHEETS FOUND</span>
                        </div>
                        <AnimatePresence mode='popLayout'>
                            {sheetResults.map((res, i) => (
                                <motion.div
                                    key={res.name}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`p-6 md:rounded-[2rem] rounded-2xl border-2 transition-all duration-500 ${res.status === 'processing'
                                        ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/5'
                                        : res.status === 'completed'
                                            ? 'bg-white border-gray-100 grayscale-0'
                                            : res.status === 'error'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-white border-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6">
                                            <div className={`p-4 rounded-2xl transition-all duration-500 ${res.status === 'completed' ? 'bg-emerald-600 text-white' :
                                                res.status === 'processing' ? 'bg-emerald-100 text-emerald-600 animate-pulse' :
                                                    res.status === 'error' ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-300'
                                                }`}>
                                                {res.status === 'completed' ? <FileCheck className="h-7 w-7" /> : <FileSpreadsheet className="h-7 w-7" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-lg text-gray-900 tracking-tight">{res.name}</p>
                                                <div className="flex items-center space-x-3 mt-1">
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-tighter">{sheets[i]?.rows.length} ROWS</span>
                                                    {res.status === 'completed' && <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">SUCCESSFUL</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            {res.status === 'processing' && (
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Syncing...</div>
                                                    <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                                                </div>
                                            )}
                                            {res.status === 'completed' && (
                                                <div className="flex flex-col items-end">
                                                    <div className="text-2xl font-black text-emerald-600 tabular-nums">+{res.success}</div>
                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ENTRIES REIFIED</div>
                                                </div>
                                            )}
                                            {res.status === 'error' && (
                                                <div className="flex items-center bg-red-100 px-4 py-2 rounded-xl text-red-600 font-black text-[10px]">
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    <span className="uppercase tracking-widest truncate max-w-[150px]">{res.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    )
}
