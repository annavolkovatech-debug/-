const { Telegraf, Scenes } = require('telegraf');
const { texts, buttons } = require('./texts');
const db = require('../supabase/services');
const bookingScene = require('./scenes/booking');
const supabaseSession = require('./supabaseSession');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN || '9194916047:AAFQJzJKOf-IttwlXRzArp3MB1iOqrXbogw');

const stage = new Scenes.Stage([bookingScene]);

// Используем кастомную сессию на базе Supabase вместо локальной памяти!
bot.use(supabaseSession());

// Admin Await Ban Middleware
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.session?.awaitingBan) {
    const isAdmin = await db.isAdmin(ctx.from.id);
    if (isAdmin) {
      const phone = ctx.message.text.replace(/\D/g, '');
      if (phone && phone.length >= 10) {
        await db.banPhone(phone);
        await ctx.reply(`✅ Номер ${phone} успешно заблокирован.`);
      } else {
        await ctx.reply('❌ Некорректный номер. Блокировка отменена.');
      }
      ctx.session.awaitingBan = false;
      return; // Завершаем обработку, не пускаем дальше
    }
  }
  return next();
});

bot.use(stage.middleware());

// Logging Middleware
bot.use(async (ctx, next) => {
  const telegramId = ctx.from?.id;
  const updateType = ctx.updateType;
  console.log(`[${new Date().toISOString()}] Update type: ${updateType} from user: ${telegramId}`);
  
  if (telegramId) {
    let actionDetail = updateType;
    if (ctx.message && ctx.message.text) actionDetail = `Message: ${ctx.message.text}`;
    if (ctx.callbackQuery) actionDetail = `Callback: ${ctx.callbackQuery.data}`;
    await db.logEvent(telegramId, updateType, { details: actionDetail }).catch(() => {});
  }
  
  await next();
});

// /start command
bot.start(async (ctx) => {
  const user = ctx.from;
  try {
    await db.createUser({
      telegram_id: user.id,
      first_name: user.first_name,
      username: user.username
    });
  } catch (err) {
    console.error('Error saving user on start:', err);
  }

  await ctx.reply(texts.welcome, {
    reply_markup: {
      keyboard: buttons.replyKeyboard,
      resize_keyboard: true
    }
  });
});

// Команда для получения ID чата (полезно для настройки уведомлений в группу)
bot.command('chatid', (ctx) => {
  ctx.reply(`ID этого чата: ${ctx.chat.id}`);
});

// Reply Keyboard Handlers
bot.hears('🚘 Автомойка', async (ctx) => {
  // Выходим из предыдущих сцен, если они были
  await ctx.scene.leave();
  await ctx.reply(texts.chooseWashService, {
    reply_markup: { inline_keyboard: buttons.washServices }
  });
});

bot.hears('💎 Детейлинг и Ремонт', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply(texts.chooseDetailingService, {
    reply_markup: { inline_keyboard: buttons.detailingServices }
  });
});

bot.hears('💵 Выкуп авто', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply(texts.buyoutInfo, {
    reply_markup: { inline_keyboard: buttons.masterContact }
  });
});

bot.hears('🗓 Мои записи', async (ctx) => {
  ctx.scene.leave();
  try {
    const bookings = await db.getUserBookings(ctx.from.id);
    if (!bookings || bookings.length === 0) {
      return ctx.reply(texts.myBookingsEmpty);
    }
    
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');
    if (activeBookings.length === 0) {
      return ctx.reply('У вас нет активных записей.');
    }
    
    await ctx.reply('Ваши активные записи:');
    for (const b of activeBookings) {
      const text = `Услуга: ${b.service_name}\nДата: ${b.booking_date}\nВремя: ${b.booking_time}\nСтатус: Подтверждена`;
      await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Отменить', callback_data: `cancel_${b.id}` }],
            [{ text: '🔄 Перезаписаться', callback_data: `reschedule_${b.id}` }]
          ]
        }
      });
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
    ctx.reply('Произошла ошибка при загрузке записей.');
  }
});

// Обработка отмены записи
bot.action(/^cancel_(.+)$/, async (ctx) => {
  const id = ctx.match[1];
  try {
    await db.cancelBooking(id);
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ <b>ЗАПИСЬ ОТМЕНЕНА</b>', { parse_mode: 'HTML' });
    await ctx.answerCbQuery('Запись успешно отменена');
    
    // Уведомление админов
    const adminChatId = process.env.ADMIN_CHAT_ID;
    if (adminChatId) {
      const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
      await ctx.telegram.sendMessage(adminChatId, `❌ <b>Отмена записи!</b>\n\nКлиент: ${username}\n${ctx.callbackQuery.message.text}`, { parse_mode: 'HTML' });
    }
  } catch (err) {
    console.error('Error cancelling booking:', err);
    await ctx.answerCbQuery('Ошибка при отмене записи');
  }
});

// Обработка перезаписи
bot.action(/^reschedule_(.+)$/, async (ctx) => {
  const id = ctx.match[1];
  try {
    await db.cancelBooking(id);
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n🔄 <b>ПЕРЕЗАПИСЬ (старая отменена)</b>', { parse_mode: 'HTML' });
    await ctx.answerCbQuery('Старая запись отменена. Давайте выберем новое время.');
    
    // Предлагаем выбрать новую услугу для записи
    await ctx.reply('Выберите услугу для новой записи:', {
      reply_markup: { inline_keyboard: buttons.washServices }
    });
  } catch (err) {
    console.error('Error rescheduling booking:', err);
    await ctx.answerCbQuery('Ошибка при перезаписи');
  }
});

bot.hears('📞 Контакты', async (ctx) => {
  ctx.scene.leave();
  ctx.reply(texts.contactAdmin, { parse_mode: 'HTML' });
});

// Service selection triggers the booking wizard
bot.action(/service_.+/, async (ctx) => {
  await ctx.scene.enter('bookingWizard');
  // Pass the callback data to the scene
  ctx.scene.state.actionData = ctx.callbackQuery.data;
});

bot.action('request_call', async (ctx) => {
  await ctx.editMessageText('Пожалуйста, напишите ваш номер телефона в ответном сообщении, и наш мастер свяжется с вами в ближайшее время.', {
    reply_markup: { inline_keyboard: buttons.backToMain }
  });
});

bot.action('back_to_main', async (ctx) => {
  await ctx.scene.leave().catch(() => {});
  await ctx.editMessageText(texts.mainMenu, {
    reply_markup: { inline_keyboard: buttons.mainMenu }
  }).catch(async () => {
    await ctx.reply(texts.mainMenu, {
      reply_markup: { inline_keyboard: buttons.mainMenu }
    });
  });
});

// Admin Commands
bot.hears('#заявки', async (ctx) => {
  const isAdmin = await db.isAdmin(ctx.from.id);
  if (!isAdmin) return;
  try {
    const count = await db.getTodayBookingsCount();
    await ctx.reply(`📊 Заявок за сегодня: ${count}`);
  } catch (err) {
    await ctx.reply('❌ Ошибка при получении заявок.');
  }
});

bot.hears('#бан', async (ctx) => {
  const isAdmin = await db.isAdmin(ctx.from.id);
  if (!isAdmin) return;
  
  ctx.session.awaitingBan = true;
  await ctx.reply('Впишите номер телефона для бана (например, 79991234567):');
});

module.exports = bot;
