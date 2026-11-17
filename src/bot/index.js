const { Telegraf, session, Scenes } = require('telegraf');
const { texts, buttons } = require('./texts');
const db = require('../supabase/services');
const bookingScene = require('./scenes/booking');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN || '9194916047:AAFQJzJKOf-IttwlXRzArp3MB1iOqrXbogw');

const stage = new Scenes.Stage([bookingScene]);

bot.use(session());
bot.use(stage.middleware());

// Logging Middleware
bot.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] Update type: ${ctx.updateType} from user: ${ctx.from?.id}`);
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
      inline_keyboard: buttons.mainMenu
    }
  });
});

// Category Handlers - Enter Wizard
bot.action(/category_.+/, (ctx) => {
  // We enter the wizard and pass the action so the wizard can process it in step 2
  ctx.scene.enter('bookingWizard');
  // Immediately trigger the next step in the wizard with the same callback data
  ctx.scene.state.actionData = ctx.callbackQuery.data;
});

// Action Handlers for non-booking flows
bot.action('my_bookings', async (ctx) => {
  try {
    const bookings = await db.getUserBookings(ctx.from.id);
    if (!bookings || bookings.length === 0) {
      return ctx.editMessageText(texts.myBookingsEmpty, {
        reply_markup: { inline_keyboard: buttons.backToMain }
      });
    }
    
    let replyText = 'Ваши активные записи:\n\n';
    bookings.forEach((b, i) => {
      replyText += `${i + 1}. Услуга: ${b.service_name}\nДата: ${b.booking_date}\nВремя: ${b.booking_time}\nСтатус: ${b.status}\n\n`;
    });
    
    ctx.editMessageText(replyText, {
      reply_markup: { inline_keyboard: buttons.backToMain }
    });
  } catch (err) {
    console.error(err);
    ctx.reply(texts.bookingError);
  }
});

bot.action('contact_admin', (ctx) => {
  ctx.editMessageText(texts.contactAdmin, {
    reply_markup: { inline_keyboard: buttons.backToMain }
  });
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
