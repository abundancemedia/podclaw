import { NextRequest, NextResponse } from 'next/server'
import { getDb } from './db'

export interface AuthResult {
  valid: true
  apiKey: string
  showId: string | null
}

export interface AuthError {
  valid: false
  response: NextResponse
}

/**
 * Validate a Bearer token against the api_keys table.
 * Returns the key row if valid, or a 401 response if not.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.slice(7).trim()

  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'API key is empty' },
        { status: 401 }
      ),
    }
  }

  const sql = getDb()
  const rows = await sql`SELECT key, show_id FROM api_keys WHERE key = ${token}`

  if (rows.length === 0) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      ),
    }
  }

  return {
    valid: true,
    apiKey: rows[0].key,
    showId: rows[0].show_id,
  }
}
