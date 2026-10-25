/* Module 1: Phishing Simulator.
   Shows 18 fictional emails one at a time in a mail-client view. The user labels each one,
   then the red flags are highlighted inside the email itself. */
(function () {
  'use strict';

  const { shuffle, escapeHTML, escapeRegExp, toast, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);
  const AVERAGE_SCORE = 11;

  // Bare domains / URLs in the body (no scheme). The look-behind skips the domain part of email addresses.
  const LINK_RE = /(?<![@\w.-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|info)(?:\/[^\s]*)?/gi;

  const FLAG_LABELS = { sender: 'Sender domain', reply_to: 'Reply-To mismatch', link: 'Suspicious link', urgency: 'Pressure tactic' };

  let cachedEmails = null;
  let generation = 0;
  let keyController = null;

  /** Load the dataset: fetch the JSON when served over HTTP(S); use the bundled copy when opened from disk. */
  async function loadEmails() {
    if (cachedEmails) return cachedEmails;
    const bundled = window.CYBERSIM_PHISHING_EMAILS;
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try {
        const res = await fetch('data/phishing_emails.json', { cache: 'no-cache' });
        if (res.ok) {
          cachedEmails = await res.json();
          return cachedEmails;
        }
      } catch (err) {
        /* fall through to the bundled copy */
      }
    }
    if (Array.isArray(bundled)) {
      cachedEmails = bundled;
      return cachedEmails;
    }
    throw new Error('Phishing dataset is unavailable.');
  }

  function formatTimestamp(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const domainOf = (addr) => String(addr).split('@').pop().toLowerCase();

  function initials(name) {
    return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  /**
   * Render the body as HTML. Every character gets a set of classes (link, flag-red, flag-urgent);
   * runs of characters with the same classes become one <span>. This keeps overlapping highlights correct.
   */
  function renderBody(text, flags, reveal) {
    const classes = Array.from({ length: text.length }, () => new Set());
    const mark = (start, end, cls) => {
      for (let i = start; i < end; i++) classes[i].add(cls);
    };

    for (const m of text.matchAll(LINK_RE)) mark(m.index, m.index + m[0].length, 'link');

    if (reveal) {
      for (const flag of flags) {
        if (!flag.match || (flag.type !== 'link' && flag.type !== 'urgency')) continue;
        const re = new RegExp(escapeRegExp(flag.match), 'g');
        for (const m of text.matchAll(re)) {
          mark(m.index, m.index + m[0].length, flag.type === 'link' ? 'flag-red' : 'flag-urgent');
        }
      }
    }

    let out = '';
    let i = 0;
    while (i < text.length) {
      const key = [...classes[i]].sort().join(' ');
      let j = i + 1;
      while (j < text.length && [...classes[j]].sort().join(' ') === key) j++;
      const raw = text.slice(i, j);
      const chunk = escapeHTML(raw);
      if (classes[i].has('link')) {
        out += `<span class="${key}" tabindex="0" data-href="${chunk}">${chunk}</span>`;
      } else {
        out += key ? `<span class="${key}">${chunk}</span>` : chunk;
      }
      i = j;
    }
    return out;
  }

  function renderEmail(email, reveal, position) {
    const flags = email.red_flags || [];
    const senderFlag = reveal && flags.some((f) => f.type === 'sender');
    const replyMismatch = email.reply_to && domainOf(email.reply_to) !== domainOf(email.sender_address);
    const replyFlag = reveal && (replyMismatch || flags.some((f) => f.type === 'reply_to'));
    const replyTo = email.reply_to || email.sender_address;
    return `
      <article class="card mail-client" aria-label="Email ${position}">
        <div class="mail-chrome">${icon('mail')} Inbox <span class="spacer"></span> ${escapeHTML(email.category)} · ${position}</div>
        <div class="mail-head">
          <div class="mail-subject">${escapeHTML(email.subject)}</div>
          <div class="mail-sender">
            <span class="avatar" aria-hidden="true">${escapeHTML(initials(email.sender_name))}</span>
            <div class="mail-meta">
              <div><span class="mail-from">${escapeHTML(email.sender_name)}</span> <span class="mail-addr">&lt;<span class="${senderFlag ? 'flag-red' : ''}">${escapeHTML(email.sender_address)}</span>&gt;</span></div>
              <div class="mail-line"><b>to</b>jordan.ellison@brightpath-consulting.com</div>
              <div class="mail-line"><b>reply-to</b><span class="${replyFlag ? 'flag-red' : ''}">${escapeHTML(replyTo)}</span></div>
            </div>
            <div class="mail-time">${escapeHTML(formatTimestamp(email.timestamp))}</div>
          </div>
        </div>
        <div class="mail-body">${renderBody(email.body, flags, reveal)}</div>
        <div class="mail-status js-status" aria-live="off">Hover over a link to see where it really goes.</div>
      </article>`;
  }

  function renderVerdict(email, guessedPhishing) {
    const correct = guessedPhishing === email.is_phishing;
    const truth = email.is_phishing ? 'This one is phishing.' : 'This one is legitimate.';
    let details;
    if (email.is_phishing) {
      details = `<ul>${email.red_flags
        .map((f) => `<li><strong>${FLAG_LABELS[f.type] || 'Red flag'}:</strong> ${escapeHTML(f.explanation)}</li>`)
        .join('')}</ul>`;
    } else {
      details = `<p>${escapeHTML(email.why_legit || 'No red flags present.')}</p>`;
    }
    return callout(correct ? 'success' : 'danger', `${correct ? 'Correct.' : 'Not quite.'} ${truth}`, details);
  }

  function scoreRing(score, total) {
    const r = 64;
    const c = 2 * Math.PI * r;
    return `
      <div class="score-ring">
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <circle class="ring-bg" cx="75" cy="75" r="${r}" fill="none" stroke-width="10"/>
          <circle class="ring-fg js-ring" cx="75" cy="75" r="${r}" fill="none" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - score / total)}"/>
        </svg>
        <div class="score-ring-label">${score}/${total}</div>
      </div>`;
  }

  window.CyberSim.registerModule({
    id: 'phishing',
    order: 1,
    group: 'Social engineering',
    title: 'Phishing Simulator',
    icon: 'hook',
    minutes: 6,
    blurb: 'Sort 18 emails into phishing and legitimate, then see every red flag highlighted.',
    description: 'Eighteen fictional emails land in your inbox. Decide which are phishing, then see exactly which details gave them away.',
    howItWorks: `
      <h3>How phishing works</h3>
      <p>Phishing emails impersonate a brand or a person you trust so that you click a link, open an attachment, send money, or type a password somewhere you shouldn't. They rarely exploit a technical flaw. They exploit trust and time pressure.</p>
      <h4>What to check, every time</h4>
      <ul>
        <li><strong>The real sender domain.</strong> Homoglyph tricks swap look-alike characters: <code>paypa1.com</code> (digit 1 for l), <code>arnazon.com</code> (rn for m), <code>g00gle.com</code> (zeros for o), <code>lnstagram.com</code> (lowercase L for capital I).</li>
        <li><strong>Reply-To.</strong> If replies go to a different domain, often a free webmail account, your answer goes straight to the attacker.</li>
        <li><strong>Where links actually point.</strong> Hover before you click. In a real mail client the visible text and the destination can be completely different.</li>
        <li><strong>Urgency and secrecy.</strong> "Within 24 hours", "account will be deleted", "keep this confidential" are there to stop you thinking or asking someone.</li>
        <li><strong>Requests for money, gift cards or credentials.</strong> Legitimate organisations don't ask for passwords or fees by email.</li>
      </ul>
      <p>The safest habit is to never act on the email itself. Open the app or type the address yourself, or phone the person on a number you already have.</p>
      <p class="muted small">Shortcuts while sorting: <kbd>P</kbd> phishing, <kbd>L</kbd> legitimate, <kbd>N</kbd> next email.</p>`,

    mount(body, { complete }) {
      const gen = ++generation;
      const state = { emails: [], index: 0, score: 0, answered: false, guess: null, results: [] };

      body.innerHTML = '<div class="card muted">Loading inbox…</div>';

      loadEmails()
        .then((emails) => {
          if (gen !== generation) return; // module was reset or left while loading
          state.emails = shuffle(emails);
          draw();
        })
        .catch((err) => {
          if (gen !== generation) return;
          body.innerHTML = callout('danger', 'Could not load the email dataset.', `<p>${escapeHTML(err.message)}</p>`);
        });

      keyController = new AbortController();
      document.addEventListener(
        'keydown',
        (event) => {
          const t = event.target;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
          const k = event.key.toLowerCase();
          if (k === 'p' && !state.answered) answer(true);
          else if (k === 'l' && !state.answered) answer(false);
          else if (k === 'n' && state.answered) advance();
        },
        { signal: keyController.signal }
      );

      function dots() {
        return state.emails
          .map((_, i) => {
            const r = state.results[i];
            const cls = r === undefined ? (i === state.index ? 'current' : '') : r.correct ? 'right' : 'wrong';
            return `<span class="phish-dot ${cls}"></span>`;
          })
          .join('');
      }

      function draw() {
        const total = state.emails.length;
        if (state.index >= total) return drawFinal();

        const email = state.emails[state.index];
        const streak = (() => {
          let s = 0;
          for (let i = state.results.length - 1; i >= 0 && state.results[i].correct; i--) s++;
          return s;
        })();
        body.innerHTML = `
          <div class="phish-bar">
            <div class="phish-dots" aria-label="Progress: email ${state.index + 1} of ${total}">${dots()}</div>
            <div class="stats">
              <div class="stat"><span class="stat-label">Score</span><span class="stat-value accent">${state.score}</span></div>
              <div class="stat"><span class="stat-label">Streak</span><span class="stat-value">${streak}</span></div>
            </div>
          </div>
          ${renderEmail(email, state.answered, `${state.index + 1}/${total}`)}
          <div class="btn-row">
            <button type="button" class="btn btn-danger js-phish" ${state.answered ? 'disabled' : ''} aria-label="Mark this email as phishing">${icon('flag')} Phishing <kbd>P</kbd></button>
            <button type="button" class="btn btn-success js-legit" ${state.answered ? 'disabled' : ''} aria-label="Mark this email as legitimate">${icon('check')} Legitimate <kbd>L</kbd></button>
            ${state.answered ? `<button type="button" class="btn btn-primary js-next">${state.index + 1 === total ? 'See results' : 'Next email'} ${icon('arrowRight')}</button>` : ''}
          </div>
          ${state.answered ? renderVerdict(email, state.guess) : ''}`;

        body.querySelector('.js-phish').addEventListener('click', () => answer(true));
        body.querySelector('.js-legit').addEventListener('click', () => answer(false));
        const next = body.querySelector('.js-next');
        if (next) {
          next.addEventListener('click', advance);
          next.focus({ preventScroll: true });
        }

        const status = body.querySelector('.js-status');
        const showLink = (event) => {
          const link = event.target.closest('[data-href]');
          if (!link) return;
          const dest = link.dataset.href;
          const lookalike = state.answered && link.classList.contains('flag-red');
          status.innerHTML = `${icon('arrowRight', 'ico-sm')} ${escapeHTML(dest)}${lookalike ? ' <span class="pill pill-danger">look-alike domain</span>' : ''}`;
        };
        const mailBody = body.querySelector('.mail-body');
        mailBody.addEventListener('mouseover', showLink);
        mailBody.addEventListener('focusin', showLink);
      }

      function answer(guessPhishing) {
        if (state.answered || !state.emails.length || state.index >= state.emails.length) return;
        const email = state.emails[state.index];
        const correct = guessPhishing === email.is_phishing;
        state.answered = true;
        state.guess = guessPhishing;
        state.results[state.index] = { correct, email };
        if (correct) state.score++;
        toast(correct ? 'Correct' : 'Not quite, check the explanation', correct ? 'success' : 'danger', 1300);
        draw();
      }

      function advance() {
        if (!state.answered) return;
        state.index++;
        state.answered = false;
        state.guess = null;
        draw();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function drawFinal() {
        const total = state.emails.length;
        const pct = Math.round((state.score / total) * 100);
        const message =
          state.score >= 16 ? 'That is a sharp eye. Most people miss at least a few of the look-alike domains.'
          : state.score >= AVERAGE_SCORE ? 'Above or level with the average. Review the misses below and try again.'
          : 'Below the average. Have a look at the misses and the "How it works" notes, then go again.';

        const cats = {};
        state.results.forEach(({ correct, email }) => {
          cats[email.category] = cats[email.category] || { right: 0, total: 0 };
          cats[email.category].total++;
          if (correct) cats[email.category].right++;
        });
        const missed = state.results.filter((r) => !r.correct);

        body.innerHTML = `
          <div class="card phish-final">
            <div class="eyebrow">Results</div>
            ${scoreRing(state.score, total)}
            <p><strong>You scored ${state.score}/${total}. Average score: ${AVERAGE_SCORE}/${total}.</strong></p>
            <p class="muted">${pct}% correct. ${message}</p>
            <table class="breakdown">
              <thead><tr><th>Category</th><th>Correct</th></tr></thead>
              <tbody>${Object.entries(cats)
                .sort()
                .map(([cat, c]) => `<tr><td>${escapeHTML(cat)}</td><td>${c.right}/${c.total}</td></tr>`)
                .join('')}</tbody>
            </table>
            ${missed.length ? `<p class="small muted">Emails you missed:</p><ul class="missed-list">${missed
              .map((r) => `<li>${escapeHTML(r.email.subject)} <span class="pill ${r.email.is_phishing ? 'pill-danger' : 'pill-success'}">${r.email.is_phishing ? 'phishing' : 'legit'}</span></li>`)
              .join('')}</ul>` : ''}
            <button type="button" class="btn btn-primary js-restart">${icon('reset')} Restart</button>
          </div>`;

        requestAnimationFrame(() => {
          const ring = body.querySelector('.js-ring');
          if (ring) ring.style.strokeDashoffset = ring.dataset.target;
        });
        body.querySelector('.js-restart').addEventListener('click', () => {
          state.emails = shuffle(state.emails);
          state.index = 0;
          state.score = 0;
          state.answered = false;
          state.guess = null;
          state.results = [];
          draw();
        });
        complete();
      }
    },

    unmount() {
      generation++;
      if (keyController) keyController.abort();
      keyController = null;
    },
  });
})();
