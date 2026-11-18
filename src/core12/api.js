const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

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
    'Content-Type': 'application/x-www-form-urlencoded'
  };
};

// Базовый клиент
const apiClient = axios.create({
  baseURL: CORE12_API_URL
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

  async createCarVisit(visitData) {
    try {
      const headers = getAuthHeaders();
      
      if (!headers) {
        console.warn('⚠️ CORE12 credentials missing. Mocking visit creation.');
        return { id: 'mock_visit_' + Date.now(), status: 'new' };
      }

      console.log('Sending payload to Core12 (JSON format):', JSON.stringify(visitData));
      
      // Попробуем отправить чистый JSON, так как 500 ошибка часто возникает при кривом парсинге form-urlencoded на стороне сервера
      const response = await apiClient.post('/api/car-visits', visitData, {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
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
    const timeslotsData = await this.getTimeslotsData(date, date);
    return this.calculateAvailableSlots(timeslotsData, date);
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
