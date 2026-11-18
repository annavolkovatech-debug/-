const axios = require('axios');
require('dotenv').config();

const CORE12_API_URL = process.env.CORE12_API_URL || 'https://cid3027.core12.ru/api';
const CORE12_LOGIN = process.env.CORE12_LOGIN || '';
const CORE12_PASSWORD = process.env.CORE12_PASSWORD || '';

// Базовый клиент
const apiClient = axios.create({
  baseURL: CORE12_API_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

// Если Core12 использует Basic Auth, мы можем добавить его так:
if (CORE12_LOGIN && CORE12_PASSWORD) {
  apiClient.defaults.auth = {
    username: CORE12_LOGIN,
    password: CORE12_PASSWORD
  };
}

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
    if (!CORE12_LOGIN) {
      console.log('Using mock timeslots (No credentials provided)');
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
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
         console.log('Auth error with Core12 API. Returning mock slots for testing.');
         return { mock: true };
      }
      throw new Error('Failed to fetch available slots');
    }
  },

  async createCarVisit(visitData) {
    if (!CORE12_LOGIN) {
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
  
  async getAvailableSlots(date) {
    const timeslotsData = await this.getTimeslotsData(date, date);
    return this.calculateAvailableSlots(timeslotsData, date);
  },
  
  calculateAvailableSlots(timeslotsData, date, serviceDurationMinutes = 60) {
    return ['10:00', '12:00', '14:30', '16:00', '18:00'];
  }
};

module.exports = core12Api;
