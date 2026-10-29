// resona.syalia.com: language switch and the Emotion CAD. No dependencies.
(function () {
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LNAMES = {en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', zh: '中文', ja: '日本語', ko: '한국어', ru: 'Русский'};
  const FEATURED = ['calm', 'happy', 'sad', 'angry', 'whispering', 'ominous', 'excited', 'sarcastic', 'tired', 'terrified'];
  // The clips the site is planned to carry (see README): six emotions at normal, plus angry at three more intensities.
  const PLANNED = ['calm-normal', 'happy-normal', 'sad-normal', 'angry-normal', 'whispering-normal', 'ominous-normal', 'angry-minimal', 'angry-strong', 'angry-extreme'];
  const T = {
    en: {normal: 'Normal', has: 'Sample: “The letter arrived this morning.”', coming: 'Sample coming: “The letter arrived this morning.”', none: 'No sample for this emotion yet', neutral: 'neutral', x: 'temperature', y: 'rep. penalty', play: 'Play sample', stop: 'Stop sample'},
    es: {normal: 'Normal', has: 'Muestra: «La carta llegó esta mañana.»', coming: 'Muestra en camino: «La carta llegó esta mañana.»', none: 'Esta emoción aún no tiene muestra', neutral: 'neutro', x: 'temperatura', y: 'penalización', play: 'Reproducir muestra', stop: 'Detener muestra'}
  };
  const STORE = 'resona-lang';
  let ui = 'en';

  // ---- language
  function setLang(l) {
    ui = l;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-en]').forEach(n => { n.textContent = n.dataset[l]; });
    document.querySelectorAll('[data-en-html]').forEach(n => { n.innerHTML = n.dataset[l + 'Html']; });
    document.querySelector('meta[name=description]').content = $('sub').textContent;
    $('l-en').classList.toggle('on', l === 'en'); $('l-es').classList.toggle('on', l === 'es');
    $('l-en').setAttribute('aria-pressed', l === 'en'); $('l-es').setAttribute('aria-pressed', l === 'es');
    if (cad) cad.setLang(l);
  }
  function pick(l) { try { localStorage.setItem(STORE, l); } catch (e) { /* private mode */ } setLang(l); }
  $('l-en').onclick = () => pick('en'); $('l-es').onclick = () => pick('es');
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) { /* private mode */ }
  let cad = null;
  setLang(saved === 'en' || saved === 'es' ? saved : (/^es/i.test(navigator.language || '') ? 'es' : 'en'));

  // ---- Emotion CAD
  fetch('data/emotions.json').then(r => r.json()).then(D => { cad = makeCad(D); cad.setLang(ui); });

  function makeCad(D) {
    const B = D.base;
    // Same as EmotionManager.calculate_parameters in Resona (src/emotions/manager.py).
    const params = (id, m) => {
      const e = D.emotions[id];
      return [Math.max(0.01, Math.min(1.99, B.temp + e[0] * m)), Math.max(0, B.penalty + e[1] * m), Math.max(0.01, Math.min(1, B.top_p + e[2] * m))];
    };
    const INTS = Object.entries(D.intensifiers).map(([id, v]) => [id, v[0]]).concat([['normal', 1]]).sort((a, b) => a[1] - b[1]);
    let nameLang = 'en', sel = 'angry', mult = 1, intId = 'normal', audio = null;
    const li = l => Math.max(0, D.langs.indexOf(l));
    const name = id => D.emotions[id][3][li(nameLang)] || D.emotions[id][3][0];
    const X = t => 20 + Math.max(0, Math.min(1, (t - 0.3) / 1.5)) * 360;   // temperature 0.3..1.8
    const Y = p => 236 - Math.max(0, Math.min(1, (p - 0.75) / 0.9)) * 216; // penalty 0.75..1.65
    const mix = (a, b, f) => '#' + [0, 2, 4].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - f) + parseInt(b.substr(i, 2), 16) * f).toString(16).padStart(2, '0')).join('');
    // Colour encodes the temperature delta: cool when it goes down, warm when it goes up.
    const col = dt => dt < 0 ? mix('5EEAD4', '8AA8FF', Math.min(1, -dt / 0.35)) : mix('5EEAD4', 'FF9466', Math.min(1, dt / 0.5));
    const svg = $('map');
    const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
    const clipKey = () => sel + '-' + intId;
    const clipLang = () => (D.clips[ui] ? ui : 'en');
    const hasClip = () => (D.clips[clipLang()] || []).includes(clipKey());

    function stop() { if (audio) { audio.pause(); audio = null; } $('slot-play').setAttribute('aria-label', T[ui].play); }

    function draw() {
      svg.textContent = '';
      el('rect', {x: 0, y: 0, width: 400, height: 260, fill: '#0F131C'});
      for (let t = 0.5; t < 1.8; t += 0.25) el('line', {x1: X(t), x2: X(t), y1: 14, y2: 236, stroke: '#1b2231'});
      for (let p = 0.8; p < 1.65; p += 0.1) el('line', {x1: 20, x2: 380, y1: Y(p), y2: Y(p), stroke: '#1b2231'});
      el('line', {x1: X(B.temp), x2: X(B.temp), y1: 14, y2: 236, stroke: '#2c3548', 'stroke-dasharray': '3 3'});
      el('line', {x1: 20, x2: 380, y1: Y(B.penalty), y2: Y(B.penalty), stroke: '#2c3548', 'stroke-dasharray': '3 3'});
      el('text', {x: 378, y: 252, 'text-anchor': 'end', class: 'ax'}).textContent = T[ui].x + ' →';
      el('text', {x: 24, y: 24, class: 'ax'}).textContent = '↑ ' + T[ui].y;
      el('text', {x: X(B.temp) + 4, y: Y(B.penalty) + 12, class: 'n0'}).textContent = T[ui].neutral + ' ' + B.temp.toFixed(2) + ' · ' + B.penalty.toFixed(2);
      for (const id in D.emotions) {
        if (id === sel) continue;
        const [t, p, q] = params(id, mult);
        el('circle', {cx: X(t), cy: Y(p), r: 1.6 + q * 2.4, fill: col(D.emotions[id][0]), 'fill-opacity': 0.55});
      }
      const [t, p, q] = params(sel, mult);
      const c = col(D.emotions[sel][0]);
      el('line', {x1: X(B.temp), y1: Y(B.penalty), x2: X(t), y2: Y(p), stroke: '#5EEAD4', 'stroke-width': 1.2});
      el('circle', {cx: X(t), cy: Y(p), r: 10 + q * 3, fill: 'none', stroke: c, 'stroke-opacity': 0.5});
      el('circle', {cx: X(t), cy: Y(p), r: 5 + q * 2, fill: c});
      el('text', {x: Math.min(X(t) + 12, 300), y: Math.max(Y(p) - 12, 40), class: 'lab'}).textContent = name(sel);

      const e = D.emotions[sel];
      const s = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
      $('r-t').textContent = t.toFixed(2); $('r-p').textContent = p.toFixed(2); $('r-q').textContent = q.toFixed(2);
      $('r-dt').textContent = s(e[0] * mult); $('r-dp').textContent = s(e[1] * mult); $('r-dq').textContent = s(e[2] * mult);

      const has = hasClip();
      $('slot').classList.toggle('has', has);
      $('slot-play').disabled = !has;
      $('slot-t').textContent = has ? T[ui].has : PLANNED.includes(clipKey()) ? T[ui].coming : T[ui].none;
      chips(); ints();
      $('emo').value = sel;
    }
    function chips() {
      const c = $('chips'); c.textContent = '';
      (FEATURED.includes(sel) ? FEATURED : FEATURED.concat([sel])).forEach(id => {
        const b = document.createElement('button'); b.type = 'button'; b.className = id === sel ? 'on' : '';
        b.setAttribute('aria-pressed', id === sel);
        b.textContent = name(id);
        if ((D.clips[clipLang()] || []).some(k => k.startsWith(id + '-'))) { const d = document.createElement('span'); d.className = 'dot'; b.appendChild(d); }
        b.onclick = () => choose(id); c.appendChild(b);
      });
    }
    function ints() {
      const c = $('ints'); c.querySelectorAll('button').forEach(b => b.remove());
      INTS.forEach(([id, m]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = id === intId ? 'on' : '';
        b.setAttribute('aria-pressed', id === intId);
        b.textContent = (id === 'normal' ? T[ui].normal : D.intensifiers[id][1][li(nameLang)] || id) + ' ×' + m;
        b.onclick = () => { stop(); intId = id; mult = m; draw(); }; c.appendChild(b);
      });
    }
    function choose(id) { stop(); sel = id; draw(); }
    function fillEmotionSelect() {
      const s = $('emo'); s.textContent = '';
      Object.keys(D.emotions).sort((a, b) => name(a).localeCompare(name(b))).forEach(id => {
        const o = document.createElement('option'); o.value = id; o.textContent = name(id); s.appendChild(o);
      });
      s.value = sel;
    }
    $('emo').onchange = () => choose($('emo').value);
    // A click on the map picks the nearest emotion.
    svg.addEventListener('click', ev => {
      const r = svg.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * 400, y = (ev.clientY - r.top) / r.height * 260;
      let best = null, bd = 1e9;
      for (const id in D.emotions) { const [t, p] = params(id, mult); const d = (X(t) - x) ** 2 + (Y(p) - y) ** 2; if (d < bd) { bd = d; best = id; } }
      if (best && bd < 900) choose(best);
    });
    $('slot-play').onclick = () => {
      if (audio) { stop(); return; }
      audio = new Audio('audio/emotions/' + clipLang() + '/' + clipKey() + '.opus');
      audio.onended = stop;
      audio.play().catch(stop);
      $('slot-play').setAttribute('aria-label', T[ui].stop);
    };
    const ls = $('lng');
    D.langs.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = LNAMES[l] || l; ls.appendChild(o); });
    ls.onchange = () => { nameLang = ls.value; fillEmotionSelect(); draw(); };
    return {setLang(l) { stop(); nameLang = l; ls.value = l; fillEmotionSelect(); draw(); }};
  }
})();
