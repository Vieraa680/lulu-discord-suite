const { prisma: _prisma } = require('@lulu-discord/database')

// Allow test injection via global — tests can set globalThis.__MOCKED_PRISMA__
// to swap in a mocked prisma without needing vi.mock on nested requires.
const prisma = globalThis.__MOCKED_PRISMA__ ?? _prisma

module.exports = { prisma }
