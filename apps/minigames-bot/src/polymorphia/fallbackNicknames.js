const FALLBACK_NICKNAMES = [
    // ── Estilo 1: Temáticos de LoL (clásico) ──
    'Yuumi la Encantadora',
    'El Puño de Sett',
    'Poro Rey',
    'La Estrella de Zoe',
    'Ahri la Seductora',
    'El Martillo de Poppy',
    'Jinx la Desenfrenada',
    'El Corazón de Lux',
    'Ekko el Rompetiempos',
    'La Furía de Darius',
    'Garen de Demacia',
    'La Sombra de Zed',
    'El Ojo de Ashe',
    'Miss Fortune la Cazadora',
    'El Dragón de Shyvana',
    'Nami la Iniciadora',
    'El Poder de Vi',
    'Kai\'Sa la Hija del Vacío',
    'El Trueno de Volibear',
    'Lulu la Hechicera',
    'La Danza de Katarina',
    'El Escudo de Braum',
    'Morgana la Caída',
    'La Sonrisa de Shaco',
    'El Hielo de Lissandra',

    // ── Estilo 2: Memes de internet ──
    '1 like y me bloquean',
    'Chismes al DM',
    'Reporto a todos',
    'Farmeo en la jungla',
    'Meto pausa',
    'GG al chat',
    'Invadeo y me voy',
    'Hago inting Sion',
    'Cosmito se la come',
    'Flash al muro',
    'Mi abuela juega mejor',
    'Darius ignicion+fantasmal',
    'Lux con skin de gato',
    'Yasuo 0-20',

    // ── Estilo 3: Mashups graciosos ──
    'Malphite Whatsapp',
    'Bot Lulu',
    'Bot Ashe',
    'Malphite Soporte',
    'Zed Delivery',
    'Yuumi Uber',
    'Ahri Netflix',
    'Sett Glovo',
    'Katarina Rappi'
]

/**
 * Get a random fallback nickname from the pool.
 * Optionally prepends the username for variety.
 * @param {string} username - Discord display name (ignored, pool is fixed)
 * @returns {string} A random nickname
 */
function getRandomFallbackNickname(username) {
    const index = Math.floor(Math.random() * FALLBACK_NICKNAMES.length)
    return FALLBACK_NICKNAMES[index]
}

module.exports = {
    getRandomFallbackNickname,
    FALLBACK_NICKNAMES
}
