const db = require('../src/supabase/services');
const sender = require('../src/mailings/sender');

module.exports = async (req, res) => {
  // Проверка токена безопасности для cron-задач (опционально)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const pendingMailings = await db.getMailings('pending');
    
    if (pendingMailings.length === 0) {
      return res.status(200).send('No pending mailings');
    }

    const allUsers = await db.getAllUsers();
    const userIds = allUsers.map(u => u.telegram_id);

    for (const mailing of pendingMailings) {
      await db.updateMailingStatus(mailing.id, 'processing');
      
      const result = await sender.sendToUsers(userIds, mailing.content);
      
      console.log(`Mailing ${mailing.id} completed. Success: ${result.successCount}, Failed: ${result.failCount}`);
      
      await db.updateMailingStatus(mailing.id, 'completed');
    }

    res.status(200).send('Cron job executed successfully');
  } catch (error) {
    console.error('Error executing cron job:', error);
    res.status(500).send('Internal Server Error');
  }
};
