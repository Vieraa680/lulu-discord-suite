'use server'

import { prisma } from '@lulu-discord/database'
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

    await prisma.$transaction(async tx => {
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

