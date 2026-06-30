// db.js
// Database Service Wrapper for Supabase queries

import { supabase } from "../supabase-config.js";

export const DbService = {
  // --- BOOKS ---
  
  // Get books with search, filtering, and sorting
  getBooks: async function ({ search = "", category = "", rating = "", priceRange = "", limit = 100 } = {}) {
    let query = supabase.from("books").select("*");

    if (search) {
      query = query.or(`title.ilike.%${search}%,authors.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (rating) {
      query = query.gte("rating", parseFloat(rating));
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      if (max !== undefined) {
        query = query.gte("price", min).lte("price", max);
      }
    }

    // Default sorting
    query = query.order("id", { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get a single book by ID
  getBookById: async function (id) {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // --- WISHLIST ---
  
  // Get user's wishlist
  getWishlist: async function (userId) {
    const { data, error } = await supabase
      .from("wishlists")
      .select("*, book:books(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map(item => item.book).filter(b => b !== null);
  },

  // Add book to wishlist
  addToWishlist: async function (userId, bookId) {
    const { data, error } = await supabase
      .from("wishlists")
      .insert({ user_id: userId, book_id: bookId })
      .select();

    if (error && error.code !== "23505") { // Ignore duplicates (unique constraint violation)
      throw error;
    }
    return data;
  },

  // Remove book from wishlist
  removeFromWishlist: async function (userId, bookId) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", bookId);

    if (error) throw error;
  },

  // Sync local storage wishlist to Supabase
  syncWishlist: async function (userId, localWishlistIds) {
    if (!localWishlistIds || localWishlistIds.length === 0) return;
    
    const inserts = localWishlistIds.map(bookId => ({
      user_id: userId,
      book_id: bookId
    }));

    const { error } = await supabase
      .from("wishlists")
      .insert(inserts)
      .select();

    // 23505 is the unique constraint error code in Postgres, ignore duplicates
    if (error && error.code !== "23505") {
      console.error("Error syncing wishlist:", error);
    }
  },

  // --- CART ---

  // Get user's cart items
  getCart: async function (userId) {
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, book:books(*)")
      .eq("user_id", userId);

    if (error) throw error;
    return data.map(item => ({
      id: item.book.id,
      quantity: item.quantity,
      book: item.book
    }));
  },

  // Add book to cart
  addToCart: async function (userId, bookId) {
    // Check if item already exists
    const { data: existing, error: checkError } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Increment quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id)
        .select();
      if (error) throw error;
      return data;
    } else {
      // Insert new cart item
      const { data, error } = await supabase
        .from("cart_items")
        .insert({ user_id: userId, book_id: bookId, quantity: 1 })
        .select();
      if (error) throw error;
      return data;
    }
  },

  // Update cart item quantity
  updateCartQuantity: async function (userId, bookId, change) {
    const { data: existing, error: checkError } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .single();

    if (checkError) throw checkError;

    const newQty = existing.quantity + change;
    
    if (newQty <= 0) {
      // Remove item
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return null;
    } else {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", existing.id)
        .select();
      if (error) throw error;
      return data;
    }
  },

  // Remove book from cart
  removeFromCart: async function (userId, bookId) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", bookId);

    if (error) throw error;
  },

  // Sync local cart items with Supabase cart items
  syncCart: async function (userId, localCartItems) {
    if (!localCartItems || localCartItems.length === 0) return;

    for (const item of localCartItems) {
      // Check if existing in DB
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("book_id", item.id)
        .maybeSingle();

      if (existing) {
        // Accumulate quantity
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        // Insert
        await supabase
          .from("cart_items")
          .insert({ user_id: userId, book_id: item.id, quantity: item.quantity });
      }
    }
  },

  // --- ORDERS ---

  // Place order (creates order record, copies items, and empties user cart)
  placeOrder: async function (userId, totalAmount, shippingAddress, phone, cartItems) {
    // 1. Create order header
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        phone: phone,
        status: "pending"
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Prepare order items
    const orderItemsInserts = cartItems.map(item => ({
      order_id: order.id,
      book_id: item.id,
      quantity: item.quantity,
      price: typeof item.book.price === "string"
        ? parseFloat(item.book.price.replace("$", ""))
        : (typeof item.book.price === "number" ? item.book.price : 0)
    }));

    // 3. Insert order items
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsInserts);

    if (itemsError) throw itemsError;

    // 4. Empty cart in database
    const { error: clearError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (clearError) throw clearError;

    return order;
  },

  // Get order history
  getOrderHistory: async function (userId) {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, book:books(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
};
