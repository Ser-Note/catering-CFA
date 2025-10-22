    document.getElementById("cateringForm").addEventListener("submit", function(e) {
      e.preventDefault();
      const choice = document.getElementById("choice").value;

      if (choice === "prev_txt") {
        // Redirect to PHP that reads catering.txt
        window.location.href = "../previous_catering/";
      } else if (choice === "prev_json") {
        window.location.href = "../edit_catering_json/";
      } else if (choice === "new-sandwich") {
        window.location.href = "../new_catering/";
      } else if (choice === "new-regular") {
        window.location.href = "../create_reg_catering/";
      } else if (choice == "foh") {
        window.location.href = "../foh_catering/";
      } else if (choice == "boh") {
        window.location.href = "../boh_catering/";
      } else if (choice == "add-delete") {
        window.location.href = "../add-delete-employees/";
      } else {
        document.getElementById("message").textContent = "Please select an option.";
        document.getElementById("message").style.color = "red";
      }
    });