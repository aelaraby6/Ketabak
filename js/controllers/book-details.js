import { supabase } from "../supabase-config.js";
import { DbService } from "../services/db.js";

let currentBook = null;
let allBooks = [];

// Generate stars HTML
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let starsHTML = "";

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  return starsHTML;
}

// Render values into elements
function displayBookDetails(book) {
  if (!book) {
    window.showNotification("Book details not found", "error");
    setTimeout(() => {
      window.location.href = "books.html";
    }, 1500);
    return;
  }

  currentBook = book;

  // Resolve relative image path
  const imgUrl = "../" + book.image.replace("../", "");
  document.getElementById("book-cover").src = imgUrl;
  document.getElementById("book-cover").alt = `Cover of ${book.title}`;

  document.getElementById("book-title").textContent = book.title;
  document.getElementById("book-author").textContent = book.authors || "Unknown Author";

  const subtitleElement = document.getElementById("book-subtitle");
  if (book.subtitle) {
    subtitleElement.textContent = book.subtitle;
    subtitleElement.style.display = "block";
  } else {
    subtitleElement.style.display = "none";
  }

  const starsContainer = document.getElementById("stars-container");
  starsContainer.innerHTML = `
    ${generateStars(book.rating)}
    <span class="rating-text" style="color:var(--text-secondary); margin-left:8px;">${book.rating}/5</span>
  `;

  document.getElementById("book-price").textContent = `$${parseFloat(book.price).toFixed(2)}`;

  // Stock Badge & count
  const stockBadge = document.getElementById("stock-badge");
  const stockText = document.getElementById("book-stock");
  const isLowStock = book.stock < 10;
  const isOutOfStock = book.stock <= 0;

  if (isOutOfStock) {
    stockBadge.textContent = "✗ Out of Stock";
    stockBadge.className = "stock-badge out-of-stock";
    stockText.textContent = "Currently unavailable";
    stockText.style.color = "var(--color-error)";
    
    // Disable Add to Cart button
    const cartBtn = document.getElementById("addToCartBtn");
    if (cartBtn) {
      cartBtn.disabled = true;
      cartBtn.style.opacity = "0.5";
      cartBtn.style.cursor = "not-allowed";
    }
  } else if (isLowStock) {
    stockBadge.textContent = "⚠️ Low Stock";
    stockBadge.className = "stock-badge low-stock";
    stockText.textContent = `Only ${book.stock} copies left!`;
    stockText.style.color = "var(--color-warning)";
  } else {
    stockBadge.textContent = "✓ In Stock";
    stockBadge.className = "stock-badge in-stock";
    stockText.textContent = `${book.stock} copies available`;
    stockText.style.color = "var(--color-success)";
  }

  // Description & metadata
  const descElement = document.getElementById("book-desc-main");
  descElement.textContent = book.description || `A comprehensive book about "${book.title}" by ${book.authors}. Explore essential concepts, detailed structures, and technical methodologies tailored for professionals.`;

  document.getElementById("book-publisher").textContent = book.publisher || "Unknown Publisher";
  document.getElementById("book-year").textContent = book.publisherYear || "N/A";
  document.getElementById("book-isbn").textContent = book.isbn13 || "N/A";

  // Store url link
  const urlLink = document.getElementById("book-url");
  if (book.url) {
    urlLink.href = book.url;
    urlLink.style.display = "inline-flex";
  } else {
    urlLink.style.display = "none";
  }

  // Sync wishlist icon state
  updateWishlistButtonState();
}

// Update wishlist icon based on localStorage cache
function updateWishlistButtonState() {
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  if (!bookmarkBtn || !currentBook) return;

  const icon = bookmarkBtn.querySelector("i");
  const wishlist = JSON.parse(localStorage.getItem("ketabak_wishlist")) || [];
  const isInWishlist = wishlist.includes(currentBook.id);

  if (isInWishlist) {
    icon.className = "fa-solid fa-bookmark";
    icon.style.color = "var(--color-error)";
    bookmarkBtn.setAttribute("aria-label", "Remove from wishlist");
  } else {
    icon.className = "fa-regular fa-bookmark";
    icon.style.color = "";
    bookmarkBtn.setAttribute("aria-label", "Add to wishlist");
  }
}

// Toggle Wishlist operation
async function handleWishlistToggle() {
  if (!currentBook) return;
  const bookId = currentBook.id;

  let wishlist = JSON.parse(localStorage.getItem("ketabak_wishlist")) || [];
  const isAdding = !wishlist.includes(bookId);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (isAdding) {
      wishlist.push(bookId);
      if (session) {
        await DbService.addToWishlist(session.user.id, bookId);
      }
      window.showNotification("Added to wishlist!", "success");
    } else {
      wishlist = wishlist.filter(id => id !== bookId);
      if (session) {
        await DbService.removeFromWishlist(session.user.id, bookId);
      }
      window.showNotification("Removed from wishlist", "info");
    }

    localStorage.setItem("ketabak_wishlist", JSON.stringify(wishlist));
    updateWishlistButtonState();
  } catch (error) {
    console.error("Error toggling details page wishlist:", error);
    window.showNotification("Failed to update wishlist", "error");
  }
}

// Add to Cart handler
function handleAddToCart() {
  if (!currentBook) return;
  if (typeof window.addBookToCart === "function") {
    window.addBookToCart(currentBook.id);
  }
}

// Book detail prev/next navigation
async function handleNavigation(direction) {
  if (allBooks.length === 0) return;

  const currentIndex = allBooks.findIndex((b) => b.id === currentBook.id);
  if (currentIndex === -1) return;

  let newIndex;
  if (direction === "prev") {
    newIndex = currentIndex > 0 ? currentIndex - 1 : allBooks.length - 1;
  } else {
    newIndex = currentIndex < allBooks.length - 1 ? currentIndex + 1 : 0;
  }

  const nextBook = allBooks[newIndex];
  // Redirect to refresh page details with new ID parameter
  window.location.href = `book.html?id=${nextBook.id}`;
}

// Load data based on URL parameter
async function initDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const idStr = urlParams.get("id");
  const bookId = parseInt(idStr);

  if (!idStr || isNaN(bookId)) {
    window.location.href = "books.html";
    return;
  }

  // Set up event listeners
  const addToCartBtn = document.getElementById("addToCartBtn");
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (addToCartBtn) addToCartBtn.addEventListener("click", handleAddToCart);
  if (bookmarkBtn) bookmarkBtn.addEventListener("click", handleWishlistToggle);
  if (prevBtn) prevBtn.addEventListener("click", () => handleNavigation("prev"));
  if (nextBtn) nextBtn.addEventListener("click", () => handleNavigation("next"));

  try {
    // 1. Fetch current book and all books (for navigation links)
    allBooks = await DbService.getBooks();
    const book = allBooks.find(b => b.id === bookId);
    displayBookDetails(book);
  } catch (dbError) {
    console.error("Supabase fetch details failed:", dbError);
    window.showNotification("Could not load book details.", "error");
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetails);
} else {
  initDetails();
}
