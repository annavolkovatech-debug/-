const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN || '9194916047:AAFQJzJKOf-IttwlXRzArp3MB1iOqrXbogw');

const sender = {
  async sendToUsers(userIds, message, options = {}) {
    let successCount = 0;
    let failCount = 0;

    for (const id of userIds) {
      try {
        await bot.telegram.sendMessage(id, message, options);
        successCount++;
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`Failed to send message to ${id}:`, err.message);
        failCount++;
      }
    }

    return { successCount, failCount };
  }
};

module.exports = sender;
