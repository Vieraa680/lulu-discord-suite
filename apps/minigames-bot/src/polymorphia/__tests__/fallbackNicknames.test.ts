import { describe, it, expect } from 'vitest'
import { getRandomFallbackNickname, FALLBACK_NICKNAMES } from '../fallbackNicknames'

describe('fallbackNicknames', () => {
  describe('FALLBACK_NICKNAMES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(FALLBACK_NICKNAMES)).toBe(true)
      expect(FALLBACK_NICKNAMES.length).toBeGreaterThan(0)
    })

    it('every nickname should be a non-empty string', () => {
      for (const nick of FALLBACK_NICKNAMES) {
        expect(typeof nick).toBe('string')
        expect(nick.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getRandomFallbackNickname()', () => {
    it('should return a string from the pool', () => {
      for (let i = 0; i < 50; i++) {
        const nick = getRandomFallbackNickname('someUser')
        expect(FALLBACK_NICKNAMES).toContain(nick)
      }
    })

    it('should ignore the username parameter', () => {
      const result = getRandomFallbackNickname('this-should-be-ignored')
      expect(typeof result).toBe('string')
      expect(FALLBACK_NICKNAMES).toContain(result)
    })

    it('should eventually return different values (randomness test)', () => {
      const results = new Set<string>()
      for (let i = 0; i < 100; i++) {
        results.add(getRandomFallbackNickname('test'))
      }
      // With 55 entries, 100 trials should produce at least 5 unique values
      expect(results.size).toBeGreaterThanOrEqual(5)
    })
  })
})