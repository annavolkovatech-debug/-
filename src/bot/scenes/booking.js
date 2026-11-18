const { Scenes, Markup } = require('telegraf');
const { texts, buttons } = require('../texts');
const core12Api = require('../../core12/api');
const { mapBookingData } = require('../../core12/mapper');
const db = require('../../supabase/services');

const bookingWizard = new Scenes.WizardScene(
  'bookingWizard',
  
  // Step 1: Process selected service
  async (ctx) => {
    // We receive the action data from the index.js trigger
    const data = ctx.scene.state.actionData || (ctx.callbackQuery && ctx.callbackQuery.data);
    
    if (!data || !data.startsWith('service_')) {
      return ctx.scene.leave();
    }
    
    if (data.startsWith('service_master_')) {
      await ctx.editMessageText(texts.masterTransfer, {
        reply_markup: { inline_keyboard: buttons.masterContact }
      });
      return ctx.scene.leave();
    }
    
    const serviceMap = {
      'service_wash_standard': { id: 'standard', name: 'Стандарт', price: '1 700' },
      'service_wash_complex': { id: 'complex', name: 'Комплекс', price: '2 200', isComplex: true },
      'service_wash_express': { id: 'express', name: 'Экспресс детейлинг', price: '4 500' },
      'service_detailing_dryclean': { id: 'dryclean', name: 'Химчистка салона', price: '16 000' },
      'service_detailing_presale': { id: 'presale', name: 'Предпродажная подготовка', price: '21 000' }
    };
    
    const selectedService = serviceMap[data];
    if (!selectedService) return ctx.scene.leave();
    
    ctx.wizard.state.service = selectedService.name;
    ctx.wizard.state.serviceId = selectedService.id; // Для маппинга в Core12
    
    // Спрашиваем марку машины перед выбором даты
    if (ctx.callbackQuery) {
      await ctx.editMessageText('Напишите марку и модель вашего автомобиля (например: Kia Rio):');
    } else {
      await ctx.reply('Напишите марку и модель вашего автомобиля (например: Kia Rio):');
    }
    return ctx.wizard.next();
  },

  // Step 2: Handle Car Input
  async (ctx) => {
    // Если пользователь нажал кнопку из Reply Keyboard (например, "Мои записи")
    // находясь внутри сцены, мы должны выйти и дать обработать команду глобально.
    if (ctx.message && ctx.message.text && Object.values(buttons.replyKeyboard).flat().some(btn => btn.text === ctx.message.text)) {
      await ctx.scene.leave();
      return; 
    }

    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Пожалуйста, напишите марку и модель текстом.');
      return;
    }

    // Сохраняем введенную машину
    ctx.wizard.state.carModel = ctx.message.text;

    const dates = [
      [Markup.button.callback('Сегодня', 'date_today'), Markup.button.callback('Завтра', 'date_tomorrow')]
    ];
    
    await ctx.reply(`Автомобиль: ${ctx.wizard.state.carModel}\n\nВыберите дату для визита:`, {
      reply_markup: { inline_keyboard: dates }
    });
    
    return ctx.wizard.next();
  },
  
  // Step 3: Choose Time
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data.startsWith('date_')) {
      const date = ctx.callbackQuery.data === 'date_today' ? 'Сегодня' : 'Завтра';
      ctx.wizard.state.date = date;
      
      try {
        const slots = await core12Api.getAvailableSlots(date);
        const timeButtons = slots.map(slot => [Markup.button.callback(slot, `time_${slot}`)]);
        
        await ctx.editMessageText(texts.chooseTime, {
          reply_markup: { inline_keyboard: timeButtons }
        });
        return ctx.wizard.next();
      } catch (err) {
        await ctx.reply(texts.bookingError);
        return ctx.scene.leave();
      }
    }
  },
  
  // Step 4: Confirm Booking
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data.startsWith('time_')) {
      const time = ctx.callbackQuery.data.replace('time_', '');
      ctx.wizard.state.time = time;
      
      const { service, date, carModel } = ctx.wizard.state;
      await ctx.editMessageText(`Подтвердите запись:\n\nАвто: ${carModel}\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}`, {
        reply_markup: { inline_keyboard: buttons.confirmBooking }
      });
      return ctx.wizard.next();
    }
  },
  
  // Step 5: Finalize
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_yes') {
      const { service, serviceId, date, time, carModel } = ctx.wizard.state;
      
      try {
        const core12Data = mapBookingData({
          telegramId: ctx.from.id,
          name: ctx.from.first_name,
          service,
          serviceId,
          date,
          time,
          carModel
        });
        const crmResult = await core12Api.createCarVisit(core12Data); 
        
        await db.saveBooking({
          telegram_id: ctx.from.id,
          service_name: service,
          booking_date: date,
          booking_time: time,
          crm_id: crmResult?.id || 'mock_id',
          status: 'confirmed'
        });
        
        await ctx.editMessageText(texts.bookingSuccess);
      } catch (err) {
        console.error(err);
        await ctx.editMessageText(texts.bookingError);
      }
    } else if (ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_no') {
      await ctx.editMessageText('Запись отменена.');
    }
    return ctx.scene.leave();
  }
);

bookingWizard.action('back_to_main', async (ctx) => {
  await ctx.scene.leave();
  await ctx.editMessageText('Возврат в главное меню... Выберите категорию в меню внизу 👇').catch(() => {});
});

module.exports = bookingWizard;
