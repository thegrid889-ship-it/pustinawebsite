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
    TRACK_OFFSET = window.innerWidth <= MOBILE_BREAKPOINT ? MOBILE_TRACK_OFFSET : DESKTOP_TRACK_OFFSET;
    w = panel.offsetWidth + TRACK_OFFSET * 2;
    h = panel.offsetHeight + TRACK_OFFSET * 2;
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
