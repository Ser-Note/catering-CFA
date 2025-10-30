document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // stop default form submit

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");
  message.textContent = "";

  if (!username || !password) {
    message.textContent = "Please enter username and password.";
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.redirect) {
      window.location.href = data.redirect;
    } else {
      message.textContent = data.error || "Login failed. Check your credentials.";
    }
  } catch (err) {
    console.error("Login request failed:", err);
    message.textContent = "Network error. Please try again.";
  }
});
