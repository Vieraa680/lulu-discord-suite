import { Header } from '@/components/Header'
import { ItemCatalogManager } from '@/components/ItemCatalogManager'
import { getActiveGuildId, getItemsCatalog } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function ItemsPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)
  const items = await getItemsCatalog()

  return (
    <div className="space-y-5">
      <Header
        title="Catálogo"
        subtitle="Inventario de ítems del bot, precios en caramelos y disponibilidad"
        guildId={guildId}
      />

      <ItemCatalogManager items={items} />
    </div>
  )
}
