/* CyberSim icon set: small inline SVGs drawn on a 24px grid with a 1.8px stroke.
   icon('lock') returns markup; pass a class to size or colour it. */
(function () {
  'use strict';

  const P = {
    // CyberSim mark: a hexagonal "cell" with a terminal prompt inside.
    logo: '<path d="M12 2.6 20.2 7.3v9.4L12 21.4l-8.2-4.7V7.3z"/><path d="m8.6 9.6 2.9 2.4-2.9 2.4"/><path d="M13.2 14.6h3"/>',
    command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.4 3.2 8.2 7.5 9 4.3-.8 7.5-4.6 7.5-9V6z"/>',
    shieldCheck: '<path d="M12 3 4.5 6v6c0 4.4 3.2 8.2 7.5 9 4.3-.8 7.5-4.6 7.5-9V6z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    hook: '<path d="M14 3v9.5a4.5 4.5 0 1 1-9 0V11"/><path d="m5 11 2.5 2.5"/><circle cx="14" cy="3" r="1"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    bug: '<rect x="8" y="8" width="8" height="12" rx="4"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0"/><path d="M12 12v8M4 13h4M16 13h4M5 19l3-2M19 19l-3-2M5.5 7.5 8 10M18.5 7.5 16 10"/>',
    nodes: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18.5" r="2.2"/><circle cx="19" cy="18.5" r="2.2"/><circle cx="12" cy="12.5" r="1.6"/><path d="M12 7.2v3.7M10.8 13.5l-4.3 3.6M13.2 13.5l4.3 3.6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/><path d="M12 14.5v2.5"/>',
    unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2"/>',
    key: '<circle cx="8" cy="15" r="4.2"/><path d="m11 12 9-9M16.5 6.5l2.5 2.5M14 9l2 2"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 6.4-6.4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    hash: '<path d="M5 9h14M5 15h14M10.5 4 8.5 20M15.5 4l-2 16"/>',
    wall: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M8.5 5v4.7M15.5 5v4.7M12 9.7v4.6M8.5 14.3V19M15.5 14.3V19"/>',
    siren: '<path d="M7 17v-5a5 5 0 0 1 10 0v5"/><rect x="5" y="17" width="14" height="3.5" rx="1"/><path d="M12 2.5v2M4 5.5l1.4 1.4M20 5.5l-1.4 1.4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4.5h4.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.1M10 10h.1M13.5 10h.1M17 10h.1M7.5 14h9"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    flag: '<path d="M5.5 21V4M5.5 4h11l-2.2 4 2.2 4h-11"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeOff: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    server: '<rect x="3.5" y="4" width="17" height="7" rx="1.5"/><rect x="3.5" y="13" width="17" height="7" rx="1.5"/><path d="M7 7.5h.1M7 16.5h.1M11 7.5h6M11 16.5h6"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.2"/><path d="M2.5 19h19"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
    coins: '<circle cx="9" cy="9" r="5.5"/><path d="M15.2 10.1a5.5 5.5 0 1 1-5.1 5.1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    scale: '<path d="M12 4v16M5 20h14M5 8h14M8 8l-3 6h6zM16 8l-3 6h6z"/>',
    zap: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };

  function icon(name, cls = '') {
    const body = P[name];
    if (!body) return '';
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  window.CyberSim = window.CyberSim || {};
  window.CyberSim.icon = icon;
})();
