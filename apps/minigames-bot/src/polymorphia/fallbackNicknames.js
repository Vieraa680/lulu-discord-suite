const FALLBACK_NICKNAMES = [
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
    'El Hielo de Lissandra'
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