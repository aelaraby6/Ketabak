// auth.js
// Authentication Service Wrapper for Supabase Auth

import { supabase } from "../supabase-config.js";

export const AuthService = {
  // Sign Up a new user
  signUp: async function (email, password, firstName, lastName) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) throw error;
    return data;
  },

  // Login an existing user
  signIn: async function (email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;
    return data;
  },

  // Logout current user
  signOut: async function () {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getSession: async function () {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Get current user object
  getCurrentUser: async function () {
    const session = await this.getSession();
    return session ? session.user : null;
  },

  // Send password reset email
  requestPasswordReset: async function (email) {
    const redirectToUrl = `${window.location.origin}/pages/reset-password.html`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl
    });
    
    if (error) throw error;
    return data;
  },

  // Update password (used on reset-password page)
  updatePassword: async function (newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  }
};
