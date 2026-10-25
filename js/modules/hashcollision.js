/* Module 8: Hash Collision Demo.
   SHA-256 via crypto.subtle.digest, with a small pure-JS fallback for browsers that only expose
   crypto.subtle in secure contexts (e.g. some file:// or plain-HTTP setups). */
(function () {
  'use strict';

  const { escapeHTML, toast, callout } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);
  const BATCH = 64;
  const MAX_ATTEMPTS = 200000;

  // ---------- SHA-256 ----------

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  /** Pure-JS SHA-256 of a byte array. Used only when crypto.subtle is unavailable. */
  function sha256Fallback(bytes) {
    const bitLen = bytes.length * 8;
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
    view.setUint32(padded.length - 4, bitLen >>> 0);

    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let off = 0; off < padded.length; off += 64) {
      for (let t = 0; t < 16; t++) W[t] = view.getUint32(off + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
  }

  const encoder = new TextEncoder();
  const hasSubtle = !!(window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function');

  async function sha256(text) {
    const bytes = encoder.encode(text);
    if (hasSubtle) {
      const buf = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return sha256Fallback(bytes);
  }

  // ---------- Rendering helpers ----------

  function renderHash(hex, otherHex, prefixLen) {
    if (!hex) return '<span class="muted">-</span>';
    if (prefixLen) {
      return `<span class="hash-prefix">${hex.slice(0, prefixLen)}</span>${hex.slice(prefixLen)}`;
    }
    if (!otherHex) return hex;
    // Mark characters that differ from the other hash.
    let out = '';
    for (let i = 0; i < hex.length; i++) {
      out += hex[i] === otherHex[i] ? hex[i] : `<span class="hash-diff">${hex[i]}</span>`;
    }
    return out;
  }

  function hexToBits(hex) {
    let bits = '';
    for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, '0');
    return bits;
  }

  function randomString() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = 'msg-';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  window.CyberSim.registerModule({
    id: 'hashcollision',
    order: 8,
    group: 'Cryptography',
    title: 'Hash Collision Demo',
    icon: 'hash',
    minutes: 3,
    blurb: 'Compute real SHA-256 hashes, see the avalanche effect bit by bit, and force a short collision.',
    description: 'Compute real SHA-256 hashes of two inputs, watch how one changed character flips half the bits, then brute-force a near-collision.',
    howItWorks: `
      <h3>SHA-256 and collision resistance</h3>
      <p>A <strong>hash function</strong> turns any input into a fixed-size fingerprint. SHA-256 outputs 256 bits, written as 64 hex characters. Change one letter of the input and roughly half the output bits flip. That is the <strong>avalanche effect</strong>, and the bit grid shows it directly. Hashes are used for file integrity, digital signatures, Git commits and, with a slow algorithm and a salt, password storage.</p>
      <h4>Collision resistance</h4>
      <p>A <strong>collision</strong> is two different inputs with the same hash. Collisions must exist (infinite inputs, finite outputs), but a good hash makes them infeasible to <em>find</em>. Because of the <strong>birthday paradox</strong>, finding any collision in an n-bit hash takes about 2<sup>n/2</sup> tries, not 2<sup>n</sup>.</p>
      <ul>
        <li>4 hex characters = 16 bits, so about 2<sup>8</sup> = 256 tries. Well under a second.</li>
        <li>6 hex characters = 24 bits, so about 2<sup>12</sup> = 4,096 tries. Still instant. Every extra hex character multiplies the work by 4.</li>
        <li>64 hex characters = 256 bits, so about 2<sup>128</sup> tries. Every computer on Earth running for billions of years wouldn't get close.</li>
      </ul>
      <h4>Near-collision vs. collision</h4>
      <p>Matching the first few characters is a <strong>near-collision</strong> (a prefix match). The remaining characters are still completely different, so the two inputs are trivially told apart and nothing is broken. A real collision needs all 64 characters to match. MD5 and SHA-1 are considered broken because researchers found <em>full</em> collisions far faster than the birthday bound; SHA-256 has no known practical collision.</p>
      <p class="muted small">Hashes are computed locally with the browser's Web Crypto API. Nothing is sent anywhere.</p>`,

    mount(body, { complete }) {
      let alive = true;
      this._stop = () => {
        alive = false;
      };

      body.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="field">
              <label for="hash-a">Input A</label>
              <input class="input mono" id="hash-a" type="text" value="hello world" spellcheck="false">
            </div>
            <div class="label">SHA-256(A)</div>
            <div class="hash-out js-out-a" aria-live="polite"></div>
          </div>
          <div class="card">
            <div class="field">
              <label for="hash-b">Input B</label>
              <input class="input mono" id="hash-b" type="text" value="hello world!" spellcheck="false">
            </div>
            <div class="label">SHA-256(B)</div>
            <div class="hash-out js-out-b" aria-live="polite"></div>
          </div>
        </div>
        <div class="toolbar">
          <button type="button" class="btn btn-primary js-compare" aria-label="Compare the two hashes">${icon('scale')} Compare</button>
          <span class="spacer"></span>
          <label class="toolbar-label" for="prefix-len">Match the first</label>
          <select class="select js-prefix" id="prefix-len" style="width:auto;height:36px">
            <option value="4">4 hex chars (16 bits)</option>
            <option value="5">5 hex chars (20 bits)</option>
            <option value="6">6 hex chars (24 bits)</option>
          </select>
          <button type="button" class="btn btn-outline-danger js-find" aria-label="Brute-force a near-collision">${icon('search')} Find a near-collision</button>
        </div>
        <div class="js-compare-result" aria-live="polite"></div>
        <div class="card">
          <div class="card-head"><h3>${icon('grid')} Avalanche effect</h3><span class="muted small">256 output bits, A vs B</span></div>
          <div class="avalanche-meter">
            <span class="avalanche-pct js-aval-pct">-</span>
            <span class="small muted js-aval-text"></span>
          </div>
          <div class="bit-grid js-bits" aria-hidden="true">${'<span class="bit"></span>'.repeat(256)}</div>
          <div class="legend" style="justify-content:flex-start">
            <span><i class="sw-diff"></i>Bit differs</span>
            <span><i class="sw-same"></i>Bit matches</span>
          </div>
        </div>
        <div class="js-collision" aria-live="polite"></div>`;

      const inA = body.querySelector('#hash-a');
      const inB = body.querySelector('#hash-b');
      const outA = body.querySelector('.js-out-a');
      const outB = body.querySelector('.js-out-b');
      const compareResult = body.querySelector('.js-compare-result');
      const collisionEl = body.querySelector('.js-collision');
      const findBtn = body.querySelector('.js-find');
      const prefixSel = body.querySelector('.js-prefix');
      const bitEls = body.querySelector('.js-bits').children;
      const avalPct = body.querySelector('.js-aval-pct');
      const avalText = body.querySelector('.js-aval-text');
      const hashes = { a: '', b: '' };
      let compared = false;
      let seq = 0;

      function drawBits() {
        const a = hexToBits(hashes.a);
        const b = hexToBits(hashes.b);
        let diff = 0;
        for (let i = 0; i < 256; i++) {
          const d = a[i] !== b[i];
          if (d) diff++;
          bitEls[i].className = `bit ${d ? 'diff' : 'same'}`;
        }
        const pct = Math.round((diff / 256) * 100);
        avalPct.textContent = `${pct}%`;
        avalText.textContent =
          diff === 0
            ? 'Identical hashes: the inputs are the same.'
            : `${diff} of 256 bits differ. A good hash flips about half (128) for any change, however small.`;
      }

      async function refresh() {
        const mine = ++seq;
        const [a, b] = await Promise.all([sha256(inA.value), sha256(inB.value)]);
        if (!alive || mine !== seq) return;
        hashes.a = a;
        hashes.b = b;
        outA.innerHTML = renderHash(a, compared ? b : null);
        outB.innerHTML = renderHash(b, compared ? a : null);
        drawBits();
        if (compared) showCompare();
      }

      function showCompare() {
        const match = hashes.a === hashes.b;
        outA.className = `hash-out js-out-a ${match ? 'match' : 'nomatch'}`;
        outB.className = `hash-out js-out-b ${match ? 'match' : 'nomatch'}`;
        let same = 0;
        for (let i = 0; i < 64; i++) if (hashes.a[i] === hashes.b[i]) same++;
        compareResult.innerHTML = match
          ? callout('success', 'Hashes match.', `<p>${inA.value === inB.value ? 'The inputs are identical.' : 'Different inputs with the same SHA-256 hash. That would be a world-first collision!'}</p>`)
          : callout('danger', 'Hashes differ.', `<p>Only ${same} of 64 characters line up, about what chance alone gives (~4). Differences are shown in red.</p>`);
      }

      inA.addEventListener('input', refresh);
      inB.addEventListener('input', refresh);
      body.querySelector('.js-compare').addEventListener('click', () => {
        compared = true;
        refresh();
      });

      findBtn.addEventListener('click', async () => {
        const prefixLen = Number(prefixSel.value);
        const bits = prefixLen * 4;
        const expected = Math.round(Math.sqrt((Math.PI / 2) * 2 ** bits));
        findBtn.disabled = true;
        prefixSel.disabled = true;
        collisionEl.innerHTML = callout('info', `Hashing random strings… expect roughly ${expected.toLocaleString()} tries for ${bits} bits.`);
        const started = performance.now();
        const seen = new Map(); // prefix -> { input, hash }
        let attempts = 0;
        let found = null;

        while (!found && attempts < MAX_ATTEMPTS) {
          const inputs = Array.from({ length: BATCH }, randomString);
          const digests = await Promise.all(inputs.map(sha256));
          if (!alive) return;
          for (let i = 0; i < inputs.length && !found; i++) {
            attempts++;
            const prefix = digests[i].slice(0, prefixLen);
            const prev = seen.get(prefix);
            if (prev && prev.input !== inputs[i]) {
              found = { a: prev, b: { input: inputs[i], hash: digests[i] }, prefix };
            } else {
              seen.set(prefix, { input: inputs[i], hash: digests[i] });
            }
          }
        }

        findBtn.disabled = false;
        prefixSel.disabled = false;
        if (!found) {
          collisionEl.innerHTML = callout('warning', 'No near-collision found this time. Try again.');
          return;
        }
        const ms = Math.max(1, Math.round(performance.now() - started));
        // Extrapolate: full SHA-256 needs ~2^128 tries at the rate we just achieved.
        const rate = attempts / (ms / 1000);
        const log10Years = 128 * Math.log10(2) - Math.log10(rate) - Math.log10(31557600);
        collisionEl.innerHTML = `
          <div class="card">
            <div class="card-head"><h3>${icon('check')} Near-collision found</h3><span class="pill pill-accent">${bits}-bit prefix</span></div>
            <p><strong>Found in ${attempts} attempts</strong> <span class="muted">(${ms} ms)</span>. Both hashes start with <code>${escapeHTML(found.prefix)}</code>. This is why ${prefixLen} hex chars is not a security boundary, but 64 hex chars is.</p>
            <div class="label">Input 1: <code>${escapeHTML(found.a.input)}</code></div>
            <div class="hash-out">${renderHash(found.a.hash, null, prefixLen)}</div>
            <div class="label" style="margin-top:12px">Input 2: <code>${escapeHTML(found.b.input)}</code></div>
            <div class="hash-out">${renderHash(found.b.hash, null, prefixLen)}</div>
            <p class="small muted" style="margin:12px 0">Only the first ${prefixLen} characters match; the other ${64 - prefixLen} are unrelated. At this speed (${Math.round(rate).toLocaleString()} hashes/s), a full 256-bit collision would take about 10<sup>${Math.round(log10Years)}</sup> years.</p>
            <button type="button" class="btn btn-sm js-load" aria-label="Load the two inputs into the boxes above">Load into inputs above</button>
          </div>`;
        collisionEl.querySelector('.js-load').addEventListener('click', () => {
          inA.value = found.a.input;
          inB.value = found.b.input;
          compared = true;
          refresh();
          inA.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        toast(`Near-collision found in ${attempts} attempts`, 'success');
        complete();
      });

      refresh();
    },

    unmount() {
      if (this._stop) this._stop();
    },
  });
})();
