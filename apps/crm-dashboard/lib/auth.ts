import { PrismaAdapter } from '@auth/prisma-adapter'
import Discord from '@auth/core/providers/discord'
import type { AuthOptions } from '@auth/core'
import { prisma } from '@lulu-discord/database'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
}

export default authOptions
