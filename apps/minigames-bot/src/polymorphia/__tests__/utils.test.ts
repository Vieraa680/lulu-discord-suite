import { describe, it, expect } from 'vitest'
import {
  progressBar,
  cooldownBar,
  relativeTimestamp,
  shortTimestamp,
  colorFromRarity,
  formatNumber,
  PROGRESS_BAR_LENGTH,
} from '../utils'

describe('utils', () => {
  // ── progressBar ──────────────────────────────────
  describe('progressBar()', () => {
    it('should return a string ending with percentage', () => {
      const bar = progressBar(50, 100)
      expect(typeof bar).toBe('string')
      expect(bar).toMatch(/\d+%$/)
    })

    it('should show 0% when current is 0', () => {
      const bar = progressBar(0, 100)
      expect(bar).toMatch(/0%$/)
      expect(bar.startsWith('░'.repeat(PROGRESS_BAR_LENGTH))).toBe(true)
    })

    it('should show 100% when current equals max', () => {
      const bar = progressBar(100, 100)
      expect(bar).toMatch(/100%$/)
      expect(bar.startsWith('▓'.repeat(PROGRESS_BAR_LENGTH))).toBe(true)
    })

    it('should handle max <= 0 as 100%', () => {
      const bar = progressBar(10, 0)
      expect(bar).toMatch(/100%$/)
    })

    it('should clamp values to 0-1 range', () => {
      const negative = progressBar(-10, 100)
      expect(negative).toMatch(/0%$/)

      const overflow = progressBar(200, 100)
      expect(overflow).toMatch(/100%$/)
    })

    it('should use custom length', () => {
      const bar = progressBar(50, 100, 6)
      expect(bar.length).toBeGreaterThanOrEqual(6)
    })
  })

  // ── cooldownBar ──────────────────────────────────
  describe('cooldownBar()', () => {
    it('should return a string ending with time label', () => {
      const bar = cooldownBar(5000, 10000)
      expect(typeof bar).toBe('string')
      expect(bar).toMatch(/\d+s$/)
    })

    it('should show 0s when remaining is 0', () => {
      const bar = cooldownBar(0, 10000)
      expect(bar).toMatch(/0s$/)
    })

    it('should show total time when remaining equals total', () => {
      const bar = cooldownBar(10000, 10000)
      expect(bar).toContain('10s')
    })

    it('should format minutes when >= 60s', () => {
      const bar = cooldownBar(125_000, 300_000) // 2m 5s
      expect(bar).toContain('2m')
      expect(bar).toContain('5s')
    })

    it('should handle max <= 0 as 0s', () => {
      const bar = cooldownBar(10, 0)
      expect(bar).toMatch(/0s$/)
    })
  })

  // ── relativeTimestamp ────────────────────────────
  describe('relativeTimestamp()', () => {
    it('should return a Discord relative timestamp string', () => {
      const result = relativeTimestamp(new Date())
      expect(result).toMatch(/^<t:\d+:R>$/)
    })

    it('should handle Date objects', () => {
      const now = new Date()
      const result = relativeTimestamp(now)
      expect(result).toMatch(/^<t:\d+:R>$/)
    })

    it('should handle numeric timestamps', () => {
      const now = Date.now()
      const result = relativeTimestamp(now)
      expect(result).toMatch(/^<t:\d+:R>$/)
    })
  })

  // ── shortTimestamp ───────────────────────────────
  describe('shortTimestamp()', () => {
    it('should return a Discord short datetime string', () => {
      const result = shortTimestamp(new Date())
      expect(result).toMatch(/^<t:\d+:f>$/)
    })
  })

  // ── colorFromRarity ──────────────────────────────
  describe('colorFromRarity()', () => {
    it('should return correct color for each rarity', () => {
      expect(colorFromRarity('common')).toBe(0x95A5A6)
      expect(colorFromRarity('uncommon')).toBe(0x2ECC71)
      expect(colorFromRarity('rare')).toBe(0x3498DB)
      expect(colorFromRarity('epic')).toBe(0x9B59B6)
      expect(colorFromRarity('legendary')).toBe(0xF1C40F)
    })

    it('should be case-insensitive', () => {
      expect(colorFromRarity('COMMON')).toBe(0x95A5A6)
      expect(colorFromRarity('Rare')).toBe(0x3498DB)
    })

    it('should return epic color as default for unknown rarity', () => {
      expect(colorFromRarity('unknown')).toBe(0x9B59B6)
      expect(colorFromRarity('')).toBe(0x9B59B6)
      expect(colorFromRarity('mythic')).toBe(0x9B59B6)
    })
  })

  // ── formatNumber ─────────────────────────────────
  describe('formatNumber()', () => {
    it('should format a number with locale separators', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
    })

    it('should handle small numbers', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(42)).toBe('42')
      expect(formatNumber(-5)).toBe('-5')
    })

    it('should handle decimal numbers', () => {
      const result = formatNumber(1234.56)
      expect(result).toContain(',')
      expect(result).toContain('.')
    })
  })
})