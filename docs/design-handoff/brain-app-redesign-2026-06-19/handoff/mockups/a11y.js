/* Iflands Neuro — A11y-Helfer
   Macht div-basierte Bedienelemente (role="button") per Tastatur aktivierbar:
   Enter oder Leertaste löst denselben Klick aus. Native <button>/<a> bleiben unberührt. */
(function () {
  if (window.__ifnA11y) return;
  window.__ifnA11y = true;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var tag = t.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (t.getAttribute('role') === 'button') {
      e.preventDefault();
      if (typeof t.click === 'function') t.click();
    }
  });
})();

/* Ruhemodus — reizarm: reduziert Bewegung/Animationen global, persistent in localStorage['ifn-ruhe'] */
(function () {
  function apply(on) {
    var de = document.documentElement;
    if (on) de.setAttribute('data-ruhe', 'on'); else de.removeAttribute('data-ruhe');
    var id = 'ifn-ruhe-style';
    var s = document.getElementById(id);
    if (on) {
      if (!s) {
        s = document.createElement('style');
        s.id = id;
        s.textContent = '[data-ruhe="on"] *{animation:none !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}';
        document.head.appendChild(s);
      }
    } else if (s) { s.remove(); }
  }
  window.ifnSetRuhe = function (on) {
    try { localStorage.setItem('ifn-ruhe', on ? '1' : '0'); } catch (e) {}
    apply(!!on);
  };
  function init() {
    var on = false;
    try { on = localStorage.getItem('ifn-ruhe') === '1'; } catch (e) {}
    apply(on);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
