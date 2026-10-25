/* Module 5: Ransomware Simulation.
   24 fake file cards flip to a padlock and a scrambled name, then a ransom note appears.
   Nothing is encrypted: the "files" are strings in an array. */
(function () {
  'use strict';

  const { escapeHTML, randomHex, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);
  const STEP_MS = 300;

  const FILES = [
    'report.docx', 'photo.jpg', 'database.sql', 'budget_2026.xlsx',
    'wedding_video.mp4', 'thesis_final.pdf', 'notes_old.txt', 'family_tree.png',
    'invoice_0042.pdf', 'presentation.pptx', 'customers.csv', 'backup_config.json',
    'holiday_2025.zip', 'song_demo.mp3', 'tax_return.pdf', 'contract_signed.docx',
    'payroll.xlsx', 'source_code.tar.gz', 'notes.md', 'baby_scan.jpg',
    'website_backup.sql', 'resume.docx', 'design_mockup.psd', 'mortgage_offer.pdf',
  ];

  const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

  function scrambledName() {
    let s = '';
    for (let i = 0; i < 12; i++) s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    return `${s}.locked`;
  }

  function ext(name) {
    return name.split('.').pop().toLowerCase();
  }

  window.CyberSim.registerModule({
    id: 'ransomware',
    order: 5,
    group: 'Malware',
    title: 'Ransomware Simulation',
    icon: 'lock',
    minutes: 4,
    blurb: 'Lose 24 files to ransomware, then compare restoring from backup with paying up.',
    description: 'Ransomware locks every file on a machine, one by one. Then you choose how to get them back: restore from backup, pay, or use the key.',
    howItWorks: `
      <h3>How ransomware works</h3>
      <p>Ransomware encrypts your files with a key only the attacker holds, then demands payment (usually cryptocurrency) for that key. Modern encryption is strong: without the key the files are effectively random noise. Many gangs also <strong>steal the data first</strong> and threaten to publish it, known as double extortion.</p>
      <h4>Why backups are the only real defence</h4>
      <ul>
        <li>With a recent, <strong>offline or immutable</strong> backup you can wipe the machine and restore, and the ransom stops mattering. Try the attack with the backup switch on and off.</li>
        <li>Follow the <strong>3-2-1 rule</strong>: 3 copies, on 2 different media, 1 off-site. Ransomware actively looks for connected backup drives and network shares, so at least one copy must be out of reach.</li>
        <li><strong>Test your restores.</strong> A backup you've never restored from is a hope, not a plan.</li>
      </ul>
      <h4>Why paying doesn't guarantee recovery</h4>
      <ul>
        <li>The decryptor may be buggy, slow, or never arrive. You are trusting criminals. In this simulation, paying recovers only part of the data.</li>
        <li>Paying marks you as a willing payer, and organisations that pay are frequently hit again.</li>
        <li>Stolen data can still be leaked or sold, and in some jurisdictions paying certain groups is illegal.</li>
      </ul>
      <p class="muted small">This is an animation. No files are touched, encrypted, or sent anywhere.</p>`,

    mount(body, { timers, complete }) {
      const files = FILES.map((name) => ({ name, scrambled: scrambledName(), encrypted: false }));
      let busy = false;
      let modal = null;

      body.innerHTML = `
        <div class="toolbar ransom-console">
          <button type="button" class="btn btn-danger js-encrypt" aria-label="Simulate a ransomware attack on these files">${icon('lock')} Simulate Ransomware</button>
          <button type="button" class="btn btn-success js-decrypt" disabled aria-label="Decrypt all files with the key">${icon('key')} Decrypt with key</button>
          <span class="ransom-counter" aria-live="polite">Files encrypted: <strong class="js-count">0</strong> / ${files.length}</span>
          <span class="spacer"></span>
          <label class="switch-row"><span class="switch"><input type="checkbox" class="js-backup" checked aria-label="Offline backup enabled"><span class="track"></span></span> Offline backup</label>
          <span class="backup-status js-backup-status">${icon('archive')} <span>Last backup: today 02:00</span></span>
        </div>
        <div class="file-grid js-grid" aria-label="Files on the simulated computer">
          ${files
            .map((f, i) => {
              const e = ext(f.name);
              return `
            <div class="file-card" data-i="${i}" aria-label="${escapeHTML(f.name)}">
              <div class="file-inner">
                <div class="file-face file-front"><span class="file-type" aria-hidden="true">${escapeHTML(e.toUpperCase())}</span><span>${escapeHTML(f.name)}</span></div>
                <div class="file-face file-back" aria-hidden="true">${icon('lock')}<span class="js-scrambled">${escapeHTML(f.scrambled)}</span></div>
              </div>
            </div>`;
            })
            .join('')}
        </div>
        <div class="js-outcome"></div>`;

      const cards = body.querySelectorAll('.file-card');
      const countEl = body.querySelector('.js-count');
      const encryptBtn = body.querySelector('.js-encrypt');
      const decryptBtn = body.querySelector('.js-decrypt');
      const backupToggle = body.querySelector('.js-backup');
      const backupStatus = body.querySelector('.js-backup-status');
      const outcome = body.querySelector('.js-outcome');

      backupToggle.addEventListener('change', () => {
        backupStatus.classList.toggle('off', !backupToggle.checked);
        backupStatus.querySelector('span').textContent = backupToggle.checked ? 'Last backup: today 02:00' : 'No backup configured';
      });

      function updateCount() {
        countEl.textContent = files.filter((f) => f.encrypted).length;
      }

      function setCard(i, encrypted) {
        files[i].encrypted = encrypted;
        cards[i].classList.toggle('encrypted', encrypted);
        cards[i].setAttribute('aria-label', encrypted ? `${files[i].scrambled} (encrypted)` : files[i].name);
        updateCount();
      }

      function closeModal() {
        if (modal) {
          modal.remove();
          modal = null;
        }
      }

      function showRansomNote() {
        let secondsLeft = 72 * 3600;
        const hasBackup = backupToggle.checked;
        modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="ransom-note" role="dialog" aria-modal="true" aria-labelledby="ransom-title">
            ${icon('lock', 'ico-xl')}
            <h3 id="ransom-title">YOUR FILES HAVE BEEN ENCRYPTED</h3>
            <p>Your files have been encrypted. Pay 0.5 BTC to recover them.</p>
            <div class="ransom-timer js-timer">72:00:00</div>
            <p class="small">until the price doubles</p>
            <div class="ransom-wallet">BTC wallet: bc1q${randomHex(38)}</div>
            <div class="ransom-choices">
              <button type="button" class="btn btn-success js-restore" ${hasBackup ? '' : 'disabled'}>${icon('archive')} Restore from offline backup${hasBackup ? '' : ' (none available)'}</button>
              <button type="button" class="btn btn-outline-danger js-pay">${icon('coins')} Pay 0.5 BTC</button>
              <button type="button" class="btn js-key">${icon('key')} Decrypt with key (training shortcut)</button>
            </div>
            <p class="ransom-sim">Simulation. No files were harmed and no payment is possible.</p>
          </div>`;
        document.body.appendChild(modal);

        const timerEl = modal.querySelector('.js-timer');
        const tickId = timers.interval(() => {
          secondsLeft = Math.max(0, secondsLeft - 1);
          const h = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
          const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
          const s = String(secondsLeft % 60).padStart(2, '0');
          timerEl.textContent = `${h}:${m}:${s}`;
        }, 1000);

        const choose = (fn) => () => {
          timers.clearInterval(tickId);
          closeModal();
          fn();
        };
        modal.querySelector('.js-restore').addEventListener('click', choose(() => recover('backup')));
        modal.querySelector('.js-pay').addEventListener('click', choose(() => recover('pay')));
        modal.querySelector('.js-key').addEventListener('click', choose(() => recover('key')));
        modal.querySelector('.js-key').focus();
      }

      function encrypt() {
        if (busy) return;
        busy = true;
        encryptBtn.disabled = true;
        decryptBtn.disabled = true;
        backupToggle.disabled = true;
        outcome.innerHTML = '';
        files.forEach((f, i) => {
          f.scrambled = scrambledName();
          cards[i].querySelector('.js-scrambled').textContent = f.scrambled;
        });
        files.forEach((_, i) => {
          timers.timeout(() => {
            setCard(i, true);
            if (i === files.length - 1) {
              busy = false;
              decryptBtn.disabled = false;
              timers.timeout(showRansomNote, 450);
            }
          }, (i + 1) * STEP_MS);
        });
      }

      /** Flip the given files back one at a time, then run onDone. */
      function restore(indexes, onDone) {
        const finish = () => {
          busy = false;
          encryptBtn.disabled = false;
          backupToggle.disabled = false;
          decryptBtn.disabled = files.every((f) => !f.encrypted);
          onDone();
        };
        if (!indexes.length) return finish();
        busy = true;
        encryptBtn.disabled = true;
        decryptBtn.disabled = true;
        indexes.forEach((idx, step) => {
          timers.timeout(() => {
            setCard(idx, false);
            if (step === indexes.length - 1) finish();
          }, (step + 1) * (STEP_MS / 2));
        });
      }

      function recover(method) {
        if (busy) return;
        const locked = files.map((f, i) => (f.encrypted ? i : -1)).filter((i) => i >= 0);
        if (method === 'pay') {
          // The "decryptor" works on some files and corrupts the rest.
          const lucky = locked.filter(() => Math.random() < 0.6);
          restore(lucky, () => {
            const lost = files.filter((f) => f.encrypted).length;
            outcome.innerHTML = callout(
              'warning',
              `You paid. The decryptor recovered ${lucky.length} of ${locked.length} files.`,
              `<p>The other ${lost} crashed the attackers' decryptor and stay locked. This happens in real incidents: paying buys a tool, not a guarantee. Try again with the offline backup switched on, or use "Decrypt with key" to finish.</p>`
            );
          });
          return;
        }
        restore(locked.slice().reverse(), () => {
          outcome.innerHTML =
            method === 'backup'
              ? callout('success', 'Restored from the offline backup. All 24 files are back.', '<p>No ransom paid. The machine would be wiped and rebuilt first in a real incident, then the data restored. This is why offline backups are the best defence.</p>')
              : callout('success', 'Decrypted with the key. All 24 files are back.', '<p>In a real attack you would not have this key. That is the whole point of ransomware.</p>');
          complete();
        });
      }

      encryptBtn.addEventListener('click', encrypt);
      decryptBtn.addEventListener('click', () => {
        closeModal();
        recover('key');
      });

      this._closeModal = closeModal;
    },

    unmount() {
      if (this._closeModal) this._closeModal();
    },
  });
})();
