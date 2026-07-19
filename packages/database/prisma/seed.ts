// ──────────────────────────────────────────────
// Run with: npm run db:seed -w packages/database
// ──────────────────────────────────────────────

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ACHIEVEMENTS = [
  { name: "Primer Duelo",          emoji: "⚔️",  category: "polymorphia", requirement: "polymorphiaWins >= 1",          description: "Ganaste tu primer duelo de Polymorphia." },
  { name: "Duelista Novato",       emoji: "🥉",  category: "polymorphia", requirement: "polymorphiaWins >= 5",          description: "Acumulaste 5 victorias en duelos." },
  { name: "Duelista Veterano",     emoji: "🥈",  category: "polymorphia", requirement: "polymorphiaWins >= 25",         description: "Acumulaste 25 victorias en duelos." },
  { name: "Maestro del Duelo",     emoji: "🥇",  category: "polymorphia", requirement: "polymorphiaWins >= 100",        description: "Alcanzaste 100 victorias en duelos." },
  { name: "Defensor Nat",          emoji: "🛡️",  category: "polymorphia", requirement: "polymorphiaSaved >= 10",        description: "Te defendiste exitosamente 10 veces." },
  { name: "Cazador de Mariposas",  emoji: "🦋",  category: "butterfly",   requirement: "butterfliesCaught >= 1",        description: "Atrapaste tu primera mariposa morada." },
  { name: "Colleccionista",        emoji: "🏆",  category: "butterfly",   requirement: "butterfliesCaught >= 50",       description: "Atrapaste 50 mariposas." },
  { name: "Primeras Gominolas",    emoji: "🍬",  category: "economy",     requirement: "totalEarned >= 100",            description: "Ganaste tus primeras 100 candies." },
  { name: "Ahorrador",             emoji: "💰",  category: "economy",     requirement: "candies >= 500",                description: "Acumulaste 500 candies en tu saldo." },
  { name: "Millonario",            emoji: "💎",  category: "economy",     requirement: "candies >= 10000",              description: "Llegaste a las 10,000 candies." },
  { name: "Gastador",              emoji: "🛍️",  category: "economy",     requirement: "totalSpent >= 1000",            description: "Gastaste 1,000 candies en la tienda." },
  { name: "Veterano del Server",   emoji: "👑",  category: "general",     requirement: "createdAt <= now - 30 days",    description: "Llevas 30 días o más en el servidor." },
  { name: "Primer Comando",        emoji: "🤖",  category: "general",     requirement: "interactions >= 1",             description: "Usaste tu primer comando con Lulu." },
]

const ITEMS = [
  // ── Butterflies (collectibles) ──
  { name: "Mariposa Monarca",   emoji: "🦋", category: "butterfly", rarity: "common",   price: 0,   isCollectible: true },
  { name: "Mariposa Azul",      emoji: "🦋", category: "butterfly", rarity: "uncommon", price: 0,   isCollectible: true },
  { name: "Mariposa Dorada",    emoji: "🦋", category: "butterfly", rarity: "rare",     price: 0,   isCollectible: true },
  { name: "Mariposa Arcoíris",  emoji: "🦋", category: "butterfly", rarity: "epic",     price: 0,   isCollectible: true },
  { name: "Mariposa Luminosa",  emoji: "🦋", category: "butterfly", rarity: "legendary",price: 0,   isCollectible: true },

  // ── Polymorphia Forms (cosmetics) ──
  { name: "Forma Yuumi",        emoji: "🐱", category: "form",     rarity: "common",   price: 50,  isCollectible: false, formDuration: 15 },
  { name: "Forma Teemo",        emoji: "🐭", category: "form",     rarity: "uncommon", price: 100, isCollectible: false, formDuration: 30 },
  { name: "Forma Poro",         emoji: "❄️", category: "form",     rarity: "rare",     price: 200, isCollectible: false, formDuration: 60 },
  { name: "Forma Gato Lunar",   emoji: "🌙", category: "form",     rarity: "epic",     price: 500, isCollectible: false, formDuration: 120 },

  // ── Consumables ──
  { name: "Red de Mariposas",        emoji: "🪤", category: "consumable", rarity: "common",   price: 10,  isCollectible: false },
  { name: "Poción de Polimorfia",    emoji: "🧪", category: "consumable", rarity: "uncommon", price: 30,  isCollectible: false },

  // ── Polymorphia Defense Items ──
  { name: "Escudo de Banshee",       emoji: "🛡️", category: "defense",    rarity: "rare",     price: 150, isCollectible: false },
  { name: "Cetro de Cristal",        emoji: "🔮", category: "defense",    rarity: "epic",     price: 300, isCollectible: false },
  { name: "Poción de Polvo de Hada", emoji: "🧴", category: "consumable", rarity: "common",   price: 40,  isCollectible: false },
]

async function main() {
  console.log("🌱 Seeding database...")

  for (const item of ITEMS) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    })
    console.log(`  ✓ ${item.emoji} ${item.name} (${item.rarity})`)
  }

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {},
      create: achievement,
    })
    console.log(`  ✓ ${achievement.emoji} ${achievement.name}`)
  }

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
