document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const message = document.getElementById("message");

  if (firstName && lastName) {
    message.textContent = `Welcome, ${firstName} ${lastName}! (This will later connect to PHP/Excel)`;
    message.style.color = "green";
    console.log("Name entered:", firstName, lastName);
  } else {
    message.textContent = "Please enter both your first and last name.";
    message.style.color = "red";
  }
});
