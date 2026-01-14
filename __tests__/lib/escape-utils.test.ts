import { describe, it, expect } from 'vitest'
import { escapeHtml, escapeXml, unescapeHtml } from '@/lib/escape-utils'

describe('escapeHtml', () => {
  describe('special characters', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should escape less than', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('should escape greater than', () => {
      expect(escapeHtml('5 > 3')).toBe('5 &gt; 3')
    })

    it('should escape double quotes', () => {
      expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#39;s fine')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle string with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
    })

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      )
    })

    it('should handle already escaped content', () => {
      // Already escaped content gets double-escaped
      expect(escapeHtml('&amp;')).toBe('&amp;amp;')
    })

    it('should handle unicode characters', () => {
      expect(escapeHtml('你好 <world>')).toBe('你好 &lt;world&gt;')
    })

    it('should handle newlines and tabs', () => {
      expect(escapeHtml('line1\nline2\ttab')).toBe('line1\nline2\ttab')
    })
  })

  describe('XSS prevention', () => {
    it('should prevent script injection', () => {
      const malicious = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(malicious)
      expect(escaped).not.toContain('<script>')
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    })

    it('should prevent event handler injection', () => {
      const malicious = '<img onerror="alert(1)">'
      const escaped = escapeHtml(malicious)
      expect(escaped).not.toContain('<img')
      expect(escaped).toBe('&lt;img onerror=&quot;alert(1)&quot;&gt;')
    })

    it('should prevent attribute injection', () => {
      const malicious = '" onclick="alert(1)"'
      const escaped = escapeHtml(malicious)
      expect(escaped).not.toContain('"')
      expect(escaped).toBe('&quot; onclick=&quot;alert(1)&quot;')
    })
  })
})

describe('escapeXml', () => {
  describe('special characters', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should escape less than', () => {
      expect(escapeXml('<element>')).toBe('&lt;element&gt;')
    })

    it('should escape greater than', () => {
      expect(escapeXml('5 > 3')).toBe('5 &gt; 3')
    })

    it('should escape double quotes', () => {
      expect(escapeXml('attr="value"')).toBe('attr=&quot;value&quot;')
    })

    it('should escape single quotes with &apos; (XML standard)', () => {
      expect(escapeXml("It's fine")).toBe('It&apos;s fine')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('')
    })

    it('should handle CDATA-like content', () => {
      expect(escapeXml('<![CDATA[text]]>')).toBe('&lt;![CDATA[text]]&gt;')
    })

    it('should handle XML declaration', () => {
      expect(escapeXml('<?xml version="1.0"?>')).toBe(
        '&lt;?xml version=&quot;1.0&quot;?&gt;'
      )
    })
  })

  describe('difference from escapeHtml', () => {
    it('should use &apos; instead of &#39; for single quotes', () => {
      const html = escapeHtml("'")
      const xml = escapeXml("'")
      expect(html).toBe('&#39;')
      expect(xml).toBe('&apos;')
    })
  })
})

describe('unescapeHtml', () => {
  describe('entity decoding', () => {
    it('should unescape &amp;', () => {
      expect(unescapeHtml('Tom &amp; Jerry')).toBe('Tom & Jerry')
    })

    it('should unescape &lt;', () => {
      expect(unescapeHtml('&lt;script&gt;')).toBe('<script>')
    })

    it('should unescape &gt;', () => {
      expect(unescapeHtml('5 &gt; 3')).toBe('5 > 3')
    })

    it('should unescape &quot;', () => {
      expect(unescapeHtml('Say &quot;hello&quot;')).toBe('Say "hello"')
    })

    it('should unescape &#39;', () => {
      expect(unescapeHtml('It&#39;s fine')).toBe("It's fine")
    })

    it('should unescape &apos;', () => {
      expect(unescapeHtml('It&apos;s fine')).toBe("It's fine")
    })
  })

  describe('round-trip conversion', () => {
    it('should round-trip simple text', () => {
      const original = 'Hello World'
      expect(unescapeHtml(escapeHtml(original))).toBe(original)
    })

    it('should round-trip text with special chars', () => {
      const original = '<div class="test">&</div>'
      expect(unescapeHtml(escapeHtml(original))).toBe(original)
    })

    it('should round-trip text with single quotes', () => {
      const original = "It's a \"test\" & more"
      expect(unescapeHtml(escapeHtml(original))).toBe(original)
    })

    it('should round-trip complex HTML', () => {
      const original = '<a href="test.html?a=1&b=2">Link\'s text</a>'
      expect(unescapeHtml(escapeHtml(original))).toBe(original)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(unescapeHtml('')).toBe('')
    })

    it('should handle string with no entities', () => {
      expect(unescapeHtml('Hello World')).toBe('Hello World')
    })

    it('should handle partial entity (no closing semicolon)', () => {
      expect(unescapeHtml('&amp')).toBe('&amp')
    })

    it('should handle unknown entities', () => {
      expect(unescapeHtml('&unknown;')).toBe('&unknown;')
    })

    it('should handle multiple consecutive entities', () => {
      expect(unescapeHtml('&lt;&gt;&amp;')).toBe('<>&')
    })
  })
})
