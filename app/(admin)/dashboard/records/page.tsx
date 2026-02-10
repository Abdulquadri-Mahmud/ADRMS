import { getChandaAmRecords, getTajnidRecords, getOrganizations } from '@/app/actions/records'
import RecordsClient from '@/app/components/RecordsClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function RecordsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; type?: string; month?: string; year?: string; majlis?: string; orgId?: string }>
}) {
    const session = await getSession()
    const filters = await searchParams
    const query = filters?.q || ''
    const page = Number(filters?.page) || 1
    const type = filters?.type || 'chanda'
    const month = filters?.month || undefined
    const year = filters?.year || undefined
    const majlis = filters?.majlis || undefined
    const orgId = filters?.orgId || undefined

    let data
    let tajnidTotal = 0
    let chandaTotal = 0

    // Fetch active view data and counts
    if (type === 'tajnid') {
        data = await getTajnidRecords(query, page, 20, { majlis, orgId, month })
        tajnidTotal = data.total
        // We also need Chanda total if we want to show it, but user specifically asked for Tajnid.
        // Let's fetch Chanda total too for completeness in tabs
        const chandaRes = await getChandaAmRecords(query, 1, 1, { month, year, orgId })
        chandaTotal = chandaRes.total
    } else {
        data = await getChandaAmRecords(query, page, 20, { month, year, orgId })
        chandaTotal = data.total
        // Fetch Tajnid total to display on Chanda view
        const tajnidRes = await getTajnidRecords(query, 1, 1, { majlis, orgId })
        tajnidTotal = tajnidRes.total
    }

    const { records, total } = data

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
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Records Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Viewing records for <span className="text-emerald-600 font-bold">{currentOrgName || 'Your Organization'}</span>
                    </p>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>}>
                <RecordsClient
                    records={records}
                    total={total}
                    tajnidTotal={tajnidTotal}
                    chandaTotal={chandaTotal}
                    searchParams={filters}
                    organizations={JSON.parse(JSON.stringify(organizations))}
                />
            </Suspense>
        </div>
    )
}
