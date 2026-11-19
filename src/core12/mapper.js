const mapBookingToCore12 = (botData) => {
  // Определяем дату
  let targetDate = new Date();
  
  if (botData.isoDate) {
    targetDate = new Date(botData.isoDate);
  } else {
    if (!botData.date) {
      botData.date = 'Сегодня';
    }

    if (botData.date === 'Завтра') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (botData.date !== 'Сегодня' && botData.date.includes('.')) {
      // Оставляем как fallback для совместимости
      const dateStr = botData.date.replace(/[^\d.]/g, ''); 
      const parts = dateStr.split('.').filter(Boolean);
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        targetDate.setMonth(month - 1);
        targetDate.setDate(day);
      }
    }
  }
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  
  // Формат времени с учетом таймзоны (Москва)
  const time = botData.time || '12:00';
  const creationDateISO = `${yyyy}-${mm}-${dd}T${time}:00+03:00`;
  // Добавляем exit_date и processed_date на всякий случай
  const exitDateISO = `${yyyy}-${mm}-${dd}T${time}:00+03:00`;

  
  // Ищем ID автомобиля в справочнике Core12 (заглушка для тестов)
  const defaultCarId = botData.carModel?.toLowerCase().includes('kia rio') ? '8421' : '8421'; 

  // Строго по примеру из Swagger Core12
  return {
    creation_date: creationDateISO,
    exit_date: exitDateISO,
    processed_date: exitDateISO,
    status: "new",
    checkup: "verified", // Подтверждаем номер автоматически
    veracity: "strong",  // Высокая достоверность
    payment_type: "cash",
    is_payed: false, 
    comment: `Запись через Telegram бота. Авто: ${botData.carModel}, Гос. номер: ${botData.carNumber}, Тел: +${botData.phone}`,
    recognized_number: botData.carNumber,
    
    group: {
      name: "Телеграм-бот"
    },
    labels: [
      { labels: "Телеграм-бот" }
    ],
    
    car: {
      number: botData.carNumber,
      ownerName: botData.name,
      group: {
        name: "Телеграм-бот"
      },
      comment: `TG ID: ${botData.telegramId}. Авто: ${botData.carModel}. Гос. номер: ${botData.carNumber}. Телефон: +${botData.phone}`
    },
    
    provided_service: {
      qty: 1,
      pointType: {
        name: botData.service
      }
    }
  };
};

module.exports = { mapBookingToCore12 };
