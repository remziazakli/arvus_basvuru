// Native form controls keep their labels, validation and keyboard behavior.
const editorNames = {fullName:'ad_soyad', email:'e_posta', university:'universite', department:'bolum', portfolio:'portfolyo', motivation:'motivasyon', project:'proje_fikri'};
document.querySelectorAll('.field-grid input, .field-grid textarea').forEach(control => {
  const multiline = control.tagName === 'TEXTAREA';
  const shell = document.createElement('span');
  shell.className = 'code-field' + (multiline ? ' code-field--multiline' : '');
  const header = document.createElement('span');
  header.className = 'code-field-header';
  header.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.textContent = editorNames[control.name] + (multiline ? '.txt' : '');
  const symbol = document.createElement('span');
  symbol.className = 'code-symbol';
  symbol.textContent = multiline ? '// ARVUS' : '="…"';
  header.append(name, symbol);
  const body = document.createElement('span');
  body.className = 'code-field-body';
  const gutter = document.createElement('span');
  gutter.className = 'code-gutter';
  gutter.setAttribute('aria-hidden', 'true');
  gutter.textContent = '01';
  control.before(shell);
  body.append(gutter, control);
  shell.append(header, body);
  if (!multiline) return;
  const footer = document.createElement('span');
  footer.className = 'code-field-footer';
  footer.setAttribute('aria-hidden', 'true');
  const mirror = document.createElement('span');
  mirror.className = 'code-measure';
  mirror.setAttribute('aria-hidden', 'true');
  body.append(mirror);
  shell.append(footer);
  function update() {
    footer.textContent = control.value.length + ' / ' + control.maxLength + ' karakter';
    if (!control.clientWidth) return;
    mirror.style.width = Math.max(1, control.clientWidth - 28) + 'px';
    const content = control.value || control.placeholder;
    const lines = content.split('\n');
    gutter.replaceChildren();
    lines.forEach((line, i) => {
      mirror.textContent = line || ' ';
      const number = document.createElement('span');
      number.textContent = String(i + 1).padStart(2, '0');
      number.style.height = Math.max(26, mirror.getBoundingClientRect().height) + 'px';
      gutter.append(number);
    });
    gutter.scrollTop = control.scrollTop;
  }
  control.addEventListener('input', update);
  control.addEventListener('scroll', () => { gutter.scrollTop = control.scrollTop; });
  control.form.addEventListener('reset', () => requestAnimationFrame(update));
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(control);
  update();
});
