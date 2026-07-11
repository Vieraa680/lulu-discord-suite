// ──────────────────────────────────────────────
// Run with: npm run db:seed -w packages/database
// ──────────────────────────────────────────────

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ITEMS = [
  // ── Butterflies (collectibles) ──
  { name: "Mariposa Monarca",   emoji: "🦋", category: "butterfly", rarity: "common",   price: 0,   isCollectible: true },
  { name: "Mariposa Azul",      emoji: "🦋", category: "butterfly", rarity: "uncommon", price: 0,   isCollectible: true },
  { name: "Mariposa Dorada",    emoji: "🦋", category: "butterfly", rarity: "rare",     price: 0,   isCollectible: true },
  { name: "Mariposa Arcoíris",  emoji: "🦋", category: "butterfly", rarity: "epic",     price: 0,   isCollectible: true },
  { name: "Mariposa Luminosa",  emoji: "🦋", category: "butterfly", rarity: "legendary",price: 0,   isCollectible: true },

  // ── Polymorphia Forms (cosmetics) ──
  { name: "Forma Yuumi",        emoji: "🐱", category: "form",     rarity: "common",   price: 50,  isCollectible: false },
  { name: "Forma Teemo",        emoji: "🐭", category: "form",     rarity: "uncommon", price: 100, isCollectible: false },
  { name: "Forma Poro",         emoji: "❄️", category: "form",     rarity: "rare",     price: 200, isCollectible: false },
  { name: "Forma Gato Lunar",   emoji: "🌙", category: "form",     rarity: "epic",     price: 500, isCollectible: false },

  // ── Consumables ──
  { name: "Red de Mariposas",   emoji: "🪤", category: "consumable", rarity: "common", price: 10,  isCollectible: false },
  { name: "Poción de Polimorfia",emoji: "🧪", category: "consumable", rarity: "uncommon",price: 30, isCollectible: false },
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