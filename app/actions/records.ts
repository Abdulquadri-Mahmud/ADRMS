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
    monthPaidFor: z.string().optional().transform(val => {
        // Support both old format (January) and new format (JAN2024, FEB2024)
        // This ensures backward compatibility
        return val
    }),
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
 * Month Normalization Utilities
 * These helpers enable inclusive month filtering regardless of input format
 */
const MONTH_MAP: { [key: string]: string } = {
    'january': 'JAN', 'jan': 'JAN',
    'february': 'FEB', 'feb': 'FEB',
    'march': 'MAR', 'mar': 'MAR',
    'april': 'APR', 'apr': 'APR',
    'may': 'MAY',
    'june': 'JUN', 'jun': 'JUN',
    'july': 'JUL', 'jul': 'JUL',
    'august': 'AUG', 'aug': 'AUG',
    'september': 'SEP', 'sep': 'SEP', 'sept': 'SEP',
    'october': 'OCT', 'oct': 'OCT',
    'november': 'NOV', 'nov': 'NOV',
    'december': 'DEC', 'dec': 'DEC'
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/**
 * Normalize month input to abbreviated format (e.g., September → SEP, SEP2024 → SEP)
 */
function normalizeMonth(input: string): string {
    const cleaned = input.trim().toLowerCase()

    // If it's already in MMMYYYY format, extract just the month part
    const match = cleaned.match(/^([a-z]+)\d{4}$/)
    if (match) {
        const monthPart = match[1]
        return MONTH_MAP[monthPart] || monthPart.toUpperCase()
    }

    // Otherwise, try to map it directly
    return MONTH_MAP[cleaned] || cleaned.toUpperCase()
}

/**
 * Check if a monthPaidFor value contains the specified month
 * Handles comma-separated values and various input formats
 */
function monthPaidForIncludes(monthPaidFor: string | null | undefined, searchMonth: string): boolean {
    if (!monthPaidFor || !searchMonth) return false

    const normalizedSearch = normalizeMonth(searchMonth)
    const monthPaidForUpper = monthPaidFor.toUpperCase()

    // Split by comma and check each month
    const months = monthPaidForUpper.split(',').map(m => m.trim())

    return months.some(month => {
        // Extract month abbreviation from MMMYYYY format
        const monthAbbr = month.match(/^([A-Z]+)\d{4}$/)?.[1] || month
        return monthAbbr === normalizedSearch
    })
}

/**
 * Fetch Chanda Am Records
 */
export async function getChandaAmRecords(query?: string, page = 1, limit = 20, filters?: { month?: string, year?: string, orgId?: string }) {
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

    if (filters?.month || filters?.year) {
        // Handle year and month filtering for ChandaAm records
        // Data format: monthPaidFor is comma-separated "MMMYYYY" values (e.g., "JAN2024, FEB2024")

        const year = filters.year
        const month = filters.month

        if (year && month) {
            // Both year and month specified: Filter for specific MMMYYYY (e.g., "SEP2024")
            const normalizedMonth = normalizeMonth(month)
            const targetMonthYear = `${normalizedMonth}${year}`

            // Match records where monthPaidFor contains the exact MMMYYYY pattern
            const escaped = targetMonthYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            match.monthPaidFor = { $regex: `(^|,\\s*)${escaped}(\\s*,|\\s*$)`, $options: 'i' }
        } else if (year && !month) {
            // Only year specified: Filter for all months in that year
            const allMonthsPattern = MONTH_ABBR.map(m => m).join('|')
            match.monthPaidFor = { $regex: `(${allMonthsPattern})${year}`, $options: 'i' }
        } else if (!year && month) {
            // Only month specified: Filter for that month across all years
            const normalizedMonth = normalizeMonth(month)
            const escaped = normalizedMonth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            match.monthPaidFor = { $regex: `(^|,\\s*)${escaped}\\d{4}(\\s*,|\\s*$)`, $options: 'i' }
        }
    }

    // Filter out empty records
    match.name = { $ne: "" }

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
export async function getTajnidRecords(query?: string, page = 1, limit = 20, filters?: { majlis?: string, orgId?: string, month?: string }) {
    const session = await getSession()
    if (!session) return { records: [], total: 0, totalPages: 0 }

    // If limit is <= 0, we treat it as "fetch all" (no pagination)
    const isPaginationEnabled = limit > 0
    const skip = isPaginationEnabled ? (page - 1) * limit : 0
    const db = await getDb()

    const match: any = {}
    if (session.user.role === 'STANDARD_ADMIN') {
        match.organizationId = new ObjectId(session.user.organizationId)
    } else if (filters?.orgId) {
        match.organizationId = new ObjectId(filters.orgId)
    }

    if (filters?.majlis) {
        if (filters.majlis.toUpperCase() === 'NASRAT') {
            match.majlis = { $in: ['NASRA', 'NASIRA', 'NASRAT'] }
        } else if (filters.majlis.toUpperCase() === 'LAJNAH') {
            match.majlis = { $in: ['LAJNAH', 'LAJNA'] }
        } else {
            match.majlis = filters.majlis
        }
    }

    if (filters?.month) {
        const monthMap: Record<string, number> = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        const monthIndex = monthMap[filters.month]
        if (monthIndex) {
            match.$expr = { $eq: [{ $month: "$createdAt" }, monthIndex] }
        }
    }

    // Filter out empty records
    match.surname = { $ne: "" }

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
    ]

    // Only add pagination stages if limit is positive
    if (isPaginationEnabled) {
        pipeline.push({ $skip: skip } as any);
        pipeline.push({ $limit: limit } as any);
    }

    const [records, total] = await Promise.all([
        db.collection('TajnidRecord').aggregate(pipeline).toArray(),
        db.collection('TajnidRecord').countDocuments(match)
    ])

    return {
        records: JSON.parse(JSON.stringify(records)),
        total,
        totalPages: isPaginationEnabled ? Math.ceil(total / limit) : 1,
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

        // Validate that a Tajnid record exists for this member
        if (result.data.chandaNumber) {
            const tajnidExists = await db.collection('TajnidRecord').findOne({
                chandaNo: result.data.chandaNumber,
                organizationId: new ObjectId(session.user.organizationId)
            })

            if (!tajnidExists) {
                return {
                    success: false,
                    message: `No Tajnid record found for Chanda Number: ${result.data.chandaNumber}. Please create a Tajnid record first.`
                }
            }
        } else {
            return {
                success: false,
                message: 'Chanda Number is required. Please link this contribution to an existing member.'
            }
        }

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

        // For ChandaAm records, validate that Tajnid records exist
        if (type === 'chanda') {
            const chandaNumbers = data
                .map(item => item.chandaNumber)
                .filter(num => num && num.trim() !== '')

            if (chandaNumbers.length === 0) {
                return {
                    success: false,
                    message: 'All records must have a Chanda Number to link to existing members.'
                }
            }

            // Check which Tajnid records exist
            const existingTajnidRecords = await db.collection('TajnidRecord').find({
                chandaNo: { $in: chandaNumbers },
                organizationId: new ObjectId(session.user.organizationId)
            }).toArray()

            const existingChandaNumbers = new Set(existingTajnidRecords.map(r => r.chandaNo))
            const missingChandaNumbers = chandaNumbers.filter(num => !existingChandaNumbers.has(num))

            if (missingChandaNumbers.length > 0) {
                return {
                    success: false,
                    message: `Cannot create Chanda records. The following Chanda Numbers do not have Tajnid records: ${missingChandaNumbers.slice(0, 5).join(', ')}${missingChandaNumbers.length > 5 ? ` and ${missingChandaNumbers.length - 5} more` : ''}. Please create Tajnid records first.`
                }
            }
        }

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
export async function getAllRecordsForExport(type: 'chanda' | 'tajnid', query?: string, filters?: { month?: string, year?: string, majlis?: string, orgId?: string }) {
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

    if (type === 'chanda' && (filters?.month || filters?.year)) {
        // Handle year and month filtering for ChandaAm records
        // Data format: monthPaidFor is comma-separated "MMMYYYY" values (e.g., "JAN2024, FEB2024")

        const year = filters.year
        const month = filters.month

        if (year && month) {
            // Both year and month specified: Filter for specific MMMYYYY (e.g., "SEP2024")
            const normalizedMonth = normalizeMonth(month)
            const targetMonthYear = `${normalizedMonth}${year}`

            // Match records where monthPaidFor contains the exact MMMYYYY pattern
            // Pattern matches: start of string OR after comma/space, then MMMYYYY, then comma/space OR end
            const escaped = targetMonthYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            match.monthPaidFor = { $regex: `(^|,\\s*)${escaped}(\\s*,|\\s*$)`, $options: 'i' }
        } else if (year && !month) {
            // Only year specified: Filter for all months in that year (e.g., all of 2024)
            // Match any month abbreviation followed by the year
            // Pattern: (JAN|FEB|MAR|...)2024
            const allMonthsPattern = MONTH_ABBR.map(m => m).join('|')
            match.monthPaidFor = { $regex: `(${allMonthsPattern})${year}`, $options: 'i' }
        } else if (!year && month) {
            // Only month specified: Filter for that month across all years (e.g., all SEP)
            const normalizedMonth = normalizeMonth(month)
            const escaped = normalizedMonth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            // Match month abbreviation followed by any 4 digits (year)
            match.monthPaidFor = { $regex: `(^|,\\s*)${escaped}\\d{4}(\\s*,|\\s*$)`, $options: 'i' }
        }
    }

    if (type === 'tajnid') {
        if (filters?.majlis) {
            if (filters.majlis.toUpperCase() === 'NASRAT') {
                match.majlis = { $in: ['NASRA', 'NASIRA', 'NASRAT'] }
            } else if (filters.majlis.toUpperCase() === 'LAJNAH') {
                match.majlis = { $in: ['LAJNAH', 'LAJNA'] }
            } else {
                match.majlis = filters.majlis
            }
        }
        if (filters?.month) {
            const monthMap: Record<string, number> = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
                'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
            }
            const monthIndex = monthMap[filters.month]
            if (monthIndex) {
                match.$expr = { $eq: [{ $month: "$createdAt" }, monthIndex] }
            }
        }
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
