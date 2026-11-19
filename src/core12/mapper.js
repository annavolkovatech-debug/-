const mapBookingToCore12 = (botData) => {
  // Определяем дату
  let targetDate = new Date();
  if (botData.date === 'Завтра') {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (botData.date.match(/^\d{2}\.\d{2}$/)) {
    // Если формат "21.11"
    const [day, month] = botData.date.split('.');
    targetDate.setMonth(parseInt(month) - 1);
    targetDate.setDate(parseInt(day));
  }
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  
  // Формат времени с учетом таймзоны (Москва)
  const creationDateISO = `${yyyy}-${mm}-${dd}T${botData.time}:00+03:00`;
  
  // Ищем ID автомобиля в справочнике Core12 (заглушка для тестов)
  const defaultCarId = botData.carModel?.toLowerCase().includes('kia rio') ? '8421' : '8421'; 

  // Строго по примеру из Swagger Core12
  return {
    creation_date: creationDateISO,
    status: "new",
    payment_type: "cash",
    is_payed: false, 
    comment: `Запись через Telegram бота. Авто: ${botData.carModel}, Тел: +${botData.phone}`,
    
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

module.exports = { mapBookingToCore12 };
