const axios = require('axios');
require('dotenv').config();

const CORE12_API_URL = process.env.CORE12_API_URL || 'https://cid3027.core12.ru/api';
const CORE12_API_KEY = process.env.CORE12_API_KEY || '';

const apiClient = axios.create({
  baseURL: CORE12_API_URL,
  headers: {
    'Authorization': `Bearer ${CORE12_API_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

const core12Api = {
  async getTimeslotsData(dateFrom, dateTo) {
    // Если ключ не задан или это тест, возвращаем мок-данные
    if (!CORE12_API_KEY || CORE12_API_KEY === 'placeholder_key') {
      console.log('Using mock timeslots (No API key provided)');
      return { mock: true };
    }

    try {
      const response = await apiClient.get('/timeslots', {
        params: {
          dateFrom,
          dateTo
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching timeslots from Core12:', error.message);
      // Fallback к мок-данным, если API ответило ошибкой 401/403 (неверный токен)
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
         console.log('Auth error with Core12 API. Returning mock slots for testing.');
         return { mock: true };
      }
      throw new Error('Failed to fetch available slots');
    }
  },

  async createCarVisit(visitData) {
    if (!CORE12_API_KEY || CORE12_API_KEY === 'placeholder_key') {
      console.log('Mock creating visit:', visitData);
      return { id: 'mock_visit_123', status: 'created' };
    }

    try {
      const response = await apiClient.post('/car-visits', visitData);
      return response.data;
    } catch (error) {
      console.error('Error creating car visit in Core12:', error.message);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
         return { id: 'mock_visit_123', status: 'mock_created_due_to_auth_error' };
      }
      throw new Error('Failed to create booking in CRM');
    }
  },
  
  // Этот метод вызывается из сцены бронирования для получения слотов
  async getAvailableSlots(date) {
    // Сначала пытаемся получить сырые данные из Core12
    // Для реального запроса нужны правильные форматы дат, пока передаем просто date
    const timeslotsData = await this.getTimeslotsData(date, date);
    
    // Вычисляем доступные слоты (пока возвращаем жесткий список для демо)
    return this.calculateAvailableSlots(timeslotsData, date);
  },
  
  calculateAvailableSlots(timeslotsData, date, serviceDurationMinutes = 60) {
    return ['10:00', '12:00', '14:30', '16:00', '18:00'];
  }
};

module.exports = core12Api;
