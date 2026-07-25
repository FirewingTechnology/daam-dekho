import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { FooterObserverProvider } from "./contexts/FooterOnserverContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Clear old stale localStorage keys on startup
try {
  localStorage.removeItem("compareList");
} catch (e) {
  // silently ignore
}

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <FooterObserverProvider>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </FooterObserverProvider>
  </ThemeProvider>
);

