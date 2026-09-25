import NextAuth, { type DefaultSession } from 'next-auth'
import Discord from 'next-auth/providers/discord'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      discordId?: string
      globalName?: string
      username?: string
    } & DefaultSession['user']
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID || process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET || process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    jwt({ token, profile, account }) {
      if (profile) {
        const p = profile as Record<string, any>
        token.discordId = p.id || account?.providerAccountId
        token.globalName = p.global_name || p.name
        token.username = p.username
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const discordId = (token.discordId as string) || (token.sub as string)
        session.user.id = discordId
        session.user.discordId = discordId
        session.user.globalName = token.globalName as string | undefined
        session.user.username = token.username as string | undefined
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
})
