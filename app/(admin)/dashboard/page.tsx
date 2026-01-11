import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { FileText, DollarSign, Calendar, TrendingUp, FileSpreadsheet, Plus, Users, Building2 } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import DashboardCharts from '@/app/components/DashboardCharts'

async function getStats(session: any) {
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN'
    const orgIdString = session.user.organizationId
    const db = await getDb()

    const match: any = !isSuperAdmin ? { organizationId: new ObjectId(orgIdString) } : {}

    const [totalChanda, totalTajnid] = await Promise.all([
        db.collection('ChandaAm').countDocuments(match),
        db.collection('TajnidRecord').countDocuments(match)
    ])

    // Total Sum of Chanda
    const sumResult = await db.collection('ChandaAm').aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$totalNgn' } } }
    ]).toArray()
    const totalAmount = sumResult[0]?.total || 0

    // Calculate monthly total for Chanda
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyMatch = { ...match, createdAt: { $gte: firstDayOfMonth } }

    const monthlyResult = await db.collection('ChandaAm').aggregate([
        { $match: monthlyMatch },
        { $group: { _id: null, total: { $sum: '$totalNgn' } } }
    ]).toArray()
    const currentMonthly = monthlyResult[0]?.total || 0

    // Get monthly collections for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    const monthlyCollections = await db.collection('ChandaAm').aggregate([
        { $match: { ...match, createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' }
                },
                total: { $sum: '$totalNgn' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const chartData = monthlyCollections.map(item => ({
        name: new Date(2000, item._id.month - 1).toLocaleString('default', { month: 'short' }),
        value: item.total
    }))

    // Get Tajnid composition by Majlis
    const tajnidComposition = await db.collection('TajnidRecord').aggregate([
        { $match: match },
        { $group: { _id: '$majlis', count: { $sum: 1 } } }
    ]).toArray()

    const pieData = tajnidComposition.map(item => ({
        name: item._id || 'UNASSIGNED',
        value: item.count
    }))

    return {
        totalRecords: totalChanda,
        totalTajnid,
        totalAmount,
        monthlyAmount: currentMonthly,
        chartData,
        pieData
    }
}

export default async function DashboardPage() {
    const session = await getSession()
    if (!session) return null

    const stats = await getStats(session)
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-emerald-600 mb-2">
                        <Building2 className="h-5 w-5" />
                        <span className="font-bold uppercase tracking-wider text-xs">
                            {isSuperAdmin ? 'Administrative Headquarters' : session.user.organizationName}
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Jama'at Dashboard</h1>
                    <p className="text-gray-500 mt-1 max-w-2xl">
                        Welcome back, <span className="font-bold text-gray-700">{session.user.name}</span>.
                        Monitoring records for {isSuperAdmin ? 'all Jamaats' : session.user.organizationName}.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">Live Updates</span>
                    <Link href="/dashboard/records" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95">
                        Manage Records
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Chanda Records"
                    description="Total collections to date"
                    value={stats.totalRecords.toLocaleString()}
                    icon={<FileText className="h-5 w-5 text-blue-600" />}
                    color="blue"
                />
                <StatsCard
                    title="Tajnid Records"
                    description="Total registered members"
                    value={stats.totalTajnid.toLocaleString()}
                    icon={<Users className="h-5 w-5 text-orange-600" />}
                    color="orange"
                />
                <StatsCard
                    title="Total Funds"
                    description="Cumulative collection"
                    value={`₦${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                    icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                    color="emerald"
                />
                <StatsCard
                    title="Monthly Velocity"
                    description="Current month total"
                    value={`₦${stats.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                    icon={<Calendar className="h-5 w-5 text-purple-600" />}
                    color="purple"
                />
            </div>

            <DashboardCharts chartData={stats.chartData} pieData={stats.pieData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Operations Panel */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Operations Panel</h2>
                            <p className="text-sm text-gray-500">Quickly add new data or import existing sheets.</p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Link href="/dashboard/records?action=new" className="flex items-center p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Plus className="h-7 w-7 text-emerald-600" />
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-base font-bold text-gray-900">Manual Entry</h3>
                                    <p className="text-xs text-gray-500 mt-1">Add single Chanda or Tajnid record.</p>
                                </div>
                            </Link>

                            <Link href="/dashboard/upload" className="flex items-center p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                                <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="h-7 w-7 text-blue-600" />
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-base font-bold text-gray-900">Bulk Import</h3>
                                    <p className="text-xs text-gray-500 mt-1">Upload multi-sheet Excel files.</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Organization Insight */}
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-900/20">
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="mb-6 bg-white/10 w-fit p-3 rounded-2xl backdrop-blur-md">
                            <Building2 className="h-6 w-6 text-emerald-300" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 tracking-tight">Organization Scope</h2>
                        <p className="text-emerald-100/80 text-sm mb-6 leading-relaxed">
                            {isSuperAdmin
                                ? 'As a Super Admin, you have access to financial metrics across all Jamaats in the federation.'
                                : `You are managing records exclusively for ${session.user.organizationName}. Data integrity and privacy are maintained.`
                            }
                        </p>
                        <div className="mt-auto pt-6 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold uppercase tracking-widest">
                                <span>Security Level</span>
                                <span className="flex items-center">
                                    <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full mr-2 shadow-[0_0_8px_white]"></div>
                                    Encrypted
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -bottom-10 -right-10 h-48 w-48 bg-emerald-500/20 rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    )
}

function StatsCard({ title, description, value, icon, color }: { title: string, description: string, value: string, icon: React.ReactNode, color: string }) {
    return (
        <div className="p-5 md:rounded-[2rem] rounded-2xl bg-white border border-gray-100 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    {icon}
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{title}</h3>
                <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tighter uppercase">{value}</p>
                <p className="mt-2 text-[10px] text-gray-400 leading-relaxed font-bold uppercase tracking-tight">
                    {description}
                </p>
            </div>
        </div>
    )
}
