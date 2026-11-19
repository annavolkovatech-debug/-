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

  // Формируем плоскую структуру, которую qs.stringify преобразует в правильные ключи с квадратными скобками
  // (например car[ownerName]=Анна)
  return {
    creation_date: creationDateISO,
    status: "new",
    payment_type: "cash",
    is_payed: "false", // form-urlencoded лучше передавать строкой
    comment: `Запись через Telegram бота. Авто: ${botData.carModel}, Тел: +${botData.phone}`,
    
    // Core12 ждет вложенные объекты в виде form-data
    car: {
      ownerName: botData.name,
      comment: `TG ID: ${botData.telegramId}. Авто: ${botData.carModel}. Телефон: +${botData.phone}`
    },
    
    provided_service: {
      qty: 1,
      pointType: {
        name: botData.service
      }
    }
  };
};

module.exports = { mapBookingData };
