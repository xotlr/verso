'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadImage, ImageBucket } from '@/lib/supabase'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  bucket: ImageBucket
  userId: string
  aspectRatio?: 'square' | 'banner' | 'auto'
  className?: string
  placeholder?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  userId,
  aspectRatio = 'auto',
  className,
  placeholder = 'Drop an image here or click to upload',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const aspectClasses = {
    square: 'aspect-square',
    banner: 'aspect-[3/1]',
    auto: 'min-h-[120px]',
  }

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const url = await uploadImage(file, bucket, userId)
        onChange(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [bucket, userId, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      } else {
        setError('Please drop an image file')
      }
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleRemove = () => {
    onChange(undefined)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div
          className={cn(
            'relative rounded-lg overflow-hidden border border-border bg-muted',
            aspectClasses[aspectRatio]
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Change</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            'flex flex-col items-center justify-center gap-2 p-6',
            aspectClasses[aspectRatio],
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {placeholder}
              </p>
              <p className="text-xs text-muted-foreground/60">
                JPEG, PNG, GIF, WebP (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
