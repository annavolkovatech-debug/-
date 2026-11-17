const logger = require('./logger');

const errorHandler = (err, ctx) => {
  logger.error(`Error for user ${ctx?.from?.id}:`, err.message);
  
  if (ctx) {
    ctx.reply('Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.').catch(e => {
      logger.error('Failed to send error message:', e.message);
    });
  }
};

module.exports = errorHandler;
