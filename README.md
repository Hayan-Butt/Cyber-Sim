# CyberSim

**A free, open-source cybersecurity lab for beginners. Ten real attacks, fully simulated, running entirely in your browser.**

Made by **Hayan Butt**.

## Live demo

🔗 **Live demo:** https://YOUR-USERNAME.github.io/cybersim/

## What CyberSim is

CyberSim is an educational website that lets you watch ten common cybersecurity threats play out safely, one module at a time. You sort real-looking phishing emails from legitimate ones, bypass a deliberately vulnerable login with SQL injection and watch the secure version block it, follow a malware scan, watch a virus spread across a network, see files "encrypted" by ransomware, measure how long a password would survive four cracking methods, port-scan a fictional server, force a SHA-256 near-collision, toggle firewall rules, and make the calls in an incident-response playbook.

It is plain HTML, CSS and JavaScript with no frameworks, no build step and no network requests. Open `index.html` and it works, online or off.

## Why I built it

I'm studying cybersecurity, and a lot of what I read only really made sense once I could see it happen. Reading that "parameterised queries prevent SQL injection" is one thing; watching the same input bypass one login and bounce off another is what made it click for me.

I wanted something I could have used when I was starting out:

- **Hands-on, but safe.** Beginners can't practise on real systems, and setting up a lab is a big first step. CyberSim needs nothing installed and touches nothing real.
- **Visual.** Every module shows the attack happening, then explains it in plain English underneath.
- **Short.** Each module takes 3 to 6 minutes, so it fits between lectures or alongside Security+ study.
- **Open source.** Anyone can use it, share it with classmates, or build on it.

### How I built it

I built CyberSim with the help of an AI coding assistant (Claude). I decided what the project should be and which ten topics to cover, set the design direction, tested every module, and pushed for changes until each simulation explained its concept correctly and felt good to use. The AI wrote much of the code under that direction. I've been reading through it since, and that's been one of the best parts of the project for learning how this kind of app is put together.

## The 10 modules

| # | Module | What you do | Key concept |
|---|--------|-------------|-------------|
| 1 | Phishing Simulator | Sort 18 fictional emails in a mail-client view. Hover links to see where they really go; red flags are highlighted after each answer, with a per-category breakdown at the end | Homoglyph domains (`paypa1.com`, `arnazon.com`, `g00gle.com`), reply-to mismatches, urgency |
| 2 | SQL Injection Simulator | Run `' OR '1'='1' --` against a vulnerable and a secure login side by side | String concatenation vs. parameterised queries |
| 3 | Malware Demo | Watch a terminal scan catch a trojan, inspect the quarantined file, then replay the timeline where nobody scanned | Trojans, persistence, backdoors, quarantine |
| 4 | Virus Visualizer | Start an outbreak on a 20×20 network, tune the infection rate, isolate machines or segment the network, and follow it on a live chart | Containment and network segmentation |
| 5 | Ransomware Simulation | Lose 24 files, then choose: restore from an offline backup, pay (and only get some back), or use the key | Why backups beat paying |
| 6 | Password Cracking Visualizer | Type a password and see four cracking estimates, a strength checklist and the fastest way in. Generate a random passphrase | Entropy, length vs. complexity, salts, Argon2/bcrypt |
| 7 | Port Scanner | Scan 20 ports on a fictional host, click any port for its service banner, risk and fix, and read the Nmap-style report | Attack surface, exposed RDP and databases |
| 8 | Hash Collision Demo | Compare real SHA-256 hashes, see the avalanche effect bit by bit, and brute-force a 4, 5 or 6 hex-character near-collision | Collision resistance and the birthday paradox |
| 9 | Firewall Rule Simulator | Toggle and reorder rules, switch the default policy, and send HTTPS, SSH and ping packets. Move a broad rule up to see shadowing | First-match rule order, default-deny, stateful filtering |
| 10 | Incident Response Playbook | Work a phishing incident through six decisions against an incident clock, then get a grade and a timeline of your calls | NIST SP 800-61 incident response lifecycle |

## Features

- **Overview page** with every module, your progress, and a "continue where you left off" button.
- **Two kinds of progress.** The header tracks modules *visited* and modules *completed*: each module has a real goal (finish the inbox, contain the outbreak, find a collision, and so on).
- **Keyboard shortcuts.** <kbd>1</kbd>–<kbd>0</kbd> jump to modules, <kbd>[</kbd> <kbd>]</kbd> step through them, <kbd>m</kbd> opens the modules menu, <kbd>g</kbd> goes to the overview, <kbd>i</kbd> toggles "How it works", <kbd>?</kbd> lists everything. The phishing module also takes <kbd>P</kbd>/<kbd>L</kbd>/<kbd>N</kbd>, and the playbook takes <kbd>A</kbd>–<kbd>D</kbd>.
- **Search.** Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> (or <kbd>/</kbd>) to search modules and run actions.
- **Custom logo and icon set**, drawn as inline SVG, so there are no image or font requests.
- **Website-style design.** A sticky header with `<code-style>` navigation and a numbered modules menu, a big gradient hero with geometric artwork, a featured-module section, and module pages with a numbered side rail.
- **Smooth by design.** No looping decorative animation, no scroll-linked effects, no backdrop blur or fixed backgrounds. Scrolling the overview holds a steady 60 fps.
- **Native typography.** No web fonts are downloaded; each platform's best built-in fonts are used.
- **Progress is saved** in your browser's local storage, and the app works fine without it.
- **Accessible:** real buttons and labels, visible focus, live regions for results, and reduced-motion support.

Every module also has a **How it works** panel with a plain-English explanation, a **Reset** button, and previous/next links.

## How to run it locally

1. Download or clone this repository.
2. Double-click `index.html`.

That's it. No install, no server, no internet connection needed. It works in current versions of Chrome, Edge, Firefox and Safari.

> **Why is there a `data/phishing_emails.js` as well as `phishing_emails.json`?** Browsers block `fetch()` for pages opened straight from disk (`file://`). When CyberSim is served over HTTP (for example on GitHub Pages) the phishing module loads `phishing_emails.json`; when opened from disk it uses the identical copy in `phishing_emails.js`. If you edit the emails, update the JSON and regenerate the JS copy:
>
> ```bash
> python -c "import json;d=json.load(open('data/phishing_emails.json',encoding='utf-8'));open('data/phishing_emails.js','w',encoding='utf-8').write('window.CYBERSIM_PHISHING_EMAILS = '+json.dumps(d,indent=2,ensure_ascii=False)+';\n')"
> ```

If you prefer a local server anyway:

```bash
python -m http.server 8000
```

then open `localhost:8000` in your browser.

## How to deploy to GitHub Pages

1. Create a new public repository on GitHub, for example `cybersim`.
2. Add the project files to it, either by dragging them into **Add file → Upload files**, or with git:
   ```bash
   git remote add origin git@github.com:<your-username>/cybersim.git
   git branch -M main
   git push -u origin main
   ```
   Make sure `index.html` sits at the top level of the repository.
3. On GitHub, open the repository's **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/ (root)**, then click **Save**.
6. Wait a minute or two for the first deployment (the **Actions** tab shows its progress).
7. Your site is live at `https://<your-username>.github.io/cybersim/`.

No build step or workflow file is needed: GitHub Pages serves the static files as they are, and all paths are relative, so it works from a sub-path.

## Ethical statement

**Every attack in this app is simulated. No real SQL is executed. No real malware is used. This is an educational tool.**

The "database" in the SQL injection module is a JavaScript array. The malware scan, virus, ransomware and port scan are scripted animations. No packets are sent, no files on your computer are read or changed, and nothing you type leaves the page. The techniques shown should only ever be practised against systems you own or have explicit written permission to test.

The phishing emails are fictional. Real brand names (PayPal, Amazon, Google, Microsoft and others) appear only to show how attackers imitate them; this project is not affiliated with any of those companies.

## Screenshot checklist

Use this list when capturing screenshots for the README, a portfolio, or a write-up:

- [ ] Overview: hero with the gradient headline and geometric artwork
- [ ] Overview: featured phishing section with the phone mock-up, and the module grid
- [ ] Phishing: a phishing email after answering, with the highlighted domain, reply-to and underlined urgency phrase
- [ ] Phishing: the final score screen ("You scored X/18. Average score: 11/18.")
- [ ] SQL injection: both panels after the injection attempt, "LOGIN BYPASSED" on the left and "Login failed" on the right
- [ ] Malware: the terminal showing the THREAT DETECTED and quarantine lines
- [ ] Virus: the grid mid-outbreak with infected, clean and isolated machines and the live counter
- [ ] Ransomware: the ransom note over a grid of locked files
- [ ] Password: the four bars for `Tr0ub4dor&3` next to `correcthorsebatterystaple`
- [ ] Port scan: completed scan with RDP and MySQL flagged and the summary
- [ ] Hash: a found near-collision with the matching prefix highlighted
- [ ] Firewall: a packet blocked at the firewall and the log panel filled in
- [ ] IR playbook: a wrong-answer explanation, and the final NIST 800-61 summary
- [ ] Mobile: the menu open on a phone-width screen
- [ ] Any module with its "How it works" panel expanded
- [ ] The search palette open with a search typed in

## Limitations

- **The simulations are simplified.** Each module isolates one idea; real attacks chain many techniques together and adapt to their target.
- **Real attacks are more complex.** Real SQL injection involves different databases, encodings and WAF evasion; real malware hides from scanners; real ransomware steals data before encrypting; real networks have far more than four firewall rules.
- **Estimates are rough.** Password-cracking times assume fixed guess rates and a small built-in sample of common passwords; real cracking speed depends on hardware, hash algorithm and wordlists.
- **This does not replace hands-on training in a lab.** To build practical skills, use dedicated, legal practice environments such as intentionally vulnerable VMs, capture-the-flag platforms, and an isolated home lab.

## What I learned

The biggest lesson was that explaining something simply is harder than understanding it. For every module I had to decide what to leave out without making the explanation wrong, and checking those explanations taught me more than reading about the topics ever had: why a parameterised query can't be tricked, why the birthday paradox halves the strength of a hash, and why isolating a machine early matters more than cleaning it perfectly later.

I also learned how to work with an AI coding assistant on a real project: describing what I wanted clearly, testing the result instead of trusting it, and sending it back when something looked wrong or didn't feel right. Several of the design rounds happened because I tried the site and wasn't happy with it yet.

Finally, reading the finished code showed me how a single-page app hangs together without a framework: a small router, a shared module format, cleanup when you leave a page, and keeping the design fast on slower machines.

## Project structure

```
cybersim/
├── index.html              Page shell: header, menu, main area, footer
├── css/style.css           Site theme, layout and module styles
├── js/
│   ├── utils.js            shuffle, escapeHTML, toast notifications, timers, module registry
│   ├── icons.js            Inline SVG icon set
│   ├── app.js              Header, modules menu, overview page, module pages, progress, shortcuts
│   └── modules/            One file per module (10 total)
├── data/
│   ├── phishing_emails.json  18 fictional emails (source of truth)
│   └── phishing_emails.js    Same data as a script, for file:// use
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

## License

MIT © 2026 Hayan Butt. See [LICENSE](LICENSE). You're free to use, share and adapt CyberSim, including for teaching.
