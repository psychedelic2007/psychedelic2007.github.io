<script>
  function toggleTheme() {
    document.body.classList.toggle('light');
    document.querySelector('header').classList.toggle('light');
    document.querySelector('footer').classList.toggle('light');
  }

  const themeButton = document.querySelector('#themeButton');
  themeButton.addEventListener('click', function() {
    document.body.classList.contains('light') ? document.body.classList.remove('light') : document.body.classList.add('light');
  });
</script>
