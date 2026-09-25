function getXpForLevel(level) {
  const l = Math.max(0, Math.floor(level || 0))
  return 5 * (l ** 2) + 50 * l + 100
}

function getTotalXpForLevel(level) {
  const l = Math.max(0, Math.floor(level || 0))
  if (l === 0) return 0

  const n = l
  const sum1 = n
  const sumI = ((n - 1) * n) / 2
  const sumI2 = ((n - 1) * n * (2 * n - 1)) / 6

  return Math.round(5 * sumI2 + 50 * sumI + 100 * sum1)
}

function getLevelFromTotalXp(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp || 0))
  if (xp === 0) return 0

  let level = 0
  while (getTotalXpForLevel(level + 1) <= xp) {
    level++
  }
  return level
}

function generateProgressBar(current, max, length = 10) {
  if (max <= 0) return `[${'█'.repeat(length)}]`
  const ratio = Math.min(1, Math.max(0, current / max))
  const filled = Math.round(ratio * length)
  const empty = length - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
}

function getLevelProgress(totalXp) {
  const safeXp = Math.max(0, Math.floor(totalXp || 0))
  const level = getLevelFromTotalXp(safeXp)
  const currentLevelTotalXp = getTotalXpForLevel(level)
  const nextLevelTotalXp = getTotalXpForLevel(level + 1)

  const xpInCurrentLevel = safeXp - currentLevelTotalXp
  const xpRequiredForNext = nextLevelTotalXp - currentLevelTotalXp
  const remainingXp = Math.max(0, xpRequiredForNext - xpInCurrentLevel)
  const progressRatio = xpRequiredForNext > 0 ? xpInCurrentLevel / xpRequiredForNext : 1
  const progressPercent = Math.min(100, Math.max(0, Math.floor(progressRatio * 100)))

  return {
    level,
    totalXp: safeXp,
    currentLevelXp: xpInCurrentLevel,
    neededLevelXp: xpRequiredForNext,
    remainingXp,
    progressPercent,
    progressBar: generateProgressBar(xpInCurrentLevel, xpRequiredForNext, 10),
  }
}

function calculateRoleMultiplier(memberRoles, roleMultipliers) {
  if (!roleMultipliers || !Array.isArray(roleMultipliers) || roleMultipliers.length === 0) {
    return 1.0
  }

  let roleIdSet
  if (memberRoles instanceof Set) {
    roleIdSet = memberRoles
  } else if (Array.isArray(memberRoles)) {
    roleIdSet = new Set(memberRoles)
  } else if (memberRoles?.cache && typeof memberRoles.cache.has === 'function') {
    roleIdSet = memberRoles.cache
  } else if (typeof memberRoles?.has === 'function') {
    roleIdSet = memberRoles
  } else {
    return 1.0
  }

  let maxMultiplier = 1.0
  for (const item of roleMultipliers) {
    if (item?.roleId && roleIdSet.has(item.roleId)) {
      const mult = Number(item.multiplier) || 1.0
      if (mult > maxMultiplier) {
        maxMultiplier = mult
      }
    }
  }

  return maxMultiplier
}

function generateRandomXp(min = 15, max = 25, multiplier = 1.0) {
  const safeMin = Math.max(1, Math.min(min, max))
  const safeMax = Math.max(safeMin, max)
  const base = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
  const safeMult = Math.max(0, Number(multiplier) || 1.0)
  return Math.round(base * safeMult)
}

module.exports = {
  getXpForLevel,
  getTotalXpForLevel,
  getLevelFromTotalXp,
  generateProgressBar,
  getLevelProgress,
  calculateRoleMultiplier,
  generateRandomXp,
}
