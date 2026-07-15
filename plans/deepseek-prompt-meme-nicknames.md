# DeepSeek Prompt — Add Meme-Style Nicknames

## Files to Modify

### 1. `apps/minigames-bot/src/services/deepseek.js`
- **What:** Expand the `systemPrompt` (line 11-23) to include 3 styles of nicknames
- **New content to add:**
  - Style 1: Classic LoL-themed (existing — keep as-is)
  - Style 2: Internet memes ("1 like y me bloquean", "Chismes al DM", "Reporto a todos", etc.)
  - Style 3: Champion + app/service/role mashups ("Malphite Whatsapp", "Bot Lulu", "Bot Ashe", "Zed Delivery", etc.)
- **All existing rules preserved:** 32 char limit, Spanish only, no Teemo, no quotes, single output, varied champions

### 2. `apps/minigames-bot/src/polymorphia/fallbackNicknames.js`
- **What:** Add ~12 new fallback nicknames of meme and mashup styles
- **New entries:** "1 like y me bloquean", "Chismes al DM", "Reporto a todos", "Malphite Whatsapp", "Bot Lulu", "Bot Ashe", "Malphite Soporte", "Zed Delivery", "Yuumi Uber", "Ahri Netflix", "Sett Glovo", "Farmeo en la jungla"

## What Stays Unchanged
- All existing LoL-themed entries in fallback nicknames
- DeepSeek API call logic (payload, max_tokens, temperature, error handling)
- All other project files
