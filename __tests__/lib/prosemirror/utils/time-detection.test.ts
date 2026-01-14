import { describe, it, expect } from 'vitest'
import {
  normalizeTimeOfDay,
  detectTimeOfDay,
  detectTimeFromHeading,
  isContinuousMarker,
  getUniqueTimesOfDay,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ORDER,
  type TimeOfDay,
} from '@/lib/prosemirror/utils/time-detection'

describe('normalizeTimeOfDay', () => {
  describe('direct matches', () => {
    it('should normalize "day" to DAY', () => {
      expect(normalizeTimeOfDay('day')).toBe('DAY')
      expect(normalizeTimeOfDay('DAY')).toBe('DAY')
      expect(normalizeTimeOfDay('Day')).toBe('DAY')
    })

    it('should normalize "night" to NIGHT', () => {
      expect(normalizeTimeOfDay('night')).toBe('NIGHT')
      expect(normalizeTimeOfDay('NIGHT')).toBe('NIGHT')
    })

    it('should normalize "dawn" to DAWN', () => {
      expect(normalizeTimeOfDay('dawn')).toBe('DAWN')
      expect(normalizeTimeOfDay('DAWN')).toBe('DAWN')
    })

    it('should normalize "morning" to MORNING', () => {
      expect(normalizeTimeOfDay('morning')).toBe('MORNING')
    })

    it('should normalize "afternoon" to AFTERNOON', () => {
      expect(normalizeTimeOfDay('afternoon')).toBe('AFTERNOON')
    })

    it('should normalize "dusk" to DUSK', () => {
      expect(normalizeTimeOfDay('dusk')).toBe('DUSK')
    })

    it('should normalize "evening" to EVENING', () => {
      expect(normalizeTimeOfDay('evening')).toBe('EVENING')
    })

    it('should normalize continuous markers', () => {
      expect(normalizeTimeOfDay('continuous')).toBe('CONTINUOUS')
      expect(normalizeTimeOfDay('cont')).toBe('CONTINUOUS')
      expect(normalizeTimeOfDay('cont.')).toBe('CONTINUOUS')
    })
  })

  describe('keyword detection', () => {
    it('should detect DAWN keywords', () => {
      expect(normalizeTimeOfDay('sunrise')).toBe('DAWN')
      expect(normalizeTimeOfDay('daybreak')).toBe('DAWN')
      expect(normalizeTimeOfDay('first light')).toBe('DAWN')
      expect(normalizeTimeOfDay('crack of dawn')).toBe('DAWN')
    })

    it('should detect MORNING keywords', () => {
      expect(normalizeTimeOfDay('early morning')).toBe('MORNING')
      expect(normalizeTimeOfDay('8am')).toBe('MORNING')
      expect(normalizeTimeOfDay('breakfast')).toBe('MORNING')
    })

    it('should detect AFTERNOON keywords', () => {
      expect(normalizeTimeOfDay('early afternoon')).toBe('AFTERNOON')
      expect(normalizeTimeOfDay('2pm')).toBe('AFTERNOON')
      expect(normalizeTimeOfDay('noon')).toBe('AFTERNOON')
      expect(normalizeTimeOfDay('lunchtime')).toBe('AFTERNOON')
    })

    it('should detect DUSK keywords', () => {
      expect(normalizeTimeOfDay('sunset')).toBe('DUSK')
      expect(normalizeTimeOfDay('twilight')).toBe('DUSK')
      expect(normalizeTimeOfDay('golden hour')).toBe('DUSK')
      expect(normalizeTimeOfDay('magic hour')).toBe('DUSK')
    })

    it('should detect EVENING keywords', () => {
      expect(normalizeTimeOfDay('nightfall')).toBe('EVENING')
      expect(normalizeTimeOfDay('8pm')).toBe('EVENING')
      expect(normalizeTimeOfDay('that evening')).toBe('EVENING')
    })

    it('should detect NIGHT keywords', () => {
      expect(normalizeTimeOfDay('midnight')).toBe('NIGHT')
      expect(normalizeTimeOfDay('late night')).toBe('NIGHT')
      expect(normalizeTimeOfDay('2am')).toBe('NIGHT')
      expect(normalizeTimeOfDay('after dark')).toBe('NIGHT')
    })

    it('should detect CONTINUOUS keywords', () => {
      expect(normalizeTimeOfDay('later')).toBe('CONTINUOUS')
      expect(normalizeTimeOfDay('moments later')).toBe('CONTINUOUS')
      expect(normalizeTimeOfDay('intercut')).toBe('CONTINUOUS')
    })
  })

  describe('edge cases', () => {
    it('should default to DAY for empty string', () => {
      expect(normalizeTimeOfDay('')).toBe('DAY')
    })

    it('should default to DAY for undefined', () => {
      expect(normalizeTimeOfDay(undefined)).toBe('DAY')
    })

    it('should default to DAY for unknown input', () => {
      expect(normalizeTimeOfDay('random text')).toBe('DAY')
    })

    it('should handle whitespace', () => {
      expect(normalizeTimeOfDay('  day  ')).toBe('DAY')
      expect(normalizeTimeOfDay('\tnight\n')).toBe('NIGHT')
    })
  })
})

describe('detectTimeOfDay', () => {
  describe('explicit time markers', () => {
    it('should use explicit time when provided', () => {
      const result = detectTimeOfDay('COFFEE SHOP', 'DAY')
      expect(result.timeOfDay).toBe('DAY')
      expect(result.autoDetected).toBe(false)
    })

    it('should normalize explicit time', () => {
      const result = detectTimeOfDay('COFFEE SHOP', 'night')
      expect(result.timeOfDay).toBe('NIGHT')
      expect(result.autoDetected).toBe(false)
    })

    it('should handle CONTINUOUS with inheritance', () => {
      const result = detectTimeOfDay('HALLWAY', 'CONTINUOUS', 'NIGHT')
      expect(result.timeOfDay).toBe('NIGHT')
      expect(result.autoDetected).toBe(false)
    })

    it('should default to DAY for CONTINUOUS without previous scene', () => {
      const result = detectTimeOfDay('HALLWAY', 'CONTINUOUS')
      expect(result.timeOfDay).toBe('DAY')
    })
  })

  describe('location-based detection', () => {
    it('should detect DAWN from location', () => {
      const result = detectTimeOfDay('BEACH AT SUNRISE')
      expect(result.timeOfDay).toBe('DAWN')
      expect(result.autoDetected).toBe(true)
    })

    it('should detect NIGHT from location', () => {
      const result = detectTimeOfDay('DARK ALLEY - MIDNIGHT')
      expect(result.timeOfDay).toBe('NIGHT')
      expect(result.autoDetected).toBe(true)
    })

    it('should detect CONTINUOUS from location keywords', () => {
      const result = detectTimeOfDay('SAME ROOM - MOMENTS LATER', undefined, 'AFTERNOON')
      expect(result.timeOfDay).toBe('AFTERNOON')
      expect(result.autoDetected).toBe(true)
    })

    it('should default to DAY when no time indicators', () => {
      const result = detectTimeOfDay('OFFICE')
      expect(result.timeOfDay).toBe('DAY')
      expect(result.autoDetected).toBe(false)
    })
  })

  describe('priority of explicit vs location detection', () => {
    it('should prefer explicit time over location keywords', () => {
      // Location says "sunset" but explicit time says "night"
      const result = detectTimeOfDay('ROOFTOP AT SUNSET', 'NIGHT')
      expect(result.timeOfDay).toBe('NIGHT')
      expect(result.autoDetected).toBe(false)
    })
  })
})

describe('detectTimeFromHeading', () => {
  it('should parse standard scene heading', () => {
    const result = detectTimeFromHeading('INT. COFFEE SHOP - DAY')
    expect(result.timeOfDay).toBe('DAY')
    expect(result.autoDetected).toBe(false)
  })

  it('should parse EXT heading', () => {
    const result = detectTimeFromHeading('EXT. PARK - NIGHT')
    expect(result.timeOfDay).toBe('NIGHT')
  })

  it('should parse INT/EXT heading', () => {
    const result = detectTimeFromHeading('INT/EXT. CAR - DUSK')
    expect(result.timeOfDay).toBe('DUSK')
  })

  it('should parse I/E heading', () => {
    const result = detectTimeFromHeading('I/E. DOORWAY - MORNING')
    expect(result.timeOfDay).toBe('MORNING')
  })

  it('should handle heading without explicit time', () => {
    const result = detectTimeFromHeading('INT. OFFICE')
    expect(result.timeOfDay).toBe('DAY')
    expect(result.autoDetected).toBe(false)
  })

  it('should detect time from location when no explicit time', () => {
    const result = detectTimeFromHeading('INT. BEDROOM AT MIDNIGHT')
    expect(result.timeOfDay).toBe('NIGHT')
    expect(result.autoDetected).toBe(true)
  })

  it('should handle CONTINUOUS with previous scene', () => {
    const result = detectTimeFromHeading('INT. HALLWAY - CONTINUOUS', 'NIGHT')
    expect(result.timeOfDay).toBe('NIGHT')
  })

  it('should handle multiple dashes in location', () => {
    const result = detectTimeFromHeading('INT. COFFEE SHOP - BACK ROOM - DAY')
    expect(result.timeOfDay).toBe('DAY')
  })
})

describe('isContinuousMarker', () => {
  it('should return true for CONTINUOUS', () => {
    expect(isContinuousMarker('CONTINUOUS')).toBe(true)
    expect(isContinuousMarker('continuous')).toBe(true)
  })

  it('should return true for CONT variations', () => {
    expect(isContinuousMarker('CONT.')).toBe(true)
    expect(isContinuousMarker("CONT'D")).toBe(true)
    expect(isContinuousMarker('CONT')).toBe(true)
  })

  it('should return true for other continuous keywords', () => {
    expect(isContinuousMarker('LATER')).toBe(true)
    expect(isContinuousMarker('MOMENTS LATER')).toBe(true)
    expect(isContinuousMarker('INTERCUT')).toBe(true)
    expect(isContinuousMarker('SAME TIME')).toBe(true)
  })

  it('should return false for regular times', () => {
    expect(isContinuousMarker('DAY')).toBe(false)
    expect(isContinuousMarker('NIGHT')).toBe(false)
    expect(isContinuousMarker('MORNING')).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isContinuousMarker(undefined)).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isContinuousMarker('')).toBe(false)
  })
})

describe('getUniqueTimesOfDay', () => {
  it('should return unique times', () => {
    const result = getUniqueTimesOfDay(['DAY', 'NIGHT', 'DAY', 'MORNING'])
    expect(result).toHaveLength(3)
    expect(result).toContain('DAY')
    expect(result).toContain('NIGHT')
    expect(result).toContain('MORNING')
  })

  it('should sort by time order (dawn to night)', () => {
    const result = getUniqueTimesOfDay(['NIGHT', 'DAY', 'DAWN', 'EVENING'])
    expect(result).toEqual(['DAWN', 'DAY', 'EVENING', 'NIGHT'])
  })

  it('should normalize input values', () => {
    const result = getUniqueTimesOfDay(['day', 'NIGHT', 'morning', 'sunrise'])
    expect(result).toContain('DAY')
    expect(result).toContain('NIGHT')
    expect(result).toContain('MORNING')
    expect(result).toContain('DAWN') // sunrise normalizes to DAWN
  })

  it('should skip undefined and empty values', () => {
    const result = getUniqueTimesOfDay(['DAY', undefined, '', 'NIGHT'])
    expect(result).toHaveLength(2)
    expect(result).toEqual(['DAY', 'NIGHT'])
  })

  it('should return empty array for empty input', () => {
    expect(getUniqueTimesOfDay([])).toEqual([])
  })

  it('should handle all time types in order', () => {
    const result = getUniqueTimesOfDay([
      'CONTINUOUS',
      'NIGHT',
      'EVENING',
      'DUSK',
      'AFTERNOON',
      'DAY',
      'MORNING',
      'DAWN',
    ])
    expect(result).toEqual([
      'DAWN',
      'MORNING',
      'DAY',
      'AFTERNOON',
      'DUSK',
      'EVENING',
      'NIGHT',
      'CONTINUOUS',
    ])
  })
})

describe('TIME_OF_DAY_LABELS', () => {
  it('should have labels for all time types', () => {
    const timeTypes: TimeOfDay[] = [
      'DAY', 'NIGHT', 'DAWN', 'MORNING', 'AFTERNOON', 'DUSK', 'EVENING', 'CONTINUOUS'
    ]
    for (const time of timeTypes) {
      expect(TIME_OF_DAY_LABELS[time]).toBeDefined()
      expect(typeof TIME_OF_DAY_LABELS[time]).toBe('string')
    }
  })

  it('should have readable labels', () => {
    expect(TIME_OF_DAY_LABELS.DAY).toBe('Day')
    expect(TIME_OF_DAY_LABELS.NIGHT).toBe('Night')
    expect(TIME_OF_DAY_LABELS.CONTINUOUS).toBe('Continuous')
  })
})

describe('TIME_OF_DAY_ORDER', () => {
  it('should have order for all time types', () => {
    const timeTypes: TimeOfDay[] = [
      'DAY', 'NIGHT', 'DAWN', 'MORNING', 'AFTERNOON', 'DUSK', 'EVENING', 'CONTINUOUS'
    ]
    for (const time of timeTypes) {
      expect(typeof TIME_OF_DAY_ORDER[time]).toBe('number')
    }
  })

  it('should order DAWN before NIGHT', () => {
    expect(TIME_OF_DAY_ORDER.DAWN).toBeLessThan(TIME_OF_DAY_ORDER.NIGHT)
  })

  it('should order DAY in middle', () => {
    expect(TIME_OF_DAY_ORDER.DAY).toBeGreaterThan(TIME_OF_DAY_ORDER.MORNING)
    expect(TIME_OF_DAY_ORDER.DAY).toBeLessThan(TIME_OF_DAY_ORDER.AFTERNOON)
  })

  it('should order CONTINUOUS last', () => {
    expect(TIME_OF_DAY_ORDER.CONTINUOUS).toBeGreaterThan(TIME_OF_DAY_ORDER.NIGHT)
  })
})
