import NextAuth from '@auth/core/next'
import authOptions from '../../../../lib/auth'

export async function GET(req: Request) {
  return await NextAuth(req as any, { ...authOptions })
}

export async function POST(req: Request) {
  return await NextAuth(req as any, { ...authOptions })
}
