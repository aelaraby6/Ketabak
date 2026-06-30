// profile.js
// Profile Page Controller (Account info, Wishlist, Checkout, and Order History tabs)

import { supabase } from "../supabase-config.js";
import { DbService } from "../services/db.js";

let currentUser = null;
let cartItems = [];

// Tab elements
const myAccountBtn = document.getElementById("myAccountBtn");
const viewWishlistBtn = document.getElementById("viewWishlistBtn");
const viewCheckoutBtn = document.getElementById("viewCheckoutBtn");
const viewOrdersBtn = document.getElementById("viewOrdersBtn");
const profileLogoutBtn = document.getElementById("profileLogoutBtn");

// Section elements
const accountSection = document.getElementById("accountSection");
const wishlistSection = document.getElementById("wishlistSection");
const checkoutSection = document.getElementById("checkoutSection");
const ordersSection = document.getElementById("ordersSection");

// Switch tab visibility
function switchTab(activeBtn, activeSection) {
  const buttons = [myAccountBtn, viewWishlistBtn, viewCheckoutBtn, viewOrdersBtn];
  const sections = [accountSection, wishlistSection, checkoutSection, ordersSection];
  
  buttons.forEach(btn => {
    if (btn) {
      btn.classList.remove("active");
      btn.removeAttribute("aria-current");
    }
  });
  
  activeBtn.classList.add("active");
  activeBtn.setAttribute("aria-current", "page");

  sections.forEach(sec => {
    if (sec) {
      sec.classList.add("hidden");
      sec.setAttribute("aria-hidden", "true");
    }
  });

  activeSection.classList.remove("hidden");
  activeSection.setAttribute("aria-hidden", "false");
}

// Load profile data
async function loadProfile() {
  const profileNameEl = document.getElementById("profileFullName");
  const profileEmailEl = document.getElementById("profileEmail");
  
  const firstNameInput = document.getElementById("profileFirstName");
  const lastNameInput = document.getElementById("profileLastName");
  const emailInput = document.getElementById("profileUserEmail");

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (error) throw error;

    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "User Name";

    if (profileNameEl) profileNameEl.textContent = fullName;
    if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

    if (firstNameInput) firstNameInput.value = firstName;
    if (lastNameInput) lastNameInput.value = lastName;
    if (emailInput) emailInput.value = currentUser.email;

  } catch (error) {
    console.error("Error loading profile:", error);
    window.showNotification("Failed to load profile details", "error");
  }
}

// Save profile changes
async function handleProfileUpdate(e) {
  e.preventDefault();

  const firstName = document.getElementById("profileFirstName").value.trim();
  const lastName = document.getElementById("profileLastName").value.trim();
  const submitBtn = document.querySelector("#profileForm button[type='submit']");

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    // 1. Update Auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName }
    });
    if (authError) throw authError;

    // 2. Update Profiles table row
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
      .eq("id", currentUser.id);
    if (dbError) throw dbError;

    window.showNotification("Profile details updated successfully!", "success");
    loadProfile();

  } catch (error) {
    console.error("Profile update error:", error);
    window.showNotification(error.message || "Failed to update profile", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Changes";
  }
}

// Load wishlist items
async function loadWishlist() {
  const container = document.getElementById("wishlistContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="modern-card wishlist-card skeleton" style="height:280px;"></div>
    <div class="modern-card wishlist-card skeleton" style="height:280px;"></div>
  `;

  try {
    const books = await DbService.getWishlist(currentUser.id);
    
    // Sync localStorage wishlist cache
    const bookIds = books.map(b => b.id);
    localStorage.setItem("ketabak_wishlist", JSON.stringify(bookIds));

    container.innerHTML = "";

    if (books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-heart" aria-hidden="true" style="color:var(--text-muted);"></i>
          <h3>Your wishlist is empty</h3>
          <p>You haven't saved any books yet.</p>
          <a href="books.html" class="btn-primary">Browse Books</a>
        </div>
      `;
      return;
    }

    container.innerHTML = books.map(book => {
      const imgUrl = "../" + book.image.replace("../", "");
      return `
        <article class="modern-card wishlist-card">
          <div class="card-header">
            <span class="discount-badge">-15%</span>
            <button onclick="removeFromWishlist(${book.id})" class="remove-wishlist-btn" aria-label="Remove ${book.title} from wishlist">
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
          <div class="book-image-container">
            <img src="${imgUrl}" alt="${book.title}" loading="lazy" />
          </div>
          <div class="book-info">
            <h3>${book.title}</h3>
            <div class="current-price">$${parseFloat(book.price).toFixed(2)}</div>
            <button onclick="addWishlistItemToCart(${book.id})" class="add-cart-btn">Add to Cart</button>
          </div>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error("Wishlist fetch error:", error);
    container.innerHTML = `<p class="error-msg" role="alert">Failed to load wishlist.</p>`;
  }
}

// Global wishlist remove action
window.removeFromWishlist = async function (bookId) {
  const id = parseInt(bookId);
  const confirmDelete = confirm("Remove this book from your wishlist?");
  if (!confirmDelete) return;

  try {
    await DbService.removeFromWishlist(currentUser.id, id);
    window.showNotification("Removed from wishlist", "info");
    loadWishlist();
  } catch (error) {
    console.error("Wishlist remove error:", error);
    window.showNotification("Failed to update wishlist", "error");
  }
};

// Global wishlist add to cart action
window.addWishlistItemToCart = async function (bookId) {
  if (typeof window.addBookToCart === "function") {
    await window.addBookToCart(bookId);
  }
};

// Load checkout summary
async function loadCheckout() {
  const container = document.getElementById("checkoutContainer");
  if (!container) return;

  container.innerHTML = `<div class="checkout-form-box skeleton" style="height:350px; grid-column:1/-1;"></div>`;

  try {
    cartItems = await DbService.getCart(currentUser.id);

    if (cartItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-shopping-cart" aria-hidden="true"></i>
          <h3>Your cart is empty</h3>
          <p>Add books to your cart before proceeding to checkout.</p>
          <a href="books.html" class="btn-primary">Shop Now</a>
        </div>
      `;
      return;
    }

    let subtotal = 0;
    const itemsHtml = cartItems.map(item => {
      const priceVal = parseFloat(item.book.price.toString().replace("$", ""));
      const lineTotal = priceVal * item.quantity;
      subtotal += lineTotal;

      return `
        <div class="order-item">
          <span>${item.book.title} (x${item.quantity})</span>
          <span>$${lineTotal.toFixed(2)}</span>
        </div>
      `;
    }).join("");

    const tax = subtotal * 0.14;
    const shipping = 5.00;
    const finalTotal = subtotal + tax + shipping;

    // Fetch user details for form pre-population
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();
      
    const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    container.innerHTML = `
      <div class="checkout-form-box">
        <h3>Shipping Details</h3>
        <form id="checkoutForm">
          <div class="form-group">
            <label for="fullName">Full Name</label>
            <input type="text" id="fullName" class="form-control" value="${fullName}" required />
          </div>
          <div class="form-group">
            <label for="address">Delivery Address</label>
            <input type="text" id="address" class="form-control" placeholder="123 Main St, Cairo, Egypt" required />
          </div>
          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" class="form-control" placeholder="+20 123 456 7890" required />
          </div>
          <button type="submit" class="place-order-btn">Place Order - $${finalTotal.toFixed(2)}</button>
        </form>
      </div>
      
      <aside class="order-summary-box" aria-label="Order Summary">
        <h3>Order Summary</h3>
        <div class="order-items-list">
          ${itemsHtml}
        </div>
        <div class="order-calculations">
          <div class="calc-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="calc-row"><span>Tax (14%)</span><span>$${tax.toFixed(2)}</span></div>
          <div class="calc-row"><span>Shipping</span><span>$${shipping.toFixed(2)}</span></div>
          <div class="calc-row total-row"><span>Total</span><span>$${finalTotal.toFixed(2)}</span></div>
        </div>
      </aside>
    `;

    document.getElementById("checkoutForm").addEventListener("submit", handleOrderPlacement);

  } catch (error) {
    console.error("Checkout summary load error:", error);
    container.innerHTML = `<p class="error-msg" role="alert">Failed to load checkout details.</p>`;
  }
}

// Handle Order placement form submit
async function handleOrderPlacement(e) {
  e.preventDefault();

  const address = document.getElementById("address").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const submitBtn = document.querySelector("#checkoutForm button[type='submit']");

  let subtotal = 0;
  cartItems.forEach(item => {
    subtotal += parseFloat(item.book.price.toString().replace("$", "")) * item.quantity;
  });
  
  const finalTotal = subtotal + (subtotal * 0.14) + 5.00;

  submitBtn.disabled = true;
  submitBtn.textContent = "Placing Order...";

  try {
    await DbService.placeOrder(currentUser.id, finalTotal, address, phone, cartItems);

    // Empty local storage cart cache and badge
    localStorage.removeItem("ketabak_cart");
    if (window.updateHeaderCartCount) window.updateHeaderCartCount();

    document.getElementById("checkoutContainer").innerHTML = `
      <div class="empty-state success-state" style="grid-column: 1 / -1;">
        <i class="fas fa-check-circle" style="color: var(--color-success);" aria-hidden="true"></i>
        <h3>Order Placed Successfully!</h3>
        <p>Thank you for shopping with Ketabak. Your books will be delivered shortly.</p>
        <button onclick="window.location.href='books.html'" class="btn-primary">Continue Shopping</button>
      </div>
    `;
    window.showNotification("Order placed successfully!", "success");

  } catch (error) {
    console.error("Order placement error:", error);
    window.showNotification("Failed to place order. Try again.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = `Place Order - $${finalTotal.toFixed(2)}`;
  }
}

// Load order history
async function loadOrders() {
  const container = document.getElementById("ordersContainer");
  if (!container) return;

  container.innerHTML = `<div class="order-history-card skeleton" style="height:200px;"></div>`;

  try {
    const orders = await DbService.getOrderHistory(currentUser.id);

    container.innerHTML = "";

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history" aria-hidden="true" style="color:var(--text-muted);"></i>
          <h3>No orders placed yet</h3>
          <p>Browse our catalog and place your first order!</p>
          <a href="books.html" class="btn-primary">Shop Now</a>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const date = new Date(order.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const itemsHtml = order.order_items.map(item => {
        const imgUrl = "../" + item.book.image.replace("../", "");
        return `
          <div class="history-item-row">
            <div class="history-item-details">
              <img src="${imgUrl}" alt="${item.book.title}">
              <div>
                <span class="history-item-title">${item.book.title}</span>
                <span style="font-size:12px; color:var(--text-muted); display:block;">Qty: ${item.quantity}</span>
              </div>
            </div>
            <span>$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
          </div>
        `;
      }).join("");

      return `
        <article class="order-history-card">
          <div class="order-header-info">
            <div class="order-id-date">
              <h4>Order ID: #${order.id.slice(0, 8)}</h4>
              <span>Placed on: ${date}</span>
            </div>
            <span class="order-status-badge ${order.status}">${order.status}</span>
          </div>
          
          <div class="order-history-items">
            ${itemsHtml}
          </div>
          
          <div class="order-footer-details">
            <div>
              <span>Deliver to: ${order.shipping_address}</span>
            </div>
            <div>
              Total: <strong>$${parseFloat(order.total_amount).toFixed(2)}</strong>
            </div>
          </div>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error("Order history load error:", error);
    container.innerHTML = `<p class="error-msg" role="alert">Failed to load order history.</p>`;
  }
}

// Initialise page controller
async function initProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  currentUser = session.user;

  // Bind tab buttons
  myAccountBtn.addEventListener("click", () => {
    switchTab(myAccountBtn, accountSection);
    loadProfile();
  });

  viewWishlistBtn.addEventListener("click", () => {
    switchTab(viewWishlistBtn, wishlistSection);
    loadWishlist();
  });

  viewCheckoutBtn.addEventListener("click", () => {
    switchTab(viewCheckoutBtn, checkoutSection);
    loadCheckout();
  });

  viewOrdersBtn.addEventListener("click", () => {
    switchTab(viewOrdersBtn, ordersSection);
    loadOrders();
  });

  // Edit Profile Form Submit
  const profileForm = document.getElementById("profileForm");
  if (profileForm) profileForm.addEventListener("submit", handleProfileUpdate);

  // Profile Logout Trigger
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", async () => {
      const confirmLogout = confirm("Are you sure you want to logout?");
      if (confirmLogout) {
        try {
          await supabase.auth.signOut();
          localStorage.removeItem("ketabak_cart");
          localStorage.removeItem("ketabak_wishlist");
          window.showNotification("Logged out successfully", "success");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 800);
        } catch (err) {
          window.showNotification(err.message, "error");
        }
      }
    });
  }

  // Parse initial tab from URL routing
  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get('tab');

  if (activeTab === 'checkout') {
    switchTab(viewCheckoutBtn, checkoutSection);
    loadCheckout();
  } else if (activeTab === 'wishlist') {
    switchTab(viewWishlistBtn, wishlistSection);
    loadWishlist();
  } else if (activeTab === 'orders') {
    switchTab(viewOrdersBtn, ordersSection);
    loadOrders();
  } else {
    switchTab(myAccountBtn, accountSection);
    loadProfile();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfile);
} else {
  initProfile();
}
