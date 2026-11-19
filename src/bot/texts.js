module.exports = {
  texts: {
    welcome: `Добро пожаловать в автокомплекс "Улей"! 🐝\nЗдесь вы можете записаться на мойку, детейлинг или оценить авто для выкупа.`,
    mainMenu: `Главное меню. Выберите интересующее вас направление:`,
    chooseCategory: `Выберите категорию услуг:`,
    chooseWashService: `💧 Услуги автомойки:\nВыберите нужную услугу для записи.`,
    chooseDetailingService: `✨ Детейлинг и ремонт:\nВыберите услугу для консультации или записи.`,
    complexWashInfo: `Стоимость комплекса начинается от 2 200 ₽ и зависит от класса вашего авто (до 2 500 ₽ для внедорожников).\n\nВыберите дату для визита:`,
    standardWashInfo: (price) => `Стоимость услуги начинается от ${price} ₽.\n\nВыберите дату для визита:`,
    masterTransfer: `Для точной оценки стоимости и времени работ необходим осмотр.\n\nВы можете прислать фото повреждений нашему мастеру прямо сейчас, либо договориться о бесплатном осмотре.`,
    chooseTime: `Выберите удобное время:`,
    confirmBooking: (service, date, time) => `Подтвердите запись:\n\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}`,
    bookingSuccess: `✅ Вы успешно записаны! Ждем вас в автокомплексе "Улей".`,
    bookingError: `❌ Произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с администратором.`,
    myBookingsEmpty: `У вас пока нет активных записей.`,
    contactAdmin: `📞 <b>Наши контакты</b>

📍 Адрес: Москва, 2-я улица Измайловского Зверинца, 2
📱 Телефон: 8 (986) 774-00-00
🕒 График работы: Ежедневно с 9:00 до 22:00

Свяжитесь с нами любым удобным способом 👇`,
    buyoutInfo: `🤝 Выкуп авто\n\nМы готовы оперативно оценить и выкупить ваш автомобиль. Свяжитесь с нашим специалистом для предварительной оценки по фото или договоритесь о встрече.`
  },
  buttons: {
    replyKeyboard: [
      [{ text: '💧 Автомойка' }, { text: '✨ Детейлинг и Ремонт' }],
      [{ text: '🤝 Выкуп авто' }, { text: '📋 Мои записи' }],
      [{ text: '📞 Контакты' }]
    ],
    washServices: [
      [{ text: 'Стандарт (от 1 700 ₽)', callback_data: 'service_wash_standard' }],
      [{ text: 'Комплекс (от 2 200 ₽)', callback_data: 'service_wash_complex' }],
      [{ text: 'Экспресс детейлинг (от 4 500 ₽)', callback_data: 'service_wash_express' }],
      [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ],
    detailingServices: [
      [{ text: 'Химчистка салона (от 16 000 ₽)', callback_data: 'service_detailing_dryclean' }],
      [{ text: 'Предпродажная подготовка (от 21 000 ₽)', callback_data: 'service_detailing_presale' }],
      [{ text: 'Удаление вмятин без покраски', callback_data: 'service_master_dents' }],
      [{ text: 'Полировка и царапины', callback_data: 'service_master_polish' }],
      [{ text: 'Оклейка пленкой', callback_data: 'service_master_film' }],
      [{ text: 'Перетяжка салона', callback_data: 'service_master_interior' }],
      [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ],
    masterContact: [
      [{ text: '📸 Написать мастеру', url: 'https://t.me/admin_uley' }],
      [{ text: '📞 Заказать звонок', callback_data: 'request_call' }],
      [{ text: '🔙 В главное меню', callback_data: 'back_to_main' }]
    ],
    confirmBooking: [
      [{ text: '✅ Подтвердить', callback_data: 'confirm_yes' }],
      [{ text: '❌ Отменить', callback_data: 'confirm_no' }]
    ],
    backToMain: [
      [{ text: '🔙 В главное меню', callback_data: 'back_to_main' }]
    ]
  }
};
