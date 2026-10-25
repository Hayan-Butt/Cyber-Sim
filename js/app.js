/* CyberSim application shell: site header, modules menu, overview page, module pages,
   progress tracking, command palette and keyboard shortcuts.

   Every module file calls CyberSim.registerModule({ ... }) with:
     id, order, group, title, icon, minutes   metadata for menus, cards and page headers
     blurb, description                       card text and the one-line page summary
     howItWorks                               HTML for the "How it works" panel
     mount(body, ctx)                         build the module UI inside `body`
     unmount()                                optional; release anything the timers don't cover
   ctx.timers is a timer group the shell cancels on navigation and on Reset.
   ctx.complete() marks the module's main exercise as done. */
(function () {
  'use strict';

  const { createTimers, escapeHTML, toast } = window.CyberSim.utils;
  const icon = window.CyberSim.icon;
  const STORAGE_KEY = 'cybersim.progress.v2';
  const LEGACY_KEY = 'cybersim.visited';
  const TOTAL = 10;

  const modules = window.CyberSim.modules.slice().sort((a, b) => a.order - b.order);
  const byId = new Map(modules.map((m) => [m.id, m]));
  const pad = (n) => String(n).padStart(2, '0');

  const el = {
    main: document.getElementById('main'),
    header: document.getElementById('site-header'),
    current: document.getElementById('header-current'),
    count: document.getElementById('progress-count'),
    doneCount: document.getElementById('done-count'),
    bar: document.getElementById('progress-bar'),
    fill: document.getElementById('progress-fill'),
    doneFill: document.getElementById('progress-done'),
    mega: document.getElementById('mega'),
    megaInner: document.getElementById('mega-inner'),
    scrim: document.getElementById('mega-scrim'),
    modulesToggle: document.getElementById('modules-toggle'),
    menuBtn: document.getElementById('menu-btn'),
    cta: document.getElementById('header-cta'),
  };

  const progress = loadProgress();
  let current = null; // { def, timers, body } for the mounted module, or null on the overview
  let dialog = null;
  let palette = null;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // ---------- Persistence (best effort: everything still works without storage) ----------

  function loadProgress() {
    const clean = (ids) => new Set(Array.isArray(ids) ? ids.filter((id) => byId.has(id)) : []);
    const empty = { visited: new Set(), completed: new Set() };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return { visited: clean(data.visited), completed: clean(data.completed) };
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      return { ...empty, visited: clean(legacy ? JSON.parse(legacy) : []) };
    } catch (err) {
      return empty;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ visited: [...progress.visited], completed: [...progress.completed] }));
    } catch (err) {
      /* storage unavailable: progress lasts for this visit only */
    }
  }

  const statusOf = (id) => (progress.completed.has(id) ? 'completed' : progress.visited.has(id) ? 'visited' : '');
  const statusText = (s) => (s === 'completed' ? 'done' : s === 'visited' ? 'started' : 'new');

  // ---------- Header and modules menu ----------

  function buildHeader() {
    document.getElementById('logo-mark').innerHTML = icon('logo');
    document.getElementById('footer-mark').innerHTML = icon('logo');
    el.menuBtn.innerHTML = icon('menu');

    el.megaInner.innerHTML = `
      <div class="mega-head">
        <span class="mono-label">&lt;modules&gt;</span>
        <span class="muted small">Pick any module. Press <kbd>1</kbd>–<kbd>0</kbd> to jump straight there.</span>
      </div>
      <ol class="mega-grid">
        ${modules
          .map(
            (m) => `
          <li>
            <button type="button" class="mega-item js-nav-item" data-id="${m.id}">
              <span class="mega-num">${pad(m.order)}</span>
              <span class="mega-text"><b>${escapeHTML(m.title)}</b><small>${escapeHTML(m.group)} · ${m.minutes} min</small></span>
              <span class="status-dot" aria-hidden="true">${icon('check')}</span>
            </button>
          </li>`
          )
          .join('')}
      </ol>
      <div class="mega-foot">
        <button type="button" class="nav-link" data-nav="home">overview</button>
        <button type="button" class="nav-link" data-nav="search">search</button>
        <button type="button" class="nav-link" data-nav="shortcuts">shortcuts</button>
      </div>`;

    document.getElementById('logo').addEventListener('click', () => go('home'));
    el.modulesToggle.addEventListener('click', toggleMega);
    el.menuBtn.addEventListener('click', toggleMega);
    el.scrim.addEventListener('click', closeMega);
    el.cta.addEventListener('click', () => go(nextUp().id));

    // One delegated handler for every nav button in the header and menu.
    el.header.addEventListener('click', (event) => {
      const item = event.target.closest('.js-nav-item');
      if (item) {
        go(item.dataset.id);
        return;
      }
      const link = event.target.closest('[data-nav]');
      if (!link) return;
      const action = link.dataset.nav;
      closeMega();
      if (action === 'home') go('home');
      else if (action === 'search') openPalette();
      else if (action === 'shortcuts') openHelp();
    });
  }

  function openMega() {
    el.mega.hidden = false;
    el.scrim.hidden = false;
    el.header.classList.add('menu-open');
    el.modulesToggle.setAttribute('aria-expanded', 'true');
    el.menuBtn.setAttribute('aria-expanded', 'true');
    el.menuBtn.innerHTML = icon('x');
    el.menuBtn.setAttribute('aria-label', 'Close menu');
  }

  function closeMega() {
    if (el.mega.hidden) return;
    el.mega.hidden = true;
    el.scrim.hidden = true;
    el.header.classList.remove('menu-open');
    el.modulesToggle.setAttribute('aria-expanded', 'false');
    el.menuBtn.setAttribute('aria-expanded', 'false');
    el.menuBtn.innerHTML = icon('menu');
    el.menuBtn.setAttribute('aria-label', 'Open menu');
  }

  function toggleMega() {
    if (el.mega.hidden) openMega();
    else closeMega();
  }

  /** Sync every numbered module list (menu and page rail) with progress and the active page. */
  function refreshNav() {
    const activeId = current ? current.def.id : 'home';
    document.querySelectorAll('.js-nav-item').forEach((btn) => {
      const id = btn.dataset.id;
      btn.classList.toggle('active', id === activeId);
      btn.classList.toggle('visited', progress.visited.has(id));
      btn.classList.toggle('completed', progress.completed.has(id));
      if (id === activeId) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-nav="home"]').forEach((b) => b.classList.toggle('active', activeId === 'home'));
    el.modulesToggle.classList.toggle('active', activeId !== 'home');

    const next = nextUp();
    el.cta.textContent = progress.completed.size === TOTAL ? 'revisit the lab' : progress.visited.size ? 'continue' : 'start the lab';
    el.cta.setAttribute('aria-label', `Open ${next.title}`);
  }

  // ---------- Progress ----------

  function refreshProgress() {
    const v = progress.visited.size;
    const d = progress.completed.size;
    el.count.textContent = v;
    el.doneCount.textContent = d;
    el.fill.style.transform = `scaleX(${v / TOTAL})`;
    el.doneFill.style.transform = `scaleX(${d / TOTAL})`;
    el.bar.setAttribute('aria-valuenow', String(v));
  }

  function markVisited(id) {
    if (progress.visited.has(id)) return;
    progress.visited.add(id);
    saveProgress();
    refreshProgress();
  }

  function markComplete(def) {
    if (progress.completed.has(def.id)) return;
    progress.completed.add(def.id);
    progress.visited.add(def.id);
    saveProgress();
    refreshProgress();
    refreshNav();
    const chipSlot = el.main.querySelector('.js-done-slot');
    if (chipSlot && current && current.def === def) chipSlot.innerHTML = doneChip();
    const left = TOTAL - progress.completed.size;
    toast(left ? `${def.title} complete. ${left} to go.` : 'All ten modules complete. Nicely done.', 'success', 3600);
  }

  const doneChip = () => `<span class="done-chip">${icon('check')} complete</span>`;

  function nextUp() {
    return modules.find((m) => !progress.completed.has(m.id)) || modules[0];
  }

  // ---------- Artwork (static, drawn once) ----------

  /**
   * An isometric "plus" made of five cubes. Faces get three shades of one colour so it reads as 3D.
   * Cells are drawn back to front so nearer cubes cover farther ones.
   */
  function isoPlus(cls) {
    const s = 34;
    const cx = 120;
    const cy = 64;
    const P = (x, y, z) => [cx + (x - y) * s * 0.866, cy + (x + y) * s * 0.5 - z * s];
    const poly = (pts, fill) => `<polygon points="${pts.map((p) => P(...p).map((v) => v.toFixed(1)).join(',')).join(' ')}" class="${fill}"/>`;
    const cells = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    const cubes = cells
      .map(([x, y]) =>
        [
          poly([[x, y + 1, 1], [x + 1, y + 1, 1], [x + 1, y + 1, 0], [x, y + 1, 0]], 'f-left'),
          poly([[x + 1, y, 1], [x + 1, y + 1, 1], [x + 1, y + 1, 0], [x + 1, y, 0]], 'f-right'),
          poly([[x, y, 1], [x + 1, y, 1], [x + 1, y + 1, 1], [x, y + 1, 1]], 'f-top'),
        ].join('')
      )
      .join('');
    return `<svg class="iso ${cls}" viewBox="0 0 240 230" aria-hidden="true" focusable="false">${cubes}</svg>`;
  }

  /** A soft two-lobed teal shape, like a capsule seen at an angle. */
  function capsule(cls) {
    return `
      <svg class="capsule ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <ellipse cx="74" cy="72" rx="28" ry="38" transform="rotate(-38 74 72)" class="c-back"/>
        <ellipse cx="48" cy="46" rx="30" ry="36" transform="rotate(-38 48 46)" class="c-front"/>
        <ellipse cx="40" cy="36" rx="10" ry="16" transform="rotate(-38 40 36)" class="c-shine"/>
      </svg>`;
  }

  /** A tilted phone showing the phishing inbox: a static picture, not an interactive element. */
  function phoneMock() {
    const rows = [
      ['legit', 'PayPal', 'Receipt for your payment to Greenleaf Books', 'service@paypal.com'],
      ['legit', 'Priya Raman', "Notes from Tuesday's sprint planning", 'brightpath-consulting.com'],
      ['phish', 'Amazon.com', 'Problem with your order #112-4471902', 'arnazon.com'],
      ['legit', 'LinkedIn', 'Daniel Okafor wants to connect', 'linkedin.com'],
    ];
    return `
      <div class="phone" aria-hidden="true">
        <div class="phone-screen">
          <div class="phone-top"><span class="phone-logo">${icon('logo')} inbox</span><span class="phone-count"><b>18</b> emails<br><small>9 are traps</small></span></div>
          <div class="phone-alert">
            <span class="pa-tag">PHISHING · look-alike domain</span>
            <b>Your account has been limited</b>
            <span class="pa-from">security@paypa1.com</span>
            <span class="pa-score">risk high</span>
          </div>
          <div class="phone-tabs"><span class="on">inbox</span><span>flagged</span></div>
          ${rows
            .map(
              ([kind, from, subject, domain]) => `
            <div class="phone-row ${kind}">
              <div><b>${escapeHTML(from)}</b><small>${escapeHTML(subject)}</small><em>${escapeHTML(domain)}</em></div>
              <span>${kind === 'phish' ? 'trap' : 'safe'}</span>
            </div>`
            )
            .join('')}
          <div class="phone-nav"><i></i><i></i><i></i><i></i></div>
        </div>
      </div>`;
  }

  // ---------- Overview page ----------

  function renderHome() {
    const v = progress.visited.size;
    const d = progress.completed.size;
    const minutesLeft = modules.filter((m) => !progress.completed.has(m.id)).reduce((sum, m) => sum + m.minutes, 0);
    const next = nextUp();
    const started = v > 0;
    const startLabel = d === TOTAL ? 'revisit module 01' : started ? `continue: ${next.title.toLowerCase()}` : 'start the lab';

    el.main.innerHTML = `
      <div class="page home">
        <section class="hero" aria-labelledby="home-title">
          <div class="wrap hero-wrap">
            <div class="hero-copy">
              <div class="hero-tags"><span class="tag">security</span><span class="tag">hands-on</span><span class="tag">no installs</span></div>
              <h1 id="home-title" class="display">
                <span>Learn security</span>
                <span>by breaking</span>
                <span>things safely.</span>
              </h1>
              <p class="lead">Ten real cyber attacks rebuilt as interactive simulations. Break the vulnerable version, watch the fix hold, then read why it works.</p>
              <div class="btn-row">
                <button type="button" class="btn btn-lime btn-xl js-start">${escapeHTML(startLabel)} ${icon('arrowRight')}</button>
                <button type="button" class="btn btn-outline btn-xl js-browse">browse modules</button>
              </div>
            </div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="beam"></div>
            <div class="column column-purple">${isoPlus('plus-a')}</div>
            <div class="column column-teal">${capsule('capsule-a')}</div>
          </div>
        </section>

        <section class="stats-strip" aria-label="Your progress">
          <div class="wrap stats-wrap">
            <div class="big-stat"><b>10</b><span>attack simulations</span></div>
            <div class="big-stat"><b>0</b><span>network requests</span></div>
            <div class="big-stat"><b>${v}<small>/10</small></b><span>modules visited</span></div>
            <div class="big-stat"><b>${d}<small>/10</small></b><span>modules completed${minutesLeft && d < TOTAL ? ` · ~${minutesLeft} min left` : ''}</span></div>
          </div>
        </section>

        <section class="feature" aria-labelledby="feature-title">
          ${isoPlus('plus-b')}
          <div class="wrap feature-wrap">
            <div class="feature-copy">
              <span class="mono-label">&lt;featured&gt;</span>
              <h2 id="feature-title" class="display-2">Phishing Simulator</h2>
              <p>Eighteen fictional emails, nine of them traps. Spot the look-alike domains, mismatched reply-to addresses and pressure tactics, then see every red flag highlighted in the email itself.</p>
              <button type="button" class="btn btn-purple btn-xl js-feature">open the phishing lab ${icon('arrowRight')}</button>
            </div>
            <div class="feature-art">${phoneMock()}</div>
            <div class="feature-note">
              <p>Most breaches start with an email. This module trains the habit that stops them.</p>
              <button type="button" class="text-link js-feature">learn more ${icon('arrowRight', 'ico-sm')}</button>
            </div>
          </div>
        </section>

        <section class="modules-section" id="modules" aria-labelledby="modules-title">
          <div class="wrap">
            <div class="section-head">
              <div>
                <span class="mono-label">&lt;modules&gt;</span>
                <h2 id="modules-title" class="display-2">Ten simulations</h2>
              </div>
              <div class="section-actions">
                <span class="muted small">Each takes 3 to 6 minutes. Do them in any order.</span>
                ${started ? `<button type="button" class="btn btn-ghost btn-sm js-reset-progress">${icon('reset')} reset progress</button>` : ''}
              </div>
            </div>
            <div class="module-cards">
              ${modules
                .map((m) => {
                  const st = statusOf(m.id);
                  return `
                  <button type="button" class="module-card ${st}" data-id="${m.id}">
                    <span class="card-num" aria-hidden="true">${pad(m.order)}</span>
                    <span class="card-top">
                      <span class="card-icon">${icon(m.icon)}</span>
                      <span class="card-status ${st}">${statusText(st)}</span>
                    </span>
                    <span class="card-title">${escapeHTML(m.title)}</span>
                    <span class="card-blurb">${escapeHTML(m.blurb)}</span>
                    <span class="card-foot"><span>${escapeHTML(m.group)} · ${m.minutes} min</span><span class="card-go">${icon('arrowRight')}</span></span>
                  </button>`;
                })
                .join('')}
            </div>
          </div>
        </section>

        <section class="steps-section" aria-labelledby="steps-title">
          <div class="wrap">
            <span class="mono-label">&lt;how it works&gt;</span>
            <h2 id="steps-title" class="display-2">Break it. Fix it. Understand it.</h2>
            <div class="steps">
              <div class="step"><span class="step-num">01</span><h3>Run the attack</h3><p>Fire the payload, start the outbreak, send the packet. Each module puts the attack in your hands.</p></div>
              <div class="step"><span class="step-num">02</span><h3>Watch the defence</h3><p>Most modules show the vulnerable and the secure version side by side, so the difference is obvious.</p></div>
              <div class="step"><span class="step-num">03</span><h3>Read why</h3><p>A short "How it works" panel explains the mechanism and what defenders do about it in the real world.</p></div>
            </div>
          </div>
        </section>

        <section class="cta-band" aria-label="Get started">
          <div class="wrap cta-wrap">
            <h2 class="display-2">Nothing here is real.<br>Everything here is how it works.</h2>
            <button type="button" class="btn btn-dark btn-xl js-start">${escapeHTML(startLabel)} ${icon('arrowRight')}</button>
          </div>
        </section>
      </div>`;

    el.main.querySelectorAll('.js-start').forEach((b) => b.addEventListener('click', () => go(next.id)));
    el.main.querySelectorAll('.js-feature').forEach((b) => b.addEventListener('click', () => go('phishing')));
    el.main.querySelector('.js-browse').addEventListener('click', () => {
      document.getElementById('modules').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.main.querySelectorAll('.module-card').forEach((card) => card.addEventListener('click', () => go(card.dataset.id)));

    const resetBtn = el.main.querySelector('.js-reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!window.confirm('Clear your visited and completed progress?')) return;
        progress.visited.clear();
        progress.completed.clear();
        saveProgress();
        refreshProgress();
        refreshNav();
        renderHome();
        toast('Progress cleared', 'info', 1800);
      });
    }
  }

  // ---------- Module pages ----------

  function unmountCurrent() {
    if (!current) return;
    current.timers.clearAll();
    if (typeof current.def.unmount === 'function') current.def.unmount();
    current.body.innerHTML = '';
    current = null;
  }

  function mountInto(body, def) {
    const timers = createTimers();
    current = { def, timers, body };
    def.mount(body, { timers, complete: () => markComplete(def) });
  }

  function renderModule(def) {
    const idx = modules.indexOf(def);
    const prev = modules[idx - 1];
    const next = modules[idx + 1];

    el.main.innerHTML = `
      <div class="page module-page">
        <div class="wrap module-layout">
          <aside class="rail" aria-label="All modules">
            <span class="rail-label">modules</span>
            <ol>
              ${modules
                .map(
                  (m) => `
                <li><button type="button" class="rail-item js-nav-item" data-id="${m.id}">
                  <span class="rail-num">${pad(m.order)}</span>
                  <span class="rail-name">${escapeHTML(m.title)}</span>
                  <span class="status-dot" aria-hidden="true">${icon('check')}</span>
                </button></li>`
                )
                .join('')}
            </ol>
          </aside>

          <article class="module" aria-labelledby="module-title">
            <header class="page-head">
              <span class="page-num" aria-hidden="true">${pad(def.order)}</span>
              <div class="page-head-copy">
                <span class="mono-label">&lt;${escapeHTML(def.group.toLowerCase())}&gt; <span class="muted">module ${pad(def.order)} / 10 · ${def.minutes} min</span></span>
                <h1 id="module-title" class="display-3">${escapeHTML(def.title)}<span class="js-done-slot">${progress.completed.has(def.id) ? doneChip() : ''}</span></h1>
                <p class="lead">${escapeHTML(def.description)}</p>
                <div class="btn-row">
                  <button type="button" class="btn btn-outline btn-sm js-how-top" aria-controls="how-panel">${icon('info')} how it works</button>
                  <button type="button" class="btn btn-ghost btn-sm js-reset" aria-label="Reset this module to its initial state">${icon('reset')} reset</button>
                </div>
              </div>
            </header>

            <div class="module-body"></div>

            <section class="how-it-works">
              <button type="button" class="btn btn-lime js-how" aria-expanded="false" aria-controls="how-panel">${icon('info')} how it works</button>
              <div class="how-panel" id="how-panel" hidden>${def.howItWorks}</div>
            </section>

            <nav class="module-pager" aria-label="Previous and next module">
              ${prev ? `<button type="button" class="pager-link prev" data-id="${prev.id}"><small>${icon('arrowLeft', 'ico-sm')} ${pad(prev.order)} previous</small>${escapeHTML(prev.title)}</button>` : `<button type="button" class="pager-link prev" data-id="home"><small>${icon('arrowLeft', 'ico-sm')} back</small>Overview</button>`}
              ${next ? `<button type="button" class="pager-link next" data-id="${next.id}"><small>${pad(next.order)} next ${icon('arrowRight', 'ico-sm')}</small>${escapeHTML(next.title)}</button>` : `<button type="button" class="pager-link next" data-id="home"><small>finish ${icon('arrowRight', 'ico-sm')}</small>Back to overview</button>`}
            </nav>
          </article>
        </div>
      </div>`;

    const body = el.main.querySelector('.module-body');
    const panel = el.main.querySelector('#how-panel');
    const howBtn = el.main.querySelector('.js-how');

    const toggleHow = (scroll) => {
      const open = panel.hidden;
      panel.hidden = !open;
      howBtn.setAttribute('aria-expanded', String(open));
      howBtn.innerHTML = open ? `${icon('x')} hide explanation` : `${icon('info')} how it works`;
      if (open && scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    howBtn.addEventListener('click', () => toggleHow(false));
    el.main.querySelector('.js-how-top').addEventListener('click', () => {
      if (panel.hidden) toggleHow(true);
      else panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.main.querySelector('.js-reset').addEventListener('click', () => resetModule());
    el.main.querySelectorAll('.pager-link').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.id)));
    el.main.querySelector('.rail').addEventListener('click', (event) => {
      const item = event.target.closest('.js-nav-item');
      if (item) go(item.dataset.id);
    });

    mountInto(body, def);
  }

  function resetModule() {
    if (!current) return;
    const { def, body } = current;
    unmountCurrent();
    mountInto(body, def);
    toast(`${def.title} reset`, 'info', 1500);
  }

  // ---------- Routing ----------

  function go(id) {
    closeMega();
    const target = id === 'home' || !byId.has(id) ? '' : id;
    if (location.hash.slice(1) === target) route();
    else location.hash = target;
  }

  function route() {
    const id = location.hash.slice(1);
    const def = byId.get(id);
    closeMega();
    if (current && def && current.def === def) return;
    unmountCurrent();

    if (def) {
      renderModule(def);
      el.current.innerHTML = `<span>${pad(def.order)}</span> ${escapeHTML(def.title)}`;
      document.title = `${def.title} · CyberSim`;
      markVisited(def.id);
    } else {
      renderHome();
      el.current.textContent = '';
      document.title = 'CyberSim · Threat Simulation Lab';
    }
    refreshNav();
    window.scrollTo(0, 0);
    el.main.focus({ preventScroll: true });
  }

  // ---------- Command palette ----------

  function paletteItems() {
    const items = [{ kind: 'go', id: 'home', title: 'Overview', meta: 'page', icon: 'grid', keywords: 'home start' }];
    modules.forEach((m) =>
      items.push({ kind: 'go', id: m.id, title: m.title, meta: `${pad(m.order)} · ${m.group}`, icon: m.icon, keywords: `${m.blurb} ${m.group}` })
    );
    if (current) {
      items.push({ kind: 'how', title: 'Toggle "How it works"', meta: 'this module', icon: 'info', keywords: 'explain help' });
      items.push({ kind: 'reset', title: `Reset ${current.def.title}`, meta: 'this module', icon: 'reset', keywords: 'restart clear' });
    }
    items.push({ kind: 'help', title: 'Keyboard shortcuts', meta: 'help', icon: 'keyboard', keywords: 'keys hotkeys' });
    return items;
  }

  function highlight(text, q) {
    const i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) return escapeHTML(text);
    return `${escapeHTML(text.slice(0, i))}<mark>${escapeHTML(text.slice(i, i + q.length))}</mark>${escapeHTML(text.slice(i + q.length))}`;
  }

  function openPalette() {
    if (palette) return;
    closeHelp();
    closeMega();
    const all = paletteItems();
    let shown = all;
    let active = 0;

    palette = document.createElement('div');
    palette.className = 'modal-backdrop palette-backdrop';
    palette.innerHTML = `
      <div class="palette" role="dialog" aria-modal="true" aria-label="Search">
        <div class="palette-input-row">${icon('search')}<input class="palette-input" type="text" placeholder="Search modules and actions…" aria-label="Search" aria-controls="palette-list" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
        <ul class="palette-list" id="palette-list" role="listbox"></ul>
        <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
      </div>`;
    document.body.appendChild(palette);
    const input = palette.querySelector('.palette-input');
    const list = palette.querySelector('.palette-list');

    const draw = () => {
      const q = input.value.trim().toLowerCase();
      shown = q ? all.filter((it) => `${it.title} ${it.meta} ${it.keywords}`.toLowerCase().includes(q)) : all;
      active = Math.min(active, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length
        ? shown
            .map(
              (it, i) =>
                `<li class="palette-item ${i === active ? 'active' : ''}" role="option" aria-selected="${i === active}" data-i="${i}">${icon(it.icon)}<span class="p-title">${highlight(it.title, q)}</span><span class="p-meta">${escapeHTML(it.meta)}</span></li>`
            )
            .join('')
        : '<li class="palette-empty">Nothing matches that. Try "ransom", "hash" or "network".</li>';
      const a = list.querySelector('.active');
      if (a) a.scrollIntoView({ block: 'nearest' });
    };

    const run = (it) => {
      if (!it) return;
      closePalette();
      if (it.kind === 'go') go(it.id);
      else if (it.kind === 'help') openHelp();
      else if (it.kind === 'reset') resetModule();
      else if (it.kind === 'how') {
        const btn = el.main.querySelector('.js-how');
        if (btn) btn.click();
      }
    };

    input.addEventListener('input', () => {
      active = 0;
      draw();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        active = (active + 1) % Math.max(1, shown.length);
        draw();
      } else if (event.key === 'ArrowUp') {
        active = (active - 1 + shown.length) % Math.max(1, shown.length);
        draw();
      } else if (event.key === 'Enter') {
        run(shown[active]);
      } else if (event.key === 'Escape') {
        closePalette();
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    });
    list.addEventListener('mousemove', (event) => {
      const li = event.target.closest('.palette-item');
      if (li && Number(li.dataset.i) !== active) {
        active = Number(li.dataset.i);
        draw();
      }
    });
    list.addEventListener('click', (event) => {
      const li = event.target.closest('.palette-item');
      if (li) run(shown[Number(li.dataset.i)]);
    });
    palette.addEventListener('click', (event) => {
      if (event.target === palette) closePalette();
    });

    draw();
    input.focus();
  }

  function closePalette() {
    if (!palette) return;
    palette.remove();
    palette = null;
  }

  // ---------- Keyboard shortcuts ----------

  function openHelp() {
    if (dialog) return;
    closeMega();
    dialog = document.createElement('div');
    dialog.className = 'modal-backdrop';
    dialog.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <h3 id="help-title">Keyboard shortcuts</h3>
        <div class="shortcut-list">
          <span><kbd>${isMac ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd> or <kbd>/</kbd></span><span>Search modules and actions</span>
          <span><kbd>1</kbd> … <kbd>9</kbd> <kbd>0</kbd></span><span>Jump to module 1 to 10</span>
          <span><kbd>[</kbd> <kbd>]</kbd></span><span>Previous / next module</span>
          <span><kbd>m</kbd></span><span>Open the modules menu</span>
          <span><kbd>g</kbd></span><span>Go to the overview</span>
          <span><kbd>i</kbd></span><span>Toggle "How it works"</span>
          <span><kbd>?</kbd></span><span>Show this list</span>
          <span><kbd>Esc</kbd></span><span>Close menus and dialogs</span>
        </div>
        <button type="button" class="btn btn-lime js-close">got it</button>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.js-close').addEventListener('click', closeHelp);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeHelp();
    });
    dialog.querySelector('.js-close').focus();
  }

  function closeHelp() {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
  }

  function onKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (palette) closePalette();
      else openPalette();
      return;
    }
    if (event.key === 'Escape') {
      closePalette();
      closeHelp();
      closeMega();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const t = event.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('.modal-backdrop') && event.key !== '?') return;

    const idx = current ? modules.indexOf(current.def) : -1;
    if (event.key === '/') {
      openPalette();
    } else if (/^[0-9]$/.test(event.key)) {
      const n = event.key === '0' ? 10 : Number(event.key);
      const m = modules.find((mod) => mod.order === n);
      if (m) go(m.id);
    } else if (event.key === ']') {
      go((modules[idx + 1] || modules[0]).id);
    } else if (event.key === '[') {
      go(idx > 0 ? modules[idx - 1].id : 'home');
    } else if (event.key === 'g') {
      go('home');
    } else if (event.key === 'm') {
      toggleMega();
    } else if (event.key === 'i') {
      const btn = el.main.querySelector('.js-how');
      if (btn) btn.click();
    } else if (event.key === '?') {
      if (dialog) closeHelp();
      else openHelp();
    } else {
      return;
    }
    event.preventDefault();
  }

  // ---------- Boot ----------

  function boot() {
    if (modules.length !== TOTAL) {
      console.warn(`CyberSim expected ${TOTAL} modules but found ${modules.length}.`);
    }
    buildHeader();
    refreshProgress();
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', route);
    route();
  }

  boot();
})();
