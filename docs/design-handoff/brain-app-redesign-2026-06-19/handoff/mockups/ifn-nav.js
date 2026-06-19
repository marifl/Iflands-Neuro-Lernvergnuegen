/* Iflands Neuro — globale Navigation (Single Source of Truth)
   Light-DOM Web-Component: erbt die data-theme Tokens des Host-Frames.
   Verwendung:
     <ifn-nav variant="rail" active="explorer"></ifn-nav>   (Landscape)
     <ifn-nav variant="dock" active="explorer"></ifn-nav>   (Portrait)
   Bereiche (immer gleich, überall erreichbar):
     start · lernen · explorer · faelle · wiki · chat · settings
*/
(function () {
  if (window.customElements && customElements.get('ifn-nav')) return;

  var I = {
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>',
    lernen: '<path d="M12 7v14M3 18a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5a3 3 0 0 1 4 2 3 3 0 0 1 4-2h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6a3 3 0 0 0-3 1 3 3 0 0 0-3-1z"/>',
    explorer: '<circle cx="12" cy="12" r="9.2"/><polygon points="15.6 8.4 10.6 10.6 8.4 15.6 13.4 13.4"/>',
    faelle: '<path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.2 3H16a2 2 0 0 0-1.4 3.4A1.9 1.9 0 0 1 12 21Z"/><circle cx="7.6" cy="11" r="1.1"/><circle cx="11" cy="7.4" r="1.1"/><circle cx="15.4" cy="9.2" r="1.1"/>',
    wiki: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    layer: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    slide: '<path d="M2 3h20v14H2zM8 21h8M12 17v4"/>',
    settings: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>'
  };

  // Alle Ziele (Single Source of Truth)
  var AREAS = {
    start:    { label: 'Start',        href: 'LauncherFrame.dc.html',          icon: I.brain },
    lernen:   { label: 'Lernen',       href: 'AppFrame.dc.html?mode=lernen',   icon: I.lernen },
    explorer: { label: 'Explorer',     href: 'AppFrame.dc.html?mode=explorer', icon: I.explorer },
    faelle:   { label: 'Fälle',        href: 'FaelleFrame.dc.html',            icon: I.faelle },
    wiki:     { label: 'Wiki',         href: 'WikiFrame.dc.html',              icon: I.wiki },
    chat:     { label: 'Chat',         href: 'ChatFrame.dc.html',              icon: I.chat },
    faerbung: { label: 'Färbung',      href: 'FaerbungFrame.dc.html',          icon: I.faelle },
    werkzeuge:{ label: 'Werkzeuge',    href: 'ExplorerToolsFrame.dc.html',     icon: I.tool },
    atlas:    { label: 'Atlas & ERP',  href: 'AtlasErpFrame.dc.html',          icon: I.layer },
    timeline: { label: 'Timeline',     href: 'TimelineSnapshotFrame.dc.html',  icon: I.clock },
    collection:{label: 'Sammlung',     href: 'CollectionFrame.dc.html',        icon: I.grid },
    faellebrowser:{label:'Fälle-Browser',href:'FaelleBrowserFrame.dc.html',     icon: I.faelle },
    presenter:{ label: 'Presenter',    href: 'PresenterFrame.dc.html',         icon: I.slide },
    participant:{label:'Companion',    href: 'ParticipantFrame.dc.html',       icon: I.gear },
    authoring:{ label: 'Authoring',    href: 'AuthoringFrame.dc.html',         icon: I.layer },
    admin:    { label: 'Admin',        href: 'AdminFrame.dc.html',             icon: I.gear },
    settings: { label: 'Einstellungen',href: 'SettingsFrame.dc.html',          icon: I.gear }
  };
  // Rail/Dock = primäre Bereiche
  var RAIL_ITEMS = ['lernen', 'explorer', 'faelle', 'wiki', 'chat'];
  var DOCK_ITEMS = ['start', 'lernen', 'explorer', 'faelle'];
  // Sheet = vollständiges, überall identisches Menü (gruppiert)
  var SHEET_GROUPS = [
    { title: 'Einstieg', keys: ['start'] },
    { title: 'Lernen & Fälle', keys: ['lernen', 'faelle', 'faellebrowser'] },
    { title: 'Explorer', keys: ['explorer', 'faerbung', 'werkzeuge', 'atlas', 'timeline', 'collection'] },
    { title: 'Wissen', keys: ['wiki', 'chat'] },
    { title: 'Vortrag', keys: ['presenter', 'participant'] },
    { title: 'Verwaltung', keys: ['authoring', 'admin', 'settings'] }
  ];

  function svg(path, size) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  var MONO = "'IBM Plex Mono',monospace";

  function curTheme(el) {
    var r = el.closest('[data-theme]');
    var t = r && r.getAttribute('data-theme');
    if (t === 'hell' || t === 'dark') return t;
    try { var s = localStorage.getItem('ifn-theme'); if (s === 'hell' || s === 'dark') return s; } catch (e) {}
    return 'dark';
  }

  var proto = Object.create(HTMLElement.prototype);

  proto.connectedCallback = function () {
    if (!this._sr) this._sr = this.attachShadow({ mode: 'open' });
    this.render();
  };
  proto.attributeChangedCallback = function () { if (this._sr) this.render(); };

  proto.go = function (href) { location.href = href; };

  proto.toggleTheme = function () {
    var nx = curTheme(this) === 'hell' ? 'dark' : 'hell';
    try { localStorage.setItem('ifn-theme', nx); } catch (e) {}
    // ganzheitlich & konsistent: Frame neu laden, damit alle Komponenten dasselbe Theme ziehen
    location.reload();
  };

  proto.openSheet = function () {
    var self = this;
    var th = curTheme(this);
    var active = this.getAttribute('active') || '';
    var here = this.getAttribute('here') || active;
    var wrap = document.createElement('div');
    wrap.setAttribute('data-theme', th);
    wrap.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;justify-content:flex-end;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;';
    var groups = SHEET_GROUPS.map(function (g) {
      var rows = g.keys.map(function (k) {
        var a = AREAS[k]; if (!a) return '';
        var on = k === here;
        return '<button data-go="' + a.href + '" style="display:flex;align-items:center;gap:13px;width:100%;min-height:48px;background:' + (on ? 'var(--sel)' : 'transparent') + ';border:none;color:var(--t1);cursor:pointer;padding:0 22px;text-align:left;">' +
          '<span style="display:flex;color:' + (on ? '#f26b1f' : 'var(--t3)') + ';">' + svg(a.icon, 19) + '</span>' +
          '<span style="font-size:14px;font-weight:600;">' + a.label + '</span>' +
          (on ? '<span style="margin-left:auto;font-family:' + MONO + ';font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#f26b1f;">Hier</span>' : '') +
          '</button>';
      }).join('');
      return '<div style="font-family:' + MONO + ';font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--t4);padding:13px 22px 6px;">' + g.title + '</div>' + rows;
    }).join('');
    var ico = th === 'hell' ? I.moon : I.sun;
    var tl = th === 'hell' ? 'Dunkelmodus' : 'Hellmodus';
    wrap.innerHTML =
      '<div data-close="1" style="position:absolute;inset:0;background:rgba(0,0,0,.5);"></div>' +
      '<div style="position:relative;background:var(--panel);border-top:1px solid var(--line);max-height:86%;overflow-y:auto;padding-bottom:14px;box-shadow:0 -16px 40px rgba(0,0,0,.4);">' +
        '<div style="position:sticky;top:0;background:var(--panel);display:flex;align-items:center;justify-content:space-between;padding:16px 22px 10px;border-bottom:1px solid var(--line2);z-index:1;">' +
          '<span style="display:flex;align-items:center;gap:9px;"><span style="width:24px;height:24px;background:#f26b1f;display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--onacc)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.brain + '</svg></span><span style="font-size:14px;font-weight:700;letter-spacing:-.01em;color:var(--t1);">Navigation</span></span>' +
          '<button data-close="1" style="display:flex;background:transparent;border:none;color:var(--t3);cursor:pointer;min-width:44px;min-height:44px;align-items:center;justify-content:flex-end;">' + svg(I.close, 18) + '</button>' +
        '</div>' +
        groups +
        '<button data-theme-toggle="1" style="display:flex;align-items:center;gap:13px;width:100%;min-height:52px;background:transparent;border:none;border-top:1px solid var(--line2);margin-top:8px;color:var(--t1);cursor:pointer;padding:0 22px;text-align:left;">' +
          '<span style="display:flex;color:#f26b1f;">' + svg(ico, 19) + '</span>' +
          '<span style="font-size:14px;font-weight:600;">' + tl + '</span></button>' +
      '</div>';
    wrap.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { self.go(go.getAttribute('data-go')); return; }
      if (e.target.closest('[data-theme-toggle]')) { self.toggleTheme(); return; }
      if (e.target.closest('[data-close]')) { document.body.removeChild(wrap); }
    });
    document.body.appendChild(wrap);
  };

  proto.railItem = function (key, active) {
    var a = AREAS[key];
    var on = key === active;
    var col = on ? 'var(--t1)' : 'var(--t4)';
    return '<button data-go="' + a.href + '" title="' + a.label + '" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 0;width:100%;background:transparent;border:none;cursor:pointer;color:' + col + ';">' +
      (on ? '<span style="position:absolute;left:0;top:7px;bottom:7px;width:3px;background:#f26b1f;"></span>' : '') +
      svg(a.icon, 20) +
      '<span style="font-family:' + MONO + ';font-size:6.5px;letter-spacing:.06em;text-transform:uppercase;">' + a.label + '</span></button>';
  };

  proto.dockItem = function (key, active, isMore) {
    var primary = ['start', 'lernen', 'explorer', 'faelle'];
    var on = isMore ? (active && primary.indexOf(active) < 0) : (key === active);
    var col = on ? 'var(--t1)' : 'var(--t4)';
    var a = isMore ? { label: 'Mehr', icon: I.settings } : AREAS[key];
    var attr = isMore ? 'data-more="1"' : 'data-go="' + a.href + '"';
    return '<button ' + attr + ' style="position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:transparent;border:none;cursor:pointer;color:' + col + ';border-right:1px solid var(--line2);min-height:44px;">' +
      (on ? '<span style="position:absolute;top:0;left:0;right:0;height:2px;background:#f26b1f;"></span>' : '') +
      svg(a.icon, 20) +
      '<span style="font-family:' + MONO + ';font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;">' + a.label + '</span></button>';
  };

  proto.render = function () {
    if (!this._sr) this._sr = this.attachShadow({ mode: 'open' });
    var variant = this.getAttribute('variant') || 'rail';
    var active = this.getAttribute('active') || '';
    var th = curTheme(this);
    var self = this;

    if (variant === 'dock') {
      this.style.cssText = 'display:block;width:100%;flex:none;';
      var dockHtml = '<div style="height:64px;display:flex;background:var(--panel);border-top:1px solid var(--line);">';
      DOCK_ITEMS.forEach(function (k) { dockHtml += self.dockItem(k, active, false); });
      dockHtml += this.dockItem('settings', active, true);
      dockHtml += '</div>';
      this._sr.innerHTML = dockHtml;
    } else {
      this.style.cssText = 'display:block;width:64px;flex:none;align-self:stretch;';
      var logoOn = active === 'start';
      var themeIco = th === 'hell' ? I.moon : I.sun;
      var themeLabel = th === 'hell' ? 'Dunkel' : 'Hell';
      var railHtml = '<div style="height:100%;display:flex;flex-direction:column;align-items:center;background:var(--rail);border-right:1px solid var(--line);padding:13px 0;box-sizing:border-box;">' +
        '<button data-go="' + AREAS.start.href + '" title="Start · Moduswahl" style="width:30px;height:30px;flex:none;background:#f26b1f;display:flex;align-items:center;justify-content:center;margin-bottom:12px;border:none;cursor:pointer;">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--onacc)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.brain + '</svg></button>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;">';
      RAIL_ITEMS.forEach(function (k) { railHtml += self.railItem(k, active); });
      railHtml += '</div>' +
        '<div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;">' +
          '<button data-theme-toggle="1" title="Theme wechseln" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 0;width:100%;background:transparent;border:none;cursor:pointer;color:var(--t4);">' +
            svg(themeIco, 19) + '<span style="font-family:' + MONO + ';font-size:6.5px;letter-spacing:.06em;text-transform:uppercase;">' + themeLabel + '</span></button>' +
          '<button data-more="1" title="Mehr · alle Bereiche" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 0;width:100%;background:transparent;border:none;cursor:pointer;color:var(--t4);">' +
            svg(I.settings, 20) + '<span style="font-family:' + MONO + ';font-size:6.5px;letter-spacing:.06em;text-transform:uppercase;">Mehr</span></button>' +
        '</div>' +
      '</div>';
      this._sr.innerHTML = railHtml;
    }

    if (!this._bound) {
      this._bound = true;
      this._sr.addEventListener('click', function (e) {
        var go = e.target.closest('[data-go]');
        if (go) { self.go(go.getAttribute('data-go')); return; }
        if (e.target.closest('[data-theme-toggle]')) { self.toggleTheme(); return; }
        if (e.target.closest('[data-more]')) { self.openSheet(); return; }
      });
    }
  };

  if (window.customElements) {
    try {
      var Ctor = function () { return Reflect.construct(HTMLElement, [], Ctor); };
      Ctor.prototype = proto;
      Ctor.observedAttributes = ['variant', 'active', 'here'];
      customElements.define('ifn-nav', Ctor);
    } catch (e) {
      // Fallback für ältere Engines
      function INav() {}
      INav.prototype = proto;
    }
  }
})();
