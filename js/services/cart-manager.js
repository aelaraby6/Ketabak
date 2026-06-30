// Global Cart Operations for logged-in and guest users

import { supabase } from "../supabase-config.js";
import { DbService } from "./db.js";

window.addBookToCart = async function (bookId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    let cart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];
    const id = parseInt(bookId);

    if (session) {
      // Logged in: write to Supabase Database
      await DbService.addToCart(session.user.id, id);
      
      // Sync local storage cache to keep badge immediate and correct
      const dbCart = await DbService.getCart(session.user.id);
      const cacheCart = dbCart.map(item => ({ id: item.id, quantity: item.quantity }));
      localStorage.setItem("ketabak_cart", JSON.stringify(cacheCart));
    } else {
      // Guest: write to local storage
      const existingItem = cart.find(item => item.id === id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ id: id, quantity: 1 });
      }
      localStorage.setItem("ketabak_cart", JSON.stringify(cart));
    }

    // Trigger header badge refresh
    if (window.updateHeaderCartCount) {
      window.updateHeaderCartCount();
    }

    window.showNotification("Added to cart successfully!", "success");
  } catch (error) {
    console.error("Cart addition error:", error);
    window.showNotification("Failed to add item to cart", "error");
  }
};
