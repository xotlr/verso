import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with storage
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type ImageBucket = 'avatars' | 'banners' | 'team-assets' | 'scene-images'

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket ('avatars' | 'banners' | 'team-assets')
 * @param userId - The user ID for organizing uploads
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  bucket: ImageBucket,
  userId: string
): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error('Failed to upload image. Please try again.')
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

/**
 * Delete an image from Supabase Storage
 * @param url - The full URL of the image to delete
 * @param bucket - The storage bucket
 */
export async function deleteImage(url: string, bucket: ImageBucket): Promise<void> {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/${bucket}/`)
    if (pathParts.length < 2) return

    const filePath = pathParts[1]

    const { error } = await supabase.storage.from(bucket).remove([filePath])
    if (error) {
      console.error('Delete error:', error)
    }
  } catch {
    // Ignore errors when deleting (might be external URL)
  }
}

/**
 * Get optimized image URL with transformations (if using Supabase Image Transformations)
 * @param url - The original image URL
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number
    height?: number
    quality?: number
  } = {}
): string {
  if (!url || !url.includes('supabase')) return url

  const { width, height, quality = 80 } = options
  const params = new URLSearchParams()

  if (width) params.set('width', width.toString())
  if (height) params.set('height', height.toString())
  params.set('quality', quality.toString())

  // Add render=image for transformations
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.toString()}`
}
