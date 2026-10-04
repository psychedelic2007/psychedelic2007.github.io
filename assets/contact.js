// Contact form → email, via FormSubmit (https://formsubmit.co), which needs no
// server or account. The first submission sends a one-time activation email to
// the inbox below; after clicking that link, every message is forwarded.
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const ENDPOINT = 'https://formsubmit.co/ajax/satyamsangeet229@gmail.com';
  const status = document.getElementById('formStatus');
  const btn = document.getElementById('formSend');

  function say(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return;                              // bot filled the hidden field
    const bad = ['name', 'email', 'message'].find(k => !String(data[k] || '').trim()) ||
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && 'email');
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    if (bad) {
      const field = form.elements[bad];
      field.closest('.field').classList.add('invalid');
      field.focus();
      return say(bad === 'email' ? 'Please enter a valid email address.' : `Please fill in your ${bad}.`, 'err');
    }

    btn.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          _replyto: data.email.trim(),
          _subject: 'Portfolio message: ' + (data.subject.trim() || 'no subject'),
          subject: data.subject.trim(),
          message: data.message.trim(),
          _template: 'table',
          _captcha: 'false',
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && String(out.success) === 'true') {
        form.reset();
        say('Sent. Thank you, I’ll get back to you soon.', 'ok');
      } else {
        throw new Error(out.message || 'Request failed');
      }
    } catch (err) {
      say('Couldn’t send just now. Please email me directly at satyamsangeet229@gmail.com.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
})();
