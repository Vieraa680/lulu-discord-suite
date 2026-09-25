import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ActivityRolesPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  if (guild) {
    redirect(`/dashboard/levels?guild=${encodeURIComponent(guild)}`)
  }
  redirect('/dashboard/levels')
}
