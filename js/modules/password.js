/* Module 6: Password Cracking Visualizer.
   Estimates how long four attack methods would take against the typed password.
   Nothing is cracked and the password never leaves this page. */
(function () {
  'use strict';

  const { escapeHTML, formatDuration } = window.CyberSim.utils;
  const icon = (...a) => window.CyberSim.icon(...a);

  const BRUTE_RATE = 1e9; // guesses per second (fast offline attack on a weak hash)
  const RULE_RATE = 1e8; // guesses per second for rule-based mangling
  const DICT_SIZE = 1e5; // words in the attacker's dictionary
  const SECONDS_PER_YEAR = 31557600;
  const UNIVERSE_LOG10_S = 17.64; // ~13.8 billion years, used to scale the bars

  // An excerpt of the most common leaked passwords (the real top-10k lists are built from breach dumps).
  const COMMON_PASSWORDS = new Set(`123456 password 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123
    abc123 1234 password1 iloveyou 1q2w3e4r 000000 qwerty123 zaq12wsx dragon sunshine princess letmein 654321 monkey
    27653 1qaz2wsx 123321 qwertyuiop superman asdfghjkl trustno1 jordan23 welcome welcome1 login admin admin123
    password123 passw0rd p@ssw0rd p@ssword master hello freedom whatever qazwsx shadow michael football baseball
    starwars 666666 696969 batman access mustang 121212 flower hottie loveme zaq1zaq1 charlie donald aa123456
    7777777 888888 123qwe 1qazxsw2 ashley bailey 112233 987654321 michelle jennifer hunter ranger buster soccer
    harley andrew tigger daniel thomas robert computer secret summer internet service canada hockey killer george
    pepper jessica zxcvbnm 555555 11111111 131313 lovely 7777 joshua matthew cheese amanda summer2024 summer2025
    summer2026 winter2025 spring2026 autumn2026 password! password1! qwerty1 abcd1234 a1b2c3d4 iloveyou1 princess1
    sunshine1 football1 monkey1 dragon1 charlie1 aa12345678 123abc test test123 guest root toor changeme default
    letmein1 welcome123 admin1 administrator 1q2w3e 1q2w3e4r5t q1w2e3r4 asdf1234 asdfgh zxcvbn naruto pokemon
    minecraft fortnite liverpool chelsea arsenal manchester blink182 metallica slipknot nirvana jesus christ
    blessed angel angels butterfly chocolate cookie banana orange purple yellow ginger peanut maggie buddy coffee
    samsung apple iphone google yahoo hotmail facebook linkedin myspace qwer1234 1234qwer 159753 147258369
    789456123 456789 999999 101010 password12 password2 passwort motdepasse contrasena senha parola`
    .split(/\s+/).filter(Boolean));

  // Common words an attacker would mangle with rules (capitalise, leet-speak, append digits/symbols).
  const COMMON_WORDS = new Set(`password correct horse battery staple troubador troubadour dragon monkey sunshine
    princess shadow master freedom summer winter spring autumn football baseball soccer hockey welcome letmein
    secret hello love lovely angel computer internet coffee cheese banana orange purple yellow flower tiger
    hunter ranger killer pepper ginger cookie chocolate butterfly superman batman starwars pokemon minecraft
    admin login guest trust family london paris dallas chicago boston apple google samsung jordan michael
    charlie thomas robert daniel andrew joshua matthew jessica jennifer ashley amanda michelle security
    cyber hacker matrix phoenix diamond silver golden purple blue green red black white house garden kitchen
    window paper river mountain ocean forest castle dragonfly rainbow thunder lightning`
    .split(/\s+/).filter(Boolean));

  const LEET = { 0: 'o', 1: 'l', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l' };

  function charsetSize(pw) {
    let size = 0;
    if (/[a-z]/.test(pw)) size += 26;
    if (/[A-Z]/.test(pw)) size += 26;
    if (/[0-9]/.test(pw)) size += 10;
    if (/[^a-zA-Z0-9\s]/.test(pw)) size += 33;
    if (/\s/.test(pw)) size += 1;
    if (/[^\x00-\x7F]/.test(pw)) size += 100;
    return size;
  }

  /** Try to split `s` into two or more common words (e.g. "correcthorsebatterystaple"). */
  function splitIntoWords(s) {
    const memo = new Map();
    const go = (start) => {
      if (start === s.length) return [];
      if (memo.has(start)) return memo.get(start);
      let result = null;
      for (let end = s.length; end > start + 2; end--) {
        const word = s.slice(start, end);
        if (COMMON_WORDS.has(word)) {
          const rest = go(end);
          if (rest) {
            result = [word, ...rest];
            break;
          }
        }
      }
      memo.set(start, result);
      return result;
    };
    const words = go(0);
    return words && words.length >= 2 ? words : null;
  }

  /** Rule-based attack: dictionary word + capitalisation + leet substitutions + appended digits/symbols. */
  function ruleBasedEstimate(pw) {
    const lower = pw.toLowerCase();

    // A passphrase from the generator: assume the attacker has the word list and guesses whole words.
    const parts = lower.split('-');
    if (parts.length >= 3 && parts.every((w) => PASSPHRASE_WORDS.includes(w))) {
      const n = PASSPHRASE_WORDS.length;
      return { log10s: parts.length * Math.log10(n) - Math.log10(RULE_RATE), note: `${parts.length} random words from a known ${n}-word list: ${n}^${parts.length} combinations, even if the attacker has the list.` };
    }

    const suffix = (pw.match(/[0-9!@#$%^&*?._-]{0,6}$/) || [''])[0];
    const stem = pw.slice(0, pw.length - suffix.length);
    let subs = 0;
    const base = [...stem.toLowerCase()].map((ch) => {
      if (LEET[ch] && /[^a-z]/.test(ch)) {
        subs++;
        return LEET[ch];
      }
      return ch;
    }).join('');

    if (base && (COMMON_WORDS.has(base) || COMMON_PASSWORDS.has(base))) {
      const digits = (suffix.match(/[0-9]/g) || []).length;
      const symbols = suffix.length - digits;
      const caps = /[A-Z]/.test(stem) ? 2 : 1;
      const log10Guesses = Math.log10(DICT_SIZE) + Math.log10(caps) + subs * Math.log10(2) + digits + symbols * Math.log10(33);
      return { log10s: log10Guesses - Math.log10(RULE_RATE), note: `Base word "${base}" + ${subs} substitution(s) + ${suffix ? `suffix "${suffix}"` : 'no suffix'}.` };
    }

    const words = splitIntoWords(lower.replace(/[^a-z]/g, ''));
    if (words && lower.replace(/[^a-z]/g, '').length === lower.length) {
      // Combinator attack over a 10,000-word list of common words.
      const log10Guesses = words.length * 4;
      return { log10s: log10Guesses - Math.log10(RULE_RATE), note: `${words.length} common words (${words.join(' + ')}) so a combinator attack over a 10k-word list.` };
    }
    return null;
  }

  function describe(log10s) {
    if (log10s > 300) return `~10^${Math.round(log10s - Math.log10(SECONDS_PER_YEAR))} years`;
    return formatDuration(Math.pow(10, log10s));
  }

  function strengthClass(log10s) {
    if (log10s < Math.log10(86400)) return 'weak';
    if (log10s < Math.log10(100 * SECONDS_PER_YEAR)) return 'ok';
    return 'strong';
  }

  const BAR_COLORS = { weak: 'var(--coral)', ok: 'var(--amber)', strong: 'var(--teal)' };

  function barWidth(log10s) {
    return Math.max(3, Math.min(100, ((log10s + 1) / (UNIVERSE_LOG10_S + 1)) * 100));
  }

  function analyse(pw) {
    const len = [...pw].length;
    const cs = charsetSize(pw);
    const entropy = len && cs ? len * Math.log2(cs) : 0;
    const results = {};

    // Brute force: charset^length / 10^9 (computed in log space so long passwords don't overflow).
    results.brute = len
      ? { log10s: len * Math.log10(cs) - Math.log10(BRUTE_RATE), note: `${cs}^${len} combinations at 10^9 guesses/sec.` }
      : null;

    // Dictionary: instant if the password is on the common-passwords list.
    results.dict = COMMON_PASSWORDS.has(pw.toLowerCase())
      ? { text: 'instant', cls: 'weak', width: 3, note: 'Found in the top-10k leaked passwords list, so it is cracked on the first pass.' }
      : { text: 'not applicable', cls: 'na', width: 0, note: 'Not on the common-passwords list.' };

    // Rainbow table: pre-computed hash lookups are defeated by per-user salts.
    results.rainbow = {
      text: 'not viable',
      cls: 'na',
      width: 0,
      note: len <= 8
        ? 'Would be instant against an unsalted MD5/SHA-1 hash, but a unique salt makes the pre-computed table useless.'
        : 'A per-user salt means the attacker would need a separate table for every salt.',
    };

    results.rule = ruleBasedEstimate(pw);
    return { len, cs, entropy, results };
  }

  // Words for the passphrase generator. Short, common and easy to type; the strength comes from
  // picking them with crypto.getRandomValues, not from the words being obscure.
  const PASSPHRASE_WORDS = `acorn agile alpine amber anchor apple april arcade arrow atlas autumn bacon badge bamboo banjo barley basil beacon beetle bento berry bison blanket blossom bonfire bramble breeze brick bronze bubble cabin cactus camel canal candle canyon carbon cargo carrot castle cedar cello chalk cherry chess cider cinema citrus clover cobalt comet copper coral cotton coyote crane crater crayon cricket crystal cypress dahlia dancer delta denim desert dingo dolphin domino donut drum eagle ember engine falcon fennel ferry fiddle fig flannel flint fossil fox galaxy garlic gecko glacier goblet granite gravel guitar hammock harbor hazel hedgehog helmet heron hickory honey horizon husky igloo indigo island ivory jacket jasmine jelly jigsaw juniper kayak kettle kiwi koala ladder lagoon lantern lemon lily linen lizard llama lobster locket lotus lunar magnet mango maple marble meadow melon meteor mint mitten mosaic moss muffin nectar nickel noodle nutmeg oasis oat olive onyx opal orbit orchid otter oyster paddle panda papaya parrot pebble piano pickle pigeon pillow pine pixel plum polar pony poppy prism puffin pumpkin quartz quill quokka rabbit radar raven reef ribbon robin rocket saddle saffron salmon sapphire satchel scarf sequoia shell sierra sketch sled sonnet sparrow spruce squid stencil summit sunset swallow tango teapot thistle timber toffee topaz tractor tulip tundra turtle umber velvet violet walnut walrus willow wombat yarrow yeti zephyr zinc`
    .split(/\s+/).filter(Boolean);

  function randomInt(max) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max; // reject values past this to avoid modulo bias
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % max;
  }

  function generatePassphrase(words = 8) {
    return Array.from({ length: words }, () => PASSPHRASE_WORDS[randomInt(PASSPHRASE_WORDS.length)]).join('-');
  }

  const METHODS = [
    ['brute', 'Brute Force', 'zap', '10^9 guesses/s'],
    ['dict', 'Dictionary', 'search', 'top-10k list'],
    ['rainbow', 'Rainbow Table', 'layers', 'pre-computed'],
    ['rule', 'Rule-Based', 'grid', '10^8 guesses/s'],
  ];

  window.CyberSim.registerModule({
    id: 'password',
    order: 6,
    group: 'Credentials',
    title: 'Password Cracking Visualizer',
    icon: 'key',
    minutes: 4,
    blurb: 'Type a password and watch four cracking methods estimate how long it would last.',
    description: 'Type a password and see how four common cracking methods would fare against it. Nothing you type leaves this page.',
    howItWorks: `
      <h3>Entropy, length, and slow hashes</h3>
      <p><strong>Entropy</strong> measures how many guesses a password could need, in bits. A rough estimate is <code>length × log2(charset size)</code>. Each extra bit doubles the work. Lowercase, uppercase, digits and symbols together give a charset of 95, so each character adds about 6.6 bits.</p>
      <h4>Why length beats complexity</h4>
      <p>Adding one character multiplies the search space by the whole charset; adding a symbol class only enlarges the charset a little. And people make "complex" passwords predictably: capitalise the first letter, swap <code>o</code> for <code>0</code>, add <code>1!</code> at the end. Rule-based attacks try exactly those changes, which is why <code>Tr0ub4dor&amp;3</code> falls in seconds while a long passphrase holds out far longer.</p>
      <h4>The four methods</h4>
      <ul>
        <li><strong>Brute force</strong> tries every combination. Time = charset<sup>length</sup> ÷ 10<sup>9</sup> guesses per second.</li>
        <li><strong>Dictionary</strong> tries known leaked passwords first. Anything on a top-10k list is instant.</li>
        <li><strong>Rainbow table</strong> looks up pre-computed hash-to-password chains. A <strong>salt</strong> defeats it: a random value stored with each hash, so identical passwords produce different hashes and no pre-computed table applies.</li>
        <li><strong>Rule-based</strong> takes dictionary words and applies common substitutions, capitalisation and suffixes, at 10<sup>8</sup> guesses per second.</li>
      </ul>
      <h4>Random passphrases</h4>
      <p>The Generate button picks eight words at random from a list of ${PASSPHRASE_WORDS.length} using the browser's cryptographic random number generator. Even if an attacker knows the exact word list, that is ${PASSPHRASE_WORDS.length}<sup>8</sup> combinations, about ${Math.round(8 * Math.log2(PASSPHRASE_WORDS.length))} bits of real entropy, and it is much easier to remember than random symbols.</p>
      <h4>Why Argon2 or bcrypt matters</h4>
      <p>The 10<sup>9</sup> guesses per second here assumes a fast hash like MD5 or SHA-256. Password hashes such as <strong>Argon2id</strong>, <strong>bcrypt</strong> or <strong>scrypt</strong> are deliberately slow and memory-hard, cutting an attacker down to thousands of guesses per second per GPU and turning hours into centuries. Pair a slow hash with long, unique passwords (a password manager helps) and multi-factor authentication.</p>
      <p class="muted small">Estimates are simplified for teaching; real cracking speed depends on hardware and hash type.</p>`,

    mount(body, { complete }) {
      const presets = ['password123', 'Tr0ub4dor&3', 'correcthorsebatterystaple', 'xK9#mP2$vL8@nQ4'];

      body.innerHTML = `
        <div class="card">
          <div class="field">
            <label for="pw-input">Password to analyse</label>
            <div class="pw-input-wrap">
              <input class="input" id="pw-input" type="text" autocomplete="off" spellcheck="false" placeholder="Type a password…">
              <button type="button" class="btn js-toggle" aria-label="Hide password" aria-pressed="false">${icon('eyeOff')}</button>
              <button type="button" class="btn btn-primary js-generate" aria-label="Generate a random passphrase">${icon('dice')} Generate</button>
            </div>
          </div>
          <div class="btn-row">
            <span class="toolbar-label">Presets</span>
            ${presets.map((p) => `<button type="button" class="btn btn-sm btn-ghost js-preset" data-pw="${escapeHTML(p)}" aria-label="Use preset password ${escapeHTML(p)}"><code>${escapeHTML(p)}</code></button>`).join('')}
          </div>
          <div class="pw-checks js-checks"></div>
        </div>

        <div class="card pw-verdict">
          <div class="pw-verdict-main">
            <div class="label">Fastest way in</div>
            <div class="pw-verdict-time js-verdict strength-na">Type a password</div>
            <div class="small muted js-verdict-note">The weakest method decides how strong a password really is.</div>
          </div>
          <div class="stats">
            <div class="stat"><span class="stat-label">Length</span><span class="stat-value js-len">0</span></div>
            <div class="stat"><span class="stat-label">Charset</span><span class="stat-value js-cs">0</span></div>
            <div class="stat"><span class="stat-label">Entropy</span><span class="stat-value accent"><span class="js-ent">0</span><span class="muted small"> bits</span></span></div>
          </div>
        </div>

        <div class="card js-methods">
          ${METHODS.map(
            ([key, name, ico, rate]) => `
            <div class="method" data-key="${key}">
              <div class="method-head">
                <span class="method-name">${icon(ico)} ${name} <span class="method-rate">${rate}</span></span>
                <span class="method-time strength-na js-time">-</span>
              </div>
              <div class="bar-track" role="presentation"><div class="bar-fill js-bar"></div></div>
              <div class="method-note js-note">Type a password to see an estimate.</div>
            </div>`
          ).join('')}
        </div>
        <p class="muted small">Longer bars mean the password holds out longer: red is under a day, amber under a century, green longer than that.</p>`;

      const input = body.querySelector('#pw-input');
      const toggle = body.querySelector('.js-toggle');
      const checksEl = body.querySelector('.js-checks');
      const verdict = body.querySelector('.js-verdict');
      const verdictNote = body.querySelector('.js-verdict-note');
      const out = {
        len: body.querySelector('.js-len'),
        cs: body.querySelector('.js-cs'),
        ent: body.querySelector('.js-ent'),
      };
      const rows = {};
      body.querySelectorAll('.method').forEach((m) => {
        rows[m.dataset.key] = { time: m.querySelector('.js-time'), bar: m.querySelector('.js-bar'), note: m.querySelector('.js-note') };
      });

      function setRow(key, { text, cls, width, note }) {
        const row = rows[key];
        row.time.textContent = text;
        row.time.className = `method-time js-time strength-${cls}`;
        row.bar.style.width = `${width}%`;
        row.bar.style.background = BAR_COLORS[cls] || 'var(--surface-3)';
        row.note.textContent = note;
      }

      function renderChecks(pw, common, predictable) {
        const checks = [
          ['12+ characters', [...pw].length >= 12],
          ['lowercase', /[a-z]/.test(pw)],
          ['uppercase', /[A-Z]/.test(pw)],
          ['digit', /[0-9]/.test(pw)],
          ['symbol', /[^a-zA-Z0-9]/.test(pw)],
          ['not a leaked password', !common],
          ['no word + tweak pattern', !predictable],
        ];
        checksEl.innerHTML = checks
          .map(([label, ok]) => `<span class="pw-check ${pw ? (ok ? 'ok' : 'bad') : ''}">${icon(ok && pw ? 'check' : 'x')} ${label}</span>`)
          .join('');
      }

      function update() {
        const pw = input.value;
        if (!pw) {
          out.len.textContent = '0';
          out.cs.textContent = '0';
          out.ent.textContent = '0';
          verdict.textContent = 'Type a password';
          verdict.className = 'pw-verdict-time js-verdict strength-na';
          verdictNote.textContent = 'The weakest method decides how strong a password really is.';
          renderChecks('', false, false);
          METHODS.forEach(([k]) => setRow(k, { text: '-', cls: 'na', width: 0, note: 'Type a password to see an estimate.' }));
          return;
        }
        const { len, cs, entropy, results } = analyse(pw);
        out.len.textContent = len;
        out.cs.textContent = cs;
        out.ent.textContent = entropy.toFixed(1);

        const timed = (r) => ({ text: describe(r.log10s), cls: strengthClass(r.log10s), width: barWidth(r.log10s), note: r.note });
        const common = results.dict.text === 'instant';
        setRow('brute', timed(results.brute));
        setRow('dict', results.dict);
        setRow('rainbow', results.rainbow);
        setRow(
          'rule',
          common
            ? { text: 'instant', cls: 'weak', width: 3, note: 'Already on the common-passwords list, no rules needed.' }
            : results.rule
              ? timed(results.rule)
              : { text: 'not applicable', cls: 'na', width: 0, note: 'No dictionary word or pattern found, so the attacker falls back to brute force.' }
        );
        renderChecks(pw, common, !!results.rule && /^Base word/.test(results.rule.note));

        // The fastest applicable method is the honest answer.
        const candidates = [{ name: 'brute force', log10s: results.brute.log10s }];
        if (results.rule) candidates.push({ name: 'a rule-based attack', log10s: results.rule.log10s });
        const fastest = common ? { name: 'a dictionary attack', log10s: -Infinity } : candidates.reduce((a, b) => (b.log10s < a.log10s ? b : a));
        const cls = strengthClass(fastest.log10s);
        verdict.textContent = common ? 'instant' : describe(fastest.log10s);
        verdict.className = `pw-verdict-time js-verdict strength-${cls}`;
        verdictNote.textContent = `via ${fastest.name}. ${cls === 'strong' ? 'That is a strong password.' : cls === 'ok' ? 'Decent, but longer would be better.' : 'Too weak for anything that matters.'}`;
        if (cls === 'strong') complete();
      }

      input.addEventListener('input', update);
      toggle.addEventListener('click', () => {
        const hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        toggle.innerHTML = icon(hidden ? 'eyeOff' : 'eye');
        toggle.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
        toggle.setAttribute('aria-pressed', String(!hidden));
      });
      body.querySelector('.js-generate').addEventListener('click', () => {
        input.value = generatePassphrase();
        update();
        input.focus();
      });
      body.querySelectorAll('.js-preset').forEach((btn) =>
        btn.addEventListener('click', () => {
          input.value = btn.dataset.pw;
          update();
          input.focus();
        })
      );
      update();
    },
  });
})();
