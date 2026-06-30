// cart-controller.js
// Shopping Cart Page Controller

import { supabase } from "../supabase-config.js";
import { DbService } from "../services/db.js";

let allBooksData = [];

// Get session helper
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Fetch all books (for details retrieval on guest cart rendering)
async function loadBooksReference() {
  try {
    allBooksData = await DbService.getBooks();
  } catch (err) {
    console.warn("DB book fetch failed, loading JSON reference:", err);
    try {
      const response = await fetch("../data/books.json");
      const data = await response.json();
      allBooksData = data.books.map((b, idx) => ({ ...b, id: idx + 1 }));
    } catch (fallbackErr) {
      console.error("Failed to load reference books:", fallbackErr);
    }
  }
}

// Render the cart elements
async function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!container || !totalEl) return;

  // Show skeleton loader
  container.innerHTML = `
    <div class="cart-item skeleton" style="height: 140px; margin-bottom: 15px;"></div>
    <div class="cart-item skeleton" style="height: 140px; margin-bottom: 15px;"></div>
  `;

  try {
    const session = await getSession();
    let cartItems = [];
    let subtotal = 0;

    if (session) {
      // Fetch cart items from Supabase
      cartItems = await DbService.getCart(session.user.id);
    } else {
      // Fetch guest cart items from local storage
      const localCart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];
      cartItems = localCart.map(item => {
        const book = allBooksData.find(b => b.id === item.id);
        return {
          id: item.id,
          quantity: item.quantity,
          book: book
        };
      }).filter(item => item.book !== undefined);
    }

    container.innerHTML = "";

    if (cartItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-shopping-cart" aria-hidden="true"></i>
          <h3>Your cart is empty</h3>
          <p>Browse our catalog to add books to your shopping cart.</p>
          <a href="books.html" class="btn-primary" style="margin-top: 10px;">Explore Books</a>
        </div>
      `;
      totalEl.textContent = "$0.00";
      return;
    }

    cartItems.forEach(item => {
      const book = item.book;
      const priceNum = parseFloat(book.price.toString().replace("$", ""));
      const itemTotal = priceNum * item.quantity;
      subtotal += itemTotal;

      const imgUrl = "../" + book.image.replace("../", "");

      container.innerHTML += `
        <div class="cart-item" data-id="${book.id}">
          <img src="${imgUrl}" alt="${book.title}">
          
          <div class="cart-item-info">
            <h4>${book.title}</h4>
            <p>$${priceNum.toFixed(2)}</p>
          </div>
          
          <div class="quantity-controls">
            <button onclick="changeQuantity(${book.id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="changeQuantity(${book.id}, 1)">+</button>
          </div>
          
          <button class="remove-btn" onclick="removeItem(${book.id})" aria-label="Remove ${book.title} from cart">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    });

    totalEl.textContent = `$${subtotal.toFixed(2)}`;

  } catch (error) {
    console.error("Cart render error:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error loading cart</h3>
        <p>Could not fetch your shopping cart items.</p>
      </div>
    `;
  }
}

// Global function exposed on window for quantity buttons
window.changeQuantity = async function (bookId, change) {
  const id = parseInt(bookId);
  try {
    const session = await getSession();

    if (session) {
      // Update in Supabase
      await DbService.updateCartQuantity(session.user.id, id, change);
      
      // Sync cache
      const dbCart = await DbService.getCart(session.user.id);
      const cacheCart = dbCart.map(item => ({ id: item.id, quantity: item.quantity }));
      localStorage.setItem("ketabak_cart", JSON.stringify(cacheCart));
    } else {
      // Update in Guest local storage
      let cart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];
      const item = cart.find(i => i.id === id);
      
      if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
          cart = cart.filter(i => i.id !== id);
        }
        localStorage.setItem("ketabak_cart", JSON.stringify(cart));
      }
    }

    // Refresh UI & Header count
    if (window.updateHeaderCartCount) window.updateHeaderCartCount();
    renderCart();

  } catch (error) {
    console.error("Change quantity error:", error);
    window.showNotification("Failed to update quantity", "error");
  }
};

// Global function exposed on window for remove button
window.removeItem = async function (bookId) {
  const id = parseInt(bookId);
  const confirmDelete = confirm("Are you sure you want to remove this book from your cart?");
  if (!confirmDelete) return;

  try {
    const session = await getSession();

    if (session) {
      // Remove in Supabase
      await DbService.removeFromCart(session.user.id, id);
      
      // Sync cache
      const dbCart = await DbService.getCart(session.user.id);
      const cacheCart = dbCart.map(item => ({ id: item.id, quantity: item.quantity }));
      localStorage.setItem("ketabak_cart", JSON.stringify(cacheCart));
    } else {
      // Remove in Guest local storage
      let cart = JSON.parse(localStorage.getItem("ketabak_cart")) || [];
      cart = cart.filter(i => i.id !== id);
      localStorage.setItem("ketabak_cart", JSON.stringify(cart));
    }

    window.showNotification("Item removed from cart", "info");
    if (window.updateHeaderCartCount) window.updateHeaderCartCount();
    renderCart();

  } catch (error) {
    console.error("Remove cart item error:", error);
    window.showNotification("Failed to remove item", "error");
  }
};

// Initialise page
async function initCart() {
  await loadBooksReference();
  renderCart();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCart);
} else {
  initCart();
}
