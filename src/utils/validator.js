const { z } = require('zod');

const bookingSchema = z.object({
  telegramId: z.number().int().positive(),
  name: z.string().min(1),
  service: z.string().min(1),
  date: z.string().min(1),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
});

const validateBooking = (data) => {
  return bookingSchema.safeParse(data);
};

module.exports = { validateBooking };
