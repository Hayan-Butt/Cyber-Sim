/* CyberSim: shared helpers.
   Exposes window.CyberSim.utils and the window.CyberSim.modules registry. */
(function () {
  'use strict';

  const CyberSim = (window.CyberSim = window.CyberSim || {});
  CyberSim.modules = CyberSim.modules || [];

  /** Fisher–Yates shuffle. Returns a new array; the input is not modified. */
  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escape a value so it can be safely inserted into innerHTML. */
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
  }

  /** Escape a string for use inside a RegExp. */
  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Show a short notification in the bottom-right corner. type: info | success | danger | warning */
  function toast(message, type = 'info', duration = 2800) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    while (stack.children.length >= 3) stack.firstElementChild.remove();
    const node = document.createElement('div');
    node.className = `toast toast-${type}`;
    node.setAttribute('role', 'status');
    node.textContent = message;
    stack.appendChild(node);
    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 320);
    }, duration);
  }

  /** Create an element from an HTML string. Returns the first element. */
  function html(markup) {
    const tpl = document.createElement('template');
    tpl.innerHTML = markup.trim();
    return tpl.content.firstElementChild;
  }

  /**
   * A group of timers that can all be cancelled at once.
   * Modules use one per mount so navigating away or pressing Reset stops every animation.
   */
  function createTimers() {
    const timeouts = new Set();
    const intervals = new Set();
    return {
      timeout(fn, ms) {
        const id = setTimeout(() => {
          timeouts.delete(id);
          fn();
        }, ms);
        timeouts.add(id);
        return id;
      },
      interval(fn, ms) {
        const id = setInterval(fn, ms);
        intervals.add(id);
        return id;
      },
      clearInterval(id) {
        clearInterval(id);
        intervals.delete(id);
      },
      sleep(ms) {
        return new Promise((resolve) => this.timeout(resolve, ms));
      },
      clearAll() {
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
        timeouts.clear();
        intervals.clear();
      },
    };
  }

  /** Format a duration in seconds as human-readable text ("3 seconds", "4.2 billion years"). */
  function formatDuration(seconds) {
    if (!isFinite(seconds)) return 'longer than the universe will exist';
    if (seconds < 1) return 'instant';
    const MIN = 60, HOUR = 3600, DAY = 86400, YEAR = 31557600;
    const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
    if (seconds < MIN) return plural(Math.round(seconds), 'second');
    if (seconds < HOUR) return plural(Math.round(seconds / MIN), 'minute');
    if (seconds < DAY) return plural(Math.round(seconds / HOUR), 'hour');
    if (seconds < YEAR) return plural(Math.round(seconds / DAY), 'day');
    const years = seconds / YEAR;
    if (years < 1000) return plural(Math.round(years), 'year');
    const scales = [
      [1e18, 'quintillion'],
      [1e15, 'quadrillion'],
      [1e12, 'trillion'],
      [1e9, 'billion'],
      [1e6, 'million'],
      [1e3, 'thousand'],
    ];
    if (years >= 1e21) return `${years.toExponential(1).replace('e+', ' × 10^')} years`;
    for (const [value, name] of scales) {
      if (years >= value) {
        const n = years / value;
        return `${n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n)} ${name} years`;
      }
    }
    return plural(Math.round(years), 'year');
  }

  /**
   * Markup for a result callout. `body` is trusted HTML (callers escape user input themselves).
   * type: info | success | danger | warning
   */
  function callout(type, title, body = '', role = 'status') {
    const iconName = { success: 'check', danger: 'x', warning: 'alert', info: 'info' }[type] || 'info';
    const ico = CyberSim.icon ? CyberSim.icon(iconName) : '';
    return `<div class="callout callout-${type}" role="${role}">${ico}<div class="callout-body"><div class="callout-title">${title}</div>${body}</div></div>`;
  }

  /** Random lowercase hex string of the given length (for fake hashes, wallet IDs and similar). */
  function randomHex(length) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  /** Register a module. Order of registration does not matter; app.js sorts by `order`. */
  function registerModule(def) {
    CyberSim.modules.push(def);
  }

  CyberSim.utils = { shuffle, escapeHTML, escapeRegExp, toast, html, createTimers, formatDuration, callout, randomHex };
  CyberSim.registerModule = registerModule;
})();
