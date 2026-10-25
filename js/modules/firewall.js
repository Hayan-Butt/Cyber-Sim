/* Module 9: Firewall Rule Simulator.
   Toggle and reorder rules, send pretend packets, and watch them get allowed or blocked.
   No traffic is generated. */
(function () {
  'use strict';

  const { escapeHTML, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);
  const LEG_MS = 750; // time for a packet to travel one hop

  const RULES = [
    { id: 1, label: 'Allow TCP 443 (HTTPS)', detail: 'ALLOW tcp any → 10.0.0.10:443', action: 'allow', match: (p) => p.proto === 'tcp' && p.port === 443, defaultOn: true },
    { id: 2, label: 'Block TCP 22 (SSH) from internet', detail: 'DENY  tcp any → 10.0.0.10:22', action: 'block', match: (p) => p.proto === 'tcp' && p.port === 22, defaultOn: true },
    { id: 3, label: 'Block all inbound ICMP (ping)', detail: 'DENY  icmp any → any', action: 'block', match: (p) => p.proto === 'icmp', defaultOn: false },
    { id: 4, label: 'Allow all TCP (any port)', detail: 'ALLOW tcp any → 10.0.0.10:*', action: 'allow', match: (p) => p.proto === 'tcp', defaultOn: false },
  ];

  const PACKETS = {
    https: { name: 'HTTPS request', proto: 'tcp', port: 443, tag: '443', btn: 'Send HTTPS request' },
    ssh: { name: 'SSH attempt', proto: 'tcp', port: 22, tag: '22', btn: 'Send SSH attempt' },
    ping: { name: 'Ping', proto: 'icmp', port: null, tag: 'ICMP', btn: 'Send ping' },
  };

  window.CyberSim.registerModule({
    id: 'firewall',
    order: 9,
    group: 'Network',
    title: 'Firewall Rule Simulator',
    icon: 'wall',
    minutes: 4,
    blurb: 'Toggle and reorder firewall rules, then send packets to see what gets through.',
    description: 'Switch firewall rules on and off, change their order, then send HTTPS, SSH and ping packets to see which reach the server.',
    howItWorks: `
      <h3>How a firewall decides</h3>
      <p>A firewall sits between networks and checks every packet against an ordered list of rules: source, destination, protocol and port. The <strong>first rule that matches</strong> decides whether it is allowed or blocked. If nothing matches, the <strong>default policy</strong> applies.</p>
      <h4>Why rule order matters</h4>
      <p>Because the first match wins, a broad rule placed too early can <strong>shadow</strong> a specific one. Try it: switch on rule 4 ("Allow all TCP"), move it to the top with the arrows, and send an SSH attempt. It gets through, because the block rule underneath is never reached. Put specific rules first and keep the list short enough to review.</p>
      <h4>Default-deny</h4>
      <p>Secure firewalls are <strong>default-deny</strong>: everything is blocked unless a rule explicitly allows it. A forgotten service (a test database, an admin panel) is then never exposed by accident. Switch the default policy to deny and you only need the HTTPS allow rule; SSH and ping are blocked automatically.</p>
      <h4>Stateful firewalls</h4>
      <p>A <strong>stateful</strong> firewall remembers connections. When a client opens an HTTPS connection the rules allow, the server's replies are let back in automatically because they belong to a known session. Unsolicited inbound packets that aren't part of a tracked connection are dropped. Older stateless filters needed rules for both directions, which was error-prone.</p>
      <p class="muted small">The packets here are animations; no network traffic is sent.</p>`,

    mount(body, { timers, complete }) {
      const enabled = Object.fromEntries(RULES.map((r) => [r.id, r.defaultOn]));
      let order = RULES.map((r) => r.id);
      let defaultPolicy = 'allow';
      const seen = { allowed: false, blocked: false };

      body.innerHTML = `
        <div class="fw-layout">
          <div class="card">
            <div class="card-head"><h3>${icon('layers')} Network path</h3></div>
            <div class="fw-diagram js-diagram" aria-label="Diagram: client, firewall, server">
              <div class="fw-wire"></div>
              <div class="fw-node client js-client">${icon('laptop')}<strong>Client</strong><span class="ip">192.168.1.50</span></div>
              <div class="fw-node firewall js-fw">${icon('wall')}<strong>Firewall</strong><span class="ip">default: <span class="js-policy-label">allow</span></span></div>
              <div class="fw-node server js-server">${icon('server')}<strong>Server</strong><span class="ip">10.0.0.10</span></div>
            </div>
            <div class="btn-row">
              ${Object.entries(PACKETS).map(([key, p]) => `<button type="button" class="btn js-send" data-packet="${key}" aria-label="${p.name}: send packet through the firewall"><span class="pill pill-accent">${p.tag}</span> ${p.btn}</button>`).join('')}
            </div>
            <div class="card-head" style="margin:22px 0 10px"><h3>${icon('grid')} Rules</h3><span class="muted small">Evaluated top to bottom. First match wins.</span></div>
            <ol class="rule-list js-rules"></ol>
            <div class="policy-row">
              <div class="rule-text">Default policy, when no rule matches<small>Off = allow everything else · On = deny everything else</small></div>
              <span class="switch"><input type="checkbox" class="js-policy" aria-label="Default-deny policy"><span class="track"></span></span>
            </div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3>${icon('terminal')} Firewall log</h3>
              <button type="button" class="btn btn-sm btn-ghost js-clear" aria-label="Clear the firewall log">Clear</button>
            </div>
            <div class="fw-log js-log" role="log" aria-live="polite"><div class="muted">No packets yet.</div></div>
            <div class="js-insight" style="margin-top:12px"></div>
          </div>
        </div>`;

      const diagram = body.querySelector('.js-diagram');
      const clientEl = body.querySelector('.js-client');
      const fwEl = body.querySelector('.js-fw');
      const serverEl = body.querySelector('.js-server');
      const logEl = body.querySelector('.js-log');
      const rulesEl = body.querySelector('.js-rules');
      const insight = body.querySelector('.js-insight');
      const policyLabel = body.querySelector('.js-policy-label');

      function renderRules() {
        rulesEl.innerHTML = order
          .map((id, pos) => {
            const r = RULES.find((x) => x.id === id);
            return `
            <li class="rule ${enabled[id] ? '' : 'off'}" data-rule="${id}">
              <span class="rule-order">${pos + 1}</span>
              <div class="rule-text">${escapeHTML(r.label)} <span class="pill ${r.action === 'allow' ? 'pill-success' : 'pill-danger'}">${r.action}</span><small>${escapeHTML(r.detail)}</small></div>
              <div class="rule-move">
                <button type="button" class="js-up" ${pos === 0 ? 'disabled' : ''} aria-label="Move rule ${r.id} up">${icon('arrowUp')}</button>
                <button type="button" class="js-down" ${pos === order.length - 1 ? 'disabled' : ''} aria-label="Move rule ${r.id} down">${icon('arrowDown')}</button>
              </div>
              <span class="switch"><input type="checkbox" class="js-rule" ${enabled[id] ? 'checked' : ''} aria-label="Enable rule: ${escapeHTML(r.label)}"><span class="track"></span></span>
            </li>`;
          })
          .join('');
      }
      renderRules();

      rulesEl.addEventListener('click', (event) => {
        const li = event.target.closest('.rule');
        if (!li) return;
        const id = Number(li.dataset.rule);
        const pos = order.indexOf(id);
        if (event.target.closest('.js-up') && pos > 0) {
          [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]];
          renderRules();
        } else if (event.target.closest('.js-down') && pos < order.length - 1) {
          [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]];
          renderRules();
        }
      });
      rulesEl.addEventListener('change', (event) => {
        const li = event.target.closest('.rule');
        if (!li || !event.target.classList.contains('js-rule')) return;
        enabled[li.dataset.rule] = event.target.checked;
        li.classList.toggle('off', !event.target.checked);
      });
      body.querySelector('.js-policy').addEventListener('change', (event) => {
        defaultPolicy = event.target.checked ? 'deny' : 'allow';
        policyLabel.textContent = defaultPolicy;
      });
      body.querySelector('.js-clear').addEventListener('click', () => {
        logEl.innerHTML = '<div class="muted">Log cleared.</div>';
        insight.innerHTML = '';
      });

      /** First matching enabled rule wins; otherwise the default policy applies. */
      function evaluate(packet) {
        for (const id of order) {
          const rule = RULES.find((r) => r.id === id);
          if (enabled[id] && rule.match(packet)) {
            return { allowed: rule.action === 'allow', reason: `rule ${rule.id}`, ruleId: rule.id };
          }
        }
        return { allowed: defaultPolicy === 'allow', reason: `default ${defaultPolicy} policy`, ruleId: null };
      }

      function centerX(el) {
        const d = diagram.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return r.left - d.left + r.width / 2;
      }

      function log(packet, verdict) {
        const placeholder = logEl.querySelector('.muted');
        if (placeholder) placeholder.remove();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const row = document.createElement('div');
        row.className = verdict.allowed ? 'allowed' : 'blocked';
        row.innerHTML = `<span class="time">${time}</span>${escapeHTML(packet.name)} → ${verdict.allowed ? 'ALLOWED' : 'BLOCKED'} (${escapeHTML(verdict.reason)})`;
        logEl.appendChild(row);
        logEl.scrollTop = logEl.scrollHeight;

        if (verdict.allowed) seen.allowed = true;
        else seen.blocked = true;
        if (seen.allowed && seen.blocked) complete();

        // Point out shadowing when it happens: SSH let through by the broad rule while the block rule is on.
        const shadowed = packet.port === 22 && verdict.ruleId === 4 && enabled[2];
        if (shadowed) {
          insight.innerHTML = callout('warning', 'Rule 2 was shadowed.', '<p>"Allow all TCP" sits above the SSH block rule, so it matched first and the block rule was never checked. Move rule 4 below rule 2, or switch it off.</p>');
        } else if (packet.port === 22 && !verdict.allowed) {
          insight.innerHTML = '';
        }
      }

      function flash(el) {
        el.classList.add('hit');
        timers.timeout(() => el.classList.remove('hit'), 700);
      }

      function highlightRule(ruleId) {
        if (!ruleId) return;
        const li = rulesEl.querySelector(`[data-rule="${ruleId}"]`);
        if (!li) return;
        li.classList.add('matched');
        timers.timeout(() => li.classList.remove('matched'), 900);
      }

      function send(key) {
        const packet = PACKETS[key];
        const verdict = evaluate(packet);

        const dot = document.createElement('div');
        dot.className = 'packet';
        dot.textContent = packet.tag;
        dot.setAttribute('aria-hidden', 'true');
        diagram.appendChild(dot);

        const x0 = centerX(clientEl);
        const x1 = centerX(fwEl);
        const x2 = centerX(serverEl);
        dot.style.left = `${x0}px`;
        dot.animate([{ left: `${x0}px` }, { left: `${x1}px` }], { duration: LEG_MS, easing: 'ease-in-out', fill: 'forwards' });

        timers.timeout(() => {
          highlightRule(verdict.ruleId);
          if (!verdict.allowed) {
            dot.classList.add('blocked');
            dot.innerHTML = icon('x');
            dot.animate(
              [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(1.4)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
              { duration: 400 }
            );
            flash(fwEl);
            log(packet, verdict);
            timers.timeout(() => dot.classList.add('fade'), 700);
            timers.timeout(() => dot.remove(), 1300);
            return;
          }
          dot.animate([{ left: `${x1}px` }, { left: `${x2}px` }], { duration: LEG_MS, easing: 'ease-in-out', fill: 'forwards' });
          timers.timeout(() => {
            dot.classList.add('allowed');
            dot.innerHTML = icon('check');
            flash(serverEl);
            log(packet, verdict);
            timers.timeout(() => dot.classList.add('fade'), 700);
            timers.timeout(() => dot.remove(), 1300);
          }, LEG_MS);
        }, LEG_MS);
      }

      body.querySelectorAll('.js-send').forEach((btn) => btn.addEventListener('click', () => send(btn.dataset.packet)));
    },
  });
})();
