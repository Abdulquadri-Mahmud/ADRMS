'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

/**
 * Base schema used for creating records
 */
const CreateRecordSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    amount: z.coerce.number().min(0, 'Amount must be positive'),
    date: z.coerce.date(),
    receiptNumber: z.string().min(1, 'Receipt number is required'),
    description: z.string().optional(),
    type: z.string().min(1, 'Type is required'),
})

/**
 * Schema used for updating records
 * NOTE: id is NOT included and receiptNumber is excluded by default
 */
const UpdateRecordSchema = CreateRecordSchema.omit({
    receiptNumber: true,
})

export async function getRecords(query?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit

    const where = query
        ? {
              OR: [
                  { name: { contains: query } },
                  { receiptNumber: { contains: query } },
              ],
          }
        : {}

    const [records, total] = await Promise.all([
        prisma.record.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.record.count({ where }),
    ])

    return {
        records,
        total,
        totalPages: Math.ceil(total / limit),
    }
}

export async function createRecord(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const result = CreateRecordSchema.safeParse(rawData)

    if (!result.success) {
        return {
            success: false,
            errors: result.error.flatten().fieldErrors,
            message: 'Validation failed',
        }
    }

    const { name, amount, date, receiptNumber, description, type } = result.data

    try {
        // Generate serial number manually
        const lastRecord = await prisma.record.findFirst({
            orderBy: { serialNumber: 'desc' },
            select: { serialNumber: true },
        })

        const serialNumber = (lastRecord?.serialNumber || 0) + 1

        await prisma.record.create({
            data: {
                name,
                amount,
                date,
                receiptNumber,
                description,
                type,
                serialNumber,
            },
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')

        return { success: true, message: 'Record created successfully' }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, message: 'Receipt number already exists' }
        }

        return { success: false, message: 'Failed to create record' }
    }
}

export async function updateRecord(id: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const result = UpdateRecordSchema.safeParse(rawData)

    if (!result.success) {
        return {
            success: false,
            errors: result.error.flatten().fieldErrors,
        }
    }

    try {
        await prisma.record.update({
            where: { id },
            data: result.data,
        })

        revalidatePath('/dashboard/records')
        revalidatePath('/dashboard')

        return { success: true, message: 'Updated successfully' }
    } catch (error) {
        return { success: false, message: 'Update failed' }
    }
}
