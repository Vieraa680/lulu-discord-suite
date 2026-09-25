'use server'

import { prisma, Prisma } from '@lulu-discord/database'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { invalidateCache } from '@/lib/dashboard-data'

export interface ActionResponse {
  success: boolean
  message: string
}

export async function selectGuild(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }

  const cookieStore = await cookies()
  cookieStore.set('lulu_selected_guild', guildId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  invalidateCache('guilds')
  invalidateCache(`stats:${guildId}`)
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'Servidor cambiado con éxito.' }
}

export async function registerGuild(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }

  try {
    await prisma.guildConfig.upsert({
      where: { guildId },
      update: {},
      create: {
        guildId,
        veteranRoleName: 'Invocador Veterano',
      },
    })
    const cookieStore = await cookies()
    cookieStore.set('lulu_selected_guild', guildId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
    invalidateCache('guilds')
    invalidateCache(`config:${guildId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true, message: `Servidor ${guildId} registrado con éxito.` }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Error al registrar el servidor.' }
  }
}

export async function adjustUserCandies(formData: FormData): Promise<ActionResponse> {
  const discordId = formData.get('discordId') as string
  const guildId = formData.get('guildId') as string
  const amountStr = formData.get('amount') as string
  const reason = (formData.get('reason') as string)?.trim() || 'Ajuste administrativo'

  const amount = parseInt(amountStr, 10)
  if (isNaN(amount) || amount === 0) {
    return { success: false, message: 'La cantidad debe ser un número entero diferente de cero.' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
    })

    if (!user) {
      return { success: false, message: 'Usuario no encontrado en este servidor.' }
    }

    const newBalance = Math.max(0, user.candies + amount)
    const effectiveDelta = newBalance - user.candies

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          candies: newBalance,
          totalEarned: effectiveDelta > 0 ? { increment: effectiveDelta } : undefined,
          totalSpent: effectiveDelta < 0 ? { increment: Math.abs(effectiveDelta) } : undefined,
        },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'admin',
          amount: Math.abs(effectiveDelta),
          balanceAfter: newBalance,
          description: `Ajuste Staff (${effectiveDelta > 0 ? '+' : ''}${effectiveDelta}): ${reason}`,
        },
      })
    })

    invalidateCache(`stats:${guildId}`)
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/users/${discordId}`)
    revalidatePath('/dashboard/users')
    revalidatePath('/dashboard/transactions')
    return { success: true, message: `Saldo actualizado a ${newBalance.toLocaleString()} caramelos.` }
  } catch (error) {
    console.error('[actions] adjustUserCandies error:', error)
    return { success: false, message: 'No se pudo actualizar el balance en la base de datos.' }
  }
}

export async function dispelPolymorphia(formData: FormData): Promise<ActionResponse> {
  const discordId = formData.get('discordId') as string
  const guildId = formData.get('guildId') as string

  try {
    const user = await prisma.user.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
      include: { state: true },
    })

    if (!user || !user.state) {
      return { success: false, message: 'El usuario no tiene una metamorfosis activa.' }
    }

    await prisma.polymorphiaState.update({
      where: { id: user.state.id },
      data: {
        isActive: false,
        currentForm: '',
        endsAt: new Date(),
      },
    })

    invalidateCache(`stats:${guildId}`)
    invalidateCache(`polymorphia:${guildId}`)
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/users/${discordId}`)
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Metamorfosis disipada exitosamente.' }
  } catch (error) {
    console.error('[actions] dispelPolymorphia error:', error)
    return { success: false, message: 'Error al disipar la metamorfosis.' }
  }
}

export async function applyPolymorphia(formData: FormData): Promise<ActionResponse> {
  const discordId = formData.get('discordId') as string
  const guildId = formData.get('guildId') as string
  const form = (formData.get('form') as string)?.trim()
  const durationMinutes = parseInt(formData.get('durationMinutes') as string, 10) || 30

  if (!form) {
    return { success: false, message: 'Debes especificar una forma (ej. Forma Yuumi).' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
      include: { state: true },
    })

    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' }
    }

    const now = new Date()
    const endsAt = new Date(now.getTime() + durationMinutes * 60000)

    if (user.state) {
      await prisma.polymorphiaState.update({
        where: { id: user.state.id },
        data: {
          isActive: true,
          currentForm: form,
          isVoluntary: true,
          formDuration: durationMinutes,
          startedAt: now,
          endsAt,
        },
      })
    } else {
      await prisma.polymorphiaState.create({
        data: {
          userId: user.id,
          guildId,
          isActive: true,
          currentForm: form,
          isVoluntary: true,
          formDuration: durationMinutes,
          startedAt: now,
          endsAt,
        },
      })
    }

    invalidateCache(`stats:${guildId}`)
    invalidateCache(`polymorphia:${guildId}`)
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/users/${discordId}`)
    return { success: true, message: `Usuario transformado en "${form}" por ${durationMinutes} minutos.` }
  } catch (error) {
    console.error('[actions] applyPolymorphia error:', error)
    return { success: false, message: 'Error al aplicar metamorfosis.' }
  }
}

export async function grantItem(formData: FormData): Promise<ActionResponse> {
  const discordId = formData.get('discordId') as string
  const guildId = formData.get('guildId') as string
  const itemId = formData.get('itemId') as string
  const quantity = parseInt(formData.get('quantity') as string, 10) || 1

  try {
    const user = await prisma.user.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
    })

    if (!user) return { success: false, message: 'Usuario no encontrado.' }

    await prisma.userItem.upsert({
      where: {
        userId_itemId: { userId: user.id, itemId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId: user.id,
        itemId,
        quantity,
      },
    })

    invalidateCache(`stats:${guildId}`)
    invalidateCache('items:catalog')
    revalidatePath(`/dashboard/users/${discordId}`)
    revalidatePath('/dashboard/users')
    return { success: true, message: `Se añadieron ${quantity}x del ítem al inventario.` }
  } catch (error) {
    console.error('[actions] grantItem error:', error)
    return { success: false, message: 'Error al otorgar ítem.' }
  }
}

export async function updateGuildConfig(formData: FormData): Promise<ActionResponse> {
  const guildId = formData.get('guildId') as string
  const veteranRoleName = formData.get('veteranRoleName') as string
  const butterflyMultiplier = parseFloat(formData.get('butterflyMultiplier') as string) || 1.0
  const candyMultiplier = parseFloat(formData.get('candyMultiplier') as string) || 1.0
  const polymorphiaMinBet = parseInt(formData.get('polymorphiaMinBet') as string, 10) || 1
  const polymorphiaMaxBet = parseInt(formData.get('polymorphiaMaxBet') as string, 10) || 1000
  const adminRoleId = (formData.get('adminRoleId') as string)?.trim() || null
  const logChannelId = (formData.get('logChannelId') as string)?.trim() || null
  const excludedChannelsStr = (formData.get('butterflyExcludedChannels') as string)?.trim() || ''

  const butterflyExcludedChannels = excludedChannelsStr
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)

  try {
    await prisma.guildConfig.upsert({
      where: { guildId },
      update: {
        veteranRoleName,
        butterflyMultiplier,
        candyMultiplier,
        polymorphiaMinBet,
        polymorphiaMaxBet,
        adminRoleId,
        logChannelId,
        butterflyExcludedChannels,
      },
      create: {
        guildId,
        veteranRoleName,
        butterflyMultiplier,
        candyMultiplier,
        polymorphiaMinBet,
        polymorphiaMaxBet,
        adminRoleId,
        logChannelId,
        butterflyExcludedChannels,
      },
    })

    invalidateCache(`config:${guildId}`)
    invalidateCache('guilds')
    revalidatePath('/dashboard/settings')
    return { success: true, message: 'Configuración guardada exitosamente.' }
  } catch (error) {
    console.error('[actions] updateGuildConfig error:', error)
    return { success: false, message: 'Error al guardar la configuración.' }
  }
}

export async function toggleItemStatus(formData: FormData): Promise<ActionResponse> {
  const itemId = formData.get('itemId') as string
  const isActive = formData.get('isActive') === 'true'

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { isActive: !isActive },
    })

    invalidateCache('items:catalog')
    revalidatePath('/dashboard/items')
    return { success: true, message: `Estado del ítem actualizado.` }
  } catch (error) {
    console.error('[actions] toggleItemStatus error:', error)
    return { success: false, message: 'Error al actualizar el estado del ítem.' }
  }
}

export async function updateItemPrice(formData: FormData): Promise<ActionResponse> {
  const itemId = formData.get('itemId') as string
  const price = parseInt(formData.get('price') as string, 10)

  if (isNaN(price) || price < 0) {
    return { success: false, message: 'Precio inválido.' }
  }

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { price },
    })

    invalidateCache('items:catalog')
    revalidatePath('/dashboard/items')
    return { success: true, message: `Precio actualizado a ${price} caramelos.` }
  } catch (error) {
    console.error('[actions] updateItemPrice error:', error)
    return { success: false, message: 'Error al actualizar precio.' }
  }
}

export interface CreateRoleResponse extends ActionResponse {
  role?: {
    id: string
    name: string
    color: number
    hexColor: string
    position: number
  }
}

export async function createDiscordRole(formData: FormData): Promise<CreateRoleResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const colorHex = (formData.get('color') as string)?.trim() || '#a855f7'
  const hoist = formData.get('hoist') === 'true'

  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }
  if (!name) return { success: false, message: 'Debes ingresar un nombre para el nuevo rol.' }

  const token = process.env.DISCORD_TOKEN?.trim()
  if (!token) return { success: false, message: 'DISCORD_TOKEN no configurado en el servidor.' }

  const cleanHex = colorHex.replace('#', '')
  const colorInt = parseInt(cleanHex, 16) || 0

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        color: colorInt,
        hoist,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('[actions] createDiscordRole failed:', errData)
      const errorMsg =
        errData?.message ||
        'Error de permisos en Discord: Asegúrate de que el bot tenga el permiso "Gestionar roles" y que su rol esté por encima en la jerarquía del servidor.'
      return { success: false, message: errorMsg }
    }

    const created = (await res.json()) as {
      id: string
      name: string
      color: number
      position: number
    }

    const formattedRole = {
      id: created.id,
      name: created.name,
      color: created.color,
      hexColor: created.color ? `#${created.color.toString(16).padStart(6, '0')}` : colorHex,
      position: created.position ?? 0,
    }

    invalidateCache(`roles:${guildId}`)
    revalidatePath('/dashboard/activity-roles')
    return {
      success: true,
      message: `¡Rol "${created.name}" creado con éxito en Discord!`,
      role: formattedRole,
    }
  } catch (error) {
    console.error('[actions] createDiscordRole error:', error)
    return { success: false, message: 'No se pudo contactar con la API de Discord.' }
  }
}

export async function createActivityRoleRule(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const roleId = (formData.get('roleId') as string)?.trim()
  const roleName = (formData.get('roleName') as string)?.trim() || null
  const roleColor = (formData.get('roleColor') as string)?.trim() || null
  const channelName = (formData.get('channelName') as string)?.trim() || null
  const channelIdsRaw = (formData.get('channelIds') as string)?.trim()
  const messagesReq = parseInt(formData.get('messagesReq') as string, 10) || 1
  const cooldownSec = parseInt(formData.get('cooldownSec') as string, 10) || 60

  let channelIds: string[] = []
  if (channelIdsRaw) {
    try {
      const parsed = JSON.parse(channelIdsRaw)
      if (Array.isArray(parsed)) {
        channelIds = parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      }
    } catch {
      channelIds = []
    }
  }

  const channelId = channelIds.length === 1 ? channelIds[0] : (formData.get('channelId') as string)?.trim() || null

  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }
  if (!name) return { success: false, message: 'El nombre de la regla es obligatorio.' }
  if (!roleId) return { success: false, message: 'Debes seleccionar un rol de Discord.' }
  if (messagesReq < 1) return { success: false, message: 'La cantidad de mensajes requeridos debe ser al menos 1.' }

  try {
    await prisma.activityRoleRule.create({
      data: {
        guildId,
        name,
        roleId,
        roleName,
        roleColor,
        channelId,
        channelName,
        channelIds,
        messagesReq,
        cooldownSec: Math.max(5, cooldownSec),
        isEnabled: true,
      },
    })

    invalidateCache(`rules:${guildId}`)
    revalidatePath('/dashboard/activity-roles')
    return { success: true, message: 'Regla de rol por actividad creada con éxito.' }
  } catch (error) {
    console.error('[actions] createActivityRoleRule error:', error)
    return { success: false, message: 'Error al crear la regla en la base de datos.' }
  }
}

export async function toggleActivityRoleRule(formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string
  const isEnabled = formData.get('isEnabled') === 'true'

  if (!id) return { success: false, message: 'ID de regla no especificado.' }

  try {
    const updated = await prisma.activityRoleRule.update({
      where: { id },
      data: { isEnabled },
    })

    invalidateCache(`rules:${updated.guildId}`)
    revalidatePath('/dashboard/activity-roles')
    return {
      success: true,
      message: isEnabled ? 'Regla activada.' : 'Regla pausada.',
    }
  } catch (error) {
    console.error('[actions] toggleActivityRoleRule error:', error)
    return { success: false, message: 'Error al cambiar estado de la regla.' }
  }
}

export async function deleteActivityRoleRule(formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string

  if (!id) return { success: false, message: 'ID de regla no especificado.' }

  try {
    const deleted = await prisma.activityRoleRule.delete({
      where: { id },
    })

    invalidateCache(`rules:${deleted.guildId}`)
    revalidatePath('/dashboard/activity-roles')
    return { success: true, message: 'Regla eliminada con éxito.' }
  } catch (error) {
    console.error('[actions] deleteActivityRoleRule error:', error)
    return { success: false, message: 'Error al eliminar la regla.' }
  }
}

export async function updateLevelingConfig(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }

  const xpEnabled = formData.get('xpEnabled') === 'true'
  const xpPerMessageMin = Math.max(1, parseInt(formData.get('xpPerMessageMin') as string, 10) || 15)
  const xpPerMessageMax = Math.max(xpPerMessageMin, parseInt(formData.get('xpPerMessageMax') as string, 10) || 25)
  const xpCooldownSec = Math.max(0, parseInt(formData.get('xpCooldownSec') as string, 10) || 60)

  let xpExcludedChannels: string[] = []
  try {
    const raw = formData.get('xpExcludedChannels') as string
    if (raw) {
      xpExcludedChannels = JSON.parse(raw)
    }
  } catch {
    xpExcludedChannels = []
  }

  const rawLevelUpChannel = (formData.get('xpLevelUpChannelId') as string)?.trim()
  const xpLevelUpChannelId = rawLevelUpChannel && rawLevelUpChannel !== 'default' ? rawLevelUpChannel : null

  const voiceXpEnabled = formData.get('voiceXpEnabled') === 'true'
  const voiceXpPerMinute = Math.max(1, parseInt(formData.get('voiceXpPerMinute') as string, 10) || 10)
  const voiceXpMinMembers = Math.max(1, parseInt(formData.get('voiceXpMinMembers') as string, 10) || 2)
  const voiceXpRequiresUnmuted = formData.get('voiceXpRequiresUnmuted') === 'true'

  let xpRoleMultipliers: Array<{ roleId: string; roleName: string; multiplier: number }> = []
  try {
    const rawMultipliers = formData.get('xpRoleMultipliers') as string
    if (rawMultipliers) {
      xpRoleMultipliers = JSON.parse(rawMultipliers)
    }
  } catch {
    xpRoleMultipliers = []
  }

  try {
    await prisma.guildConfig.upsert({
      where: { guildId },
      update: {
        xpEnabled,
        xpPerMessageMin,
        xpPerMessageMax,
        xpCooldownSec,
        xpExcludedChannels,
        xpLevelUpChannelId,
        voiceXpEnabled,
        voiceXpPerMinute,
        voiceXpMinMembers,
        voiceXpRequiresUnmuted,
        xpRoleMultipliers,
      },
      create: {
        guildId,
        xpEnabled,
        xpPerMessageMin,
        xpPerMessageMax,
        xpCooldownSec,
        xpExcludedChannels,
        xpLevelUpChannelId,
        voiceXpEnabled,
        voiceXpPerMinute,
        voiceXpMinMembers,
        voiceXpRequiresUnmuted,
        xpRoleMultipliers,
      },
    })

    invalidateCache(`config:${guildId}`)
    revalidatePath('/dashboard/levels')
    revalidatePath('/dashboard/settings')
    return { success: true, message: 'Cambios guardados.' }
  } catch (error) {
    console.error('[actions] updateLevelingConfig error:', error)
    return { success: false, message: 'No se pudieron guardar los cambios.' }
  }
}

export async function createLevelRoleReward(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  const levelReq = parseInt((formData.get('levelReq') as string) || '1', 10)
  const roleId = (formData.get('roleId') as string)?.trim()
  const roleName = (formData.get('roleName') as string)?.trim() || null
  const roleColor = (formData.get('roleColor') as string)?.trim() || null
  const removePrevious = formData.get('removePrevious') === 'true'

  if (!guildId) {
    return { success: false, message: 'Falta el ID del servidor.' }
  }
  if (!roleId) {
    return { success: false, message: 'Debes seleccionar un rol de Discord.' }
  }
  if (isNaN(levelReq) || levelReq < 1) {
    return { success: false, message: 'El nivel debe ser mayor o igual a 1.' }
  }

  try {
    await prisma.levelRoleReward.upsert({
      where: {
        guildId_levelReq_roleId: {
          guildId,
          levelReq,
          roleId,
        },
      },
      update: {
        roleName,
        roleColor,
        removePrevious,
        isEnabled: true,
      },
      create: {
        guildId,
        levelReq,
        roleId,
        roleName,
        roleColor,
        removePrevious,
        isEnabled: true,
      },
    })

    invalidateCache(`level-rewards:${guildId}`)
    revalidatePath('/dashboard/levels')
    return { success: true, message: `Rol de nivel ${levelReq} guardado.` }
  } catch (error) {
    console.error('[actions] createLevelRoleReward error:', error)
    return { success: false, message: 'No se pudo guardar el rol.' }
  }
}

export async function toggleLevelRoleReward(formData: FormData): Promise<ActionResponse> {
  const id = (formData.get('id') as string)?.trim()
  const guildId = (formData.get('guildId') as string)?.trim()

  if (!id || !guildId) {
    return { success: false, message: 'Faltan datos.' }
  }

  try {
    const existing = await prisma.levelRoleReward.findUnique({
      where: { id },
    })

    if (!existing || existing.guildId !== guildId) {
      return { success: false, message: 'Rol no encontrado.' }
    }

    await prisma.levelRoleReward.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
    })

    invalidateCache(`level-rewards:${guildId}`)
    revalidatePath('/dashboard/levels')
    return {
      success: true,
      message: existing.isEnabled ? 'Rol pausado.' : 'Rol activado.',
    }
  } catch (error) {
    console.error('[actions] toggleLevelRoleReward error:', error)
    return { success: false, message: 'No se pudo cambiar el estado.' }
  }
}

export async function deleteLevelRoleReward(formData: FormData): Promise<ActionResponse> {
  const id = (formData.get('id') as string)?.trim()
  const guildId = (formData.get('guildId') as string)?.trim()

  if (!id || !guildId) {
    return { success: false, message: 'Faltan datos.' }
  }

  try {
    await prisma.levelRoleReward.delete({
      where: { id },
    })

    invalidateCache(`level-rewards:${guildId}`)
    revalidatePath('/dashboard/levels')
    return { success: true, message: 'Rol eliminado.' }
  } catch (error) {
    console.error('[actions] deleteLevelRoleReward error:', error)
    return { success: false, message: 'No se pudo eliminar el rol.' }
  }
}

export async function saveSeason(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  const seasonId = (formData.get('seasonId') as string)?.trim() || null
  const name = (formData.get('name') as string)?.trim()
  const status = ((formData.get('status') as string)?.trim() || 'ACTIVE') as 'ACTIVE' | 'SCHEDULED'
  const startDateStr = (formData.get('startDate') as string)?.trim()
  const endDateStr = (formData.get('endDate') as string)?.trim()
  const rawRewards = (formData.get('rewards') as string)?.trim()

  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }
  if (!name) return { success: false, message: 'Ingresa un nombre para la temporada.' }
  if (!endDateStr) return { success: false, message: 'Indica la fecha de finalización.' }

  let rewardsData: Array<{ tier: number; levelReq: number; roleId: string; roleName?: string; roleColor?: string; isTrophy?: boolean }> = []
  try {
    rewardsData = rawRewards ? JSON.parse(rawRewards) : []
  } catch {
    return { success: false, message: 'Formato de recompensas inválido.' }
  }

  if (rewardsData.length === 0) {
    return { success: false, message: 'Debes configurar al menos los roles de la temporada.' }
  }

  const startDate = startDateStr ? new Date(startDateStr) : new Date()
  const endDate = new Date(endDateStr)
  const trophyReward = rewardsData.find(r => r.tier === 5 || r.isTrophy)

  try {
    let season
    if (seasonId) {
      season = await prisma.season.update({
        where: { id: seasonId },
        data: {
          name,
          status,
          startDate,
          endDate,
          trophyRoleId: trophyReward?.roleId || null,
          trophyRoleName: trophyReward?.roleName || null,
        },
      })
      await prisma.seasonRoleReward.deleteMany({ where: { seasonId } })
    } else {
      season = await prisma.season.create({
        data: {
          guildId,
          name,
          status,
          startDate,
          endDate,
          trophyRoleId: trophyReward?.roleId || null,
          trophyRoleName: trophyReward?.roleName || null,
        },
      })
    }

    for (const r of rewardsData) {
      await prisma.seasonRoleReward.create({
        data: {
          seasonId: season.id,
          tier: r.tier,
          levelReq: r.levelReq,
          roleId: r.roleId,
          roleName: r.roleName || null,
          roleColor: r.roleColor || null,
          isTrophy: r.tier === 5 || !!r.isTrophy,
        },
      })
    }

    if (status === 'ACTIVE') {
      await prisma.levelRoleReward.deleteMany({ where: { guildId } })
      for (const r of rewardsData) {
        await prisma.levelRoleReward.create({
          data: {
            guildId,
            levelReq: r.levelReq,
            roleId: r.roleId,
            roleName: r.roleName || null,
            roleColor: r.roleColor || null,
            removePrevious: true,
            isEnabled: true,
          },
        })
      }
    }

    invalidateCache(`seasons:${guildId}`)
    invalidateCache(`level-rewards:${guildId}`)
    revalidatePath('/dashboard/levels')
    return { success: true, message: 'Temporada guardada correctamente.' }
  } catch (error) {
    console.error('[actions] saveSeason error:', error)
    return { success: false, message: 'No se pudo guardar la temporada.' }
  }
}

export async function triggerSeasonRotation(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  const seasonId = (formData.get('seasonId') as string)?.trim()

  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }

  const token = process.env.DISCORD_TOKEN?.trim()

  try {
    const activeSeason = seasonId
      ? await prisma.season.findUnique({
          where: { id: seasonId },
          include: { rewards: true },
        })
      : await prisma.season.findFirst({
          where: { guildId, status: 'ACTIVE' },
          include: { rewards: true },
        })

    if (!activeSeason) {
      return { success: false, message: 'No se encontró ninguna temporada activa para rotar.' }
    }

    const trophyReward = activeSeason.rewards.find(r => r.isTrophy || r.tier === 5)
    const tempRewards = activeSeason.rewards.filter(r => !r.isTrophy && r.tier !== 5)

    if (trophyReward) {
      const trophyUsers = await prisma.user.findMany({
        where: {
          guildId,
          level: { gte: trophyReward.levelReq },
        },
      })

      for (const u of trophyUsers) {
        await prisma.seasonWinner.upsert({
          where: {
            seasonId_discordId: {
              seasonId: activeSeason.id,
              discordId: u.discordId,
            },
          },
          update: {
            finalLevel: u.level,
            finalXp: u.xp,
            achievedTrophy: true,
            username: u.username,
            avatarUrl: u.avatarUrl,
          },
          create: {
            seasonId: activeSeason.id,
            guildId,
            discordId: u.discordId,
            username: u.username,
            avatarUrl: u.avatarUrl,
            finalLevel: u.level,
            finalXp: u.xp,
            achievedTrophy: true,
          },
        })
      }
    }

    if (token) {
      for (const rew of tempRewards) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${rew.roleId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bot ${token}`,
              'X-Audit-Log-Reason': `Fin de temporada: ${activeSeason.name}`,
            },
          })
        } catch (err) {
          console.warn('[actions] Error deleting temp role:', rew.roleId, err)
        }
      }
    }

    await prisma.season.update({
      where: { id: activeSeason.id },
      data: { status: 'COMPLETED' },
    })

    await prisma.user.updateMany({
      where: { guildId },
      data: { xp: 0, level: 0 },
    })

    const nextSeason = await prisma.season.findFirst({
      where: { guildId, status: 'SCHEDULED' },
      orderBy: { startDate: 'asc' },
      include: { rewards: true },
    })

    if (nextSeason) {
      await prisma.season.update({
        where: { id: nextSeason.id },
        data: { status: 'ACTIVE' },
      })

      await prisma.levelRoleReward.deleteMany({ where: { guildId } })
      for (const rew of nextSeason.rewards) {
        await prisma.levelRoleReward.create({
          data: {
            guildId,
            levelReq: rew.levelReq,
            roleId: rew.roleId,
            roleName: rew.roleName,
            roleColor: rew.roleColor,
            removePrevious: true,
            isEnabled: true,
          },
        })
      }
    } else {
      await prisma.levelRoleReward.deleteMany({ where: { guildId } })
    }

    invalidateCache(`seasons:${guildId}`)
    invalidateCache(`level-rewards:${guildId}`)
    invalidateCache(`leaderboard:${guildId}`)
    revalidatePath('/dashboard/levels')
    revalidatePath('/dashboard/leaderboard')
    return {
      success: true,
      message: `Temporada finalizada. Se reinició la experiencia de todos y el rol trofeo permanece en los ganadores.`,
    }
  } catch (error) {
    console.error('[actions] triggerSeasonRotation error:', error)
    return { success: false, message: 'No se pudo completar la rotación de temporada.' }
  }
}



