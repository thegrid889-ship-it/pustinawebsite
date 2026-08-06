const sections = document.querySelectorAll('.section');
let currentIndex = 0;
let isScrolling = false;

// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const nav = document.querySelector('nav');

if (hamburger && navMenu) {
  // Make entire nav clickable on mobile (only for index page)
  if (document.getElementById('home')) {
    nav.addEventListener('click', (e) => {
      // Don't toggle if clicking on a link
      if (!e.target.closest('a')) {
        navMenu.classList.toggle('active');
      }
    });
  }

  // Close menu when clicking on link
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
    });
  });
}

// Active section highlighting
function updateActiveLink() {
  const scrollPosition = window.scrollY + 200;
  
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
          // Update current page text on mobile
          const currentPageEl = document.getElementById('currentPage');
          if (currentPageEl) {
            currentPageEl.textContent = link.textContent;
          }
        }
      });
    }
  });
}

window.addEventListener('scroll', updateActiveLink);
window.addEventListener('load', updateActiveLink);

// Smooth scrolling with snap
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isScrolling) return;

  isScrolling = true;

  if (e.deltaY > 0 && currentIndex < sections.length - 1) {
    currentIndex++;
  } else if (e.deltaY < 0 && currentIndex > 0) {
    currentIndex--;
  }

  sections[currentIndex].scrollIntoView({
    behavior: 'smooth'
  });

  setTimeout(() => {
    isScrolling = false;
  }, 900);
}, { passive: false });

// Portfolio tabs
const portfolioTabs = document.querySelectorAll('.tab');
const portfolioTabContents = document.querySelectorAll('.tab-content');

function activatePortfolioTab(tab) {
  portfolioTabs.forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  portfolioTabContents.forEach(content => {
    content.hidden = content.id !== 'tab-' + tab.dataset.tab;
  });
}

portfolioTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activatePortfolioTab(tab);
    history.replaceState(null, '', '#' + tab.dataset.tab);
  });
});

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  const tab = Array.from(portfolioTabs).find(t => t.dataset.tab === hash);
  if (tab) activatePortfolioTab(tab);
});

const initialTab = Array.from(portfolioTabs).find(t => t.dataset.tab === location.hash.replace('#', '')) || portfolioTabs[0];
activatePortfolioTab(initialTab);

// Pac-Man runner circling the home panel, chomping a coin
async function initPacman() {
  const panel = document.getElementById('homePanel');
  if (!panel) return;

  // The known-good vector artwork (correct arc math for the mouth, real "$" text on the coin).
  // We rasterize this down to a small pixel grid instead of hand-drawing pixels, so the shapes
  // stay accurate (open mouth actually opens, coin actually shows a $) while looking pixel-art.
  const PACMAN_SOURCE = [
    // mouth open (arc endpoints at +/-25deg on a r=17 circle centered at 18,18)
    `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 18 L33.41 10.82 A17 17 0 1 0 33.41 25.18 Z" fill="#ffe14d"/>
      <line x1="18" y1="18" x2="33.41" y2="10.82" stroke="#d0142c" stroke-width="3" stroke-linecap="round"/>
      <line x1="18" y1="18" x2="33.41" y2="25.18" stroke="#d0142c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="14.5" cy="9.5" r="3" fill="#111"/>
    </svg>`,
    // mouth closed (arc endpoints at +/-5deg)
    `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 18 L34.94 16.52 A17 17 0 1 0 34.94 19.48 Z" fill="#ffe14d"/>
      <line x1="18" y1="18" x2="34.94" y2="16.52" stroke="#d0142c" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="18" y1="18" x2="34.94" y2="19.48" stroke="#d0142c" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="14.5" cy="9.5" r="3" fill="#111"/>
    </svg>`
  ];

  const COIN_RX = [10, 7.2, 3.4, 0.8, 3.4, 7.2];
  const COIN_SOURCE = COIN_RX.map(rx => {
    const showDollar = rx > 2.5;
    return `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="10" rx="${rx}" ry="9" fill="#ffd93f" stroke="#b8860b" stroke-width="1.3"/>
      ${showDollar ? '<text x="10" y="14.5" text-anchor="middle" font-size="11" font-weight="bold" font-family="sans-serif" fill="#8a6400">$</text>' : ''}
    </svg>`;
  });

  // Renders an SVG string to a tiny canvas (nearest-neighbor, no smoothing) then rebuilds it
  // as crisp <rect> blocks at full display size — a real "pixelate this shape" pass.
  // When a palette is given, every sampled pixel snaps to its nearest palette color, so
  // anti-aliased edge blends never show up as extra "compression"-looking shades.
  function rasterize(svgMarkup, gridN, boxSize, palette) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = gridN;
        canvas.height = gridN;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, gridN, gridN);
        const data = ctx.getImageData(0, 0, gridN, gridN).data;
        const cell = boxSize / gridN;
        let rects = '';
        for (let row = 0; row < gridN; row++) {
          for (let col = 0; col < gridN; col++) {
            const idx = (row * gridN + col) * 4;
            const a = data[idx + 3];
            if (a < 60) continue;
            let r = data[idx], g = data[idx + 1], b = data[idx + 2];
            if (palette) {
              let best = palette[0], bestDist = Infinity;
              for (const [pr, pg, pb] of palette) {
                const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
                if (dist < bestDist) { bestDist = dist; best = [pr, pg, pb]; }
              }
              [r, g, b] = best;
            }
            rects += `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="rgb(${r},${g},${b})"/>`;
          }
        }
        resolve(`<svg viewBox="0 0 ${boxSize} ${boxSize}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`);
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgMarkup)));
    });
  }

  // Pac-Man may only ever be pure yellow / red / black — no anti-aliased in-between shades.
  const PACMAN_PALETTE = [[255, 225, 77], [208, 20, 44], [17, 17, 17]];

  const PAC_GRID = 9;   // pixel-art resolution for Pac-Man
  const COIN_GRID = 12; // a bit finer so the $ stays readable
  const PACMAN_SIZE = 36;
  const COIN_SIZE = 20;

  const [PACMAN_FRAMES, COIN_FRAMES] = await Promise.all([
    Promise.all(PACMAN_SOURCE.map(src => rasterize(src, PAC_GRID, PACMAN_SIZE, PACMAN_PALETTE))),
    Promise.all(COIN_SOURCE.map(src => rasterize(src, COIN_GRID, COIN_SIZE)))
  ]);

  const pacman = document.createElement('div');
  pacman.className = 'pacman';
  pacman.innerHTML = PACMAN_FRAMES[0];
  const coin = document.createElement('div');
  coin.className = 'coin';
  coin.innerHTML = COIN_FRAMES[0];
  panel.appendChild(pacman);
  panel.appendChild(coin);

  const MOBILE_BREAKPOINT = 768;
  const DESKTOP_TRACK_OFFSET = 14; // outside the panel border
  const MOBILE_TRACK_OFFSET = -20; // inside the panel border, so it can't run off-screen
  let TRACK_OFFSET = DESKTOP_TRACK_OFFSET;
  const PAC_R = 18;
  const COIN_R = 10;
  const SPEED = 90; // px per second
  const MOUTH_INTERVAL = 150; // ms per animation frame
  const COIN_SPIN_INTERVAL = 90; // ms per coin spin frame
  let coinFrameIndex = 0;
  let lastCoinFrame = 0;

  let w = 0, h = 0, perim = 0;
  let dist = 0;
  let coinDist = 0;
  let eating = false;
  let mouthOpen = true;
  let lastMouthToggle = 0;
  let lastTime = null;

  function computeDims() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    TRACK_OFFSET = isMobile ? MOBILE_TRACK_OFFSET : DESKTOP_TRACK_OFFSET;
    // Pac-Man is positioned relative to the panel's padding edge (border excluded).
    // On mobile the track must stay inside that same box, so use clientWidth/Height
    // (no border) there; offsetWidth/Height (with border) keeps desktop's outside-the-frame math unchanged.
    const panelW = isMobile ? panel.clientWidth : panel.offsetWidth;
    const panelH = isMobile ? panel.clientHeight : panel.offsetHeight;
    w = panelW + TRACK_OFFSET * 2;
    h = panelH + TRACK_OFFSET * 2;
    perim = 2 * (w + h);
  }

  function randomCoinDist(avoid) {
    let d;
    do {
      d = Math.random() * perim;
    } while (Math.min(Math.abs(d - avoid), perim - Math.abs(d - avoid)) < perim * 0.15);
    return d;
  }

  function pointAt(d) {
    d = ((d % perim) + perim) % perim;
    if (d < w) return { x: d - TRACK_OFFSET, y: -TRACK_OFFSET, dir: 0 };
    if (d < w + h) return { x: w - TRACK_OFFSET, y: (d - w) - TRACK_OFFSET, dir: 90 };
    if (d < w + h + w) return { x: (w - (d - w - h)) - TRACK_OFFSET, y: h - TRACK_OFFSET, dir: 180 };
    return { x: -TRACK_OFFSET, y: (h - (d - w - h - w)) - TRACK_OFFSET, dir: 270 };
  }

  computeDims();
  coinDist = randomCoinDist(dist);
  window.addEventListener('resize', computeDims);

  function step(ts) {
    if (lastTime === null) lastTime = ts;
    const dt = (ts - lastTime) / 1000;
    lastTime = ts;

    dist = (dist + SPEED * dt) % perim;

    const p = pointAt(dist);
    pacman.style.transform = `translate(${p.x - PAC_R}px, ${p.y - PAC_R}px) rotate(${p.dir}deg)`;

    if (ts - lastMouthToggle > MOUTH_INTERVAL) {
      mouthOpen = !mouthOpen;
      pacman.innerHTML = PACMAN_FRAMES[mouthOpen ? 0 : 1];
      lastMouthToggle = ts;
    }

    if (ts - lastCoinFrame > COIN_SPIN_INTERVAL) {
      coinFrameIndex = (coinFrameIndex + 1) % COIN_FRAMES.length;
      coin.innerHTML = COIN_FRAMES[coinFrameIndex];
      lastCoinFrame = ts;
    }

    if (!eating) {
      const cp = pointAt(coinDist);
      coin.style.transform = `translate(${cp.x - COIN_R}px, ${cp.y - COIN_R}px)`;

      const diff = Math.abs(dist - coinDist);
      if (Math.min(diff, perim - diff) < 14) {
        eating = true;
        coin.style.transition = 'transform 0.15s, opacity 0.15s';
        coin.style.opacity = '0';
        setTimeout(() => {
          coinDist = randomCoinDist(dist);
          coin.style.transition = 'none';
          coin.style.opacity = '1';
          eating = false;
        }, 400);
      }
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

initPacman();

// Bomberman mini-game in the skills section (layer behind the text, like the rocket)
function initBomberman() {
  const canvas = document.getElementById('bomberCanvas');
  if (!canvas) return;
  const panel = canvas.closest('.panel');
  const ctx = canvas.getContext('2d');

  let W = 900, H = 500, s = 1;
  let CW, CH, KILL_R, SPEED;
  let players = [], bombs = [], particles = [], exp = null;
  let flame = null, flameT = 10;
  let state = 'play', stateT = 0, last = 0, visible = true;
  let scores = [0, 0];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function pixCircle(cx, cy, r, color) {
    const cxx = Math.round(cx), cyy = Math.round(cy), rr = Math.max(1, Math.round(r));
    ctx.fillStyle = color;
    for (let dy = -rr; dy <= rr; dy++) {
      const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
      ctx.fillRect(cxx - half, cyy + dy, half * 2, 1);
    }
  }

  function pixFlame(cx, yBase, r, flick) {
    const h = Math.round(r * 2.6 * (1 + flick * 0.12));
    const hw = Math.round(r * 1.05);
    const body = (rr, color) => {
      ctx.fillStyle = color;
      for (let dy = 1; dy <= h; dy++) {
        let w = Math.round(2 * Math.sin(Math.PI * dy / h) * rr);
        if (w <= 0) continue;
        if (dy > h * 0.7) w += 1;
        ctx.fillRect(Math.round(cx - w / 2), yBase - h + dy, w, 1);
      }
    };
    body(hw + 1, '#d6331f');
    body(hw, '#ff6f1f');
    body(Math.round(hw * 0.6), '#ffd93f');
    body(Math.round(hw * 0.28), '#fff7d1');
    ctx.fillStyle = '#d6331f';
    ctx.fillRect(cx - hw - 1, yBase - 2, 2, 2);
    ctx.fillRect(cx + hw - 1, yBase - 2, 2, 2);
    ctx.fillStyle = '#ff6f1f';
    ctx.fillRect(cx - hw, yBase - 1, 2, 1);
    ctx.fillRect(cx + hw - 2, yBase - 1, 2, 1);
  }

  function resize() {
    const w = Math.max(320, Math.round(panel.clientWidth));
    const h = Math.max(200, Math.round(panel.clientHeight));
    if (w !== W || h !== H) {
      W = w;
      H = h;
      canvas.width = W;
      canvas.height = H;
      s = Math.max(0.7, Math.min(W, H) / 220);
      CW = Math.round(12 * s);
      CH = Math.round(16 * s);
      KILL_R = CH * 2;
      SPEED = 48 * s;
      reset();
    }
  }

  function reset() {
    players = [0, 1].map(i => ({
      id: i,
      color: i === 0 ? '#4fc3ff' : '#ff6f3f',
      head: i === 0 ? '#9fe4ff' : '#ffb28f',
      eye: i === 0 ? '#063a52' : '#4a1200',
      x: W * (i === 0 ? 0.3 : 0.7),
      y: H * 0.55,
      vx: 0, vy: 0, lookX: 1, lookY: 0, walkT: 0, boost: false,
      reacting: false, reactWait: 0,
      wanderT: rand(0.2, 0.8), wa: rand(0, Math.PI * 2),
      throwT: rand(0.8, 1.6), dead: false
    }));
    bombs = [];
    particles = [];
    exp = null;
    flame = null;
    flameT = 10;
    state = 'play';
  }

  function throwBomb(p, o) {
    const d = Math.hypot(o.x - p.x, o.y - p.y) || 1;
    const speed = 165 * s;
    const t = d / speed;
    const tx = o.x + o.vx * t, ty = o.y + o.vy * t;
    bombs.push({
      x: p.x, y: p.y,
      vx: (tx - p.x) / d * speed, vy: (ty - p.y) / d * speed,
      targetX: tx, targetY: ty,
      landed: false, fuse: 0, done: false, owner: p.id,
      fail: Math.random() < 0.15, failFor: o.id
    });
  }

  function explode(b) {
    b.done = true;
    const boosted = !players[b.owner].dead && players[b.owner].boost;
    const r = boosted ? KILL_R * 2 : KILL_R;
    exp = { x: b.x, y: b.y, t: 0.38, r: r };
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 150) * s;
      particles.push({
        x: b.x, y: b.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        t: rand(0.3, 0.55),
        color: Math.random() < 0.5 ? '#ffd93f' : '#ff6f3f'
      });
    }
    players.forEach((pl, i) => {
      if (pl.dead) return;
      if (Math.hypot(pl.x - b.x, pl.y - b.y) < r) {
        pl.dead = true;
        if (b.owner !== i) scores[b.owner]++;
      }
    });
    if (players.some(pl => pl.dead)) {
      players.forEach(q => { q.boost = false; });
      state = 'over';
      stateT = 1.8;
    }
  }

  function update(dt) {
    if (state === 'over') {
      stateT -= dt;
      updateBombs(dt);
      if (exp) { exp.t -= dt; if (exp.t <= 0) exp = null; }
      updateParticles(dt);
      if (stateT <= 0) reset();
      return;
    }

    const pad = 8 * s;
    flameT -= dt;
    if (flameT <= 0 && !flame) {
      flame = { x: rand(pad * 2, W - pad * 2), y: rand(pad * 2, H - pad * 2) };
      flameT = rand(8, 12);
    }
    players.forEach((p, i) => {
      const o = players[1 - i];
      let ax = 0, ay = 0;
      const dx = o.x - p.x, dy = o.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 70 * s) { ax -= dx / d; ay -= dy / d; }
      else if (d > 180 * s) { ax += dx / d; ay += dy / d; }
      if (flame) {
        const fd = Math.hypot(flame.x - p.x, flame.y - p.y) || 1;
        ax += (flame.x - p.x) / fd * 1.2;
        ay += (flame.y - p.y) / fd * 1.2;
      }
      const stuck = bombs.some(b => b.fail && b.failFor === i && !b.done);
      const danger = !stuck && bombs.some(b => !b.done && Math.hypot(b.x - p.x, b.y - p.y) < 110 * s);
      if (!danger) p.reacting = false;
      if (danger && !p.reacting) {
        p.reacting = true;
        p.reactWait = rand(0.6, 1.2);
      }
      if (p.reactWait > 0) p.reactWait -= dt;
      const avoid = p.reacting && p.reactWait <= 0;
      bombs.forEach(b => {
        if (b.fail && b.failFor === i) return;
        if (!avoid) return;
        const bd = Math.hypot(b.x - p.x, b.y - p.y) || 1;
        if (bd < 90 * s) {
          ax -= (b.x - p.x) / bd * 0.9;
          ay -= (b.y - p.y) / bd * 0.9;
        }
      });
      p.wanderT -= dt;
      if (p.wanderT <= 0) {
        p.wanderT = rand(0.5, 1.3);
        p.wa = rand(0, Math.PI * 2);
      }
      ax += Math.cos(p.wa) * 0.35;
      ay += Math.sin(p.wa) * 0.35;
      const al = Math.hypot(ax, ay) || 1;
      p.vx = stuck ? 0 : ax / al * SPEED;
      p.vy = stuck ? 0 : ay / al * SPEED;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = Math.max(pad, Math.min(W - pad, p.x));
      p.y = Math.max(pad, Math.min(H - pad, p.y));
      p.lookX = dx >= 0 ? 1 : -1;
      p.lookY = dy >= 0 ? 1 : -1;
      p.walkT += Math.hypot(p.vx, p.vy) * dt * 0.08;
      if (flame && Math.hypot(flame.x - p.x, flame.y - p.y) < CH * 1.6) {
        flame = null;
        p.boost = true;
        flameT = rand(8, 12);
      }
      p.throwT -= dt;
      if (p.throwT <= 0 && d < 235 * s) {
        p.throwT = rand(1.4, 2.6);
        throwBomb(p, o);
      }
    });
    updateBombs(dt);
    if (exp) { exp.t -= dt; if (exp.t <= 0) exp = null; }
    updateParticles(dt);
  }

  function updateBombs(dt) {
    const pad = 8 * s;
    bombs.forEach(b => {
      if (!b.landed) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (Math.hypot(b.targetX - b.x, b.targetY - b.y) < 10 * s ||
            b.x < pad || b.x > W - pad || b.y < pad || b.y > H - pad) {
          b.landed = true;
          b.fuse = 0.95;
        }
      } else {
        b.fuse -= dt;
        if (b.fuse <= 0) explode(b);
      }
    });
    bombs = bombs.filter(b => !b.done);
  }

  function updateParticles(dt) {
    particles.forEach(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.t -= dt;
    });
    particles = particles.filter(pt => pt.t > 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    bombs.forEach(b => {
      const bx = Math.round(b.x), by = Math.round(b.y), r = Math.round(4 * s);
      pixCircle(bx, by, r, '#4a4a4a');
      const hw = Math.max(1, Math.round(r * 0.3)), hh = Math.max(1, Math.round(r * 0.3));
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(bx - Math.round(r * 0.45), by - Math.round(r * 0.5), hw, hh);
      if (!b.landed) {
        ctx.fillStyle = '#ff4f4f';
        ctx.fillRect(bx - hw, by - Math.round(r * 0.2), Math.max(1, Math.round(r * 0.2)), Math.max(1, Math.round(r * 0.2)));
      } else {
        const fuseLen = Math.max(1, b.fuse / 0.95 * 10 * s);
        ctx.strokeStyle = '#f5d76e';
        ctx.lineWidth = Math.max(1, s);
        ctx.beginPath();
        ctx.moveTo(bx, by - r);
        ctx.lineTo(bx + 2 * s, by - r - fuseLen);
        ctx.stroke();
        ctx.fillStyle = '#ff4f4f';
        ctx.fillRect(bx + 2 * s, by - r - fuseLen, Math.round(2 * s), Math.round(2 * s));
      }
    });

    if (flame) {
      const fx = Math.round(flame.x), fy = Math.round(flame.y);
      const fk = Math.sin(last / 90);
      ctx.globalAlpha = 0.2;
      pixCircle(fx, fy - 5 * s, 8 * s, '#ff8a2a');
      ctx.globalAlpha = 1;
      pixFlame(fx, fy, Math.round(4 * s), fk);
    }

    players.forEach(p => {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.dead) {
        const gx = Math.round(x), gy = Math.round(y + CH * 0.2);
        const vw = Math.round(3 * s), vh = Math.round(10 * s);
        const hb = Math.round(7 * s), hh = Math.round(3 * s);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(gx - Math.round(hb / 2) + Math.round(s), gy, hb, Math.round(s));
        ctx.fillStyle = '#8f9aa5';
        ctx.fillRect(gx - Math.round(vw / 2), gy - vh, vw, vh);
        ctx.fillRect(gx - Math.round(hb / 2), gy - vh + Math.round(s), hb, hh);
        ctx.fillStyle = '#b6c2cc';
        ctx.fillRect(gx - Math.round(vw / 2), gy - vh, vw, Math.round(s));
        ctx.fillRect(gx - Math.round(hb / 2), gy - vh + Math.round(s), hb, Math.round(s));
        return;
      }
      const R = CH * 0.42;
      const headY = y - CH * 0.28;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(x - s), Math.round(headY - R - 2 * s), Math.round(2 * s), Math.round(3 * s));
      ctx.fillRect(Math.round(x - 1.5 * s), Math.round(headY - R - 5 * s), Math.round(3 * s), Math.round(3 * s));
      ctx.beginPath();
      ctx.arc(x, headY, R, 0, Math.PI * 2);
      ctx.fill();
      const bodyTop = headY + R * 0.6;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(x - CW * 0.25), Math.round(bodyTop), Math.round(CW * 0.5), Math.round(y + CH * 0.32 - bodyTop));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, headY + R * 0.15, R * 0.55, 0, Math.PI * 2);
      ctx.fill();
      const pw = Math.max(2, R * 0.22), ph = Math.max(2, R * 0.3);
      const ox = p.lookX * R * 0.18, oy = p.lookY * R * 0.12;
      ctx.fillStyle = p.eye;
      ctx.fillRect(Math.round(x - R * 0.28 + ox - pw / 2), Math.round(headY + R * 0.1 + oy - ph / 2), pw, ph);
      ctx.fillRect(Math.round(x + R * 0.28 + ox - pw / 2), Math.round(headY + R * 0.1 + oy - ph / 2), pw, ph);
      ctx.fillStyle = p.eye;
      ctx.fillRect(Math.round(x - 1.5 * s), Math.round(headY + R * 0.45), Math.round(3 * s), Math.round(1.5 * s));
      const step = Math.round(Math.sin(p.walkT) * CH * 0.12);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(x - CW * 0.3 + step), Math.round(y + CH * 0.32), Math.round(CW * 0.28), Math.round(CH * 0.15));
      ctx.fillRect(Math.round(x + CW * 0.02 - step), Math.round(y + CH * 0.32), Math.round(CW * 0.28), Math.round(CH * 0.15));
      if (p.boost) {
        const bf = Math.sin(last / 70);
        pixFlame(x, Math.round(headY - R - 4 * s + bf * s), Math.round(2.5 * s), bf);
      }
      if (bombs.some(b => b.fail && b.failFor === p.id && !b.done)) {
        ctx.font = 'bold ' + Math.round(12 * s) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd93f';
        ctx.fillText('!', x, headY - R - 8 * s);
      }
    });

    particles.forEach(pt => {
      ctx.globalAlpha = Math.min(1, pt.t / 0.2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), Math.max(1, 3 * s), Math.max(1, 3 * s));
    });
    ctx.globalAlpha = 1;

    if (exp) {
      const k = 1 - exp.t / 0.38;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.fillStyle = '#ff6f3f';
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, Math.max(2, exp.r * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd93f';
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, Math.max(1, exp.r * k * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const fs = Math.round(14 * s);
    ctx.font = 'bold ' + fs + 'px monospace';
    ctx.textAlign = 'right';
    const w0 = ctx.measureText(String(scores[0])).width;
    const w1 = ctx.measureText(String(scores[1])).width;
    const cw = ctx.measureText(':').width;
    const gap = 6 * s, ry = 24 * s;
    let rx = W - 10 * s;
    ctx.fillStyle = '#ff6f3f';
    ctx.fillText(String(scores[1]), rx, ry);
    rx -= w1 + gap;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(':', rx, ry);
    rx -= cw + gap;
    ctx.fillStyle = '#4fc3ff';
    ctx.fillText(String(scores[0]), rx, ry);

    if (state === 'over') {
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(20 * s) + 'px monospace';
      ctx.lineWidth = Math.max(2, 4 * s);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText('GAME OVER', W / 2, H / 2 - 6 * s);
      ctx.fillStyle = stateT % 0.5 < 0.25 ? '#ff4f6f' : '#ffb2c4';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 6 * s);
      ctx.font = Math.round(10 * s) + 'px monospace';
      ctx.fillStyle = '#8fa3b8';
      ctx.fillText('NEXT ROUND...', W / 2, H / 2 + 16 * s);
    }
  }

  function frame(ts) {
    if (last === 0) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (visible) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(en => { visible = en.isIntersecting; });
    }, { threshold: 0.1 }).observe(canvas);
  }
}

initBomberman();

// Snake mini-game on the portfolio page (layer behind the content, avoids project images)
function initSnake() {
  const canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  const panel = canvas.closest('.panel');
  const ctx = canvas.getContext('2d');

  let W = 900, H = 500, s = 1, cell = 16, cols = 1, rows = 1;
  let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 };
  let apple = null, state = 'play', stateT = 0, moveT = 0, score = 0;
  let last = 0, visible = true, obsSet = new Set();
  const MOVE_MS = 280;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function pixCircle(cx, cy, r, color) {
    const cxx = Math.round(cx), cyy = Math.round(cy), rr = Math.max(1, Math.round(r));
    ctx.fillStyle = color;
    for (let dy = -rr; dy <= rr; dy++) {
      const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
      ctx.fillRect(cxx - half, cyy + dy, half * 2, 1);
    }
  }

  function computeObstacles() {
    obsSet = new Set();
    const imgs = panel.querySelectorAll('.project > img');
    if (!imgs.length) return;
    const cr = panel.getBoundingClientRect();
    const inflate = cell * 0.6;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const cx = gx * cell, cy = gy * cell;
        let blocked = false;
        for (const img of imgs) {
          const pr = img.getBoundingClientRect();
          const ox = pr.left - cr.left, oy = pr.top - cr.top;
          const ow = pr.width, oh = pr.height;
          if (cx + cell > ox - inflate && cx < ox + ow + inflate &&
              cy + cell > oy - inflate && cy < oy + oh + inflate) {
            blocked = true;
            break;
          }
        }
        if (blocked) obsSet.add(gx + ',' + gy);
      }
    }
  }

  function resize() {
    const w = Math.max(320, Math.round(panel.clientWidth));
    const h = Math.max(200, Math.round(panel.clientHeight));
    if (w !== W || h !== H) {
      W = w;
      H = h;
      canvas.width = W;
      canvas.height = H;
      s = Math.max(0.7, Math.min(W, H) / 220);
      cell = Math.max(10, Math.round(16 * s));
      cols = Math.max(8, Math.floor(W / cell));
      rows = Math.max(6, Math.floor(H / cell));
      computeObstacles();
      reset();
    }
  }

  function spawnApple() {
    const free = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!obsSet.has(x + ',' + y) && !snake.some(seg => seg.x === x && seg.y === y)) free.push({ x: x, y: y });
      }
    }
    if (!free.length) { gameOver(); return; }
    apple = free[Math.floor(Math.random() * free.length)];
  }

  function reset() {
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    state = 'play';
    stateT = 0;
    moveT = 0;
    apple = null;
    spawnApple();
  }

  function gameOver() {
    state = 'over';
    stateT = 1.8;
  }

  function pickDir() {
    const cands = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ].filter(d => !(d.x === -dir.x && d.y === -dir.y));
    const head = snake[0];
    let best = null, bestD = Infinity;
    cands.forEach(d => {
      const nx = head.x + d.x, ny = head.y + d.y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (obsSet.has(nx + ',' + ny)) return;
      if (snake.some(seg => seg.x === nx && seg.y === ny)) return;
      const dd = Math.hypot(nx - apple.x, ny - apple.y) + rand(0, 0.6);
      if (dd < bestD) { bestD = dd; best = d; }
    });
    if (!best) {
      nextDir = cands[Math.floor(Math.random() * cands.length)];
    } else {
      nextDir = best;
    }
  }

  function step() {
    dir = nextDir;
    const head = snake[0];
    const nx = head.x + dir.x, ny = head.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { gameOver(); return; }
    if (obsSet.has(nx + ',' + ny)) { gameOver(); return; }
    const eating = apple && nx === apple.x && ny === apple.y;
    const bodyToCheck = eating ? snake : snake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === nx && seg.y === ny)) { gameOver(); return; }
    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score++;
      spawnApple();
    } else {
      snake.pop();
    }
  }

  function update(dt) {
    if (state === 'over') {
      stateT -= dt;
      if (stateT <= 0) reset();
      return;
    }
    moveT -= dt * 1000;
    if (moveT <= 0) {
      moveT += MOVE_MS;
      pickDir();
      step();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    snake.forEach((seg, i) => {
      const gx = Math.round(seg.x * cell), gy = Math.round(seg.y * cell);
      ctx.fillStyle = i === 0 ? '#7ddb7d' : (i % 2 === 0 ? '#3f9e4d' : '#2f7d3d');
      ctx.fillRect(gx, gy, cell - 1, cell - 1);
      if (i === 0) {
        const es = Math.max(2, Math.round(s));
        const fw = Math.round(dir.x * cell * 0.22), fy2 = Math.round(dir.y * cell * 0.22);
        const px = -dir.y, py = dir.x;
        const side = Math.round(cell * 0.28);
        ctx.fillStyle = '#0a2a12';
        ctx.fillRect(Math.round(gx + cell / 2 + fw + px * side - es / 2), Math.round(gy + cell / 2 + fy2 + py * side - es / 2), es, es);
        ctx.fillRect(Math.round(gx + cell / 2 + fw - px * side - es / 2), Math.round(gy + cell / 2 + fy2 - py * side - es / 2), es, es);
      }
    });

    if (apple) {
      const ax = apple.x * cell + cell / 2, ay = apple.y * cell + cell / 2;
      const ar = Math.round(cell * 0.38);
      pixCircle(ax, ay, ar, '#d6331f');
      pixCircle(ax, ay, Math.round(ar * 0.7), '#c62828');
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(Math.round(ax - ar * 0.5), Math.round(ay - ar * 0.55), Math.max(1, Math.round(ar * 0.3)), Math.max(1, Math.round(ar * 0.3)));
      ctx.fillStyle = '#7a4a21';
      ctx.fillRect(Math.round(ax - Math.round(s)), Math.round(ay - ar - 3 * s), Math.round(2 * s), Math.round(3 * s));
      ctx.fillStyle = '#3f9e4d';
      ctx.fillRect(Math.round(ax - Math.round(s)), Math.round(ay - ar - 4 * s), Math.round(4 * s), Math.round(2 * s));
    }

    const fs = Math.round(14 * s);
    ctx.font = 'bold ' + fs + 'px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7ddb7d';
    ctx.fillText(String(score), W - 10 * s, 24 * s);

    if (state === 'over') {
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(20 * s) + 'px monospace';
      ctx.lineWidth = Math.max(2, 4 * s);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText('GAME OVER', W / 2, H / 2 - 6 * s);
      ctx.fillStyle = stateT % 0.5 < 0.25 ? '#7ddb7d' : '#c9f2c9';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 6 * s);
      ctx.font = Math.round(10 * s) + 'px monospace';
      ctx.fillStyle = '#8fa3b8';
      ctx.fillText('RESTART...', W / 2, H / 2 + 16 * s);
    }
  }

  function frame(ts) {
    if (last === 0) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (visible) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  const cimg = panel.querySelector('.project > img');
  if (cimg && !cimg.complete) cimg.addEventListener('load', computeObstacles);
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(en => { visible = en.isIntersecting; });
    }, { threshold: 0.1 }).observe(canvas);
  }
}

initSnake();

// Tetris mini-game on the contact page (randomly falling blocks, layer behind the content)
function initTetris() {
  if (window.matchMedia('(max-width: 768px)').matches) return;
  const canvas = document.getElementById('tetrisCanvas');
  if (!canvas) return;
  const panel = canvas.closest('.panel');
  const ctx = canvas.getContext('2d');

  const SHAPES = [
    { cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: '#37c8e8' },
    { cells: [[1, 0], [2, 0], [1, 1], [2, 1]], color: '#f5d76e' },
    { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: '#b06af0' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#5ad45a' },
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#ff5a5a' },
    { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#5a8cff' },
    { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#ff9a3f' }
  ];
  const COLS = 10;
  let ROWS = 20;
  let W = 900, H = 500, s = 1, cell = 20, fx = 0, fy = 0;
  let board = [], cur = null, fallT = 0, clearT = 0, score = 0;
  let clearRows = [];
  let mouseCol = -1;
  const FALL_MS = 420;
  let fallMs = FALL_MS, speedT = 0;
  let state = 'play', stateT = 0, last = 0, visible = true;

  function resize() {
    const w = Math.max(320, Math.round(panel.clientWidth));
    const h = Math.max(200, Math.round(panel.clientHeight));
    if (w !== W || h !== H) {
      W = w;
      H = h;
      canvas.width = W;
      canvas.height = H;
      s = Math.max(0.7, Math.min(W, H) / 220);
      const marginR = Math.round(16 * s);
      const gapTxt = Math.round(36 * s);
      let textRight = W - marginR - COLS * 10;
      const txt = panel.querySelector('.contact-text');
      if (txt) {
        const tr = txt.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        textRight = Math.max(0, Math.min(W - marginR - COLS * 10, tr.right - pr.left));
      }
      const availW = (W - marginR) - (textRight + gapTxt);
      cell = Math.max(10, Math.floor(Math.min(availW / COLS, H / 14)));
      ROWS = Math.max(8, Math.floor(H / cell));
      fx = textRight + gapTxt;
      fy = Math.floor((H - ROWS * cell) / 2);
      reset();
    }
  }

  function reset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    clearRows = [];
    fallMs = FALL_MS;
    speedT = 0;
    state = 'play';
    stateT = 0;
    fallT = 0;
    clearT = 0;
    spawn();
  }

  function rotateCells(cells) {
    return cells.map(function (c) { return [3 - c[1], c[0]]; });
  }

  function spawn() {
    const t = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    let cells = t.cells;
    const rot = Math.floor(Math.random() * 4);
    for (let i = 0; i < rot; i++) cells = rotateCells(cells);
    const x = Math.max(0, Math.min(COLS - 4, Math.floor((COLS - 4) / 2) + Math.floor(Math.random() * 5) - 2));
    cur = { cells: cells, color: t.color, x: x, y: 0 };
    if (collides(x, 0, cells)) gameOver();
  }

  function collides(x, y, cells) {
    return cells.some(function (c) {
      const gx = x + c[0], gy = y + c[1];
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && board[gy][gx]) return true;
      return false;
    });
  }

  function lock() {
    cur.cells.forEach(function (c) {
      const gx = cur.x + c[0], gy = cur.y + c[1];
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) board[gy][gx] = cur.color;
    });
    clearRows = [];
    for (let y = 0; y < ROWS; y++) {
      if (board[y].every(function (c) { return c; })) clearRows.push(y);
    }
    if (clearRows.length) {
      score += clearRows.length;
      clearT = 0.25;
    } else {
      spawn();
    }
  }

  function clearFullRows() {
    clearRows.forEach(function (y) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
    });
    clearRows = [];
    spawn();
  }

  function gameOver() {
    state = 'over';
    stateT = 1.8;
  }

  function rotate() {
    if (!cur || state !== 'play' || clearRows.length) return;
    const nc = rotateCells(cur.cells);
    const kicks = [0, -1, 1, -2, 2];
    for (let i = 0; i < kicks.length; i++) {
      if (!collides(cur.x + kicks[i], cur.y, nc)) {
        cur.cells = nc;
        cur.x += kicks[i];
        return;
      }
    }
  }

  function move(dx) {
    if (!cur || state !== 'play' || clearRows.length) return;
    if (!collides(cur.x + dx, cur.y, cur.cells)) cur.x += dx;
  }

  function softDrop() {
    if (!cur || state !== 'play' || clearRows.length) return;
    if (!collides(cur.x, cur.y + 1, cur.cells)) {
      cur.y++;
      fallT = fallMs;
    }
  }

  function update(dt) {
    if (state === 'over') {
      stateT -= dt;
      if (stateT <= 0) reset();
      return;
    }
    if (clearRows.length) {
      clearT -= dt;
      if (clearT <= 0) clearFullRows();
      return;
    }
    speedT += dt;
    while (speedT >= 10) {
      speedT -= 10;
      fallMs = fallMs * 0.9;
    }
    if (mouseCol >= 0 && cur) {
      let minC = 4, maxC = -1;
      cur.cells.forEach(function (c) {
        if (c[0] < minC) minC = c[0];
        if (c[0] > maxC) maxC = c[0];
      });
      const center = (minC + maxC) / 2;
      const want = Math.max(-minC, Math.min(COLS - 1 - maxC, Math.round(mouseCol - center)));
      const step = Math.sign(want - cur.x);
      if (step && !collides(cur.x + step, cur.y, cur.cells)) cur.x += step;
    }
    fallT -= dt * 1000;
    if (fallT <= 0) {
      fallT += fallMs;
      if (Math.random() < 0.35) {
        const d = Math.random() < 0.5 ? -1 : 1;
        if (!collides(cur.x + d, cur.y, cur.cells)) cur.x += d;
      }
      if (collides(cur.x, cur.y + 1, cur.cells)) {
        lock();
      } else {
        cur.y++;
      }
    }
  }

  function drawCell(x, y, color) {
    const ins = Math.max(1, Math.round(s * 0.6));
    ctx.fillStyle = color;
    ctx.fillRect(x + ins, y + ins, cell - ins * 2, cell - ins * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + ins, y + ins, cell - ins * 2, Math.max(1, ins));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.075)';
    ctx.lineWidth = Math.max(1, s);
    ctx.strokeRect(fx - s, fy - s, COLS * cell + 2 * s, ROWS * cell + 2 * s);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = board[y][x];
        if (c) drawCell(fx + x * cell, fy + y * cell, c);
      }
    }

    clearRows.forEach(function (y) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let x = 0; x < COLS; x++) {
        ctx.fillRect(fx + x * cell, fy + y * cell, cell, cell);
      }
    });

    if (cur && state === 'play') {
      cur.cells.forEach(function (c) {
        drawCell(fx + (cur.x + c[0]) * cell, fy + (cur.y + c[1]) * cell, cur.color);
      });
    }

    const fs = Math.round(14 * s);
    ctx.font = 'bold ' + fs + 'px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#37c8e8';
    ctx.fillText(String(score), W - 10 * s, 24 * s);

    if (state === 'over') {
      const cx = fx + COLS * cell / 2, cy = fy + ROWS * cell / 2;
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(20 * s) + 'px monospace';
      ctx.lineWidth = Math.max(2, 4 * s);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText('GAME OVER', cx, cy - 6 * s);
      ctx.fillStyle = stateT % 0.5 < 0.25 ? '#37c8e8' : '#b7ecf7';
      ctx.fillText('GAME OVER', cx, cy - 6 * s);
      ctx.font = Math.round(10 * s) + 'px monospace';
      ctx.fillStyle = '#8fa3b8';
      ctx.fillText('RESTART...', cx, cy + 16 * s);
    }
  }

  function frame(ts) {
    if (last === 0) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (visible) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);

  const inField = function (e) {
    const pr = panel.getBoundingClientRect();
    const mx = e.clientX - pr.left, my = e.clientY - pr.top;
    return mx >= fx && mx <= fx + COLS * cell && my >= fy && my <= fy + ROWS * cell;
  };

  panel.addEventListener('mousemove', function (e) {
    if (!visible) return;
    if (!inField(e)) {
      mouseCol = -1;
      return;
    }
    const pr = panel.getBoundingClientRect();
    mouseCol = Math.max(0, Math.min(COLS - 1, Math.floor((e.clientX - pr.left - fx) / cell)));
  });

  panel.addEventListener('mouseleave', function () {
    mouseCol = -1;
  });

  panel.addEventListener('contextmenu', function (e) {
    if (!visible || !inField(e)) return;
    e.preventDefault();
    softDrop();
  });

  panel.addEventListener('click', function (e) {
    if (!visible || !inField(e)) return;
    e.preventDefault();
    rotate();
  });

  window.addEventListener('keydown', function (e) {
    if (!visible) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); move(-1); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); rotate(); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); softDrop(); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(en => { visible = en.isIntersecting; });
    }, { threshold: 0.1 }).observe(canvas);
  }
}

initTetris();
