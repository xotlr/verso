import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the BadRequestError before importing file-validation
vi.mock('@/lib/api/errors', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(message: string, public details?: Record<string, unknown>) {
      super(message)
      this.name = 'BadRequestError'
    }
  },
}))

import {
  validateFileUrl,
  validateImageUrl,
  validateFileSize,
  validateFile,
  validateMagicBytes,
  sanitizeFilename,
  generateStoragePath,
} from '@/lib/file-validation'

describe('validateFileUrl', () => {
  describe('valid URLs', () => {
    it('should accept valid Supabase storage URL with JPEG', () => {
      const url = 'https://abc.supabase.co/storage/v1/object/public/images/photo.jpg'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.category).toBe('image')
      expect(result.mimeType).toBe('image/jpeg')
      expect(result.extension).toBe('jpg')
    })

    it('should accept valid Supabase storage URL with PNG', () => {
      const url = 'https://project.supabase.co/storage/photo.png'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.category).toBe('image')
      expect(result.mimeType).toBe('image/png')
    })

    it('should accept valid Supabase storage URL with WebP', () => {
      const url = 'https://project.supabase.co/storage/photo.webp'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.mimeType).toBe('image/webp')
    })

    it('should accept valid Supabase storage URL with GIF', () => {
      const url = 'https://project.supabase.co/storage/animation.gif'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.mimeType).toBe('image/gif')
    })

    it('should accept valid Supabase storage URL with PDF', () => {
      const url = 'https://project.supabase.co/storage/document.pdf'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.category).toBe('document')
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should accept URLs with query parameters', () => {
      const url = 'https://project.supabase.co/storage/photo.jpg?token=abc123'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
      expect(result.extension).toBe('jpg')
    })

    it('should accept supabase.in domain', () => {
      const url = 'https://project.supabase.in/storage/photo.png'
      const result = validateFileUrl(url)
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should reject invalid URL format', () => {
      expect(() => validateFileUrl('not-a-url')).toThrow('Invalid URL format')
    })

    it('should reject empty URL', () => {
      expect(() => validateFileUrl('')).toThrow('Invalid URL format')
    })

    it('should reject URL from disallowed domain', () => {
      expect(() =>
        validateFileUrl('https://evil.com/malware.jpg')
      ).toThrow('File URL must be from an allowed storage domain')
    })

    it('should reject URL without proper extension', () => {
      // URL ending with 'file' gets parsed as having extension '.file'
      expect(() =>
        validateFileUrl('https://project.supabase.co/storage/file')
      ).toThrow('Unsupported file type: .file')
    })

    it('should reject unsupported file extension', () => {
      expect(() =>
        validateFileUrl('https://project.supabase.co/storage/script.exe')
      ).toThrow('Unsupported file type: .exe')
    })

    it('should reject URL with path but no filename', () => {
      expect(() =>
        validateFileUrl('https://project.supabase.co/storage/')
      ).toThrow('Could not determine file type from URL')
    })
  })

  describe('HTTPS enforcement', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('should reject HTTP URLs in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      expect(() =>
        validateFileUrl('http://project.supabase.co/storage/photo.jpg')
      ).toThrow('URL must use HTTPS')
    })

    it('should allow HTTP URLs in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const result = validateFileUrl('http://project.supabase.co/storage/photo.jpg')
      expect(result.valid).toBe(true)
    })
  })
})

describe('validateImageUrl', () => {
  it('should accept valid image URLs', () => {
    const url = 'https://project.supabase.co/storage/photo.png'
    const result = validateImageUrl(url)
    expect(result.valid).toBe(true)
    expect(result.category).toBe('image')
  })

  it('should reject PDF URLs', () => {
    expect(() =>
      validateImageUrl('https://project.supabase.co/storage/doc.pdf')
    ).toThrow('URL must point to an image file')
  })

  it('should reject non-image file types', () => {
    expect(() =>
      validateImageUrl('https://project.supabase.co/storage/doc.pdf')
    ).toThrow('URL must point to an image file')
  })
})

describe('validateFileSize', () => {
  it('should accept image under 5MB', () => {
    expect(() => validateFileSize(1024 * 1024, 'image')).not.toThrow()
  })

  it('should accept image at exactly 5MB', () => {
    expect(() => validateFileSize(5 * 1024 * 1024, 'image')).not.toThrow()
  })

  it('should reject image over 5MB', () => {
    expect(() => validateFileSize(6 * 1024 * 1024, 'image')).toThrow(
      'File too large. Maximum size for images is 5MB'
    )
  })

  it('should accept document under 10MB', () => {
    expect(() => validateFileSize(8 * 1024 * 1024, 'document')).not.toThrow()
  })

  it('should reject document over 10MB', () => {
    expect(() => validateFileSize(11 * 1024 * 1024, 'document')).toThrow(
      'File too large. Maximum size for documents is 10MB'
    )
  })

  it('should accept zero-size file', () => {
    expect(() => validateFileSize(0, 'image')).not.toThrow()
  })
})

describe('validateFile', () => {
  it('should accept valid JPEG image', () => {
    const file = { type: 'image/jpeg', size: 1024 * 1024 }
    const result = validateFile(file)
    expect(result.category).toBe('image')
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('should accept valid PNG image', () => {
    const file = { type: 'image/png', size: 1024 * 1024 }
    const result = validateFile(file)
    expect(result.category).toBe('image')
    expect(result.mimeType).toBe('image/png')
  })

  it('should accept valid PDF when documents allowed', () => {
    const file = { type: 'application/pdf', size: 1024 * 1024 }
    const result = validateFile(file, ['document'])
    expect(result.category).toBe('document')
    expect(result.mimeType).toBe('application/pdf')
  })

  it('should reject PDF when only images allowed', () => {
    const file = { type: 'application/pdf', size: 1024 * 1024 }
    expect(() => validateFile(file, ['image'])).toThrow('Invalid file type')
  })

  it('should reject unsupported MIME type', () => {
    const file = { type: 'application/javascript', size: 1024 }
    expect(() => validateFile(file)).toThrow('Invalid file type')
  })

  it('should reject file that exceeds size limit', () => {
    const file = { type: 'image/png', size: 10 * 1024 * 1024 }
    expect(() => validateFile(file)).toThrow('File too large')
  })

  it('should handle uppercase MIME type', () => {
    const file = { type: 'IMAGE/JPEG', size: 1024 }
    const result = validateFile(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('should accept both image and document when both allowed', () => {
    const imageFile = { type: 'image/png', size: 1024 }
    const docFile = { type: 'application/pdf', size: 1024 }

    expect(validateFile(imageFile, ['image', 'document']).category).toBe('image')
    expect(validateFile(docFile, ['image', 'document']).category).toBe('document')
  })
})

describe('validateMagicBytes', () => {
  it('should validate JPEG magic bytes', () => {
    const jpegBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]).buffer
    expect(validateMagicBytes(jpegBuffer, 'image/jpeg')).toBe(true)
  })

  it('should reject invalid JPEG magic bytes', () => {
    const wrongBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer
    expect(validateMagicBytes(wrongBuffer, 'image/jpeg')).toBe(false)
  })

  it('should validate PNG magic bytes', () => {
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).buffer
    expect(validateMagicBytes(pngBuffer, 'image/png')).toBe(true)
  })

  it('should reject invalid PNG magic bytes', () => {
    const wrongBuffer = new Uint8Array([0x89, 0x50, 0x00, 0x00]).buffer
    expect(validateMagicBytes(wrongBuffer, 'image/png')).toBe(false)
  })

  it('should validate GIF87a magic bytes', () => {
    const gif87Buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]).buffer
    expect(validateMagicBytes(gif87Buffer, 'image/gif')).toBe(true)
  })

  it('should validate GIF89a magic bytes', () => {
    const gif89Buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer
    expect(validateMagicBytes(gif89Buffer, 'image/gif')).toBe(true)
  })

  it('should validate WebP magic bytes (RIFF header)', () => {
    const webpBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer
    expect(validateMagicBytes(webpBuffer, 'image/webp')).toBe(true)
  })

  it('should validate PDF magic bytes', () => {
    const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer
    expect(validateMagicBytes(pdfBuffer, 'application/pdf')).toBe(true)
  })

  it('should return true for unknown MIME types (no signature check)', () => {
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer
    expect(validateMagicBytes(buffer, 'application/octet-stream')).toBe(true)
  })

  it('should handle empty buffer', () => {
    const emptyBuffer = new ArrayBuffer(0)
    expect(validateMagicBytes(emptyBuffer, 'image/jpeg')).toBe(false)
  })

  it('should handle buffer shorter than signature', () => {
    const shortBuffer = new Uint8Array([0xFF]).buffer
    expect(validateMagicBytes(shortBuffer, 'image/jpeg')).toBe(false)
  })
})

describe('sanitizeFilename', () => {
  describe('path traversal prevention', () => {
    it('should remove forward slash path components', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    })

    it('should remove backslash path components', () => {
      expect(sanitizeFilename('..\\..\\windows\\system.dll')).toBe('system.dll')
    })

    it('should handle mixed path separators', () => {
      expect(sanitizeFilename('path/to\\file.txt')).toBe('file.txt')
    })
  })

  describe('special character handling', () => {
    it('should remove null bytes', () => {
      expect(sanitizeFilename('file\x00.txt')).toBe('file.txt')
    })

    it('should remove control characters', () => {
      expect(sanitizeFilename('file\x0A\x0D.txt')).toBe('file.txt')
    })

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt')
    })

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('file@#$%.txt')).toBe('file____.txt')
    })

    it('should preserve allowed characters', () => {
      expect(sanitizeFilename('file-name_123.txt')).toBe('file-name_123.txt')
    })
  })

  describe('double extension prevention', () => {
    it('should collapse multiple extensions', () => {
      expect(sanitizeFilename('virus.txt.exe')).toBe('virus_txt.exe')
    })

    it('should handle multiple dots', () => {
      expect(sanitizeFilename('file.a.b.c.txt')).toBe('file_a_b_c.txt')
    })

    it('should preserve single extension', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
    })
  })

  describe('length limits', () => {
    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(150) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result.length).toBeLessThanOrEqual(100)
      expect(result.endsWith('.txt')).toBe(true)
    })

    it('should preserve extension when truncating', () => {
      const longName = 'a'.repeat(150) + '.jpeg'
      const result = sanitizeFilename(longName)
      expect(result.endsWith('.jpeg')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should return "file" for empty string', () => {
      expect(sanitizeFilename('')).toBe('file')
    })

    it('should return "file" for only special characters', () => {
      expect(sanitizeFilename('///\\\\///')).toBe('file')
    })

    it('should handle filename with only extension', () => {
      expect(sanitizeFilename('.htaccess')).toBe('.htaccess')
    })

    it('should handle unicode characters', () => {
      // Unicode gets replaced with underscores
      expect(sanitizeFilename('文件.txt')).toBe('__.txt')
    })
  })
})

describe('generateStoragePath', () => {
  it('should include userId in path', () => {
    const path = generateStoragePath('user-123', 'photo.jpg', 'image')
    expect(path.startsWith('user-123/')).toBe(true)
  })

  it('should include category in path', () => {
    const imagePath = generateStoragePath('user-123', 'photo.jpg', 'image')
    const docPath = generateStoragePath('user-123', 'doc.pdf', 'document')

    expect(imagePath).toContain('/image/')
    expect(docPath).toContain('/document/')
  })

  it('should sanitize the filename', () => {
    const path = generateStoragePath('user-123', '../../../etc/passwd', 'document')
    expect(path).not.toContain('..')
  })

  it('should include timestamp for uniqueness', () => {
    const before = Date.now()
    const path = generateStoragePath('user-123', 'file.txt', 'document')
    const after = Date.now()

    // Path format: userId/category/timestamp-random-filename
    const parts = path.split('/')
    const filename = parts[2]
    const timestamp = parseInt(filename.split('-')[0], 10)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('should include random component', () => {
    const path1 = generateStoragePath('user-123', 'file.txt', 'document')
    const path2 = generateStoragePath('user-123', 'file.txt', 'document')

    // Very unlikely to be the same due to random component
    expect(path1).not.toBe(path2)
  })

  it('should produce valid path format', () => {
    const path = generateStoragePath('user-abc', 'my-photo.jpg', 'image')

    // Format: userId/category/timestamp-random-filename
    const pattern = /^user-abc\/image\/\d+-[a-z0-9]+-my-photo\.jpg$/
    expect(path).toMatch(pattern)
  })
})
