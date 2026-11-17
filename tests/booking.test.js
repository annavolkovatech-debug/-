const { validateBooking } = require('../src/utils/validator');

describe('Booking Validation', () => {
  it('should validate correct booking data', () => {
    const data = {
      telegramId: 123456789,
      name: 'John',
      service: 'Комплексная мойка',
      date: 'Сегодня',
      time: '14:30'
    };
    const result = validateBooking(data);
    expect(result.success).toBe(true);
  });

  it('should fail on invalid time format', () => {
    const data = {
      telegramId: 123456789,
      name: 'John',
      service: 'Комплексная мойка',
      date: 'Сегодня',
      time: '14-30' // invalid
    };
    const result = validateBooking(data);
    expect(result.success).toBe(false);
  });
});
