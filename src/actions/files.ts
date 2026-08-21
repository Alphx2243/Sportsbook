'use server'

import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { requireUser } from '@/lib/auth-utils'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}


