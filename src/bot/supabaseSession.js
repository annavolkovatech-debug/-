const db = require('../supabase/services');

function supabaseSession() {
  return async (ctx, next) => {
    // Generate a unique session key based on user and chat ID
    const key = ctx.from && ctx.chat ? `${ctx.from.id}:${ctx.chat.id}` : null;
    if (!key) return next();

    // 1. Load session from Supabase
    try {
      const sessionData = await db.getSession(key);
      ctx.session = sessionData || {};
      
      // Инициализация объекта scenes, если он пустой (важно для telegraf-scenes)
      if (!ctx.session.__scenes) {
        ctx.session.__scenes = {};
      }
    } catch (err) {
      console.error('Error loading session from Supabase:', err);
      ctx.session = { __scenes: {} };
    }

    // 2. Process the update (wait for the scene/bot logic to finish)
    await next();

    // 3. Save session back to Supabase
    try {
      if (ctx.session) {
        // Очищаем пустые сцены, чтобы не раздувать базу
        if (Object.keys(ctx.session).length === 1 && ctx.session.__scenes && Object.keys(ctx.session.__scenes).length === 0) {
          await db.saveSession(key, {});
        } else {
          await db.saveSession(key, ctx.session);
        }
      }
    } catch (err) {
      console.error('Error saving session to Supabase:', err);
    }
  };
}

module.exports = supabaseSession;