// database/db.js - Database utility functions for Supabase operations
const supabase = require('../config/supabase');

// Employee operations
const employeeDB = {
  // Get all employees
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('id');
    
    if (error) throw error;
    return data || [];
  },

  // Get employee by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new employee
  async create(fname, lname) {
    const { data, error } = await supabase
      .from('employees')
      .insert([{ fname: fname.toLowerCase(), lname: lname.toLowerCase() }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete employee
  async delete(id) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Find employee by name
  async findByName(fname, lname) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('fname', fname.toLowerCase())
      .eq('lname', lname.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }
};

// Check-in operations
const checkInDB = {
  // Create check-in record
  async create(fname, lname, date, time) {
    const { data, error } = await supabase
      .from('check_ins')
      .insert([{
        fname: fname.toLowerCase(),
        lname: lname.toLowerCase(),
        check_in_date: date,
        check_in_time: time
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get recent check-ins
  async getRecent(limit = 50) {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
};

// Debug log operations
const debugLogDB = {
  // Add debug log entry
  async log(message) {
    const { data, error } = await supabase
      .from('debug_logs')
      .insert([{ message }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get recent logs
  async getRecent(limit = 1000) {
    const { data, error } = await supabase
      .from('debug_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Clean old logs (keep only recent entries)
  async cleanup(keepCount = 1000) {
    // Get the timestamp of the keepCount-th most recent log
    const { data: cutoffLog, error: cutoffError } = await supabase
      .from('debug_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .range(keepCount - 1, keepCount - 1);
    
    if (cutoffError) throw cutoffError;
    
    if (cutoffLog && cutoffLog.length > 0) {
      const cutoffTime = cutoffLog[0].created_at;
      const { error } = await supabase
        .from('debug_logs')
        .delete()
        .lt('created_at', cutoffTime);
      
      if (error) throw error;
    }
    
    return true;
  }
};

// Catering orders operations
const cateringOrderDB = {
  // Get all orders
  async getAll() {
    const { data, error } = await supabase
      .from('catering_orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create new catering order
  async create(orderData) {
    const { data, error } = await supabase
      .from('catering_orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update order status
  async updateStatus(id, updates) {
    const { data, error } = await supabase
      .from('catering_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get orders by date
  async getByDate(date) {
    const { data, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('order_date', date)
      .order('time_of_day');
    
    if (error) throw error;
    return data || [];
  },

  // Update catering order (full update)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('catering_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete catering order
  async delete(id) {
    const { error } = await supabase
      .from('catering_orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Email orders operations (from fetchCatering.js)
const emailOrderDB = {
  // Get all orders
  async getAll() {
    const { data, error } = await supabase
      .from('email_orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create new email order
  async create(orderData) {
    const { data, error } = await supabase
      .from('email_orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update order status
  async updateStatus(id, updates) {
    const { data, error } = await supabase
      .from('email_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Check if order exists (for duplicate prevention)
  async findDuplicate(email, date, total) {
    const { data, error } = await supabase
      .from('email_orders')
      .select('*')
      .eq('customer_email', email)
      .eq('order_date', date)
      .eq('total', total)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Get orders by date
  async getByDate(date) {
    const { data, error } = await supabase
      .from('email_orders')
      .select('*')
      .eq('order_date', date)
      .order('order_time');
    
    if (error) throw error;
    return data || [];
  },

  // Delete email order
  async delete(id) {
    const { error } = await supabase
      .from('email_orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// User operations
const userDB = {
  // Get all users
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id');
    
    if (error) throw error;
    return data || [];
  },

  // Get user by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get user by username
  async getByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Create new user
  async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username: userData.username.toLowerCase(),
        fname: userData.fname.toLowerCase(),
        lname: userData.lname.toLowerCase(),
        password_hash: userData.password_hash
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user
  async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete user
  async delete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Update password
  async updatePassword(username, newPasswordHash) {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('username', username.toLowerCase())
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Temporary credentials operations
const tempCredsDB = {
  // Get all temp credentials
  async getAll() {
    const { data, error } = await supabase
      .from('temp_creds')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get temp credentials by username
  async getByUsername(username) {
    const { data, error } = await supabase
      .from('temp_creds')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Create new temp credentials
  async create(username, tempPassword) {
    const { data, error } = await supabase
      .from('temp_creds')
      .insert([{
        username: username.toLowerCase(),
        temp_password: tempPassword
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete temp credentials by username
  async deleteByUsername(username) {
    const { error } = await supabase
      .from('temp_creds')
      .delete()
      .eq('username', username.toLowerCase());
    
    if (error) throw error;
    return true;
  },

  // Clean up expired temp credentials
  async cleanupExpired() {
    const { error } = await supabase
      .from('temp_creds')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
    return true;
  },

  // Check if temp password is valid
  async validateTempPassword(username, tempPassword) {
    const { data, error } = await supabase
      .from('temp_creds')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('temp_password', tempPassword)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
};

module.exports = {
  employeeDB,
  checkInDB,
  debugLogDB,
  cateringOrderDB,
  emailOrderDB,
  userDB,
  tempCredsDB
};