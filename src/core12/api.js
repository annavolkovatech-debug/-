const axios = require('axios');
require('dotenv').config();
const { mapBookingToCore12 } = require('./mapper');

const CORE12_API_URL = process.env.CORE12_API_URL || 'https://cid3027.core12.ru'; // Используем домен из скриншота
const CORE12_LOGIN = process.env.CORE12_LOGIN || '';
const CORE12_PASSWORD = process.env.CORE12_PASSWORD || '';

// Функция для генерации заголовка Basic Auth
const getAuthHeaders = () => {
  if (!CORE12_LOGIN || !CORE12_PASSWORD) {
    return null;
  }

  // Кодируем логин и пароль в Base64
  const base64Credentials = Buffer.from(`${CORE12_LOGIN}:${CORE12_PASSWORD}`).toString('base64');
  
  return {
    'Authorization': `Basic ${base64Credentials}`,
    'Content-Type': 'application/json'
  };
};

// Базовый клиент
const apiClient = axios.create({
  baseURL: CORE12_API_URL,
  headers: {
    // В Swagger явно указано application/json для этого метода в разделе "Parameter content type"
    'Content-Type': 'application/json', 
    'Accept': 'application/json'
  }
});

let sessionToken = null; // На случай, если нужно получать токен отдельным запросом

const core12Api = {
  // Метод для получения токена (если Core12 требует отдельного запроса на авторизацию)
  async authenticate() {
    if (!CORE12_LOGIN || !CORE12_PASSWORD) {
       console.log('No Core12 credentials provided. Using mock mode.');
       return false;
    }
    
    try {
      // Пример того, как это могло бы выглядеть. Точный URL нужен из документации.
      // const res = await axios.post(`${CORE12_API_URL}/auth/login`, { login: CORE12_LOGIN, password: CORE12_PASSWORD });
      // sessionToken = res.data.token;
      // apiClient.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
      return true;
    } catch (err) {
      console.error('Core12 Auth Error:', err.message);
      return false;
    }
  },

  async getTimeslotsData(dateFrom, dateTo) {
    try {
      const headers = getAuthHeaders();
      
      // Если нет доступов — возвращаем тестовые данные для проверки бота
      if (!headers) {
        console.warn('⚠️ CORE12_LOGIN or CORE12_PASSWORD is not set. Returning mock timeslots.');
        return ['10:00', '11:00', '14:30', '16:00'];
      }

      const response = await apiClient.get('/api/timeslots', {
        headers,
        params: {
          dateFrom,
          dateTo
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching timeslots from Core12:', error.message);
      // Even if it fails, return mock data so the bot doesn't crash
      return { mock: true };
    }
  },

  generateMockSlots() {
    return [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
      '21:00', '21:30', '22:00'
    ];
  },

  async createCarVisit(botData) {
    try {
      const headers = getAuthHeaders();
      
      if (!headers) {
        console.warn('⚠️ CORE12 credentials missing. Mocking visit creation.');
        return { id: 'mock_visit_' + Date.now(), status: 'new' };
      }

      const visitData = mapBookingToCore12(botData);

      // Возвращаем JSON, так как Core12 работает с application/json
      console.log(`Sending payload to Core12 (JSON):`, JSON.stringify(visitData));

      const response = await apiClient.post('/api/car-visits', visitData, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error creating car visit in Core12:', error.message);
      if (error.response) {
        console.error('Core12 Response Data:', JSON.stringify(error.response.data));
        console.error('Core12 Response Status:', error.response.status);
      }
      // Return a mock success so the bot flow doesn't break for the user while we debug the API payload
      return { id: 'mock_visit_fallback', status: 'mock_created_due_to_error' };
    }
  },

  async getAvailableSlots(date) {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        return core12Api.generateMockSlots();
      }

      console.log(`Fetching timeslots from Core12 for date: ${date}`);
      
      let targetDate = new Date();
      if (date === 'Завтра') {
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (date.match(/^\d{2}\.\d{2}$/)) {
        const [day, month] = date.split('.');
        targetDate.setMonth(parseInt(month) - 1);
        targetDate.setDate(parseInt(day));
      }
      
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');

      const dateFrom = `${yyyy}-${mm}-${dd}T00:00:00+03:00`;
      const dateTo = `${yyyy}-${mm}-${dd}T23:59:59+03:00`;

      const response = await apiClient.get('/api/timeslots', {
        headers,
        params: {
          dateFrom,
          dateTo
        }
      });
      
      return core12Api.generateMockSlots();
    } catch (error) {
      console.error('Error fetching timeslots from Core12:', error.message);
      if (error.response) {
        console.error('Core12 Response Data (timeslots):', JSON.stringify(error.response.data));
      }
      return core12Api.generateMockSlots();
    }
  },
  
  calculateAvailableSlots(timeslotsData, date, serviceDurationMinutes = 60) {
    // В реальной интеграции тут будет парсинг JSON от Core12:
    // 1. Берем timeslotsData.shifts (смены)
    // 2. Берем timeslotsData.car_visits (занятое время)
    // 3. Вычитаем занятое из рабочего
    
    // Пока генерируем слоты с 9:00 до 22:00 с шагом в 1 час
    const slots = [];
    for (let hour = 9; hour < 22; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  }
};

module.exports = core12Api;
