const { mapBookingData } = require('../src/core12/mapper');

describe('Core12 Mapper', () => {
  it('should map bot data to Core12 format', () => {
    const botData = {
      telegramId: 123,
      name: 'Test',
      phone: '+79991234567',
      service: 'Wash',
      date: '2026-11-17',
      time: '15:00'
    };
    
    const mapped = mapBookingData(botData);
    
    expect(mapped.customer.telegramId).toBe(123);
    expect(mapped.source).toBe('telegram_bot');
    expect(mapped.datetime).toBe('2026-11-17T15:00:00Z');
  });
});
