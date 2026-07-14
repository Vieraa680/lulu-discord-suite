const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

async function generatePolymorphiaNickname(username) {
    const apiKey = process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is not set in environment variables.')
    }

    const systemPrompt =
        'Eres un generador de apodos creativos de League of Legends para un minijuego de Discord llamado Polymorphia. ' +
        'Tu UNICA tarea es generar un solo apodo divertido y creativo basado en un nombre de usuario de Discord. ' +
        'Los apodos pueden ser de TRES estilos diferentes, mezclados aleatoriamente:\n' +
        '\n' +
        'Estilo 1 - TEMATICOS DE LOL (clasico): Relacionados con campeones, objetos, habilidades o historias de League of Legends. ' +
        'Ejemplos: "Yuumi la Encantadora", "El Puño de Sett", "Poro Rey", "La Estrella de Zoe".\n' +
        '\n' +
        'Estilo 2 - MEMES DE INTERNET: Frases graciosas virales, tipicas de Discord/LoL en español. ' +
        'Ejemplos: "1 like y me bloquean", "Chismes al DM", "Reporto a todos", "Farmeo en la jungla de la vida", "Meto pausa", "GG al chat", "Invadeo y me voy", "Cosmito se la come".\n' +
        '\n' +
        'Estilo 3 - MASHUPS GRACIOSOS: Combina campeones de LoL con apps, servicios, roles o cosas cotidianas. ' +
        'Ejemplos: "Malphite Whatsapp", "Bot Lulu", "Bot Ashe", "Malphite Soporte", "Zed Delivery", "Yuumi Uber", "Ahri Netflix", "Sett Glovo", "Katarina Rappi".\n' +
        '\n' +
        'Reglas:\n' +
        '- Devuelve SOLO el apodo, nada mas -- sin comillas, sin explicaciones, sin formato.\n' +
        '- El apodo DEBE tener 32 caracteres o menos (limite de apodos de Discord).\n' +
        '- Hazlo divertido, tematico y unico cada vez.\n' +
        '- Escribelo SIEMPRE EN ESPANOL.\n' +
        '- NUNCA uses a Teemo. Jamas. Teemo esta prohibido.\n' +
        '- Varía entre muchos campeones diferentes: Yuumi, Poro, Lux, Garen, Ahri, Sett, Jinx, Ekko, Zoe, Lulu, etc.\n' +
        '- NUNCA repitas el mismo apodo ni el mismo campeon para diferentes usuarios.'

    const userPrompt = `Genera un apodo de polymorphia tematico de League of Legends para el usuario de Discord "${username}".`

    const payload = {
        model: DEEPSEEK_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_tokens: 60,
        temperature: 0.9,
        top_p: 0.9
    }

    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(
            `DeepSeek API error: ${response.status} ${response.statusText}${errorBody ? ` -- ${errorBody}` : ''}`
        )
    }

    const data = await response.json()

    const rawNickname = data?.choices?.[0]?.message?.content?.trim() ?? ''

    if (!rawNickname) {
        throw new Error('DeepSeek returned an empty response.')
    }

    const cleaned = rawNickname.replace(/^["']|["']$/g, '').trim()

    return cleaned.slice(0, 32)
}

module.exports = { generatePolymorphiaNickname }
