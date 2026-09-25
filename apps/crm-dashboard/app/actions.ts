'use server'

import { prisma } from '@lulu-discord/database'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export interface ActionResponse {
  success: boolean
  message: string
}

export async function selectGuild(formData: FormData): Promise<ActionResponse> {
  const guildId = (formData.get('guildId') as string)?.trim()
  if (!guildId) return { success: false, message: 'ID de servidor requerido.' }

  const cookieStore = await cookies()
  cookieStore.set('lulu_selected_guild', guildId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
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

    revalidatePath('/dashboard/items')
    return { success: true, message: `Precio actualizado a ${price} caramelos.` }
  } catch (error) {
    console.error('[actions] updateItemPrice error:', error)
    return { success: false, message: 'Error al actualizar precio.' }
  }
}
