// The Detail Collective — interaction layer
// GSAP + ScrollTrigger + Lenis for scroll choreography, Three.js for the hero.

document.body.classList.remove('no-js');

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   Smooth momentum scroll (Lenis), synced to GSAP's ticker so
   ScrollTrigger stays in lockstep with Lenis's virtual scroll.
   --------------------------------------------------------------- */

let lenis = null;

if (!prefersReduced && typeof Lenis !== 'undefined') {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

/* ---------------------------------------------------------------
   Nav: background/blur once scrolled past the hero threshold
   --------------------------------------------------------------- */

const nav = document.getElementById('site-nav');

ScrollTrigger.create({
  start: '80px top',
  end: 999999,
  toggleClass: { targets: nav, className: 'is-scrolled' },
});

const navToggle = document.querySelector('.nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMobileMenu(open) {
  document.body.classList.toggle('nav-open', open);
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (lenis) { if (open) lenis.stop(); else lenis.start(); }
}

if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    setMobileMenu(!document.body.classList.contains('nav-open'));
  });
  mobileMenu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setMobileMenu(false));
  });
}

/* ---------------------------------------------------------------
   Hero headline: split into per-word masked spans, rise on load
   --------------------------------------------------------------- */

function splitWords(root) {
  const walk = (node) => {
    const frag = document.createDocumentFragment();
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/).filter((p) => p.length);
        parts.forEach((part) => {
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            const inner = document.createElement('span');
            inner.textContent = part;
            wordSpan.appendChild(inner);
            frag.appendChild(wordSpan);
          }
        });
      } else if (child.nodeName === 'BR') {
        frag.appendChild(document.createElement('br'));
      } else {
        const clone = document.createElement(child.nodeName);
        for (const attr of child.attributes || []) clone.setAttribute(attr.name, attr.value);
        clone.appendChild(walk(child));
        frag.appendChild(clone);
      }
    });
    return frag;
  };
  const result = walk(root);
  root.innerHTML = '';
  root.appendChild(result);
  return root.querySelectorAll('.word > span');
}

const heroHeading = document.querySelector('.hero h1');
const heroWordSpans = heroHeading ? splitWords(heroHeading) : [];

const loadTl = gsap.timeline({ delay: prefersReduced ? 0 : 0.15 });

if (heroWordSpans.length) {
  gsap.set(heroWordSpans, { yPercent: 115 });
  loadTl.to(heroWordSpans, {
    yPercent: 0,
    duration: prefersReduced ? 0.01 : 1.1,
    ease: 'power4.out',
    stagger: prefersReduced ? 0 : 0.045,
  }, 0.1);
}

document.querySelectorAll('.hero [data-reveal="fade"]').forEach((el, i) => {
  gsap.set(el, { opacity: 0, y: 16 });
  loadTl.to(el, {
    opacity: 1, y: 0,
    duration: prefersReduced ? 0.01 : 0.9,
    ease: 'power3.out',
  }, prefersReduced ? 0 : 0.5 + i * 0.08);
});

/* ---------------------------------------------------------------
   Generic scroll reveals for everything below the hero
   --------------------------------------------------------------- */

const revealDefs = {
  fade: { y: 20, duration: 0.9 },
  rise: { y: 36, duration: 1 },
  'rise-slow': { y: 50, duration: 1.3 },
};

document.querySelectorAll('section:not(.hero) [data-reveal]').forEach((el) => {
  const kind = el.dataset.reveal;
  if (kind === 'wipe' || prefersReduced) return; // handled separately / shown as-is
  const cfg = revealDefs[kind] || revealDefs.fade;
  gsap.set(el, { opacity: 0, y: cfg.y });
  gsap.to(el, {
    opacity: 1, y: 0,
    duration: cfg.duration,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* ---------------------------------------------------------------
   Gallery: clip-path wipe reveal + pointer tilt/sheen
   --------------------------------------------------------------- */

const galleryGrid = document.querySelector('.gallery-grid');
const tiles = gsap.utils.toArray('.g-tile');

if (galleryGrid && !prefersReduced) {
  gsap.set(tiles, { clipPath: 'inset(100% 0% 0% 0%)' });
  ScrollTrigger.batch(tiles, {
    start: 'top 90%',
    onEnter: (batch) => {
      gsap.to(batch, {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
      });
    },
    once: true,
  });
}

document.querySelectorAll('.g-tile, .about-portrait').forEach((tile) => {
  const setTilt = (xDeg, yDeg, sx, sy) => {
    gsap.to(tile, {
      '--tilt-x': `${xDeg}deg`,
      '--tilt-y': `${yDeg}deg`,
      '--sheen-x': `${sx}%`,
      '--sheen-y': `${sy}%`,
      duration: 0.6,
      ease: 'power3.out',
      overwrite: true,
    });
  };

  tile.addEventListener('pointermove', (e) => {
    if (prefersReduced) return;
    const rect = tile.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - py) * 10;
    const tiltY = (px - 0.5) * 10;
    setTilt(tiltX.toFixed(2), tiltY.toFixed(2), (px * 100).toFixed(1), (py * 100).toFixed(1));
  });

  tile.addEventListener('pointerleave', () => setTilt(0, 0, 50, 50));
});

/* ---------------------------------------------------------------
   Pinned moment: the section holds while the story cards assemble
   --------------------------------------------------------------- */

const storiesSection = document.getElementById('stories');
const storyCards = storiesSection ? gsap.utils.toArray('.story-card', storiesSection) : [];

if (storiesSection && storyCards.length && !prefersReduced) {
  ScrollTrigger.matchMedia({
    '(min-width: 861px)': () => {
      gsap.set(storyCards, { opacity: 0, y: 40 });
      gsap.to(storyCards, {
        opacity: 1, y: 0,
        stagger: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: storiesSection,
          start: 'top top',
          end: '+=60%',
          scrub: true,
          pin: true,
        },
      });
    },
    '(max-width: 860px)': () => {
      gsap.set(storyCards, { opacity: 0, y: 30 });
      gsap.to(storyCards, {
        opacity: 1, y: 0,
        stagger: 0.15,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: storiesSection, start: 'top 85%' },
      });
    },
  });
}

/* ---------------------------------------------------------------
   Hero parallax: copy and flag drift at different rates
   --------------------------------------------------------------- */

if (!prefersReduced) {
  ScrollTrigger.matchMedia({
    '(min-width: 861px)': () => {
      gsap.to('.hero-copy', {
        yPercent: -16,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-checker', {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    },
  });
}

/* ---------------------------------------------------------------
   Footer year
   --------------------------------------------------------------- */

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

