const UNICODE_LOOKALIKES: Record<string, string> = {
  // Small capitals
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ʜ': 'h',
  'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p',
  'ǫ': 'q', 'ʀ': 'r', 'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ʏ': 'y', 'ᴢ': 'z',

  // Superscripts
  'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h',
  'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ⁿ': 'n', 'ᵒ': 'o', 'ᵖ': 'p',
  'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z',

  // Subscripts
  'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm',
  'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u', 'ᵥ': 'v', 'ₓ': 'x',
}

export function normalizeDiscordText(input: string | null | undefined): string {
  if (!input) return ''

  let str = input
    .replace(/[\u{1F150}-\u{1F169}]/gu, ch => String.fromCharCode(ch.codePointAt(0)! - 0x1F150 + 65))
    .replace(/[\u{1F170}-\u{1F189}]/gu, ch => String.fromCharCode(ch.codePointAt(0)! - 0x1F170 + 65))
    .replace(/[\u{1F130}-\u{1F149}]/gu, ch => String.fromCharCode(ch.codePointAt(0)! - 0x1F130 + 65))
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, ch => String.fromCharCode(ch.codePointAt(0)! - 0x1F1E6 + 65))

  str = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')

  let out = ''
  for (const char of str) {
    out += UNICODE_LOOKALIKES[char] || char
  }

  return out.toLowerCase()
}

const SEPARATOR_REGEX = /[-_・|︱┃╎┊\s~·•«»「」【】『』〔〕]+/g

export function matchesDiscordChannel(channelName: string, query: string): boolean {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return true

  if (channelName.toLowerCase().includes(trimmedQuery.toLowerCase())) {
    return true
  }

  const normQuery = normalizeDiscordText(trimmedQuery)
  if (!normQuery) return true

  const normChannel = normalizeDiscordText(channelName)

  if (normChannel.includes(normQuery)) {
    return true
  }
  const strippedChannel = normChannel.replace(SEPARATOR_REGEX, ' ').trim()
  const strippedQuery = normQuery.replace(SEPARATOR_REGEX, ' ').trim()

  if (strippedChannel.includes(strippedQuery)) {
    return true
  }

  const queryTokens = strippedQuery.split(' ').filter(Boolean)
  if (queryTokens.length > 1) {
    return queryTokens.every(token => strippedChannel.includes(token))
  }

  return false
}
