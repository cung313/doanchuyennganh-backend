document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-confirm]');
  if (btn) {
    const msg = btn.getAttribute('data-confirm') || 'Are you sure?';
    if (!window.confirm(msg)) e.preventDefault();
  }

  const close = e.target.closest('[data-flash-close]');
  if (close) {
    const box = close.closest('.flash');
    if (box) box.remove();
  }
});
