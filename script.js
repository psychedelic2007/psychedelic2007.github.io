function toggleTheme() {
  document.body.classList.toggle('light');
  document.querySelector('header').classList.toggle('light');
  document.querySelector('footer').classList.toggle('light');
}

document.addEventListener('DOMContentLoaded', function() {
  const themeButton = document.querySelector('#themeButton');
  themeButton.addEventListener('click', function() {
    toggleTheme();
  });
});
