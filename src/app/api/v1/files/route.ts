import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { authenticateRequest } from '@/lib/auth'

const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

/**
 * POST /api/v1/files — Two modes:
 *
 * MODE 1 — MULTIPART (small files < 4.5MB, e.g. artwork):
 *   Content-Type: multipart/form-data
 *   Body: file field + optional type field
 *   → Returns { url: "..." }
 *
 * MODE 2 — REQUEST UPLOAD TOKEN (large audio files):
 *   Content-Type: application/json
 *   Body: { "filename": "ep1.mp3", "content_type": "audio/mpeg" }
 *   → Returns { upload_url: "...", token: "...", headers: {...} }
 *   Then: PUT <upload_url> with the provided headers + raw file body
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return handleTokenRequest(request)
  }

  return handleMultipartUpload(request)
}

/**
 * Generate an upload token for large files.
 * Agent then PUTs the file directly to Vercel Blob.
 */
async function handleTokenRequest(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const body = await request.json()
    const { filename, content_type, type: fileType = 'audio' } = body

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing required field: filename' },
        { status: 400 }
      )
    }

    if (fileType !== 'audio' && fileType !== 'artwork') {
      return NextResponse.json(
        { error: 'type must be "audio" or "artwork"' },
        { status: 400 }
      )
    }

    const ext = filename.split('.').pop() || (fileType === 'audio' ? 'mp3' : 'png')
    const timestamp = Date.now()
    const pathname = `${fileType}/${auth.apiKey.slice(0, 12)}/${timestamp}.${ext}`

    // Generate a client token for direct upload
    const token = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      pathname,
      allowedContentTypes: fileType === 'audio' ? AUDIO_TYPES : IMAGE_TYPES,
      maximumSizeInBytes: fileType === 'audio' ? 500 * 1024 * 1024 : 512 * 1024,
      validUntil: Date.now() + 30 * 60 * 1000, // 30 min
    })

    const storeUrl = process.env.BLOB_URL || 'https://blob.vercel-storage.com'
    const uploadUrl = `${storeUrl}/${pathname}`

    return NextResponse.json({
      upload_url: uploadUrl,
      token,
      pathname,
      type: fileType,
      method: 'PUT',
      headers: {
        'x-vercel-blob-client-token': token,
        'content-type': content_type || (fileType === 'audio' ? 'audio/mpeg' : 'image/png'),
      },
      expires_in: '30 minutes',
      instructions: `PUT the raw file to upload_url with the headers above. The response contains { url: "..." } — use that URL in show/episode creation.`,
      curl_example: `curl -X PUT "${uploadUrl}" -H "x-vercel-blob-client-token: ${token.slice(0, 20)}..." -H "content-type: ${content_type || 'audio/mpeg'}" --data-binary @${filename}`
    }, { status: 200 })
  } catch (err: any) {
    console.error('Token request error:', err)
    return NextResponse.json(
      { error: 'Failed to generate upload token' },
      { status: 500 }
    )
  }
}

/**
 * Multipart upload for small files (< 4.5MB, e.g. artwork)
 */
async function handleMultipartUpload(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = (formData.get('type') as string) || 'audio'

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file. For large audio files, POST JSON { "filename": "...", "content_type": "..." } to get an upload token instead.' },
        { status: 400 }
      )
    }

    if (fileType !== 'audio' && fileType !== 'artwork') {
      return NextResponse.json(
        { error: 'type must be "audio" or "artwork"' },
        { status: 400 }
      )
    }

    const ct = file.type || 'application/octet-stream'

    if (fileType === 'audio' && !AUDIO_TYPES.includes(ct)) {
      return NextResponse.json(
        { error: `Invalid audio type: ${ct}. Accepted: ${AUDIO_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && !IMAGE_TYPES.includes(ct)) {
      return NextResponse.json(
        { error: `Invalid image type: ${ct}. Accepted: ${IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (fileType === 'artwork' && file.size > 512 * 1024) {
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
      contentType: ct,
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url: blob.url,
      type: fileType,
      content_type: ct,
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
