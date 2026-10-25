/* Module 2: SQL Injection Simulator.
   No SQL is executed anywhere. The "database" is a JavaScript array, and the vulnerable
   login is a function that recognises classic injection payloads in the concatenated string. */
(function () {
  'use strict';

  const { escapeHTML, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);

  // A pretend users table. Plain-text passwords only because this is a toy; see "How it works".
  const USERS = [
    { id: 1, username: 'admin', password: 'S3cure!Admin#2026', role: 'administrator' },
    { id: 2, username: 'alice', password: 'wonderland42', role: 'user' },
    { id: 3, username: 'bob', password: 'builder-bob-77', role: 'user' },
  ];

  const NORMAL = { username: 'alice', password: 'wonderland42' };
  const INJECTION = "' OR '1'='1' --";

  // Patterns that make the concatenated WHERE clause always true, or comment out the password check.
  const TAUTOLOGY_RE = /'\s*or\s*('?)(\w+)\1\s*=\s*\1\2\1?/i; // ' OR '1'='1  /  ' OR 1=1  /  ' OR 'a'='a
  const COMMENT_TRUNC_RE = /^(\w+)'\s*(--|#)/; // admin' --

  /** Simulate the vulnerable query. Returns { ok, user, reason }. */
  function vulnerableLogin(username, password) {
    const combined = `${username}\u0000${password}`;
    if (TAUTOLOGY_RE.test(username) || TAUTOLOGY_RE.test(password)) {
      return { ok: true, user: USERS[0], reason: 'tautology', rows: USERS.length };
    }
    const trunc = username.match(COMMENT_TRUNC_RE);
    if (trunc) {
      const user = USERS.find((u) => u.username === trunc[1]);
      if (user) return { ok: true, user, reason: 'comment', rows: 1 };
      return { ok: false, reason: 'nomatch' };
    }
    if (combined.includes("'")) {
      // An unbalanced quote that isn't a known payload breaks the statement.
      return { ok: false, reason: 'syntax' };
    }
    const user = USERS.find((u) => u.username === username && u.password === password);
    return user ? { ok: true, user, reason: 'normal', rows: 1 } : { ok: false, reason: 'nomatch' };
  }

  /** Simulate the parameterised query: inputs are only ever compared as plain values. */
  function secureLogin(username, password) {
    const user = USERS.find((u) => u.username === username && u.password === password);
    return user ? { ok: true, user, reason: 'normal' } : { ok: false, reason: 'nomatch' };
  }

  /** Highlighted SQL for the concatenated query. Injected input is red; anything after "--" is a comment. */
  function renderVulnerableQuery(username, password) {
    const segments = [
      { text: 'SELECT', cls: 'kw' }, { text: ' * ' }, { text: 'FROM', cls: 'kw' }, { text: ' users ' },
      { text: 'WHERE', cls: 'kw' }, { text: ' username = ' }, { text: "'", cls: 'str' },
      { text: username, input: true }, { text: "'", cls: 'str' }, { text: ' ' }, { text: 'AND', cls: 'kw' },
      { text: ' password = ' }, { text: "'", cls: 'str' }, { text: password, input: true }, { text: "'", cls: 'str' },
    ];

    let commented = false;
    let out = '';
    for (const seg of segments) {
      if (commented) {
        out += `<span class="cmt">${escapeHTML(seg.text)}</span>`;
        continue;
      }
      if (seg.input) {
        const injected = seg.text.includes("'");
        const dash = injected ? seg.text.indexOf('--') : -1;
        if (dash >= 0) {
          out += `<span class="inj">${escapeHTML(seg.text.slice(0, dash))}</span>`;
          out += `<span class="cmt">${escapeHTML(seg.text.slice(dash))}</span>`;
          commented = true;
        } else {
          out += injected ? `<span class="inj">${escapeHTML(seg.text)}</span>` : `<span class="str">${escapeHTML(seg.text)}</span>`;
        }
        continue;
      }
      out += seg.cls ? `<span class="${seg.cls}">${escapeHTML(seg.text)}</span>` : escapeHTML(seg.text);
    }
    return out;
  }

  function renderSecureQuery(username, password) {
    return (
      '<span class="kw">SELECT</span> * <span class="kw">FROM</span> users <span class="kw">WHERE</span> username = <span class="param">?</span> <span class="kw">AND</span> password = <span class="param">?</span>' +
      `\n<span class="cmt">-- parameters:</span> <span class="param">[${escapeHTML(JSON.stringify(username))}, ${escapeHTML(JSON.stringify(password))}]</span>`
    );
  }

  function vulnerableResult(res) {
    if (res.ok && res.reason === 'tautology') {
      return `
        <div class="alarm" role="alert"><div class="alarm-title">LOGIN BYPASSED</div>
          <p>Logged in as <strong>${escapeHTML(res.user.username)}</strong> (${escapeHTML(res.user.role)}) without knowing any password.</p>
          <p>Why: the quote in the input closed the string early, so <code>' OR '1'='1'</code> became part of the SQL itself. The WHERE clause now reads "username matches <em>or</em> 1 equals 1", and 1 always equals 1, so it is <strong>always true</strong>. The database returns every row (${res.rows} users) and the app logs you in as the first one: the administrator. The <code>--</code> turns the rest of the query, including the password check, into a comment.</p>
        </div>`;
    }
    if (res.ok && res.reason === 'comment') {
      return `
        <div class="alarm" role="alert"><div class="alarm-title">LOGIN BYPASSED</div>
          <p>Logged in as <strong>${escapeHTML(res.user.username)}</strong>. The <code>--</code> commented out the password check entirely, so only the username had to match.</p>
        </div>`;
    }
    if (res.ok) {
      return callout('success', `Login successful. Welcome, ${escapeHTML(res.user.username)}.`, '<p>Normal credentials behave the same in both panels.</p>');
    }
    if (res.reason === 'syntax') {
      return callout('warning', 'Simulated database error: unclosed quotation mark.', '<p>A stray quote broke the SQL. Attackers use errors like this to confirm a field is injectable.</p>');
    }
    return callout('danger', 'Login failed. No matching user.');
  }

  function secureResult(res, attempted) {
    if (res.ok) {
      return callout('success', `Login successful. Welcome, ${escapeHTML(res.user.username)}.`);
    }
    if (attempted) {
      return callout(
        'success',
        'Login failed. Injection blocked.',
        `<p>The input was sent as a <strong>parameter</strong>, so the database treated it as a plain string, not SQL. It looked for a user literally named <code>${escapeHTML(attempted)}</code>, found none, and refused the login.</p>`
      );
    }
    return callout('danger', 'Login failed. No matching user.');
  }

  function loginPanel(kind) {
    const vuln = kind === 'vuln';
    return `
      <section class="card login-panel ${kind}" aria-labelledby="${kind}-title">
        <div class="card-head">
          <h3 id="${kind}-title">${icon(vuln ? 'unlock' : 'shieldCheck')} ${vuln ? 'Vulnerable login' : 'Secure login'}</h3>
          <span class="pill ${vuln ? 'pill-danger' : 'pill-success'}">${vuln ? 'string concatenation' : 'parameterised'}</span>
        </div>
        <form class="js-form" data-kind="${kind}" autocomplete="off">
          <div class="field">
            <label for="${kind}-user">Username</label>
            <input class="input mono" id="${kind}-user" name="username" type="text" spellcheck="false">
          </div>
          <div class="field">
            <label for="${kind}-pass">Password</label>
            <input class="input mono" id="${kind}-pass" name="password" type="text" spellcheck="false">
          </div>
          <button type="submit" class="btn ${vuln ? 'btn-danger' : 'btn-success'}" aria-label="Log in using the ${vuln ? 'vulnerable' : 'secure'} panel">${icon('arrowRight')} Login</button>
        </form>
        <div class="query-label">Query sent to the database</div>
        <div class="code-block js-query" aria-live="polite"><span class="cmt">-- press Login to build the query</span></div>
        <div class="login-result js-result" aria-live="polite"></div>
      </section>`;
  }

  window.CyberSim.registerModule({
    id: 'sqli',
    order: 2,
    group: 'Web & data',
    title: 'SQL Injection Simulator',
    icon: 'database',
    minutes: 4,
    blurb: 'Two login forms, one payload. See why parameterised queries shut the attack down.',
    description: 'Two login forms talk to the same pretend database. One glues your input into the SQL, the other passes it as a parameter. Try the same input on both.',
    howItWorks: `
      <h3>How SQL injection works</h3>
      <p>Many apps check a login by asking the database a question like "find a user with this username and this password". The vulnerable version builds that question by <strong>pasting the user's text straight into the SQL</strong>:</p>
      <div class="code-block">query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"</div>
      <p>If the username contains a quote, the attacker can end the string early and write their own SQL. Typing <code>' OR '1'='1' --</code> turns the question into "find users where the username is blank <em>or</em> 1 equals 1", which is true for every row. The <code>--</code> hides the rest of the line, including the password check.</p>
      <h4>The fix: parameterised queries</h4>
      <p>A parameterised (or "prepared") query sends the SQL and the user's data <strong>separately</strong>. The SQL has placeholders (<code>?</code>) and the values travel alongside it. The database already knows the shape of the query before it sees the data, so the data can never change that shape. A quote is just a quote character inside a username, nothing more.</p>
      <div class="code-block">db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password])</div>
      <h4>Also worth knowing</h4>
      <ul>
        <li>Never store plain-text passwords as this toy table does. Store a slow, salted hash (see the Password module).</li>
        <li>Escaping quotes by hand is fragile. Use your language's parameter binding or an ORM that uses it.</li>
        <li>Give the app's database account the least privilege it needs, so a mistake can't drop tables.</li>
      </ul>
      <p class="muted small">Everything here is simulated: the "database" is a JavaScript array and no SQL engine runs.</p>`,

    mount(body, { complete }) {
      const seen = { bypassed: false, blocked: false };

      body.innerHTML = `
        <div class="toolbar">
          <span class="toolbar-label">Fill both panels</span>
          <button type="button" class="btn btn-sm js-fill-normal" aria-label="Fill both panels with a normal login">Normal login</button>
          <button type="button" class="btn btn-sm btn-outline-danger js-fill-inject" aria-label="Fill both panels with an SQL injection payload">${icon('zap')} SQL injection attempt</button>
          <span class="spacer"></span>
          <span class="muted small">Test accounts: <code>alice / wonderland42</code>, <code>bob / builder-bob-77</code></span>
        </div>
        <div class="grid-2">
          ${loginPanel('vuln')}
          ${loginPanel('secure')}
        </div>`;

      const fill = ({ username, password }) => {
        ['vuln', 'secure'].forEach((k) => {
          body.querySelector(`#${k}-user`).value = username;
          body.querySelector(`#${k}-pass`).value = password;
        });
      };
      body.querySelector('.js-fill-normal').addEventListener('click', () => fill(NORMAL));
      body.querySelector('.js-fill-inject').addEventListener('click', () => fill({ username: INJECTION, password: INJECTION }));

      body.querySelectorAll('.js-form').forEach((form) => {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const kind = form.dataset.kind;
          const panel = form.closest('.login-panel');
          const username = form.elements.username.value;
          const password = form.elements.password.value;
          const queryEl = panel.querySelector('.js-query');
          const resultEl = panel.querySelector('.js-result');

          if (kind === 'vuln') {
            queryEl.innerHTML = renderVulnerableQuery(username, password);
            const res = vulnerableLogin(username, password);
            resultEl.innerHTML = vulnerableResult(res);
            if (res.ok && res.reason !== 'normal') seen.bypassed = true;
          } else {
            queryEl.innerHTML = renderSecureQuery(username, password);
            const res = secureLogin(username, password);
            const attempted = /['"]|--|\bor\b/i.test(username + password) ? username : '';
            resultEl.innerHTML = secureResult(res, attempted);
            if (!res.ok && attempted) seen.blocked = true;
          }
          if (seen.bypassed && seen.blocked) complete();
        });
      });
    },
  });
})();
