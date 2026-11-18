const supabase = require('./client');

const db = {
  async getUser(telegramId) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch(e) {
      console.error(e);
      return null;
    }
  },

  async createUser(userData) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'telegram_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch(e) {
      console.error('Error creating user:', e);
      return null;
    }
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

  async isAdmin(telegramId) {
    if (!supabase) return false;
    try {
      const { data } = await supabase.from('users').select('is_admin').eq('telegram_id', telegramId).single();
      return data ? data.is_admin : false;
    } catch(e) {
      return false;
    }
  },

  async updateUserPhone(telegramId, phone) {
    try {
      await supabase.from('users').update({ phone }).eq('telegram_id', telegramId);
    } catch(e) {
      console.error(e);
    }
  },

  async isPhoneBanned(phone) {
    try {
      const { data } = await supabase.from('banned_phones').select('phone').eq('phone', phone).single();
      return !!data;
    } catch(e) {
      return false;
    }
  },

  async banPhone(phone) {
    await supabase.from('banned_phones').upsert({ phone });
  },

  async getTodayBookingsCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Начало текущего дня
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    if (error) throw error;
    return count || 0;
  },

  async getSession(key) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('telegraf_sessions')
        .select('session')
        .eq('id', key)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? data.session : null;
    } catch(e) {
      console.error('getSession error:', e);
      return null;
    }
  },

  async saveSession(key, session) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('telegraf_sessions')
        .upsert({ id: key, session, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) throw error;
    } catch(e) {
      console.error('saveSession error:', e);
    }
  },

  async logEvent(telegramId, action, details = {}) {
    if (!supabase) return;
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
