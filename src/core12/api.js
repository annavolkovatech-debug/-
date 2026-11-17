const axios = require('axios');
require('dotenv').config();

const CORE12_API_URL = process.env.CORE12_API_URL || 'https://cid3027.core12.ru/api';
const CORE12_API_KEY = process.env.CORE12_API_KEY || 'placeholder_key';

const apiClient = axios.create({
  baseURL: CORE12_API_URL,
  headers: {
    'Authorization': `Bearer ${CORE12_API_KEY}`,
    // Согласно скриншоту, API ожидает данные в формате urlencoded, а не JSON
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

const core12Api = {
  async getTimeslotsData(dateFrom, dateTo) {
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
      throw new Error('Failed to fetch available slots');
    }
  },

  async createCarVisit(visitData) {
    try {
      // Axios автоматически преобразует объект в URL-encoded строку, если установлен правильный заголовок
      const response = await apiClient.post('/car-visits', visitData);
      return response.data;
    } catch (error) {
      console.error('Error creating car visit in Core12:', error.message);
      throw new Error('Failed to create booking in CRM');
    }
  },
  
  calculateAvailableSlots(timeslotsData, date, serviceDurationMinutes = 60) {
    return ['10:00', '12:00', '14:30', '16:00', '18:00'];
  }
};

module.exports = core12Api;
