    document.getElementById("cateringForm").addEventListener("submit", function(e) {
      e.preventDefault();
      const choice = document.getElementById("choice").value;

      if (choice === "dashboard") {
        window.location.href = "/dashboard";
      } else if (choice === "prev_txt") {
        // Redirect to route that reads catering.json
        window.location.href = "/catering";
      } else if (choice === "prev_json") {
        window.location.href = "/json-catering";
      } else if (choice === "new-sandwich") {
        window.location.href = "/fundraiser";
      } else if (choice === "new-regular") {
        window.location.href = "/create-regular";
      } else if (choice === "today-boh") {
        window.location.href = "/orders?view=boh";
      } else if (choice === "today-foh") {
        window.location.href = "/orders?view=foh";
      } else if (choice === "change_password") {
        window.location.href = "/change-password";
      } else if (choice === "add-delete") {
        window.location.href = "/employees/";
      } else {
        document.getElementById("message").textContent = "Please select an option.";
        document.getElementById("message").style.color = "red";
      }
    });