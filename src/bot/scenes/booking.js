const { Scenes, Markup } = require('telegraf');
const { texts, buttons } = require('../texts');
const core12Api = require('../../core12/api');
const { mapBookingData } = require('../../core12/mapper');
const db = require('../../supabase/services');

const bookingWizard = new Scenes.WizardScene(
  'bookingWizard',
  
  // Step 1: Handle Category Selection
  async (ctx) => {
    await ctx.reply(texts.chooseCategory, {
      reply_markup: { inline_keyboard: buttons.mainMenu }
    });
    return ctx.wizard.next();
  },
  
  // Step 2: Handle Service Selection based on Category
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('category_')) {
      if (data === 'category_wash') {
        await ctx.editMessageText(texts.chooseWashService, {
          reply_markup: { inline_keyboard: buttons.washServices }
        });
        return; 
      } else if (data === 'category_detailing') {
        await ctx.editMessageText(texts.chooseDetailingService, {
          reply_markup: { inline_keyboard: buttons.detailingServices }
        });
        return; 
      } else if (data === 'category_buyout') {
        await ctx.editMessageText(texts.buyoutInfo, {
          reply_markup: { inline_keyboard: buttons.masterContact }
        });
        return ctx.scene.leave();
      }
    }
    
    if (data.startsWith('service_')) {
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
      if (!selectedService) return;
      
      ctx.wizard.state.service = selectedService.name;
      ctx.wizard.state.serviceId = selectedService.id; // Для маппинга в Core12
      
      // Спрашиваем марку машины перед выбором даты
      await ctx.editMessageText('Напишите марку и модель вашего автомобиля (например: Kia Rio):');
      return ctx.wizard.next();
    }
  },

  // Step 3: Handle Car Input
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Пожалуйста, напишите марку и модель текстом.');
      return;
    }

    // Сохраняем введенную машину
    ctx.wizard.state.carModel = ctx.message.text;

    // В реальном проекте здесь можно сделать поиск по API Core12:
    // const carModels = await core12Api.searchCarModel(ctx.message.text);
    // Но для упрощения (так как мы знаем, что нам нужен ID машины для Core12),
    // мы просто сохраняем текст. В маппере мы либо передаем это текстом, 
    // либо привязываем к тестовому ID (например 8421 для Kia Rio).

    const dates = [
      [Markup.button.callback('Сегодня', 'date_today'), Markup.button.callback('Завтра', 'date_tomorrow')]
    ];
    
    await ctx.reply(`Автомобиль: ${ctx.wizard.state.carModel}\n\nВыберите дату для визита:`, {
      reply_markup: { inline_keyboard: dates }
    });
    
    return ctx.wizard.next();
  },
  
  // Step 4: Choose Time
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
  
  // Step 5: Confirm Booking
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
  
  // Step 6: Finalize
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
          carModel // Передаем машину в маппер
        });
        const crmResult = await core12Api.createCarVisit(core12Data); // Используем правильный метод
        
        await db.saveBooking({
          telegram_id: ctx.from.id,
          service_name: service,
          booking_date: date,
          booking_time: time,
          crm_id: crmResult?.id || 'mock_id',
          status: 'confirmed'
        });
        
        await ctx.editMessageText(texts.bookingSuccess, {
          reply_markup: { inline_keyboard: buttons.backToMain }
        });
      } catch (err) {
        console.error(err);
        await ctx.editMessageText(texts.bookingError, {
          reply_markup: { inline_keyboard: buttons.backToMain }
        });
      }
    } else if (ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_no') {
      await ctx.editMessageText('Запись отменена.', {
        reply_markup: { inline_keyboard: buttons.backToMain }
      });
    }
    return ctx.scene.leave();
  }
);

bookingWizard.action('back_to_main', async (ctx) => {
  await ctx.scene.leave();
  await ctx.editMessageText(texts.mainMenu, {
    reply_markup: { inline_keyboard: buttons.mainMenu }
  }).catch(() => {});
});

module.exports = bookingWizard;
