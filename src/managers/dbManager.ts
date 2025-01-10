import {PrismaClient} from '@prisma/client'

// Create it here so not making multiple connections
export const prisma = new PrismaClient()

