/* Module 4: Virus Visualizer.
   A 20×20 grid of "computers". Infection spreads to neighbours every 500 ms; isolation and
   network segmentation stop it. Purely visual: the cells are buttons and the "virus" is an array of states. */
(function () {
  'use strict';

  const icon = (...a) => window.CyberSim.icon(...a);

  const SIZE = 20;
  const CELLS = SIZE * SIZE;
  const TICK_MS = 500;
  const HISTORY = 90; // ticks kept for the chart
  const WALL_COLS = [6, 13];
  const WALL_ROWS = [9];

  const CLEAN = 0;
  const INFECTED = 1;
  const ISOLATED = 2;
  const WALL = 3;
  const CLASS = ['', 'infected', 'isolated', 'wall'];
  const LABEL = ['clean', 'infected', 'isolated', 'firewall segment'];

  function neighbours(i) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const out = [];
    if (r > 0) out.push(i - SIZE);
    if (r < SIZE - 1) out.push(i + SIZE);
    if (c > 0) out.push(i - 1);
    if (c < SIZE - 1) out.push(i + 1);
    return out;
  }

  const isWallCell = (i) => WALL_COLS.includes(i % SIZE) || WALL_ROWS.includes(Math.floor(i / SIZE));

  window.CyberSim.registerModule({
    id: 'virus',
    order: 4,
    group: 'Malware',
    title: 'Virus Visualizer',
    icon: 'nodes',
    minutes: 4,
    blurb: 'Start an outbreak on a 400-machine network and contain it with isolation and segmentation.',
    description: 'A flat network of 400 computers. Infect one, watch it spread, then contain the outbreak by isolating machines or splitting the network into segments.',
    howItWorks: `
      <h3>How a network virus spreads</h3>
      <p>Each square is a computer. A self-spreading virus or worm on one machine tries to reach the machines it can talk to, here its four neighbours. Every half second each infected machine has a chance (the infection rate) to infect each clean neighbour, so the outbreak grows quickly and unevenly, much like a real one.</p>
      <h4>Isolation stops the spread</h4>
      <p>Clicking an infected machine <strong>isolates</strong> it (blue): it is cut off from the network, so it can't infect anyone else. Isolated machines also act as walls, since the virus can't pass through them.</p>
      <h4>Why network segmentation matters</h4>
      <ul>
        <li>In a <strong>flat network</strong>, every machine can reach every other, so one infection can eventually reach everything.</li>
        <li><strong>Segmentation</strong> splits the network into zones (HR, finance, servers, guest Wi-Fi) with firewalls between them. Turn on "Segment network" and start an outbreak: it stays trapped in one zone.</li>
        <li>Fast <strong>containment</strong> beats a perfect clean-up done late. Compare the chart when you isolate early versus late.</li>
      </ul>
      <p class="muted small">This is a conceptual animation, not real malware. No code leaves this page.</p>`,

    mount(body, { timers, complete }) {
      const state = new Uint8Array(CELLS);
      const history = [];
      let tickId = null;
      let rate = 0.35;
      let hadOutbreak = false;

      body.innerHTML = `
        <div class="toolbar">
          <button type="button" class="btn btn-danger js-one" aria-label="Infect one random clean computer">${icon('bug')} Infect one</button>
          <button type="button" class="btn btn-outline-danger js-ten" aria-label="Infect ten random clean computers">Infect 10</button>
          <button type="button" class="btn btn-primary js-isolate" aria-label="Isolate every infected computer">${icon('shield')} Isolate all infected</button>
          <button type="button" class="btn js-reset-grid" aria-label="Reset the network to all clean">${icon('reset')} Reset</button>
          <span class="spacer"></span>
          <label class="switch-row"><span class="switch"><input type="checkbox" class="js-segment" aria-label="Segment the network with firewalls"><span class="track"></span></span> Segment network</label>
          <label class="switch-row small" for="virus-rate">Infection rate <input type="range" class="range" id="virus-rate" min="10" max="80" step="5" value="35"> <b class="mono js-rate">35%</b></label>
        </div>
        <div class="virus-layout">
          <div class="card">
            <div class="virus-counter" aria-live="polite">
              Clean: <strong class="js-clean">400</strong> |
              <span class="c-inf">Infected: <strong class="js-inf">0</strong></span> |
              <span class="c-iso">Isolated: <strong class="js-iso">0</strong></span><span class="js-wall-count"></span>
            </div>
            <div class="net-grid js-grid" role="group" aria-label="Network of 400 computers"></div>
            <div class="legend">
              <span><i class="sw-clean"></i>Clean (click to infect)</span>
              <span><i class="sw-infected"></i>Infected (click to isolate)</span>
              <span><i class="sw-isolated"></i>Isolated</span>
              <span><i class="sw-wall"></i>Firewall</span>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>${icon('zap')} Outbreak timeline</h3></div>
            <div class="chart-wrap"><canvas class="js-chart" aria-label="Chart of infected and isolated machines over time" role="img"></canvas></div>
            <div class="chart-legend"><span>Infected</span><span class="dashed">Isolated</span></div>
            <div class="stats" style="margin-top:14px">
              <div class="stat"><span class="stat-label">Peak infected</span><span class="stat-value danger js-peak">0</span></div>
              <div class="stat"><span class="stat-label">Ticks</span><span class="stat-value js-ticks">0</span></div>
            </div>
            <p class="small muted" style="margin:12px 0 0">Tip: infect one machine, then try to contain it before it reaches 30. Then try again with the network segmented.</p>
          </div>
        </div>`;

      const grid = body.querySelector('.js-grid');
      const canvas = body.querySelector('.js-chart');
      const out = {
        clean: body.querySelector('.js-clean'),
        inf: body.querySelector('.js-inf'),
        iso: body.querySelector('.js-iso'),
        walls: body.querySelector('.js-wall-count'),
        peak: body.querySelector('.js-peak'),
        ticks: body.querySelector('.js-ticks'),
      };
      let peak = 0;
      let ticks = 0;

      const frag = document.createDocumentFragment();
      for (let i = 0; i < CELLS; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'node';
        btn.dataset.i = i;
        btn.setAttribute('aria-label', `Computer ${i + 1}: clean`);
        frag.appendChild(btn);
      }
      grid.appendChild(frag);
      const nodes = grid.children;

      function setState(i, s) {
        state[i] = s;
        nodes[i].className = `node ${CLASS[s]}`;
        nodes[i].setAttribute('aria-label', `Computer ${i + 1}: ${LABEL[s]}`);
      }

      function counts() {
        let inf = 0;
        let iso = 0;
        let walls = 0;
        for (let i = 0; i < CELLS; i++) {
          if (state[i] === INFECTED) inf++;
          else if (state[i] === ISOLATED) iso++;
          else if (state[i] === WALL) walls++;
        }
        return { inf, iso, walls, clean: CELLS - inf - iso - walls };
      }

      function drawChart() {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth || 280;
        const h = canvas.clientHeight || 150;
        if (canvas.width !== Math.round(w * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let g = 1; g < 4; g++) {
          const y = Math.round((h / 4) * g) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        if (history.length < 2) return;

        const max = Math.max(20, ...history.map((p) => Math.max(p.inf, p.iso)));
        const x = (i) => (i / (HISTORY - 1)) * w;
        const y = (v) => h - 4 - (v / max) * (h - 10);
        const line = (key, color, width, dash) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.setLineDash(dash);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          history.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p[key])) : ctx.moveTo(x(i), y(p[key]))));
          ctx.stroke();
        };
        // Infected is the solid coral line, isolated the dashed purple one.
        line('iso', '#8b5cf6', 2, [5, 4]);
        line('inf', '#ff7a59', 2.5, []);
        ctx.setLineDash([]);
      }

      function update(record) {
        const c = counts();
        out.clean.textContent = c.clean;
        out.inf.textContent = c.inf;
        out.iso.textContent = c.iso;
        out.walls.innerHTML = c.walls ? ` | <span class="c-wall">Firewalled: <strong>${c.walls}</strong></span>` : '';
        if (c.inf > 0) hadOutbreak = true;
        peak = Math.max(peak, c.inf);
        out.peak.textContent = peak;
        if (record) {
          history.push({ inf: c.inf, iso: c.iso });
          if (history.length > HISTORY) history.shift();
          drawChart();
        }
        if (c.inf === 0) {
          stop();
          if (hadOutbreak && c.iso > 0) complete();
        }
        return c;
      }

      function tick() {
        const newly = [];
        for (let i = 0; i < CELLS; i++) {
          if (state[i] !== INFECTED) continue;
          for (const n of neighbours(i)) {
            if (state[n] === CLEAN && Math.random() < rate) newly.push(n);
          }
        }
        newly.forEach((n) => setState(n, INFECTED));
        ticks++;
        out.ticks.textContent = ticks;
        update(true);
      }

      function start() {
        if (tickId === null) tickId = timers.interval(tick, TICK_MS);
      }

      function stop() {
        if (tickId !== null) {
          timers.clearInterval(tickId);
          tickId = null;
        }
      }

      function infectRandom(count) {
        const clean = [];
        for (let i = 0; i < CELLS; i++) if (state[i] === CLEAN) clean.push(i);
        for (let k = 0; k < count && clean.length; k++) {
          const pick = clean.splice(Math.floor(Math.random() * clean.length), 1)[0];
          setState(pick, INFECTED);
        }
        update(true);
        start();
      }

      grid.addEventListener('click', (event) => {
        const node = event.target.closest('.node');
        if (!node) return;
        const i = Number(node.dataset.i);
        if (state[i] === CLEAN) {
          setState(i, INFECTED);
          start();
        } else if (state[i] === INFECTED) {
          setState(i, ISOLATED);
        }
        update(true);
      });

      body.querySelector('.js-one').addEventListener('click', () => infectRandom(1));
      body.querySelector('.js-ten').addEventListener('click', () => infectRandom(10));
      body.querySelector('.js-isolate').addEventListener('click', () => {
        for (let i = 0; i < CELLS; i++) if (state[i] === INFECTED) setState(i, ISOLATED);
        update(true);
      });
      body.querySelector('.js-reset-grid').addEventListener('click', () => {
        stop();
        const segmented = body.querySelector('.js-segment').checked;
        for (let i = 0; i < CELLS; i++) setState(i, segmented && isWallCell(i) ? WALL : CLEAN);
        history.length = 0;
        peak = 0;
        ticks = 0;
        hadOutbreak = false;
        out.ticks.textContent = '0';
        update(false);
        drawChart();
      });
      body.querySelector('.js-segment').addEventListener('change', (event) => {
        for (let i = 0; i < CELLS; i++) {
          if (!isWallCell(i)) continue;
          if (event.target.checked) setState(i, WALL);
          else if (state[i] === WALL) setState(i, CLEAN);
        }
        update(false);
      });
      const rateInput = body.querySelector('#virus-rate');
      rateInput.addEventListener('input', () => {
        rate = Number(rateInput.value) / 100;
        body.querySelector('.js-rate').textContent = `${rateInput.value}%`;
      });

      update(false);
      drawChart();
    },
  });
})();
