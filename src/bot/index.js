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

// Reply Keyboard Handlers
bot.hears('💧 Автомойка', (ctx) => {
  // Выходим из предыдущих сцен, если они были
  ctx.scene.leave();
  ctx.reply(texts.chooseWashService, {
    reply_markup: { inline_keyboard: buttons.washServices }
  });
});

bot.hears('✨ Детейлинг и Ремонт', (ctx) => {
  ctx.scene.leave();
  ctx.reply(texts.chooseDetailingService, {
    reply_markup: { inline_keyboard: buttons.detailingServices }
  });
});

bot.hears('🤝 Выкуп авто', (ctx) => {
  ctx.scene.leave();
  ctx.reply(texts.buyoutInfo, {
    reply_markup: { inline_keyboard: buttons.masterContact }
  });
});

bot.hears('📋 Мои записи', async (ctx) => {
  ctx.scene.leave();
  try {
    const bookings = await db.getUserBookings(ctx.from.id);
    if (!bookings || bookings.length === 0) {
      return ctx.reply(texts.myBookingsEmpty);
    }
    
    let replyText = 'Ваши активные записи:\n\n';
    bookings.forEach((b, i) => {
      replyText += `${i + 1}. Услуга: ${b.service_name}\nДата: ${b.booking_date}\nВремя: ${b.booking_time}\nСтатус: ${b.status}\n\n`;
    });
    
    ctx.reply(replyText);
  } catch (err) {
    console.error(err);
    ctx.reply(texts.bookingError);
  }
});

bot.hears('📞 Контакты', (ctx) => {
  ctx.scene.leave();
  ctx.reply(texts.contactAdmin);
});

// Service selection triggers the booking wizard
bot.action(/service_.+/, (ctx) => {
  ctx.scene.enter('bookingWizard');
  // Pass the callback data to the scene
  ctx.scene.state.actionData = ctx.callbackQuery.data;
});

bot.action('request_call', (ctx) => {
  // В идеале тут запрашиваем контакт (reply_markup: { keyboard: [[{ text: 'Отправить номер', request_contact: true }]] })
  // Но для простоты inline-бота просим написать в чат
  ctx.editMessageText('Пожалуйста, напишите ваш номер телефона в ответном сообщении, и наш мастер свяжется с вами в ближайшее время.', {
    reply_markup: { inline_keyboard: buttons.backToMain }
  });
});

bot.action('back_to_main', (ctx) => {
  ctx.scene.leave().catch(() => {});
  ctx.editMessageText(texts.mainMenu, {
    reply_markup: { inline_keyboard: buttons.mainMenu }
  }).catch(() => {
    ctx.reply(texts.mainMenu, {
      reply_markup: { inline_keyboard: buttons.mainMenu }
    });
  });
});

module.exports = bot;
