import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Dev-only API to read screenplay files from the private folder.
 * Only available in development mode.
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not found', { status: 404 });
  }

  const filename = request.nextUrl.searchParams.get('file');

  if (!filename) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  // Security: only allow .md files, no path traversal
  if (!filename.endsWith('.md') || filename.includes('..') || filename.includes('/')) {
    return new NextResponse('Invalid filename', { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'private', filename);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error(`[dev/screenplay] Error reading ${filename}:`, error);
    return new NextResponse('File not found', { status: 404 });
  }
}
