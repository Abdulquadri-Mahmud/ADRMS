'use server'

import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/session'

/**
 * Zod Schema for Financial Record Validation
 */
const FinancialRecordSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE'], { message: 'Transaction type is required' }),
    category: z.string().min(1, 'Category is required'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    description: z.string().min(1, 'Description is required'),
    transactionDate: z.coerce.date(),
    receiptNo: z.string().optional(),
    paymentMethod: z.string().optional(),
    vendor: z.string().optional(),
    reference: z.string().optional(),
})





/**
 * Fetch Financial Records with Pagination and Filters
 */
export async function getFinancialRecords(
    query?: string,
    page = 1,
    limit = 20,
    filters?: {
        type?: string,
        category?: string,
        dateFrom?: string,
        dateTo?: string,
        orgId?: string
    }
) {
    const session = await getSession()
    if (!session) return { records: [], total: 0, totalPages: 0 }

    const skip = (page - 1) * limit
    const db = await getDb()

    const match: any = {}

    // Organization scoping
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    // Type filter
    if (filters?.type) {
        match.type = filters.type
    }

    // Category filter
    if (filters?.category) {
        match.category = filters.category
    }

    // Date range filter
    if (filters?.dateFrom || filters?.dateTo) {
        match.transactionDate = {}
        if (filters.dateFrom) {
            match.transactionDate.$gte = new Date(filters.dateFrom)
        }
        if (filters.dateTo) {
            match.transactionDate.$lte = new Date(filters.dateTo)
        }
    }

    // Search query
    if (query) {
        match.$or = [
            { description: { $regex: query, $options: 'i' } },
            { vendor: { $regex: query, $options: 'i' } },
            { receiptNo: { $regex: query, $options: 'i' } },
            { reference: { $regex: query, $options: 'i' } },
        ]
    }

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'Organization',
                localField: 'organizationId',
                foreignField: '_id',
                as: 'organization'
            }
        },
        { $unwind: { path: '$organization', preserveNullAndEmptyArrays: true } },
        { $sort: { transactionDate: -1 as const, createdAt: -1 as const } },
        { $skip: skip },
        { $limit: limit }
    ]

    const [records, total] = await Promise.all([
        db.collection('FinancialRecord').aggregate(pipeline).toArray(),
        db.collection('FinancialRecord').countDocuments(match)
    ])

    return {
        records: JSON.parse(JSON.stringify(records)),
        total,
        totalPages: Math.ceil(total / limit),
    }
}

/**
 * Get Financial Record by ID
 */
export async function getFinancialRecordById(id: string) {
    const session = await getSession()
    if (!session) return null

    const db = await getDb()
    const record = await db.collection('FinancialRecord').aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
            $lookup: {
                from: 'Organization',
                localField: 'organizationId',
                foreignField: '_id',
                as: 'organization'
            }
        },
        { $unwind: { path: '$organization', preserveNullAndEmptyArrays: true } }
    ]).next()

    return record ? JSON.parse(JSON.stringify(record)) : null
}

/**
 * Create a new Financial Record
 */
export async function createFinancialRecord(formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) {
        return { success: false, message: 'Unauthorized' }
    }

    const rawData = Object.fromEntries(formData.entries())
    const result = FinancialRecordSchema.safeParse(rawData)

    if (!result.success) {
        return {
            success: false,
            errors: result.error.flatten().fieldErrors,
            message: 'Validation failed'
        }
    }

    try {
        const db = await getDb()
        await db.collection('FinancialRecord').insertOne({
            ...result.data,
            organizationId: new ObjectId(session.user.organizationId),
            adminId: new ObjectId(session.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath('/dashboard/financial')
        revalidatePath('/dashboard')
        return { success: true, message: 'Financial record created successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to create financial record' }
    }
}

/**
 * Update Financial Record
 */
export async function updateFinancialRecord(id: string, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) {
        return { success: false, message: 'Unauthorized' }
    }

    const rawData = Object.fromEntries(formData.entries())
    const result = FinancialRecordSchema.safeParse(rawData)

    if (!result.success) {
        return {
            success: false,
            errors: result.error.flatten().fieldErrors,
            message: 'Validation failed'
        }
    }

    try {
        const db = await getDb()
        const match: any = { _id: new ObjectId(id) }

        if (session.user.role === 'STANDARD_ADMIN') {
            match.organizationId = new ObjectId(session.user.organizationId)
        }

        await db.collection('FinancialRecord').updateOne(match, {
            $set: {
                ...result.data,
                updatedAt: new Date(),
            }
        })

        revalidatePath('/dashboard/financial')
        revalidatePath('/dashboard')
        return { success: true, message: 'Financial record updated successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to update financial record' }
    }
}

/**
 * Delete multiple Financial Records
 */
export async function deleteFinancialRecords(ids: string[]) {
    const session = await getSession()
    if (!session || !session.user.organizationId) {
        return { success: false, message: 'Unauthorized' }
    }

    try {
        const db = await getDb()
        const objectIds = ids.map(id => new ObjectId(id))

        const match: any = { _id: { $in: objectIds } }
        if (session.user.role === 'STANDARD_ADMIN') {
            match.organizationId = new ObjectId(session.user.organizationId)
        }

        const result = await db.collection('FinancialRecord').deleteMany(match)

        revalidatePath('/dashboard/financial')
        revalidatePath('/dashboard')
        return {
            success: true,
            message: `${result.deletedCount} record(s) deleted successfully`
        }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to delete records' }
    }
}

/**
 * Create Multiple Financial Records
 */
export async function createMultipleFinancialRecords(data: any[]) {
    const session = await getSession()
    if (!session || !session.user.organizationId) {
        return { success: false, message: 'Unauthorized' }
    }

    if (!Array.isArray(data) || data.length === 0) {
        return { success: false, message: 'No data provided' }
    }

    try {
        const db = await getDb()

        const validatedRecords = data.map(item => {
            const result = FinancialRecordSchema.safeParse(item)
            if (!result.success) {
                throw new Error('Validation failed for one or more records')
            }
            return {
                ...result.data,
                organizationId: new ObjectId(session.user.organizationId as string),
                adminId: new ObjectId(session.user.id),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        })

        await db.collection('FinancialRecord').insertMany(validatedRecords)

        revalidatePath('/dashboard/financial')
        revalidatePath('/dashboard')
        return {
            success: true,
            message: `${validatedRecords.length} record(s) created successfully`
        }
    } catch (error: any) {
        console.error(error)
        return { success: false, message: error.message || 'Failed to create records' }
    }
}

/**
 * Get Financial Summary Statistics
 */
export async function getFinancialSummary(filters?: {
    month?: number,
    year?: number,
    orgId?: string
}) {
    const session = await getSession()
    if (!session) {
        return {
            totalIncome: 0,
            totalExpenses: 0,
            totalPurchases: 0,
            netBalance: 0,
            recordCount: 0
        }
    }

    const db = await getDb()
    const match: any = {}

    // Organization scoping
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    // Date filtering
    if (filters?.month || filters?.year) {
        match.transactionDate = {}

        if (filters.year && filters.month) {
            // Specific month and year
            const startDate = new Date(filters.year, filters.month - 1, 1)
            const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59)
            match.transactionDate.$gte = startDate
            match.transactionDate.$lte = endDate
        } else if (filters.year) {
            // Entire year
            const startDate = new Date(filters.year, 0, 1)
            const endDate = new Date(filters.year, 11, 31, 23, 59, 59)
            match.transactionDate.$gte = startDate
            match.transactionDate.$lte = endDate
        }
    }

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]

    const results = await db.collection('FinancialRecord').aggregate(pipeline).toArray()

    let totalIncome = 0
    let totalExpenses = 0
    let recordCount = 0

    results.forEach((result: any) => {
        recordCount += result.count
        if (result._id === 'INCOME') {
            totalIncome = result.total
        } else if (result._id === 'EXPENSE') {
            totalExpenses = result.total
        }
    })

    const netBalance = totalIncome - totalExpenses

    return {
        totalIncome,
        totalExpenses,
        netBalance,
        recordCount
    }
}

/**
 * Get All Financial Records for Export (No Pagination)
 */
export async function getAllFinancialRecordsForExport(
    query?: string,
    filters?: {
        type?: string,
        category?: string,
        dateFrom?: string,
        dateTo?: string,
        orgId?: string
    }
) {
    const session = await getSession()
    if (!session) return []

    const db = await getDb()
    const match: any = {}

    // Organization scoping
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    // Type filter
    if (filters?.type) {
        match.type = filters.type
    }

    // Category filter
    if (filters?.category) {
        match.category = filters.category
    }

    // Date range filter
    if (filters?.dateFrom || filters?.dateTo) {
        match.transactionDate = {}
        if (filters.dateFrom) {
            match.transactionDate.$gte = new Date(filters.dateFrom)
        }
        if (filters.dateTo) {
            match.transactionDate.$lte = new Date(filters.dateTo)
        }
    }

    // Search query
    if (query) {
        match.$or = [
            { description: { $regex: query, $options: 'i' } },
            { vendor: { $regex: query, $options: 'i' } },
            { receiptNo: { $regex: query, $options: 'i' } },
            { reference: { $regex: query, $options: 'i' } },
        ]
    }

    const records = await db.collection('FinancialRecord')
        .find(match)
        .sort({ transactionDate: -1, createdAt: -1 })
        .toArray()

    return JSON.parse(JSON.stringify(records))
}
