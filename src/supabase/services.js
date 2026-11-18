const supabase = require('./client');

const db = {
  async getUser(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'telegram_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveBooking(bookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUserBookings(telegramId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getMailings(status = 'pending') {
    const { data, error } = await supabase
      .from('mailings')
      .select('*')
      .eq('status', status)
      .lte('scheduled_at', new Date().toISOString());
    if (error) throw error;
    return data;
  },

  async updateMailingStatus(id, status) {
    const { error } = await supabase
      .from('mailings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
  
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id');
    if (error) throw error;
    return data;
  },

  async getSession(key) {
    const { data, error } = await supabase
      .from('telegraf_sessions')
      .select('session')
      .eq('id', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.session : null;
  },

  async saveSession(key, session) {
    const { error } = await supabase
      .from('telegraf_sessions')
      .upsert({ id: key, session, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
  },

  async logEvent(telegramId, action, details = {}) {
    try {
      await supabase.from('bot_logs').insert({
        telegram_id: telegramId,
        action,
        details
      });
    } catch (e) {
      console.error('Error saving log:', e);
    }
  }
};

module.exports = db;
