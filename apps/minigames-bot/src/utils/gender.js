const FEMALE_ROLE_NAMES = (process.env.FEMALE_ROLE_NAMES || 'Mujer')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

const MALE_ROLE_NAMES = (process.env.MALE_ROLE_NAMES || 'Hombre')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

const FEMININE_NAME_ENDINGS = [
    'a', 'ia', 'ina', 'ela', 'ita', 'isa', 'lla', 'nda', 'rla', 'cia',
    'nza', 'ica', 'ena', 'ara', 'ira', 'ora', 'ura', 'ina', 'ela'
]

const KNOWN_FEMININE = new Set([
    'abril', 'amber', 'angel', 'araceli', 'beatriz', 'belen', 'carmen',
    'dafne', 'dolores', 'eden', 'elena', 'esther', 'evelyn', 'fern',
    'guadalupe', 'ines', 'iris', 'isabel', 'jazmin', 'jennifer',
    'karen', 'lilian', 'lourdes', 'lucy', 'luz', 'mabel', 'margaret',
    'maria', 'maribel', 'marisol', 'mayte', 'mercedes', 'mildred',
    'miriam', 'montserrat', 'nancy', 'naomi', 'natalie', 'nayeli',
    'nicol', 'noemi', 'patricia', 'pilar', 'rachel', 'raquel',
    'rosa', 'rosario', 'ruth', 'salome', 'sol', 'susana',
    'valentine', 'vanessa', 'veronica', 'virginia', 'vivian',
    'ximena', 'yadira', 'yaretzi', 'yasmin', 'yenifer', 'yolanda',
    'zoe', 'zulema', 'abigail', 'adriana', 'alejandra', 'alicia',
    'ana', 'andrea', 'angela', 'angelica', 'anita', 'antonia',
    'barbara', 'camila', 'carolina', 'catalina', 'cecilia', 'clara',
    'claudia', 'consuelo', 'cristina', 'daniela', 'diana', 'dulce',
    'elisa', 'elizabeth', 'emilia', 'erica', 'esperanza', 'estela',
    'eugenia', 'eva', 'fatima', 'fernanda', 'francisca', 'gabriela',
    'gloria', 'graciela', 'guillermina', 'helena', 'iliana', 'irene',
    'isabella', 'juana', 'julia', 'juliana', 'laura', 'leticia', 'lidia',
    'liliana', 'lorena', 'lucia', 'magdalena', 'manuela', 'marcela',
    'mariana', 'marina', 'marta', 'melissa', 'monica', 'natalia',
    'norma', 'olga', 'pamela', 'paola', 'paulina', 'rebeca', 'regina',
    'renata', 'rocio', 'rosalinda', 'samantha', 'sandra', 'sara',
    'silvia', 'sofia', 'sonia', 'tatiana', 'teresa', 'valentina',
    'valeria', 'victoria', 'violeta', 'wendy', 'xochitl', 'yaneth',
    'luzma', 'cindy', 'katherine'
])

/**
 * Detect grammatical gender from a GuildMember.
 * Priority: Discord roles → name heuristics → default 'm'.
 *
 * @param {import('discord.js').GuildMember} member - The Discord guild member
 * @returns {'f' | 'm'}
 */
function detectGender(member) {
    if (!member || !member.roles) return 'm'

    for (const role of member.roles.cache.values()) {
        const name = role.name.toLowerCase().trim()
        if (FEMALE_ROLE_NAMES.includes(name)) return 'f'
        if (MALE_ROLE_NAMES.includes(name)) return 'm'
    }

    const displayName = (member.nickname || member.user?.displayName || member.user?.username || '').toLowerCase().trim()
    if (!displayName) return 'm'

    if (KNOWN_FEMININE.has(displayName)) return 'f'

    for (const ending of FEMININE_NAME_ENDINGS) {
        if (displayName.endsWith(ending) && displayName.length > ending.length + 1) {
            return 'f'
        }
    }

    return 'm'
}

/**
 * Return the correct gendered word/article based on detected gender.
 * @param {'f' | 'm'} gender
 * @param {{m: string, f: string}} forms
 * @returns {string}
 */
function g(gender, forms) {
    return forms[gender] || forms['m']
}

/**
 * Build an informal greeting for a user using @mention and gendered terms.
 * @param {import('discord.js').GuildMember} member
 * @returns {{greeting: string, gender: 'f' | 'm'}}
 */
function buildGreeting(member) {
    const gender = detectGender(member)
    const tag = member.toString()
    const greeting = g(gender, {
        m: `eyy ${tag} bro`,
        f: `eyy ${tag} amiga`
    })
    return { greeting, gender }
}

module.exports = {
    detectGender,
    g,
    buildGreeting,
    FEMALE_ROLE_NAMES,
    MALE_ROLE_NAMES
}