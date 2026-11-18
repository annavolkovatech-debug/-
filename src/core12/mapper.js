const mapBookingData = (botData) => {
  const now = new Date();
  if (botData.date === 'Завтра') {
    now.setDate(now.getDate() + 1);
  }
  
  const [hours, minutes] = botData.time.split(':');
  now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  const creationDateISO = now.toISOString();

  // Core12 ожидает application/x-www-form-urlencoded
  // Если у клиента Kia Rio, мы привязываем тестовый ID 8421, как в документации
  // В рабочей версии здесь можно реализовать динамический поиск ID через API по названию машины
  const defaultCarId = botData.carModel?.toLowerCase().includes('kia rio') ? '8421' : '8421'; // Используем 8421 по умолчанию для теста

  return {
    creation_date: creationDateISO,
    status: "new",
    payment_type: "cash",
    is_payed: false,
    comment: `Запись через Telegram бота. Пользователь: ${botData.name} (ID: ${botData.telegramId})`,
    
    // Передаем услугу
    'provided_service[qty]': 1,
    'provided_service[pointType][name]': botData.service,
    // 'provided_service[pointType][id]': botData.serviceId, // Когда будут реальные ID услуг
    
    // Данные клиента и привязка машины
    'car[ownerName]': botData.name,
    'car[comment]': `TG ID: ${botData.telegramId}. Указанное авто: ${botData.carModel}. Телефон: +${botData.phone}`,
    'car[phone]': botData.phone,
    'car[id]': defaultCarId // Привязываем машину по ID из справочника Core12
  };
};

module.exports = { mapBookingData };
