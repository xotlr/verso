import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  downloadFile,
  downloadBlob,
  createFileInput,
  readFileAsText,
  readFileAsJSON,
} from '@/lib/dom-utils'

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

// Mock document methods
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()

describe('downloadFile', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL.mockReturnValue('blob:test-url'),
      revokeObjectURL: mockRevokeObjectURL,
    })

    const mockLink = {
      href: '',
      download: '',
      click: mockClick,
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should create a blob with correct content and mime type', () => {
    downloadFile('test content', 'test.txt', 'text/plain')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    const blob = mockCreateObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/plain')
  })

  it('should create an anchor element with correct attributes', () => {
    downloadFile('test content', 'test.txt', 'text/plain')

    expect(document.createElement).toHaveBeenCalledWith('a')
  })

  it('should trigger click on the link', () => {
    downloadFile('test content', 'test.txt', 'text/plain')

    expect(mockClick).toHaveBeenCalled()
  })

  it('should append and remove the link from document', () => {
    downloadFile('test content', 'test.txt', 'text/plain')

    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
  })

  it('should revoke object URL after download', () => {
    downloadFile('test content', 'test.txt', 'text/plain')

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('should handle JSON content', () => {
    const jsonContent = JSON.stringify({ foo: 'bar' })
    downloadFile(jsonContent, 'data.json', 'application/json')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/json')
  })

  it('should handle HTML content', () => {
    downloadFile('<html><body>Test</body></html>', 'page.html', 'text/html')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/html')
  })

  it('should handle empty content', () => {
    downloadFile('', 'empty.txt', 'text/plain')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })
})

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL.mockReturnValue('blob:test-url'),
      revokeObjectURL: mockRevokeObjectURL,
    })

    const mockLink = {
      href: '',
      download: '',
      click: mockClick,
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should create object URL for blob', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'test.txt')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
  })

  it('should trigger download', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'test.txt')

    expect(mockClick).toHaveBeenCalled()
  })

  it('should clean up after download', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'test.txt')

    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('should handle binary blob', () => {
    const arrayBuffer = new ArrayBuffer(8)
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
    downloadBlob(blob, 'binary.bin')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
  })
})

describe('createFileInput', () => {
  let mockInput: Partial<HTMLInputElement>

  beforeEach(() => {
    mockInput = {
      type: '',
      accept: '',
      onchange: null,
      click: mockClick,
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as HTMLInputElement)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create input element with type file', () => {
    createFileInput('.txt', vi.fn())

    expect(document.createElement).toHaveBeenCalledWith('input')
    expect(mockInput.type).toBe('file')
  })

  it('should set accept attribute', () => {
    createFileInput('.pdf,.doc', vi.fn())

    expect(mockInput.accept).toBe('.pdf,.doc')
  })

  it('should trigger click on input', () => {
    createFileInput('.txt', vi.fn())

    expect(mockClick).toHaveBeenCalled()
  })

  it('should call callback when file is selected', () => {
    const onFile = vi.fn()
    createFileInput('.txt', onFile)

    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const mockEvent = {
      target: { files: [mockFile] },
    }

    ;(mockInput.onchange as ((ev: Event) => void) | null)?.(mockEvent as unknown as Event)

    expect(onFile).toHaveBeenCalledWith(mockFile)
  })

  it('should not call callback when no file is selected', () => {
    const onFile = vi.fn()
    createFileInput('.txt', onFile)

    const mockEvent = {
      target: { files: [] },
    }

    ;(mockInput.onchange as ((ev: Event) => void) | null)?.(mockEvent as unknown as Event)

    expect(onFile).not.toHaveBeenCalled()
  })

  it('should not call callback when files is null', () => {
    const onFile = vi.fn()
    createFileInput('.txt', onFile)

    const mockEvent = {
      target: { files: null },
    }

    ;(mockInput.onchange as ((ev: Event) => void) | null)?.(mockEvent as unknown as Event)

    expect(onFile).not.toHaveBeenCalled()
  })
})

describe('readFileAsText', () => {
  it('should read file content as text', async () => {
    const content = 'Hello, World!'
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const result = await readFileAsText(file)

    expect(result).toBe(content)
  })

  it('should handle unicode content', async () => {
    const content = '你好世界 🌍'
    const file = new File([content], 'unicode.txt', { type: 'text/plain' })

    const result = await readFileAsText(file)

    expect(result).toBe(content)
  })

  it('should handle empty file', async () => {
    const file = new File([''], 'empty.txt', { type: 'text/plain' })

    const result = await readFileAsText(file)

    expect(result).toBe('')
  })

  it('should handle multiline content', async () => {
    const content = 'Line 1\nLine 2\nLine 3'
    const file = new File([content], 'multi.txt', { type: 'text/plain' })

    const result = await readFileAsText(file)

    expect(result).toBe(content)
  })

  it('should handle large file content', async () => {
    const content = 'x'.repeat(10000)
    const file = new File([content], 'large.txt', { type: 'text/plain' })

    const result = await readFileAsText(file)

    expect(result).toBe(content)
  })
})

describe('readFileAsJSON', () => {
  it('should parse valid JSON from file', async () => {
    const data = { foo: 'bar', count: 42 }
    const file = new File([JSON.stringify(data)], 'data.json', { type: 'application/json' })

    const result = await readFileAsJSON<typeof data>(file)

    expect(result).toEqual(data)
  })

  it('should handle arrays', async () => {
    const data = [1, 2, 3, 4, 5]
    const file = new File([JSON.stringify(data)], 'array.json', { type: 'application/json' })

    const result = await readFileAsJSON<number[]>(file)

    expect(result).toEqual(data)
  })

  it('should handle nested objects', async () => {
    const data = {
      user: { name: 'John', settings: { theme: 'dark' } },
      items: [{ id: 1 }, { id: 2 }],
    }
    const file = new File([JSON.stringify(data)], 'nested.json', { type: 'application/json' })

    const result = await readFileAsJSON<typeof data>(file)

    expect(result).toEqual(data)
  })

  it('should throw on invalid JSON', async () => {
    const file = new File(['not valid json {'], 'invalid.json', { type: 'application/json' })

    await expect(readFileAsJSON(file)).rejects.toThrow(SyntaxError)
  })

  it('should handle null value', async () => {
    const file = new File(['null'], 'null.json', { type: 'application/json' })

    const result = await readFileAsJSON<null>(file)

    expect(result).toBeNull()
  })

  it('should handle string value', async () => {
    const file = new File(['"hello"'], 'string.json', { type: 'application/json' })

    const result = await readFileAsJSON<string>(file)

    expect(result).toBe('hello')
  })

  it('should handle boolean value', async () => {
    const file = new File(['true'], 'bool.json', { type: 'application/json' })

    const result = await readFileAsJSON<boolean>(file)

    expect(result).toBe(true)
  })

  it('should handle numeric value', async () => {
    const file = new File(['42'], 'number.json', { type: 'application/json' })

    const result = await readFileAsJSON<number>(file)

    expect(result).toBe(42)
  })
})
