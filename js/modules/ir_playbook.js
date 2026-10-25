/* Module 10: Incident Response Playbook.
   A branching decision tree for a phishing incident. Wrong answers explain themselves and
   return to the same decision; the right answer advances to the next step. */
(function () {
  'use strict';

  const { escapeHTML, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);

  const STEPS = [
    {
      short: 'Isolate',
      scenario: 'An employee forwards an email saying "I clicked a link and now my computer is slow." What do you do first?',
      options: [
        { text: 'Ask the employee to restart the computer', why: 'Restarting can wipe volatile evidence (running processes, network connections, memory) and does nothing to stop malware that has already set up persistence. It may also let it re-connect on boot.' },
        { text: 'Isolate the machine from the network', correct: true, why: 'Correct. Containment comes first: disconnecting the machine (pull the cable, disable Wi-Fi, or use your EDR\'s network-isolation button) stops any malware from spreading or talking to the attacker, while leaving the machine powered on to preserve evidence.' },
        { text: 'Open the link yourself to check', why: 'Never open a suspected malicious link on a normal workstation. You could infect a second machine (yours) and you may expose your own, more privileged, credentials.' },
        { text: 'Wait to see if the issue resolves', why: 'Every minute you wait gives the attacker time to steal data, move to other machines, or deploy ransomware. Slowness after clicking a link is a symptom worth acting on immediately.' },
      ],
    },
    {
      short: 'Preserve evidence',
      scenario: 'The laptop is off the network but still powered on. What next?',
      options: [
        { text: 'Run a full antivirus scan and delete anything it finds', why: 'Deleting files destroys evidence you need to understand what happened, how far it spread, and what data was taken. Analyse first, clean later.' },
        { text: 'Preserve evidence: capture memory, take a disk image, save the original email with headers', correct: true, why: 'Correct. Volatile data (RAM, running processes, open connections) disappears on shutdown, so capture it first. Keep the original phishing email with full headers, note times, and record who handled what. Chain of custody matters if this becomes a legal or insurance matter.' },
        { text: 'Wipe and reinstall the operating system straight away', why: 'Reimaging is part of recovery, but doing it now destroys all evidence. You would never learn what the malware did or which accounts and systems it touched.' },
        { text: 'Let the employee keep working offline so they aren\'t disrupted', why: 'Continued use overwrites evidence and risks the user opening more files. Give them a loaner device instead.' },
      ],
    },
    {
      short: 'Notify',
      scenario: 'Evidence is preserved. Who needs to know?',
      options: [
        { text: 'Nobody yet, fix it quietly to avoid embarrassment', why: 'Hiding an incident is how small breaches become big ones. Others may have received the same email, and you may have legal notification duties with strict deadlines.' },
        { text: 'Email the whole company with the details', why: 'Broadcasting details too early can tip off an attacker who has access to email, spread panic, and expose information that should stay need-to-know.' },
        { text: 'Post the email on social media to warn others', why: 'This could leak internal data and evidence. Share indicators through proper channels once the incident team approves it.' },
        { text: 'Notify the security / incident response team and follow the escalation plan', correct: true, why: 'Correct. The IR team opens a ticket, assigns a lead, and coordinates. They will check whether other staff got the same email, search mail logs, block the sender and link domain, and loop in management, legal, or privacy officers as the plan requires, through an out-of-band channel if email may be compromised.' },
      ],
    },
    {
      short: 'Check credentials',
      scenario: 'The link led to a fake Microsoft 365 sign-in page. What do you check?',
      options: [
        { text: 'Check for credential compromise: sign-in logs, new MFA devices, inbox rules, OAuth app grants', correct: true, why: 'Correct. Phishing pages harvest passwords and session tokens. Review sign-in logs for unfamiliar locations, look for newly registered MFA methods, forwarding or deletion inbox rules, and suspicious app consents. Attackers use these to keep access even after a password change.' },
        { text: 'Nothing, the laptop is isolated, so the account is safe', why: 'Isolating the laptop doesn\'t protect the account. If the user typed their password into the fake page, the attacker can sign in from anywhere.' },
        { text: 'Ask the employee if they think they typed their password', why: 'Worth asking, but memory is unreliable and attackers can steal session cookies without a password being retyped. Verify with logs, don\'t rely on recollection.' },
        { text: 'Only check the employee\'s browser history', why: 'Browser history shows where they went, not what the attacker did with the credentials afterwards. You need identity-provider and mailbox logs.' },
      ],
    },
    {
      short: 'Eradicate & recover',
      scenario: 'Logs show a sign-in from an unfamiliar country and a new inbox-forwarding rule. How do you eradicate and recover?',
      options: [
        { text: 'Just delete the forwarding rule', why: 'Removing one symptom leaves the attacker with a valid password and active sessions. They\'ll simply set up access again.' },
        { text: 'Reset the password, revoke all sessions and tokens, remove malicious rules and MFA devices, then reimage the laptop from a known-good image', correct: true, why: 'Correct. Eradication removes every foothold: credentials, sessions, persistence, and the infected OS. Reimaging from a trusted image is more reliable than trying to clean malware. Restore the user\'s files from backup and monitor the account closely afterwards.' },
        { text: 'Change the password but keep the laptop because the scan is now clean', why: 'A clean scan isn\'t proof. Sophisticated malware hides from scanners. If the device was compromised, rebuild it from a known-good image.' },
        { text: 'Disable the account permanently', why: 'Over-reaction: the user still needs to work. Secure the account (reset, revoke, re-enrol MFA) rather than abandoning it.' },
      ],
    },
    {
      short: 'Document & communicate',
      scenario: 'The user is back up and running on a clean machine. Are you done?',
      options: [
        { text: 'Yes, close the ticket and move on', why: 'Skipping the review means the same attack will work again. Post-incident activity is where you get the value from a painful event.' },
        { text: 'Blame the employee in the all-hands meeting', why: 'Blame discourages people from reporting quickly, and fast reporting is what saved you here. Thank them for reporting.' },
        { text: 'Document the timeline and lessons learned, communicate to stakeholders, and improve defences', correct: true, why: 'Correct. Write up what happened, when, and how it was handled; hold a blameless lessons-learned meeting; notify regulators or affected parties if required; then improve controls, for example phishing-resistant MFA, better email filtering, and targeted awareness training. Update this playbook with what you learned.' },
        { text: 'Delete the evidence to save storage space', why: 'Evidence must be retained per your policy and any legal requirements. It may be needed for insurance claims, law enforcement, or if the attacker returns.' },
      ],
    },
  ];

  // Simulated minutes that pass per decision. Wrong calls give the attacker more time.
  const MINUTES_RIGHT = 10;
  const MINUTES_WRONG = 25;

  let keyController = null;

  function clock(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `T+${h ? `${h}h ` : ''}${String(m).padStart(2, '0')}m`;
  }

  function grade(mistakes) {
    if (mistakes === 0) return ['A', '', 'Textbook response. You contained it fast and kept the evidence.'];
    if (mistakes <= 2) return ['B', '', 'Solid. A couple of detours, but the incident was handled properly.'];
    if (mistakes <= 5) return ['C', '', 'You got there, but the attacker had extra time. Run it again and aim for zero wrong calls.'];
    return ['D', '', 'Lots of detours. Read the summary below and the "How it works" panel, then try again.'];
  }

  window.CyberSim.registerModule({
    id: 'ir_playbook',
    order: 10,
    group: 'Response',
    title: 'Incident Response Playbook',
    icon: 'siren',
    minutes: 5,
    blurb: 'Run a phishing incident from first report to lessons learned, one decision at a time.',
    description: 'An employee reports a suspicious click. Work the incident through six decisions, following the NIST SP 800-61 process. Every wrong call gives the attacker more time.',
    howItWorks: `
      <h3>The incident response lifecycle</h3>
      <p>NIST Special Publication 800-61, the <em>Computer Security Incident Handling Guide</em>, describes incident response as a cycle of four phases:</p>
      <ol>
        <li><strong>Preparation</strong>: before anything happens, an IR plan and playbooks like this one, a trained team, contact lists, logging, backups, and tools such as EDR that can isolate a machine with one click.</li>
        <li><strong>Detection &amp; Analysis</strong>: recognising that something is wrong (often a user report, as here), confirming it's a real incident, judging its scope and severity, and recording everything.</li>
        <li><strong>Containment, Eradication &amp; Recovery</strong>: stop the bleeding (isolate), remove the attacker's access (reset credentials, revoke sessions, rebuild systems), then restore normal operations and watch for a return.</li>
        <li><strong>Post-Incident Activity</strong>: lessons learned, documentation, evidence retention, and improving defences so it doesn't happen the same way twice.</li>
      </ol>
      <p>The phases loop: lessons learned feed back into preparation. The 2025 revision (800-61 Rev. 3) maps the same ideas onto the NIST Cybersecurity Framework 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover), but the order of operations is unchanged.</p>
      <p class="muted small">Shortcut: press <kbd>A</kbd> to <kbd>D</kbd> to pick an option, <kbd>N</kbd> for the next decision.</p>`,

    mount(body, { complete }) {
      const state = { step: 0, mistakes: 0, tried: new Set(), solved: false, minutes: 0, log: [] };

      keyController = new AbortController();
      document.addEventListener(
        'keydown',
        (event) => {
          const t = event.target;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
          if (state.step >= STEPS.length) return;
          const k = event.key.toLowerCase();
          const idx = 'abcd'.indexOf(k);
          if (idx >= 0 && !state.solved && !state.tried.has(idx)) choose(idx);
          else if (k === 'n' && state.solved) advance();
        },
        { signal: keyController.signal }
      );

      function progressBar() {
        return `
          <div class="ir-steps" aria-label="Playbook progress">
            ${STEPS.map((s, i) => {
              const cls = i < state.step || (i === state.step && state.solved) ? 'done' : i === state.step ? 'current' : '';
              return `<div class="ir-step ${cls}"><b>${String(i + 1).padStart(2, '0')}</b>${escapeHTML(s.short)}</div>`;
            }).join('')}
          </div>`;
      }

      function header() {
        return `
          <div class="ir-top">
            <span class="eyebrow">Incident INC-2026-1042 · Phishing · Severity: High</span>
            <span class="ir-clock" aria-label="Simulated time since report">${icon('clock')} ${clock(state.minutes)}</span>
          </div>`;
      }

      function draw() {
        if (state.step >= STEPS.length) return drawSummary();
        const step = STEPS[state.step];
        const correctIdx = step.options.findIndex((o) => o.correct);

        let feedback = '';
        if (state.solved) {
          feedback = `${callout('success', 'Correct.', `<p>${escapeHTML(step.options[correctIdx].why.replace(/^Correct\.\s*/, ''))}</p>`)}
            <div class="btn-row"><button type="button" class="btn btn-primary js-next">${state.step === STEPS.length - 1 ? 'See the debrief' : 'Next decision'} ${icon('arrowRight')} <kbd>N</kbd></button></div>`;
        } else if (state.lastWrong !== undefined) {
          feedback = callout('danger', `Not that one. The attacker gains ${MINUTES_WRONG} minutes.`, `<p>${escapeHTML(step.options[state.lastWrong].why)}</p><p>Choose another option.</p>`);
        }

        body.innerHTML = `
          ${header()}
          ${progressBar()}
          <div class="card ir-ticket">
            <div class="ir-ticket-meta"><span>Decision ${state.step + 1} of ${STEPS.length}</span><span>Phase: ${escapeHTML(step.short)}</span></div>
            <p class="ir-scenario"><strong>${escapeHTML(step.scenario)}</strong></p>
            <div class="ir-options">
              ${step.options
                .map((o, i) => {
                  const cls = state.solved && o.correct ? 'right' : state.tried.has(i) ? 'wrong' : '';
                  const disabled = state.solved || state.tried.has(i);
                  return `<button type="button" class="ir-option ${cls}" data-i="${i}" ${disabled ? 'disabled' : ''}><span class="opt-key">${String.fromCharCode(65 + i)}</span><span>${escapeHTML(o.text)}</span></button>`;
                })
                .join('')}
            </div>
          </div>
          ${feedback}`;

        body.querySelectorAll('.ir-option').forEach((btn) => btn.addEventListener('click', () => choose(Number(btn.dataset.i))));
        const next = body.querySelector('.js-next');
        if (next) {
          next.addEventListener('click', advance);
          next.focus({ preventScroll: true });
        }
      }

      function choose(i) {
        const option = STEPS[state.step].options[i];
        if (option.correct) {
          state.solved = true;
          state.lastWrong = undefined;
          state.minutes += MINUTES_RIGHT;
          state.log.push({ at: state.minutes, text: option.text, ok: true });
        } else {
          state.mistakes++;
          state.tried.add(i);
          state.lastWrong = i;
          state.minutes += MINUTES_WRONG;
          state.log.push({ at: state.minutes, text: option.text, ok: false });
        }
        draw();
      }

      function advance() {
        if (!state.solved) return;
        state.step++;
        state.tried = new Set();
        state.solved = false;
        state.lastWrong = undefined;
        draw();
      }

      function drawSummary() {
        const [letter, color, verdict] = grade(state.mistakes);
        const ideal = STEPS.length * MINUTES_RIGHT;
        body.innerHTML = `
          ${header()}
          ${progressBar()}
          <div class="grid-2">
            <div class="card">
              <div class="label">Debrief</div>
              <div style="display:flex;gap:18px;align-items:center;margin:10px 0 14px">
                <span class="grade">${letter}</span>
                <div>
                  <div><strong>${state.mistakes}</strong> wrong ${state.mistakes === 1 ? 'call' : 'calls'} · closed at <strong>${clock(state.minutes)}</strong></div>
                  <div class="small muted">Best possible: ${clock(ideal)}</div>
                </div>
              </div>
              <p class="small" style="margin:0">${verdict}</p>
            </div>
            <div class="card">
              <div class="label" style="margin-bottom:10px">Your timeline</div>
              <ol class="timeline">
                ${state.log.map((e) => `<li class="${e.ok ? '' : 'miss'}"><time>${clock(e.at)}</time>${escapeHTML(e.text)}</li>`).join('')}
              </ol>
            </div>
          </div>
          <div class="card ir-summary">
            <h3>${icon('shieldCheck')} The correct phishing-incident process</h3>
            <ol>
              <li><strong>Isolate</strong> the affected machine from the network and keep it powered on. <span class="muted small">(NIST 800-61: Containment)</span></li>
              <li><strong>Preserve evidence</strong>: memory capture, disk image, the original email with headers, a timeline. <span class="muted small">(Detection &amp; Analysis)</span></li>
              <li><strong>Notify the security team</strong> and follow the escalation plan. <span class="muted small">(Detection &amp; Analysis)</span></li>
              <li><strong>Check for credential compromise</strong>: sign-in logs, MFA changes, inbox rules, app grants. <span class="muted small">(Detection &amp; Analysis / Containment)</span></li>
              <li><strong>Reset passwords, revoke sessions and reimage</strong> the device from a known-good image. <span class="muted small">(Eradication &amp; Recovery)</span></li>
              <li><strong>Document and communicate</strong>: lessons learned, stakeholder and regulatory notifications, improved defences. <span class="muted small">(Post-Incident Activity)</span></li>
            </ol>
            <p class="small muted">Reference: NIST Special Publication 800-61, <em>Computer Security Incident Handling Guide</em> (Rev. 2, 2012; Rev. 3, 2025, "Incident Response Recommendations and Considerations for Cybersecurity Risk Management").</p>
            <button type="button" class="btn btn-primary js-restart">${icon('reset')} Run the playbook again</button>
          </div>`;
        body.querySelector('.js-restart').addEventListener('click', () => {
          Object.assign(state, { step: 0, mistakes: 0, tried: new Set(), solved: false, minutes: 0, log: [], lastWrong: undefined });
          draw();
        });
        complete();
      }

      draw();
    },

    unmount() {
      if (keyController) keyController.abort();
      keyController = null;
    },
  });
})();
