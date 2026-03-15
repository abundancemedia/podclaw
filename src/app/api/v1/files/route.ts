import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { authenticateRequest } from '@/lib/auth'

// Max file sizes
const MAX_AUDIO_SIZE = 500 * 1024 * 1024   // 500MB
const MAX_IMAGE_SIZE = 512 * 1024           // 512KB (Apple requirement)

// Allowed MIME types
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

/**
 * PUT /api/v1/files?filename=ep1.mp3&type=audio — Stream upload
 *
 * Send raw file bytes in the request body. No multipart needed.
 * Streams directly to Vercel Blob — no body size limit.
 *
 * Query params:
 *   filename (required) — e.g. "ep1.mp3", "cover.png"
 *   type — "audio" (default) or "artwork"
 *
 * Headers:
 *   Authorization: Bearer <api_key>
 *   Content-Type: audio/mpeg (or image/png, etc.)
 *   Content-Length: <file size in bytes> (optional but recommended)
 */
export async function PUT(request: NextRequest) {
  // Authenticate
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const fileType = searchParams.get('type') || 'audio'

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing required query param: filename (e.g. ?filename=ep1.mp3&type=audio)' },
        { status: 400 }
      )
    }

    if (fileType !== 'audio' && fileType !== 'artwork') {
      return NextResponse.json(
        { error: 'type must be "audio" or "artwork"' },
        { status: 400 }
      )
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream'
    const contentLength = parseInt(request.headers.get('content-length') || '0')

    // Validate content type
    if (fileType === 'audio' && !AUDIO_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid audio type: ${contentType}. Accepted: ${AUDIO_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && !IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid image type: ${contentType}. Accepted: ${IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate size if Content-Length provided
    if (contentLength > 0) {
      if (fileType === 'audio' && contentLength > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: `Audio file too large: ${Math.round(contentLength / 1024 / 1024)}MB. Max: 500MB.` },
          { status: 400 }
        )
      }
      if (fileType === 'artwork' && contentLength > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Artwork too large: ${Math.round(contentLength / 1024)}KB. Apple requires <512KB.` },
          { status: 400 }
        )
      }
    }

    if (!request.body) {
      return NextResponse.json(
        { error: 'Request body is empty. Send raw file bytes in the body.' },
        { status: 400 }
      )
    }

    // Build path
    const ext = filename.split('.').pop() || (fileType === 'audio' ? 'mp3' : 'png')
    const timestamp = Date.now()
    const path = `${fileType}/${auth.apiKey.slice(0, 12)}/${timestamp}.${ext}`

    // Stream directly to Vercel Blob — bypasses function body size limit
    const blob = await put(path, request.body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url: blob.url,
      type: fileType,
      content_type: contentType,
      size: contentLength || null,
      filename,
      message: fileType === 'audio'
        ? 'Audio uploaded. Use this URL as audio_url when creating an episode.'
        : 'Artwork uploaded. Use this URL as image_url when creating a show.'
    }, { status: 201 })
  } catch (err: any) {
    console.error('File upload error:', err)
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/files — Multipart upload (for small files < 4.5MB)
 *
 * Accepts multipart/form-data with a `file` field.
 * For larger files, use PUT with raw body streaming instead.
 */
export async function POST(request: NextRequest) {
  // Authenticate
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = (formData.get('type') as string) || 'audio'

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file. Send multipart/form-data with a "file" field. For large files (>4.5MB), use PUT with raw body instead.' },
        { status: 400 }
      )
    }

    if (fileType !== 'audio' && fileType !== 'artwork') {
      return NextResponse.json(
        { error: 'type must be "audio" or "artwork"' },
        { status: 400 }
      )
    }

    const contentType = file.type || 'application/octet-stream'

    if (fileType === 'audio' && !AUDIO_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid audio type: ${contentType}. Accepted: ${AUDIO_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && !IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid image type: ${contentType}. Accepted: ${IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Artwork too large: ${Math.round(file.size / 1024)}KB. Apple requires <512KB.` },
        { status: 400 }
      )
    }

    const ext = file.name?.split('.').pop() || (fileType === 'audio' ? 'mp3' : 'png')
    const timestamp = Date.now()
    const path = `${fileType}/${auth.apiKey.slice(0, 12)}/${timestamp}.${ext}`

    const blob = await put(path, file, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url: blob.url,
      type: fileType,
      content_type: contentType,
      size: file.size,
      filename: file.name,
      message: fileType === 'audio'
        ? 'Audio uploaded. Use this URL as audio_url when creating an episode.'
        : 'Artwork uploaded. Use this URL as image_url when creating a show.'
    }, { status: 201 })
  } catch (err: any) {
    console.error('File upload error:', err)
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    )
  }
}
