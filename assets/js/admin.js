/* =========================================================
   Learning Journey Admin Login
   Secure Login v1
   ========================================================= */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOHLGgAxYbhITD4PYOEaFKVWZMntDHMCQ5raJYiDgwo2CQeFGTCXp-BUxPCF4Mu9k/exec";

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

function setLoginMessage(message, type) {
  loginMessage.textContent = message || "";
  loginMessage.className = "form-message";
  if (type) loginMessage.classList.add(type);
}

loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    setLoginMessage("Please enter your username and password.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";
  setLoginMessage("Checking account...", "");

  try {
    const formData = new URLSearchParams();
    formData.append("action", "login");
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      sessionStorage.setItem("lj_logged_in", "true");
      sessionStorage.setItem("lj_token", result.token || "");
      sessionStorage.setItem("lj_username", result.username || username);
      sessionStorage.setItem("lj_name", result.name || username);
      sessionStorage.setItem("lj_role", result.role || "");
      sessionStorage.setItem("lj_expires_at", result.expires_at || "");

      setLoginMessage("Login successful. Redirecting...", "success");
      window.location.href = "dashboard.html";
      return;
    }

    setLoginMessage(result.message || "Invalid username or password.", "error");
  } catch (error) {
    setLoginMessage("Login failed. Please check your connection and try again.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});
