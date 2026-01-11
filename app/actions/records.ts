'use server'

import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

/**
 * Zod Schemas for Validation
 */
const ChandaAmSchema = z.object({
    chandaNumber: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    receiptNo: z.string().optional(),
    date: z.coerce.date().optional(),
    monthPaidFor: z.string().optional(),
    chandaAam: z.coerce.number().default(0),
    chandaWasiyyat: z.coerce.number().default(0),
    jalsaSalana: z.coerce.number().default(0),
    tarikiJadid: z.coerce.number().default(0),
    waqfiJadid: z.coerce.number().default(0),
    welfareFund: z.coerce.number().default(0),
    scholarship: z.coerce.number().default(0),
    zakatulFitr: z.coerce.number().default(0),
    tabligh: z.coerce.number().default(0),
    zakat: z.coerce.number().default(0),
    sadakat: z.coerce.number().default(0),
    fitrana: z.coerce.number().default(0),
    mosqueDonation: z.coerce.number().default(0),
    mta: z.coerce.number().default(0),
    centinaryKhilafat: z.coerce.number().default(0),
    wasiyyatHissanJaidad: z.coerce.number().default(0),
    bilalFund: z.coerce.number().default(0),
    yatamaFund: z.coerce.number().default(0),
    localFund: z.coerce.number().default(0),
    miscellaneous: z.coerce.number().default(0),
    maryamFund: z.coerce.number().default(0),
    totalNgn: z.coerce.number().default(0),
})

const TajnidSchema = z.object({
    sn: z.string().optional(),
    surname: z.string().min(1, 'Surname is required'),
    otherNames: z.string().optional(),
    title: z.string().optional(),
    majlis: z.string().optional(),
    refName: z.string().optional(),
    chandaNo: z.string().optional(),
    wasiyyatNo: z.string().optional(),
    presence: z.string().optional(),
    family: z.string().optional(),
    election: z.string().optional(),
    updatedOnPortal: z.string().optional(),
    academicStatus: z.string().optional(),
    dateOfBirth: z.coerce.date().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    phone: z.string().optional(),
})

/**
 * Fetch Chanda Am Records
 */
export async function getChandaAmRecords(query?: string, page = 1, limit = 20, filters?: { month?: string, orgId?: string }) {
    const session = await getSession()
    if (!session) return { records: [], total: 0, totalPages: 0 }

    const skip = (page - 1) * limit
    const db = await getDb()

    const match: any = {}
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    if (filters?.month) {
        match.monthPaidFor = filters.month
    }

    if (query) {
        match.$or = [
            { name: { $regex: query, $options: 'i' } },
            { chandaNumber: { $regex: query, $options: 'i' } },
            { receiptNo: { $regex: query, $options: 'i' } },
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
        { $sort: { createdAt: -1 as const } },
        { $skip: skip },
        { $limit: limit }
    ]

    const [records, total] = await Promise.all([
        db.collection('ChandaAm').aggregate(pipeline).toArray(),
        db.collection('ChandaAm').countDocuments(match)
    ])

    return {
        records: JSON.parse(JSON.stringify(records)),
        total,
        totalPages: Math.ceil(total / limit),
    }
}

/**
 * Fetch Tajnid Records
 */
export async function getTajnidRecords(query?: string, page = 1, limit = 20, filters?: { majlis?: string, orgId?: string }) {
    const session = await getSession()
    if (!session) return { records: [], total: 0, totalPages: 0 }

    const skip = (page - 1) * limit
    const db = await getDb()

    const match: any = {}
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    if (filters?.majlis) {
        match.majlis = filters.majlis
    }

    if (query) {
        match.$or = [
            { surname: { $regex: query, $options: 'i' } },
            { otherNames: { $regex: query, $options: 'i' } },
            { chandaNo: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
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
        { $sort: { createdAt: -1 as const } },
        { $skip: skip },
        { $limit: limit }
    ]

    const [records, total] = await Promise.all([
        db.collection('TajnidRecord').aggregate(pipeline).toArray(),
        db.collection('TajnidRecord').countDocuments(match)
    ])

    return {
        records: JSON.parse(JSON.stringify(records)),
        total,
        totalPages: Math.ceil(total / limit),
    }
}

export async function getTajnidMember(id: string) {
    const session = await getSession()
    if (!session) return null

    const db = await getDb()
    const record = await db.collection('TajnidRecord').aggregate([
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
 * Create a new Chanda Am Record
 */
export async function createChandaAmRecord(formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    const rawData = Object.fromEntries(formData.entries())
    const result = ChandaAmSchema.safeParse(rawData)

    if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors, message: 'Validation failed' }
    }

    try {
        const db = await getDb()
        await db.collection('ChandaAm').insertOne({
            ...result.data,
            organizationId: new ObjectId(session.user.organizationId),
            adminId: new ObjectId(session.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: 'Record created successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to create record' }
    }
}

export async function updateChandaAmRecord(id: string, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    const rawData = Object.fromEntries(formData.entries())
    const result = ChandaAmSchema.safeParse(rawData)

    if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors, message: 'Validation failed' }
    }

    try {
        const db = await getDb()
        const match: any = { _id: new ObjectId(id) }
        if (session.user.role === 'STANDARD_ADMIN') {
            match.organizationId = new ObjectId(session.user.organizationId)
        }

        await db.collection('ChandaAm').updateOne(match, {
            $set: {
                ...result.data,
                updatedAt: new Date(),
            }
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: 'Record updated successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to update record' }
    }
}

/**
 * Create a new Tajnid Record
 */
export async function createTajnidRecord(formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    const rawData = Object.fromEntries(formData.entries())
    const result = TajnidSchema.safeParse(rawData)

    if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors, message: 'Validation failed' }
    }

    try {
        const db = await getDb()
        await db.collection('TajnidRecord').insertOne({
            ...result.data,
            organizationId: new ObjectId(session.user.organizationId),
            adminId: new ObjectId(session.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: 'Record created successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to create record' }
    }
}

export async function updateTajnidRecord(id: string, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    const rawData = Object.fromEntries(formData.entries())
    const result = TajnidSchema.safeParse(rawData)

    if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors, message: 'Validation failed' }
    }

    try {
        const db = await getDb()
        const match: any = { _id: new ObjectId(id) }
        if (session.user.role === 'STANDARD_ADMIN') {
            match.organizationId = new ObjectId(session.user.organizationId)
        }

        await db.collection('TajnidRecord').updateOne(match, {
            $set: {
                ...result.data,
                updatedAt: new Date(),
            }
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: 'Record updated successfully' }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to update record' }
    }
}

/**
 * Organization and Admin Management (Super Admin only)
 */
export async function getOrganizations() {
    const db = await getDb()
    return await db.collection('Organization').find().sort({ name: 1 }).toArray()
}

export async function createStandardAdminAction(fullName: string, organizationName: string, passwordNumber: string) {
    const session = await getSession()
    if (!session || session.user.role !== 'SUPER_ADMIN') {
        return { success: false, message: 'Only Super Admin can create standard admins' }
    }

    try {
        const db = await getDb()
        const plainPassword = `${organizationName}${passwordNumber}`
        const hashedPassword = await bcrypt.hash(plainPassword, 10)

        // Check/Create organization
        let org = await db.collection('Organization').findOne({ name: organizationName })

        if (!org) {
            const orgResult = await db.collection('Organization').insertOne({
                name: organizationName,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            org = { _id: orgResult.insertedId, name: organizationName } as any
        }

        // Create user with a generated email based on organization name
        const email = `${organizationName.toLowerCase().replace(/\s+/g, '')}${passwordNumber}@jamaat.com`

        await db.collection('User').insertOne({
            email,
            password: hashedPassword,
            name: fullName,
            role: 'STANDARD_ADMIN',
            organizationId: org!._id,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath('/dashboard/users')
        return { success: true, message: `Admin created for ${organizationName}. Email: ${email}` }
    } catch (error: any) {
        if (error.code === 11000) return { success: false, message: 'Admin with this name/email/organization already exists' }
        return { success: false, message: 'Failed to create admin' }
    }
}

/**
 * Delete multiple records
 */
export async function deleteRecords(ids: string[], type: 'chanda' | 'tajnid') {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    try {
        const db = await getDb()
        const collection = type === 'chanda' ? 'ChandaAm' : 'TajnidRecord'
        const objectIds = ids.map(id => new ObjectId(id))

        const match: any = { _id: { $in: objectIds } }
        if (session.user.role === 'STANDARD_ADMIN') {
            match.organizationId = new ObjectId(session.user.organizationId)
        }

        const result = await db.collection(collection).deleteMany(match)

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: `${result.deletedCount} records deleted successfully` }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to delete records' }
    }
}

/**
 * Create multiple records
 */
export async function createMultipleRecords(data: any[], type: 'chanda' | 'tajnid') {
    const session = await getSession()
    if (!session || !session.user.organizationId) return { success: false, message: 'Unauthorized' }

    if (!Array.isArray(data) || data.length === 0) return { success: false, message: 'No data provided' }

    try {
        const db = await getDb()
        const collection = type === 'chanda' ? 'ChandaAm' : 'TajnidRecord'
        const schema = type === 'chanda' ? ChandaAmSchema : TajnidSchema

        const validatedRecords = data.map(item => {
            const result = schema.safeParse(item)
            if (!result.success) throw new Error('Validation failed for one or more records')
            return {
                ...result.data,
                organizationId: new ObjectId(session.user.organizationId as string),
                adminId: new ObjectId(session.user.id),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        })

        await db.collection(collection).insertMany(validatedRecords)

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')
        return { success: true, message: `${validatedRecords.length} records created successfully` }
    } catch (error: any) {
        console.error(error)
        return { success: false, message: error.message || 'Failed to create records' }
    }
}
/**
 * Fetch All Records for Export (No Pagination)
 */
export async function getAllRecordsForExport(type: 'chanda' | 'tajnid', query?: string, filters?: { month?: string, majlis?: string, orgId?: string }) {
    const session = await getSession()
    if (!session) return []

    const db = await getDb()
    const collection = type === 'chanda' ? 'ChandaAm' : 'TajnidRecord'

    const match: any = {}
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    if (type === 'chanda' && filters?.month) {
        match.monthPaidFor = filters.month
    } else if (type === 'tajnid' && filters?.majlis) {
        match.majlis = filters.majlis
    }

    if (query) {
        if (type === 'chanda') {
            match.$or = [
                { name: { $regex: query, $options: 'i' } },
                { chandaNumber: { $regex: query, $options: 'i' } },
                { receiptNo: { $regex: query, $options: 'i' } },
            ]
        } else {
            match.$or = [
                { surname: { $regex: query, $options: 'i' } },
                { otherNames: { $regex: query, $options: 'i' } },
                { chandaNo: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ]
        }
    }

    const records = await db.collection(collection).find(match).sort({ createdAt: -1 }).toArray()
    return JSON.parse(JSON.stringify(records))
}
