const { Scenes, Markup } = require('telegraf');
const { texts, buttons } = require('../texts');
const core12Api = require('../../core12/api');
const { mapBookingToCore12 } = require('../../core12/mapper');
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
  async (ctx, next) => {
    try {
      await db.logEvent(ctx.from.id, 'debug', { message: 'Reached Step 2', text: ctx.message?.text });
      
      if (ctx.message && ctx.message.text && Object.values(buttons.replyKeyboard).flat().some(btn => btn.text === ctx.message.text)) {
        await ctx.scene.leave();
        return next(); 
      }

      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, напишите марку и модель текстом.');
        return;
      }

      ctx.wizard.state.carModel = ctx.message.text;

      await ctx.reply('Пожалуйста, отправьте ваш контактный номер телефона для связи:', {
        reply_markup: {
          keyboard: [[{ text: '📱 Отправить контакт', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      
      return ctx.wizard.next();
    } catch (e) {
      console.error(e);
      await db.logEvent(ctx.from.id, 'error_step2', { error: e.message });
    }
  },
  
  // Step 3: Handle Phone Input and Check Ban
  async (ctx, next) => {
    if (ctx.message && ctx.message.text && Object.values(buttons.replyKeyboard).flat().some(btn => btn.text === ctx.message.text)) {
      await ctx.scene.leave();
      return next(); 
    }

    let phone = '';
    if (ctx.message && ctx.message.contact) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.message && ctx.message.text) {
      phone = ctx.message.text;
    } else {
      await ctx.reply('Пожалуйста, отправьте контакт или напишите номер текстом.');
      return;
    }

    phone = phone.replace(/\D/g, ''); // Оставляем только цифры
    
    // Проверка на бан
    const isBanned = await db.isPhoneBanned(phone);
    if (isBanned) {
      await ctx.reply('К сожалению, на ближайшее время все места заняты. Попробуйте в следующий раз.', {
        reply_markup: { keyboard: buttons.replyKeyboard, resize_keyboard: true }
      });
      return ctx.scene.leave();
    }

    ctx.wizard.state.phone = phone;
    await db.updateUserPhone(ctx.from.id, phone).catch(() => {});

    const dates = [];
    const today = new Date();
    
    // Генерируем 5 дней вперед
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      let label = '';
      if (i === 0) label = 'Сегодня';
      else if (i === 1) label = 'Завтра';
      else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      
      const payload = `date_${i}`; // date_0, date_1, etc.
      
      // По 2 кнопки в ряд
      if (i % 2 === 0) {
        dates.push([Markup.button.callback(label, payload)]);
      } else {
        dates[Math.floor(i / 2)].push(Markup.button.callback(label, payload));
      }
    }

    await ctx.reply(`Автомобиль: ${ctx.wizard.state.carModel}\nТелефон: +${phone}\n\nВыберите дату для визита:`, {
      reply_markup: { inline_keyboard: dates }
    });
    
    return ctx.wizard.next();
  },

  // Step 4: Choose Time
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data.startsWith('date_')) {
      const offsetIndex = parseInt(ctx.callbackQuery.data.replace('date_', ''), 10);
      
      const selectedDate = new Date();
      selectedDate.setDate(selectedDate.getDate() + offsetIndex);
      
      let dateLabel = '';
      if (offsetIndex === 0) dateLabel = 'Сегодня';
      else if (offsetIndex === 1) dateLabel = 'Завтра';
      else dateLabel = selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

      ctx.wizard.state.date = dateLabel;
      
      try {
        const slots = await core12Api.getAvailableSlots(dateLabel);
        
        // Если Core12 вернул пустой массив или упал, fallback генерирует моки (они никогда не пустые)
        // Разбиваем слоты по 3 в ряд для красивой сетки
        const timeButtons = [];
        for (let i = 0; i < slots.length; i += 3) {
          const row = slots.slice(i, i + 3).map(slot => Markup.button.callback(slot, `time_${slot}`));
          timeButtons.push(row);
        }
        
        await ctx.editMessageText(texts.chooseTime, {
          reply_markup: { inline_keyboard: timeButtons }
        });
        return ctx.wizard.next();
      } catch (err) {
        console.error('Error generating timeslots UI:', err);
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
      
      const { service, date, carModel, phone } = ctx.wizard.state;
      
      // Возвращаем главную клавиатуру перед показом инлайн кнопок подтверждения
      await ctx.reply('Проверьте данные:', {
        reply_markup: { keyboard: buttons.replyKeyboard, resize_keyboard: true }
      });
      
      await ctx.reply(`Подтвердите запись:\n\nАвто: ${carModel}\nТелефон: +${phone}\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}`, {
        reply_markup: { inline_keyboard: buttons.confirmBooking }
      });
      return ctx.wizard.next();
    }
  },
  
  // Step 6: Finalize
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_yes') {
      const { service, serviceId, date, time, carModel, phone } = ctx.wizard.state;
      
      try {
        const core12Data = mapBookingToCore12({
          telegramId: ctx.from.id,
          name: ctx.from.first_name,
          service,
          serviceId,
          date,
          time,
          carModel,
          phone
        });
        let crmResult;
        try {
          crmResult = await core12Api.createCarVisit(core12Data); 
          console.log('Successfully mapped and sent booking to Core12');
        } catch (e) {
          console.error('Core12 integration error:', e);
          // Мы продолжаем работу даже если Core12 упал, чтобы клиент получил подтверждение
        }
        
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
