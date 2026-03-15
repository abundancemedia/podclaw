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
 * POST /api/v1/files — Upload audio or artwork
 *
 * Accepts multipart/form-data with a `file` field.
 * Optional `type` field: "audio" (default) or "artwork".
 * Returns a CDN URL that can be used in show/episode creation.
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
        { error: 'Missing required field: file. Send multipart/form-data with a "file" field.' },
        { status: 400 }
      )
    }

    if (fileType !== 'audio' && fileType !== 'artwork') {
      return NextResponse.json(
        { error: 'type must be "audio" or "artwork"' },
        { status: 400 }
      )
    }

    // Validate content type
    const contentType = file.type || 'application/octet-stream'

    if (fileType === 'audio') {
      if (!AUDIO_TYPES.includes(contentType)) {
        return NextResponse.json(
          { error: `Invalid audio type: ${contentType}. Accepted: ${AUDIO_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: `Audio file too large: ${Math.round(file.size / 1024 / 1024)}MB. Max: 500MB.` },
          { status: 400 }
        )
      }
    }

    if (fileType === 'artwork') {
      if (!IMAGE_TYPES.includes(contentType)) {
        return NextResponse.json(
          { error: `Invalid image type: ${contentType}. Accepted: ${IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Artwork too large: ${Math.round(file.size / 1024)}KB. Apple requires <512KB.` },
          { status: 400 }
        )
      }
    }

    // Generate a clean filename
    const ext = file.name?.split('.').pop() || (fileType === 'audio' ? 'mp3' : 'png')
    const timestamp = Date.now()
    const path = `${fileType}/${auth.apiKey.slice(0, 12)}/${timestamp}.${ext}`

    // Upload to Vercel Blob
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
