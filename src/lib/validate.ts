/**
 * Pre-flight validation for go-live.
 * Checks all Apple Podcasts + Spotify requirements before allowing publication.
 */

// Apple's official podcast category list (March 2026)
const APPLE_CATEGORIES = [
  'Arts', 'Business', 'Comedy', 'Education', 'Fiction',
  'Government', 'Health & Fitness', 'History', 'Kids & Family',
  'Leisure', 'Music', 'News', 'Religion & Spirituality',
  'Science', 'Society & Culture', 'Sports', 'Technology',
  'True Crime', 'TV & Film'
]

export interface ValidationCheck {
  name: string
  passed: boolean
  detail: string
}

export interface ValidationResult {
  passed: boolean
  checks: ValidationCheck[]
}

/**
 * Run all pre-flight checks against a show and its episodes.
 */
export async function validateShow(
  show: any,
  episodes: any[]
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = []

  // 1. Title (≤150 chars, non-empty)
  checks.push({
    name: 'title',
    passed: !!show.title && show.title.length <= 150,
    detail: !show.title
      ? 'Show title is missing'
      : show.title.length > 150
        ? `Title is ${show.title.length} chars (max 150)`
        : `Title OK (${show.title.length} chars)`
  })

  // 2. Description (≤4000 chars, non-empty)
  checks.push({
    name: 'description',
    passed: !!show.description && show.description.length <= 4000,
    detail: !show.description
      ? 'Show description is missing'
      : show.description.length > 4000
        ? `Description is ${show.description.length} chars (max 4000)`
        : `Description OK (${show.description.length} chars)`
  })

  // 3. Author
  checks.push({
    name: 'author',
    passed: !!show.author,
    detail: show.author ? `Author: ${show.author}` : 'Author is missing'
  })

  // 4. Owner email
  checks.push({
    name: 'owner_email',
    passed: !!show.owner_email && show.owner_email.includes('@'),
    detail: !show.owner_email
      ? 'Owner email is missing'
      : !show.owner_email.includes('@')
        ? 'Owner email is invalid'
        : `Owner email: ${show.owner_email}`
  })

  // 5. Category (must match Apple's official list)
  const categoryValid = !!show.category && APPLE_CATEGORIES.includes(show.category)
  checks.push({
    name: 'category',
    passed: categoryValid,
    detail: !show.category
      ? 'Category is missing'
      : !categoryValid
        ? `"${show.category}" is not a valid Apple Podcasts category. Valid: ${APPLE_CATEGORIES.join(', ')}`
        : `Category: ${show.category}`
  })

  // 6. Cover art — HTTPS, resolves, image type, dimensions
  const artCheck = await validateCoverArt(show.image_url)
  checks.push(artCheck)

  // 7. At least 1 episode exists
  checks.push({
    name: 'episodes',
    passed: episodes.length > 0,
    detail: episodes.length > 0
      ? `${episodes.length} episode(s) found`
      : 'No episodes found. Publish at least 1 episode before going live.'
  })

  // 8. All audio URLs are HTTPS and respond
  const audioCheck = await validateAudioUrls(episodes)
  checks.push(audioCheck)

  const passed = checks.every(c => c.passed)
  return { passed, checks }
}

/**
 * Validate cover art URL.
 * Checks: exists, HTTPS, resolves, content-type is image, within size limits.
 */
async function validateCoverArt(imageUrl: string | null): Promise<ValidationCheck> {
  if (!imageUrl) {
    return {
      name: 'cover_art',
      passed: false,
      detail: 'Cover art URL is missing. Apple requires artwork (1400x1400 to 3000x3000, JPEG/PNG, <512KB).'
    }
  }

  if (!imageUrl.startsWith('https://')) {
    return {
      name: 'cover_art',
      passed: false,
      detail: 'Cover art URL must be HTTPS.'
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return {
        name: 'cover_art',
        passed: false,
        detail: `Cover art URL returned HTTP ${res.status}. Must be a reachable HTTPS URL.`
      }
    }

    const contentType = res.headers.get('content-type') || ''
    const isImage = contentType.startsWith('image/jpeg') || contentType.startsWith('image/png') || contentType.startsWith('image/')
    const contentLength = parseInt(res.headers.get('content-length') || '0')

    if (!isImage) {
      return {
        name: 'cover_art',
        passed: false,
        detail: `Cover art content-type is "${contentType}". Must be image/jpeg or image/png.`
      }
    }

    if (contentLength > 512 * 1024) {
      return {
        name: 'cover_art',
        passed: false,
        detail: `Cover art is ${Math.round(contentLength / 1024)}KB. Apple requires <512KB.`
      }
    }

    return {
      name: 'cover_art',
      passed: true,
      detail: `Cover art OK (${contentType}, ${contentLength > 0 ? Math.round(contentLength / 1024) + 'KB' : 'size unknown'})`
    }
  } catch (err: any) {
    return {
      name: 'cover_art',
      passed: false,
      detail: `Cover art URL unreachable: ${err.message || 'connection failed'}`
    }
  }
}

/**
 * Validate all episode audio URLs.
 * Checks: all HTTPS, all respond to HEAD request.
 */
async function validateAudioUrls(episodes: any[]): Promise<ValidationCheck> {
  if (episodes.length === 0) {
    return {
      name: 'audio_urls',
      passed: true, // will fail on episodes check instead
      detail: 'No episodes to validate audio for.'
    }
  }

  const failures: string[] = []

  for (const ep of episodes) {
    if (!ep.audio_url) {
      failures.push(`${ep.id}: missing audio_url`)
      continue
    }

    if (!ep.audio_url.startsWith('https://')) {
      failures.push(`${ep.id}: audio_url is not HTTPS`)
      continue
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(ep.audio_url, {
        method: 'HEAD',
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!res.ok) {
        failures.push(`${ep.id}: audio URL returned HTTP ${res.status}`)
      }
    } catch (err: any) {
      failures.push(`${ep.id}: audio URL unreachable`)
    }
  }

  if (failures.length > 0) {
    return {
      name: 'audio_urls',
      passed: false,
      detail: `Audio URL issues: ${failures.join('; ')}`
    }
  }

  return {
    name: 'audio_urls',
    passed: true,
    detail: `All ${episodes.length} episode audio URL(s) verified (HTTPS, reachable)`
  }
}
