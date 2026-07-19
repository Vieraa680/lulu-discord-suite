import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('eventPagination', () => {
  let eventPagination:any

  beforeEach(async () => {
    vi.useFakeTimers()
    // import fresh
    vi.resetModules()
    eventPagination = await import('#services/eventPagination')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules disabling of components after TTL', async () => {
    const edits: any[] = []
    const message = {
      id: 'm1',
      edit: async (payload:any) => { edits.push(payload); return Promise.resolve() }
    }

    // schedule with small TTL
    eventPagination.scheduleDisable(message, 1000)
    // advance time
    vi.advanceTimersByTime(1000)
    // allow microtasks
    await Promise.resolve()
    expect(edits.length).toBe(1)
    expect(edits[0]).toEqual({ components: [] })
  })

  it('resets timer when resetDisable is called', async () => {
    const edits: any[] = []
    const message = {
      id: 'm2',
      edit: async (payload:any) => { edits.push(payload); return Promise.resolve() }
    }

    eventPagination.scheduleDisable(message, 1000)
    // advance half
    vi.advanceTimersByTime(600)
    // reset
    eventPagination.resetDisable(message, 1000)
    // advance original remaining (would have fired at 1000 but was reset)
    vi.advanceTimersByTime(600)
    await Promise.resolve()
    // should not have fired yet
    expect(edits.length).toBe(0)
    // advance to trigger
    vi.advanceTimersByTime(1000)
    await Promise.resolve()
    expect(edits.length).toBe(1)
  })
})
