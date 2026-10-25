/* Module 7: Port Scanner.
   A scripted scan of a fictional host. No packets are sent: open/closed states come from SCAN_CONFIG. */
(function () {
  'use strict';

  const { escapeHTML, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);
  const SPIN_MS = 500;
  const STAGGER_MS = 160;

  const SCAN_CONFIG = {
    target: '192.168.1.10',
    hostname: 'fileserver-02.corp.local',
    open: [22, 80, 443, 3389, 3306],
    risky: {
      3389: 'RDP',
      3306: 'MySQL',
    },
  };

  const PORTS = [
    [21, 'FTP'], [22, 'SSH'], [23, 'Telnet'], [25, 'SMTP'], [53, 'DNS'],
    [80, 'HTTP'], [110, 'POP3'], [143, 'IMAP'], [443, 'HTTPS'], [445, 'SMB'],
    [1433, 'MSSQL'], [3306, 'MySQL'], [3389, 'RDP'], [5432, 'PostgreSQL'], [5900, 'VNC'],
    [6379, 'Redis'], [8080, 'HTTP-Alt'], [8443, 'HTTPS-Alt'], [27017, 'MongoDB'], [9200, 'Elasticsearch'],
  ];

  // What a version scan would report for each open port, and what a defender should do about it.
  const DETAILS = {
    22: {
      banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6',
      risk: 'Expected on a Linux server, but exposed SSH gets constant password-guessing traffic from the internet.',
      fix: 'Use key-based login only, disable root login, and allow it only from a VPN or known admin addresses.',
    },
    80: {
      banner: 'nginx/1.18.0 (Ubuntu)',
      risk: 'Normal for a web server. The version string tells an attacker which known bugs to try.',
      fix: 'Redirect to HTTPS, keep nginx patched, and hide the version with server_tokens off.',
    },
    443: {
      banner: 'nginx/1.18.0, TLS 1.2 / 1.3',
      risk: 'Normal. This is the one port a public web server usually needs.',
      fix: 'Keep TLS settings modern (no TLS 1.0/1.1) and certificates current.',
    },
    3306: {
      banner: '5.7.42-0ubuntu0.18.04.1 MySQL Community Server',
      risk: 'A database should only be reachable by the application server, never directly from the internet. Exposed databases are routinely found, brute-forced and dumped.',
      fix: 'Bind MySQL to localhost or the private network, and firewall port 3306 from everything except the app server.',
    },
    3389: {
      banner: 'Microsoft Terminal Services (RDP), NLA supported',
      risk: 'Remote Desktop open to the internet is one of the most common ways ransomware crews get in, using stolen or guessed passwords.',
      fix: 'Close it to the internet. Put remote access behind a VPN or gateway with multi-factor authentication.',
    },
  };

  const SCAN_TYPES = {
    sT: { flag: '-sT', name: 'TCP connect', note: 'Completes the full TCP handshake on each port. Reliable, but every connection shows up in the target\'s logs.' },
    sS: { flag: '-sS', name: 'SYN "stealth"', note: 'Sends a SYN and reads the reply without finishing the handshake. Faster and quieter, though modern IDS tools still notice it.' },
  };

  window.CyberSim.registerModule({
    id: 'portscan',
    order: 7,
    group: 'Network',
    title: 'Port Scanner',
    icon: 'radar',
    minutes: 3,
    blurb: 'Scan a fictional server for 20 common services and work out which open ports are a problem.',
    description: 'Scan a fictional server for 20 common services, then click any port to see what an attacker would learn and how to lock it down.',
    howItWorks: `
      <h3>What a port scan is</h3>
      <p>A computer offers services on numbered <strong>ports</strong>: web on 80 and 443, SSH on 22, and so on. A port scan knocks on each one to see which answer. An <strong>open</strong> port has a program listening; a <strong>closed</strong> one refuses the connection; a <strong>filtered</strong> one gets no reply because a firewall drops it.</p>
      <h4>Why Nmap is used</h4>
      <p><strong>Nmap</strong> is the standard free, open-source scanner. Defenders and penetration testers use it, with permission, to audit their own networks: find forgotten services, confirm firewall rules work, and keep an inventory of what's exposed. With version detection (<code>-sV</code>) it also reads service banners like the ones in the detail panel.</p>
      <h4>What an attacker learns</h4>
      <ul>
        <li><strong>The attack surface</strong>: every open port is a door to try.</li>
        <li><strong>Software and versions</strong>, which can be matched against known vulnerabilities (CVEs).</li>
        <li><strong>Misconfigurations</strong>: databases, RDP, Redis or Elasticsearch exposed directly, often without authentication.</li>
      </ul>
      <p>The fix is to expose only what must be public (usually just 443), put admin access behind a VPN, and keep databases on an internal network.</p>
      <p class="muted small">Scanning systems you don't own or have written permission to test may be illegal. This simulation sends no network traffic.</p>`,

    mount(body, { timers, complete }) {
      let scanType = 'sT';
      let scanned = false;

      const command = () => `$ nmap ${SCAN_TYPES[scanType].flag} -sV -p ${PORTS.map((p) => p[0]).join(',')} ${SCAN_CONFIG.target}`;

      body.innerHTML = `
        <div class="toolbar">
          <span class="toolbar-label">Target</span>
          <span class="mono"><strong>${SCAN_CONFIG.target}</strong> <span class="muted small">${SCAN_CONFIG.hostname} (fictional)</span></span>
          <span class="spacer"></span>
          <label class="toolbar-label" for="scan-type">Scan type</label>
          <select class="select js-type" id="scan-type" style="width:auto;height:36px">
            ${Object.entries(SCAN_TYPES).map(([k, t]) => `<option value="${k}">${t.flag}  ${t.name}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary js-scan" aria-label="Start a simulated port scan of ${SCAN_CONFIG.target}">${icon('play')} Start scan</button>
        </div>
        <div class="code-block js-cmd"></div>
        <div class="scan-layout">
          <div class="port-grid" aria-live="polite">
            ${PORTS.map(
              ([port, svc]) => `
              <button type="button" class="port" data-port="${port}" disabled aria-label="Port ${port} ${svc}: not scanned">
                <span class="port-num">${port}/tcp</span>
                <span class="port-svc">${svc}</span>
                <span class="port-state js-state">not scanned</span>
              </button>`
            ).join('')}
          </div>
          <aside class="card port-detail js-detail">
            <div class="card-head"><h3>${icon('search')} Port details</h3></div>
            <p class="muted small" style="margin:0">Run the scan, then click a port to see what a version scan reveals about it.</p>
          </aside>
        </div>
        <div class="js-summary"></div>`;

      const scanBtn = body.querySelector('.js-scan');
      const typeSel = body.querySelector('.js-type');
      const cmdEl = body.querySelector('.js-cmd');
      const summary = body.querySelector('.js-summary');
      const detail = body.querySelector('.js-detail');
      const portEls = body.querySelectorAll('.port');

      const showCmd = () => {
        cmdEl.innerHTML = `${escapeHTML(command())}\n<span class="cmt"># ${escapeHTML(SCAN_TYPES[scanType].note)}</span>`;
      };
      showCmd();
      typeSel.addEventListener('change', () => {
        scanType = typeSel.value;
        showCmd();
      });

      function resetPorts() {
        portEls.forEach((el) => {
          el.className = 'port';
          el.disabled = true;
          el.querySelector('.js-state').textContent = 'not scanned';
        });
        summary.innerHTML = '';
        detail.innerHTML = `<div class="card-head"><h3>${icon('search')} Port details</h3></div><p class="muted small" style="margin:0">Scanning…</p>`;
      }

      function showDetail(port, svc) {
        portEls.forEach((el) => el.classList.toggle('selected', Number(el.dataset.port) === port));
        const isOpen = SCAN_CONFIG.open.includes(port);
        const d = DETAILS[port];
        const risky = Boolean(SCAN_CONFIG.risky[port]);
        detail.innerHTML = `
          <div class="card-head">
            <h3>${icon(isOpen ? (risky ? 'alert' : 'check') : 'x')} ${port}/tcp ${escapeHTML(svc)}</h3>
            <span class="pill ${isOpen ? (risky ? 'pill-danger' : 'pill-success') : ''}">${isOpen ? (risky ? 'open, high risk' : 'open') : 'closed'}</span>
          </div>
          ${
            isOpen && d
              ? `<dl>
                  <dt>Banner</dt><dd class="mono small">${escapeHTML(d.banner)}</dd>
                  <dt>Risk</dt><dd>${escapeHTML(d.risk)}</dd>
                  <dt>Fix</dt><dd>${escapeHTML(d.fix)}</dd>
                </dl>`
              : `<p class="small muted" style="margin:0">The host answered with a TCP reset (RST): nothing is listening on this port, so there is nothing here to attack.</p>`
          }`;
      }

      function nmapOutput() {
        const rows = PORTS.filter(([p]) => SCAN_CONFIG.open.includes(p))
          .map(([p, svc]) => {
            const cls = SCAN_CONFIG.risky[p] ? 'risky' : 'open';
            const portCol = `${p}/tcp`.padEnd(10);
            return `<span class="${cls}">${portCol}open   ${svc.toLowerCase().padEnd(8)}</span> ${escapeHTML(DETAILS[p].banner)}`;
          })
          .join('\n');
        const closed = PORTS.length - SCAN_CONFIG.open.length;
        return `Nmap scan report for ${SCAN_CONFIG.hostname} (${SCAN_CONFIG.target})
Host is up (0.0021s latency).
Not shown: ${closed} closed tcp ports (${scanType === 'sS' ? 'reset' : 'conn-refused'})
<span class="dim">PORT      STATE  SERVICE  VERSION</span>
${rows}

Nmap done: 1 IP address (1 host up) scanned in 3.84 seconds`;
      }

      function showSummary() {
        const open = SCAN_CONFIG.open;
        const risky = open.filter((p) => SCAN_CONFIG.risky[p]);
        const riskyText = risky.map((p) => `${p} (${SCAN_CONFIG.risky[p]})`).join(' and ');
        summary.innerHTML = `
          ${callout(
            'warning',
            `${open.length} open ports. ${risky.length} are considered high-risk: ${riskyText}. These should not be exposed to the internet.`,
            `<ul>${risky.map((p) => `<li><strong>${p} ${SCAN_CONFIG.risky[p]}:</strong> ${escapeHTML(DETAILS[p].risk)}</li>`).join('')}
              <li><strong>22, 80, 443:</strong> expected for a server. Keep them patched, and restrict SSH to known addresses or a VPN.</li></ul>`
          )}
          <div class="card">
            <div class="card-head"><h3>${icon('terminal')} Scan output</h3></div>
            <div class="code-block nmap-out">${nmapOutput()}</div>
          </div>`;
      }

      portEls.forEach((el) =>
        el.addEventListener('click', () => {
          if (!scanned) return;
          const port = Number(el.dataset.port);
          showDetail(port, PORTS.find((p) => p[0] === port)[1]);
        })
      );

      scanBtn.addEventListener('click', () => {
        scanBtn.disabled = true;
        typeSel.disabled = true;
        scanned = false;
        resetPorts();
        PORTS.forEach(([port, svc], i) => {
          const el = portEls[i];
          const stateEl = el.querySelector('.js-state');
          timers.timeout(() => {
            stateEl.innerHTML = '<span class="spinner" aria-hidden="true"></span> probing';
          }, i * STAGGER_MS);
          timers.timeout(() => {
            const isOpen = SCAN_CONFIG.open.includes(port);
            const isRisky = Boolean(SCAN_CONFIG.risky[port]);
            el.classList.add('scanned', isOpen ? (isRisky ? 'open-risky' : 'open-safe') : 'closed');
            el.disabled = false;
            stateEl.innerHTML = isOpen ? (isRisky ? `${icon('alert', 'ico-sm')} OPEN · RISK` : 'OPEN') : 'CLOSED';
            el.setAttribute('aria-label', `Port ${port} ${svc}: ${isOpen ? (isRisky ? 'open, high risk' : 'open') : 'closed'}`);
            if (i === PORTS.length - 1) {
              scanned = true;
              showSummary();
              showDetail(3389, 'RDP');
              scanBtn.disabled = false;
              typeSel.disabled = false;
              scanBtn.innerHTML = `${icon('reset')} Scan again`;
              complete();
            }
          }, i * STAGGER_MS + SPIN_MS);
        });
      });
    },
  });
})();
