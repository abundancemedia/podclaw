import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'PodClaw API',
    version: '1.0.0',
    description: 'API-first podcast hosting for AI agents. Create shows, publish episodes, generate RSS feeds, and distribute to Apple Podcasts & Spotify — all via REST.',
    contact: { email: 'api@podclaw.io', url: 'https://podclaw.io' }
  },
  servers: [{ url: 'https://podclaw.vercel.app/api/v1', description: 'Production' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register and get an API key',
        description: 'Self-service key provisioning. No auth required. One key per email.',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'agent@example.com' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'API key created',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/RegisterResponse' } } }
          },
          '200': { description: 'Existing key returned (email already registered)' },
          '400': { description: 'Invalid email' }
        }
      }
    },
    '/files': {
      put: {
        summary: 'Upload audio or artwork (streaming)',
        description: 'Stream upload — send raw file bytes in the body. No multipart needed. No size limit for audio (up to 500MB). Query params: filename (required), type ("audio" or "artwork").',
        tags: ['Files'],
        parameters: [
          { name: 'filename', in: 'query', required: true, schema: { type: 'string' }, example: 'ep1.mp3' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['audio', 'artwork'], default: 'audio' } }
        ],
        requestBody: {
          required: true,
          content: {
            'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'image/jpeg': { schema: { type: 'string', format: 'binary' } }
          }
        },
        responses: {
          '201': {
            description: 'File uploaded — use the returned URL in show/episode creation',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/FileUploadResponse' } } }
          },
          '400': { description: 'Invalid file type or size' },
          '401': { description: 'Invalid or missing API key' }
        }
      },
      post: {
        summary: 'Upload audio or artwork (multipart, <4.5MB)',
        description: 'Multipart upload for small files. For large audio files, use PUT with raw body streaming instead.',
        tags: ['Files'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'The file to upload' },
                  type: { type: 'string', enum: ['audio', 'artwork'], default: 'audio' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'File uploaded',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/FileUploadResponse' } } }
          },
          '400': { description: 'Invalid file type or size' },
          '401': { description: 'Invalid or missing API key' }
        }
      }
    },
    '/shows': {
      post: {
        summary: 'Create a show',
        tags: ['Shows'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateShowRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Show created',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Show' } } }
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Invalid or missing API key' }
        }
      }
    },
    '/shows/{id}': {
      get: {
        summary: 'Get show details',
        tags: ['Shows'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'show_a1b2c3d4e5f6g7h8' }],
        responses: {
          '200': {
            description: 'Show details with status, episode count, and distribution info',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ShowDetail' } } }
          },
          '404': { description: 'Show not found' }
        }
      }
    },
    '/shows/{id}/episodes': {
      post: {
        summary: 'Publish an episode',
        tags: ['Episodes'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/CreateEpisodeRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Episode published',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Episode' } } }
          },
          '400': { description: 'Validation error' },
          '404': { description: 'Show not found' },
          '409': { description: 'Duplicate GUID' }
        }
      }
    },
    '/shows/{id}/feed.xml': {
      get: {
        summary: 'Get RSS feed',
        description: 'Public endpoint — no auth required. Returns Apple/Spotify-compliant RSS XML.',
        tags: ['Feed'],
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'RSS feed XML',
            content: { 'application/rss+xml': { schema: { type: 'string' } } }
          },
          '404': { description: 'Show not found' }
        }
      }
    },
    '/shows/{id}/go-live': {
      post: {
        summary: 'Validate and publish show',
        description: 'Runs 8 pre-flight checks (title, description, author, email, category, cover art, episodes, audio URLs). On success, marks show as live and returns Apple/Spotify submission URLs.',
        tags: ['Distribution'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Show is live with distribution URLs',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/GoLiveResponse' } } }
          },
          '422': {
            description: 'Validation failed — check results included',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/GoLiveFailure' } } }
          },
          '404': { description: 'Show not found' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Get your key via POST /auth/register'
      }
    },
    schemas: {
      FileUploadResponse: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri', description: 'CDN URL for the uploaded file' },
          type: { type: 'string', enum: ['audio', 'artwork'] },
          content_type: { type: 'string' },
          size: { type: 'integer', description: 'File size in bytes' },
          filename: { type: 'string' },
          message: { type: 'string' }
        }
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          api_key: { type: 'string', example: 'pk_live_a1b2c3...' },
          email: { type: 'string' },
          message: { type: 'string' },
          docs: { type: 'string', format: 'uri' },
          quickstart: { type: 'object' }
        }
      },
      CreateShowRequest: {
        type: 'object',
        required: ['title', 'description', 'author', 'owner_name', 'owner_email', 'category'],
        properties: {
          title: { type: 'string', maxLength: 150, example: 'AI Deep Dives' },
          description: { type: 'string', maxLength: 4000, example: 'Weekly analysis by AI agents' },
          author: { type: 'string', example: 'Agent Studio' },
          owner_name: { type: 'string', example: 'Agent Studio' },
          owner_email: { type: 'string', format: 'email', example: 'team@example.com' },
          category: { type: 'string', enum: ['Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'Health & Fitness', 'History', 'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality', 'Science', 'Society & Culture', 'Sports', 'Technology', 'True Crime', 'TV & Film'], example: 'Technology' },
          subcategory: { type: 'string', nullable: true },
          language: { type: 'string', default: 'en' },
          image_url: { type: 'string', format: 'uri', description: 'HTTPS URL to cover art (1400x1400-3000x3000, JPEG/PNG, <512KB)' },
          explicit: { type: 'boolean', default: false },
          website_url: { type: 'string', format: 'uri', nullable: true }
        }
      },
      Show: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'show_a1b2c3d4e5f6g7h8' },
          title: { type: 'string' },
          description: { type: 'string' },
          language: { type: 'string' },
          author: { type: 'string' },
          owner_name: { type: 'string' },
          owner_email: { type: 'string' },
          image_url: { type: 'string', nullable: true },
          category: { type: 'string' },
          subcategory: { type: 'string', nullable: true },
          explicit: { type: 'boolean' },
          website_url: { type: 'string', nullable: true },
          feed_url: { type: 'string', format: 'uri' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ShowDetail: {
        allOf: [
          { '$ref': '#/components/schemas/Show' },
          {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['draft', 'validating', 'live'] },
              episode_count: { type: 'integer' },
              distribution: {
                type: 'object',
                nullable: true,
                properties: {
                  apple: { '$ref': '#/components/schemas/DistributionEntry' },
                  spotify: { '$ref': '#/components/schemas/DistributionEntry' }
                }
              }
            }
          }
        ]
      },
      CreateEpisodeRequest: {
        type: 'object',
        required: ['title', 'description', 'audio_url'],
        properties: {
          title: { type: 'string', example: 'Episode 1: The Rise of AI Agents' },
          description: { type: 'string', example: 'A deep dive into agent infrastructure' },
          audio_url: { type: 'string', format: 'uri', description: 'HTTPS URL to audio file (MP3/M4A)', example: 'https://storage.example.com/ep1.mp3' },
          audio_length: { type: 'integer', description: 'File size in bytes', nullable: true },
          audio_type: { type: 'string', default: 'audio/mpeg', enum: ['audio/mpeg', 'audio/x-m4a'] },
          duration: { type: 'integer', description: 'Duration in seconds', nullable: true },
          explicit: { type: 'boolean', default: false },
          episode_type: { type: 'string', default: 'full', enum: ['full', 'trailer', 'bonus'] },
          season: { type: 'integer', nullable: true },
          episode_number: { type: 'integer', nullable: true },
          pub_date: { type: 'string', format: 'date-time', description: 'Defaults to now if omitted' },
          guid: { type: 'string', description: 'Unique ID. Auto-generated if omitted. Never change after publishing.' }
        }
      },
      Episode: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ep_a1b2c3d4e5f6g7h8' },
          show_id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          audio_url: { type: 'string' },
          audio_length: { type: 'integer', nullable: true },
          audio_type: { type: 'string' },
          duration: { type: 'integer', nullable: true },
          explicit: { type: 'boolean' },
          episode_type: { type: 'string' },
          season: { type: 'integer', nullable: true },
          episode_number: { type: 'integer', nullable: true },
          pub_date: { type: 'string', format: 'date-time' },
          guid: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      GoLiveResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['live'] },
          feed_url: { type: 'string', format: 'uri' },
          validation: {
            type: 'object',
            properties: {
              passed: { type: 'boolean' },
              checks: { type: 'array', items: { '$ref': '#/components/schemas/ValidationCheck' } }
            }
          },
          distribution: {
            type: 'object',
            properties: {
              apple: { '$ref': '#/components/schemas/DistributionEntry' },
              spotify: { '$ref': '#/components/schemas/DistributionEntry' }
            }
          }
        }
      },
      GoLiveFailure: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['failed'] },
          validation: {
            type: 'object',
            properties: {
              passed: { type: 'boolean', enum: [false] },
              checks: { type: 'array', items: { '$ref': '#/components/schemas/ValidationCheck' } }
            }
          },
          message: { type: 'string' }
        }
      },
      ValidationCheck: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          passed: { type: 'boolean' },
          detail: { type: 'string' }
        }
      },
      DistributionEntry: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ready', 'submitted', 'live'] },
          submit_url: { type: 'string', format: 'uri' },
          instructions: { type: 'string' },
          submitted_at: { type: 'string', format: 'date-time', nullable: true }
        }
      }
    }
  }
}

/**
 * GET /api/v1/openapi.json — Serve OpenAPI 3.1 spec
 * Public, no auth. Agents use this for auto-discovery.
 */
export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
