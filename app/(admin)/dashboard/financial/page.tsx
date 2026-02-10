import { getFinancialRecords, getFinancialSummary } from '@/app/actions/financial'
import { getOrganizations } from '@/app/actions/records'
import FinancialClient from '@/app/components/FinancialClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function FinancialPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string
        page?: string
        type?: string
        category?: string
        dateFrom?: string
        dateTo?: string
        orgId?: string
    }>
}) {
    const session = await getSession()
    const filters = await searchParams
    const query = filters?.q || ''
    const page = Number(filters?.page) || 1
    const type = filters?.type || undefined
    const category = filters?.category || undefined
    const dateFrom = filters?.dateFrom || undefined
    const dateTo = filters?.dateTo || undefined
    const orgId = filters?.orgId || undefined

    // Fetch financial records
    const data = await getFinancialRecords(query, page, 20, {
        type,
        category,
        dateFrom,
        dateTo,
        orgId
    })

    const { records, total } = data

    // Fetch summary statistics
    const currentDate = new Date()
    const summary = await getFinancialSummary({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        orgId
    })

    // Fetch organizations for SUPER_ADMIN
    let organizations: any[] = []
    if (session?.user?.role === 'SUPER_ADMIN') {
        organizations = await getOrganizations()
    }

    const currentOrgName = orgId
        ? organizations.find(o => o._id.toString() === orgId)?.name
        : (session?.user?.role === 'SUPER_ADMIN' ? 'All Organizations' : session?.user?.organizationName)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Tracking</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage income, expenses, and purchases for <span className="text-emerald-600 font-bold">{currentOrgName || 'Your Organization'}</span>
                    </p>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>}>
                <FinancialClient
                    records={records}
                    total={total}
                    summary={summary}
                    searchParams={filters}
                    organizations={JSON.parse(JSON.stringify(organizations))}
                />
            </Suspense>
        </div>
    )
}
