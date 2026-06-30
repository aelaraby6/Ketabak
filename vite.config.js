import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "pages/about.html"),
        authors: resolve(__dirname, "pages/authors.html"),
        book: resolve(__dirname, "pages/book.html"),
        books: resolve(__dirname, "pages/books.html"),
        cart: resolve(__dirname, "pages/cart.html"),
        categories: resolve(__dirname, "pages/categories.html"),
        login: resolve(__dirname, "pages/login.html"),
        profile: resolve(__dirname, "pages/profile.html"),
        signup: resolve(__dirname, "pages/signup.html"),
        resetPassword: resolve(__dirname, "pages/reset-password.html")
      }
    }
  }
});
