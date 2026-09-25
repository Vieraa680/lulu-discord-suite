# Sistema de Niveles y Experiencia (XP) — Especificación Arquitectónica

## 1. Resumen Ejecutivo

Este documento define la arquitectura técnica y el plan de implementación para el **Sistema de Niveles y Experiencia (XP)** de **lulu-discord-suite**.

El sistema recompensa a los miembros de la comunidad por su interacción activa tanto en **canales de texto (chat)** como en **canales de voz**, escalando progresivamente su nivel mediante una curva matemática exponencial, otorgando multiplicadores basados en roles de Discord, bloqueando canales no deseados y ofreciendo visualización de progreso y ranking tanto en Discord (`/rank`, `/top`) como en el panel web administrativo (**CRM Dashboard**).

---

## 2. Modelo Matemático y Curva de Nivel

### 2.1 Fórmula de Progresión Exponencial
Para cumplir con el requisito de que **al principio se suba rápido y después cueste más**, se utiliza la fórmula estándar de progresión cuadrática/exponencial:

$$\text{XP necesaria para pasar del Nivel } L \text{ al } L+1 = 5 \cdot L^2 + 50 \cdot L + 100$$

$$\text{XP Total Acumulada para Nivel } L = \sum_{i=0}^{L-1} (5 \cdot i^2 + 50 \cdot i + 100)$$

### 2.2 Tabla de Referencia de Progresión

| Nivel | XP para este nivel | XP Total Acumulada | Mensajes Estimados (~20 XP/msg) |
|---|---|---|---|
| **1** | 100 XP | 100 XP | ~5 mensajes |
| **2** | 155 XP | 255 XP | ~13 mensajes |
| **3** | 220 XP | 475 XP | ~24 mensajes |
| **5** | 375 XP | 1,075 XP | ~54 mensajes |
| **10** | 1,100 XP | 4,550 XP | ~228 mensajes |
| **20** | 3,100 XP | 24,700 XP | ~1,235 mensajes |
| **30** | 6,100 XP | 70,850 XP | ~3,540 mensajes |
| **50** | 15,100 XP | 262,750 XP | ~13,100 mensajes |

---

## 3. Esquema de Base de Datos (`packages/database`)

### 3.1 Modificaciones en `User`
```prisma
model User {
  // ... campos existentes (candies, polymorphia, etc.)

  // ── Sistema de Niveles y XP ──
  xp                  Int       @default(0)    // Puntos totales acumulados de XP
  level               Int       @default(0)    // Nivel actual calculado
  lastMessageXpAt     DateTime?                // Cooldown anti-spam de chat
  lastVoiceXpAt       DateTime?                // Última vez que recibió XP en voz
  voiceMinutesTotal   Int       @default(0)    // Tiempo total acumulado en voz (minutos)

  // Índices para optimizar /rank y /leaderboard
  @@index([guildId, xp(sort: Desc)])
}
```

### 3.2 Modificaciones en `GuildConfig`
```prisma
model GuildConfig {
  // ... campos existentes

  // ── Configuración de XP de Texto ──
  xpEnabled                 Boolean  @default(true)
  xpPerMessageMin           Int      @default(15)     // Rango mínimo de XP por mensaje
  xpPerMessageMax           Int      @default(25)     // Rango máximo de XP por mensaje
  xpCooldownSec             Int      @default(60)     // Cooldown anti-spam en segundos
  xpExcludedChannels        String[] @default([])     // Canales bloqueados (sin XP)
  xpLevelUpChannelId        String?                   // null = mismo canal, "dm" = privado, "none" = silenciado, ID = canal específico

  // ── Configuración de XP de Voz ──
  voiceXpEnabled            Boolean  @default(true)
  voiceXpPerMinute          Int      @default(10)     // XP ganada por cada minuto en canal de voz
  voiceXpMinMembers         Int      @default(2)      // Anti-AFK: mínimo de personas en la sala (default 2)
  voiceXpRequiresUnmuted    Boolean  @default(false)  // Opcional: requiere micrófono activo además de no ensordecido

  // ── Multiplicadores por Roles ──
  // Almacena JSON: [ { roleId: string, roleName: string, multiplier: number } ]
  xpRoleMultipliers         Json?    @default("[]")
}
```

---

## 4. Arquitectura del Bot (`apps/minigames-bot`)

```
apps/minigames-bot/
├── index.js                                # + GatewayIntentBits.GuildVoiceStates
├── commands/
│   └── leveling/
│       ├── rank.js                         # Comando /rank (perfil de nivel y progreso)
│       └── leaderboard.js                  # Comando /top (ranking de XP del servidor)
├── events/
│   └── client/
│       └── messageCreate.js                # Integración con textXpService
└── src/
    └── services/
        └── leveling/
            ├── xpCalculator.js             # Matemáticas puras (fórmula, niveles, barra de progreso)
            ├── textXpService.js            # Lógica de mensaje, anti-spam, roles y level up
            └── voiceXpService.js           # Ticker periódico de voz (detecta no ensordecidos y anti-AFK)
```

### 4.1 Lógica de Chat (`textXpService.js`)
1. **Filtro básico**: Ignora bots, DMs y canales presentes en `guildConfig.xpExcludedChannels`.
2. **Cooldown Anti-Spam**: Comprueba `now - user.lastMessageXpAt < guildConfig.xpCooldownSec * 1000`.
3. **Multiplicador de Rol**:
   - Itera los roles del miembro en Discord (`member.roles.cache`).
   - Compara con `guildConfig.xpRoleMultipliers`.
   - Selecciona el multiplicador más alto (ej. si tiene un rol de 1.5x y otro de 2.0x, aplica 2.0x).
4. **Cálculo de XP**:
   $$\text{XP Ganada} = \text{random}(min, max) \times \text{multiplicador}$$
5. **Detección de Level UP**:
   - Comprueba si `newLevel > oldLevel`.
   - Si subió de nivel, actualiza `user.level = newLevel` y envía anuncio estilizado según `xpLevelUpChannelId`.
   - Mensaje fresco y comunitario (sin AI slop):
     > 🎉 **¡Level UP!** ¡<@usuario> acaba de subir al **Nivel 5**! 🪄  
     > *seguí charlando para desbloquear más cositas 👀*

### 4.2 Lógica de Voz (`voiceXpService.js`)
1. **Intents requeridos**: `GatewayIntentBits.GuildVoiceStates` en `index.js`.
2. **Cron/Ticker en memoria**:
   - Ejecuta cada 60 segundos (`setInterval`).
   - Itera los canales de voz de los servidores activos.
3. **Reglas de Elegibilidad de Voz**:
   - **No ensordecido**: `!member.voice.deaf && !member.voice.selfDeaf` (Requisito estricto del usuario).
   - **Anti-AFK**: El canal de voz debe tener al menos `voiceXpMinMembers` (por defecto 2 miembros no-bots) para evitar farmeo en salas vacías.
   - **Canales permitidos**: No estar en un canal excluido.
4. Otorga los puntos correspondientes con sus respectivos multiplicadores de rol.

---

## 5. Comandos de Usuario en Discord

### 5.1 `/rank [usuario]`
Muestra un embed o tarjeta interactiva con:
* **Avatar y Nombre** del usuario.
* **Nivel Actual** (ej. `Nivel 14`).
* **Posición en el Servidor** (ej. `#3 en el Servidor`).
* **Barra de Progreso visual**: `[████████░░] 78%`.
* **XP del Nivel**: `450 / 600 XP` (Total acumulado: `9,450 XP`).
* **Estadísticas de Actividad**: Mensajes enviados y horas en canales de voz.

### 5.2 `/top [página]`
Muestra el Top 10 global de niveles en el servidor:
* Medallas de podio (🥇, 🥈, 🥉).
* Paginación interactiva con botones (Página 1, 2, etc.).
* Mención de usuario, nivel actual y XP total.

---

## 6. Panel de Control en CRM Dashboard (`apps/crm-dashboard`)

Se creará una nueva vista dedicada en el sidebar: **`/dashboard/levels` (Niveles y Experiencia)**.

### 6.1 Módulos del CRM

1. **Configuración de Chat (Texto)**:
   * Switch de encendido/apagado general de XP.
   * Stepper Inputs para **XP Mínima y Máxima por mensaje** (ej. 15-25 XP).
   * Stepper Input para **Cooldown Anti-Spam** (ej. 60 segundos).
   * Selector multi-canal con buscador para **Canales Bloqueados (Excluidos)**.
   * Selector del **Canal para Anuncios de Nivel** (mismo canal, canal específico de anuncios, o desactivado).

2. **Configuración de Canales de Voz**:
   * Switch de encendido/apagado de XP por voz.
   * Stepper Input para **XP por Minuto en voz**.
   * Switch de verificación: **Solo si no está ensordecido** (activo y protegido).
   * Stepper Input para **Mínimo de personas en sala de voz** (Anti-AFK en solitario).

3. **Multiplicadores de Roles (Role Multipliers)**:
   * Componente con `RoleSelect` para seleccionar un rol de Discord existente.
   * Input numérico de multiplicador (ej. `1.5x`, `2.0x`).
   * Lista visual con el color del rol de Discord y botón para eliminar o editar.

4. **Ampliación de la Clasificación (`/dashboard/leaderboard`)**:
   * Nueva categoría añadida: **Nivel y XP**.
   * Muestra la tabla completa de jugadores ordenada por XP con su avatar, nivel, porcentaje y mensajes.

---

## 7. Fases de Implementación Sugeridas

1. **Fase 1: Capa de Datos (`packages/database`)**
   - Actualizar `schema.prisma` con los nuevos campos en `User` y `GuildConfig`.
   - Ejecutar `npm run db:generate`, `npm run build` y `npm run db:push`.

2. **Fase 2: Motor Matemático y Pruebas Unitarias**
   - Crear `apps/minigames-bot/src/services/leveling/xpCalculator.js`.
   - Implementar suite de tests en `vitest` para garantizar la precisión de la curva.

3. **Fase 3: Servicios de XP en el Bot**
   - Habilitar `GuildVoiceStates` en `index.js`.
   - Implementar `textXpService.js` en `events/client/messageCreate.js`.
   - Implementar `voiceXpService.js` (ticker de 60s con validación de no-ensordecido).

4. **Fase 4: Comandos Slash de Discord**
   - Crear `/rank` y `/top` con barras de progreso y diseño limpio.

5. **Fase 5: Interfaz del CRM Dashboard**
   - Crear página `/dashboard/levels` con Server Actions e invalidación de caché.
   - Añadir categoría de XP en `/dashboard/leaderboard`.
