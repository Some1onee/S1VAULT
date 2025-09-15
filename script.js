// S1VAULT — Interactions & Micro-UX
(function() {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', () => {
    if (window.feather) { window.feather.replace(); }
    initClipboard();
    initGenerator();
    initRevealTimed();
    initDonuts();
    initCodeInputs();
    initRangeOutputs();
    initJumpLinks();
    initToggleVisibility();
  });

  function showToast(message, type='success') {
    const stack = $('.toast-stack');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    stack.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
      setTimeout(() => t.remove(), 240);
    }, 1800);
  }

  function initClipboard() {
    $$('[data-copy]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const val = el.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(val);
          showToast('Copié');
        } catch (err) {
          console.error('Clipboard error', err);
          showToast('Impossible de copier', 'error');
        }
      });
    });
  }

  function initRangeOutputs() {
    const lenRange = $('#lenRange');
    const lenOut = $('#lenOut');
    if (lenRange && lenOut) {
      const sync = () => lenOut.textContent = lenRange.value;
      lenRange.addEventListener('input', sync);
      sync();
    }
  }

  function initJumpLinks() {
    $$('[data-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-jump');
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initToggleVisibility() {
    $$('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.input-with-actions');
        const input = wrap ? $('input', wrap) : null;
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          btn.setAttribute('data-tooltip', 'Masquer');
        } else {
          input.type = 'password';
          btn.setAttribute('data-tooltip', 'Afficher');
        }
      });
    });
  }

  function initRevealTimed() {
    $$('.reveal-timed').forEach(btn => {
      btn.addEventListener('click', () => {
        const seconds = parseInt(btn.getAttribute('data-seconds') || '10', 10);
        const wrapper = btn.closest('.entry-detail');
        const input = wrapper ? $('[data-secret]', wrapper) : null;
        const timer = btn.nextElementSibling;
        const bar = timer ? $('.timer-bar', timer) : null;
        if (!input || !bar) return;
        input.setAttribute('type', 'text');
        const start = Date.now();
        const tick = () => {
          const elapsed = (Date.now() - start) / 1000;
          const pct = Math.max(0, 100 - (elapsed / seconds) * 100);
          bar.style.width = pct + '%';
          if (pct <= 0) {
            input.setAttribute('type', 'password');
            bar.style.width = '0%';
            clearInterval(iv);
          }
        };
        bar.style.width = '100%';
        const iv = setInterval(tick, 100);
        tick();
      });
    });
  }

  function initDonuts() {
    const gradeMap = { A: 92, B: 80, C: 68, D: 56, E: 44, F: 30 };
    $$('.donut').forEach(d => {
      const g = (d.getAttribute('data-grade') || 'B').toUpperCase();
      const p = gradeMap[g] || 72;
      d.style.background = `conic-gradient(var(--accent) 0% ${p}%, rgba(21,227,255,0.25) ${p}% 100%)`;
    });
  }

  function initCodeInputs() {
    const inputs = $$('.code-inputs input');
    if (!inputs.length) return;
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0,1);
        if (inp.value && inputs[idx+1]) inputs[idx+1].focus();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && inputs[idx-1]) inputs[idx-1].focus();
      });
      inp.addEventListener('paste', (e) => {
        const txt = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d{6}$/.test(txt)) {
          e.preventDefault();
          txt.split('').forEach((ch, i) => { if (inputs[i]) inputs[i].value = ch; });
          inputs[inputs.length - 1].focus();
        }
      });
    });
  }

  function initGenerator() {
    const btnGen = $('#btnGenerate');
    const btnCopyAll = $('#btnCopyAll');
    const outputs = $('#outputs');
    const historyList = $('#history');
    const strengthBar = $('#genStrength');
    const range = $('#lenRange');
    const outLen = $('#lenOut');

    if (!btnGen || !outputs) return;

    let genHistory = [];

    const opts = {
      get length() { return parseInt(range.value, 10) || 16; },
      get copies() { return parseInt($('#copies').value, 10) || 1; },
      get upper() { return $('#optUpper').checked; },
      get lower() { return $('#optLower').checked; },
      get digits() { return $('#optDigits').checked; },
      get symbols() { return $('#optSymbols').checked; },
      get ambig() { return $('#optAmbig').checked; },
      get pronounce() { return $('#optPronounce').checked; },
      get excludePatterns() { return $('#optExcludePatterns').checked; },
    };

    btnGen.addEventListener('click', () => {
      const list = generateBatch(opts.length, opts.copies, opts);
      outputs.innerHTML = '';
      list.forEach(pw => outputs.appendChild(renderOutputItem(pw)));
      updateStrength(list[0] || '', strengthBar);
      genHistory = [...list, ...genHistory].slice(0, 8);
      renderHistory(genHistory, historyList);
      showToast('Générés');
    });

    btnCopyAll && btnCopyAll.addEventListener('click', async () => {
      const all = $$('.outputs li .secret').map(el => el.textContent).join('\n');
      try { await navigator.clipboard.writeText(all); showToast('Tous copiés'); } catch { showToast('Échec copie', 'error'); }
    });

    range && range.addEventListener('input', () => { outLen.textContent = range.value; });
  }

  function renderHistory(list, ul) {
    if (!ul) return;
    ul.innerHTML = '';
    list.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.style.fontFamily = 'JetBrains Mono, ui-monospace, monospace';
      li.style.fontSize = '12px';
      li.style.opacity = 0.8;
      ul.appendChild(li);
    });
  }

  function renderOutputItem(pw) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = pw;
    span.className = 'secret';
    const btn = document.createElement('button');
    btn.className = 'icon ghost';
    btn.setAttribute('data-tooltip', 'Copier');
    btn.innerHTML = '<i data-feather="copy"></i>';
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pw); showToast('Copié'); } catch { showToast('Échec copie', 'error'); }
    });
    li.appendChild(span); li.appendChild(btn);
    if (window.feather) window.feather.replace();
    return li;
  }

  function generateBatch(len, copies, opt) {
    const arr = [];
    let guard = 0;
    while (arr.length < copies && guard++ < 500) {
      const pw = opt.pronounce ? genPronounceable(len, opt) : genRandom(len, opt);
      if (opt.excludePatterns && isWeakPattern(pw)) continue;
      arr.push(pw);
    }
    return arr;
  }

  function genRandom(len, opt) {
    let U = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let L = 'abcdefghijkmnopqrstuvwxyz';
    let D = '23456789';
    let S = '!@#$%^&*()_-+=[]{}:;,.?';
    // If the option "Eviter O/0, l/I" (opt.ambig) is checked, we avoid ambiguous chars.
    // If unchecked, include ambiguous ones by extending the pools.
    if (!opt.ambig) { U += 'IO'; L += 'l'; D += '01'; S += '<>'; }
    let pool = '';
    if (opt.upper) pool += U;
    if (opt.lower) pool += L;
    if (opt.digits) pool += D;
    if (opt.symbols) pool += S;
    if (!pool) pool = U + L + D; // fallback
    let out = '';
    const cryptoOK = window.crypto && window.crypto.getRandomValues;
    for (let i=0; i<len; i++) {
      if (cryptoOK) {
        const u32 = new Uint32Array(1); window.crypto.getRandomValues(u32);
        out += pool[u32[0] % pool.length];
      } else {
        out += pool[Math.floor(Math.random() * pool.length)];
      }
    }
    return out;
  }

  function genPronounceable(len, opt) {
    const vowels = 'aeiou';
    const cons = 'bcdfghjkmnpqrstvwxyz';
    const choose = s => s[Math.floor(Math.random() * s.length)];
    let out = '';
    while (out.length < len) {
      out += choose(cons) + choose(vowels);
      if (Math.random() > 0.5) out += choose(cons);
    }
    out = out.slice(0, len);
    if (opt.digits) out = replaceAt(out, Math.floor(len*0.3), String(Math.floor(Math.random()*10)));
    if (opt.symbols) out = replaceAt(out, Math.floor(len*0.7), ['!','@','#','$','%','&'][Math.floor(Math.random()*6)]);
    if (opt.upper) out = out[0].toUpperCase() + out.slice(1);
    return out;
  }
  function replaceAt(s, i, ch) { return s.substring(0,i) + ch + s.substring(i+1); }

  function isWeakPattern(s) {
    const down = s.toLowerCase();
    const bads = ['password', 'qwerty', 'azerty', 'letmein', 'welcome', 'admin'];
    if (/(0123|1234|2345|3456|4567|5678|6789)/.test(down)) return true;
    if (/(aaaa|bbbb|1111|0000)/.test(down)) return true;
    return bads.some(b => down.includes(b));
  }

  function updateStrength(pw, el) {
    if (!el) return;
    const len = pw.length;
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/];
    let variety = 0;
    classes.forEach(re => { if (re.test(pw)) variety++; });
    // Very rough entropy approximation
    let space = 0; // character set size
    if (/[a-z]/.test(pw)) space += 26;
    if (/[A-Z]/.test(pw)) space += 26;
    if (/\d/.test(pw)) space += 10;
    if (/[^\w]/.test(pw)) space += 20;
    space = Math.max(space, 26);
    const bits = Math.min(120, Math.log2(Math.pow(space, Math.max(1, len))));
    const score = Math.max(0, Math.min(100, Math.round(bits / 120 * 100)));

    const bar = $('.bar', el);
    const label = $('.score', el);
    if (bar) bar.style.width = score + '%';
    if (label) label.textContent = String(score);
    el.classList.remove('warn', 'danger');
    if (score < 40) el.classList.add('danger');
    else if (score < 75) el.classList.add('warn');
  }
})();
