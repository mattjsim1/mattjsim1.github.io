// Contact form submit
const form = document.getElementById('contact-form');
const message = document.getElementById('form-message');

form.addEventListener('submit', e => {
  e.preventDefault();
  message.textContent = "Thanks! Your message has been sent.";
  form.reset();
});
