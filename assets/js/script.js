// script.js

function toggleTheme() {
  var themeIcon = document.getElementById("theme-icon");
  var body = document.getElementsByTagName("body")[0];
  
  if (body.classList.contains("dark-theme")) {
    body.classList.remove("dark-theme");
    themeIcon.src = "sun-icon.png";
  } else {
    body.classList.add("dark-theme");
    themeIcon.src = "moon-icon.png";
  }
}

