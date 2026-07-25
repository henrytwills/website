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
   Pinned moment: the "client stories" quote grows in as it holds
   --------------------------------------------------------------- */

const storiesBlock = document.querySelector('.stories');
if (storiesBlock && !prefersReduced) {
  ScrollTrigger.matchMedia({
    '(min-width: 861px)': () => {
      const mark = storiesBlock.querySelector('.mark');
      gsap.set(mark, { scale: 0.4, transformOrigin: '50% 100%' });
      gsap.to(mark, {
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: storiesBlock.closest('section'),
          start: 'top top',
          end: '+=70%',
          scrub: true,
          pin: true,
          pinSpacing: true,
        },
      });
    },
  });
}

/* ---------------------------------------------------------------
   Hero parallax: copy and canvas drift at different rates
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
      gsap.to('#hero-canvas', {
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

/* ---------------------------------------------------------------
   Three.js hero: a slowly turning, hand-displaced glossy sphere
   standing in for real photography until real jobs are shot.
   --------------------------------------------------------------- */

async function initHeroScene() {
  if (prefersReduced) return;

  const canvas = document.getElementById('hero-canvas');
  const wrap = document.querySelector('.hero-canvas-wrap');
  if (!canvas || !wrap) return;

  let THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (err) {
    return; // CSS gradient fallback already sits behind the canvas
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (err) {
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

  // A stylized, abstract sports-car silhouette — not a copy of any real
  // model (avoids trademarked bodywork) — sculpted from a unit sphere:
  // sloped hood and decklid, a cabin greenhouse bump, flared haunches
  // over the wheel arches, a flat underbody, and a subtle rear kick.
  const geometry = new THREE.SphereGeometry(1, 200, 200);
  const posAttr = geometry.attributes.position;
  const v = new THREE.Vector3();
  const smoothstep = (edge0, edge1, x) => {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const bell = (x, center, width) => Math.exp(-Math.pow((x - center) / width, 2));

  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const t = v.z; // -1 nose … +1 tail (rotation axis, like a turntable)

    let x = v.x;
    let y = v.y;

    if (y > 0) {
      // An asymmetric hump: steep/narrow rise from a low nose into the
      // cabin (short, aggressive hood-to-windshield), then a much wider,
      // gentler taper down the fastback rear — long hood, short deck.
      const peakT = -0.15;
      const front = bell(t, peakT, 0.24);
      const rear = bell(t, peakT, 0.58);
      const humpShape = t < peakT ? front : rear;

      const baseLevel = 0.2;
      const roofLevel = 0.82;
      const profile = baseLevel + (roofLevel - baseLevel) * humpShape;

      const tailKick = 0.09 * bell(t, 0.8, 0.08);
      y = y * profile + tailKick;
    } else {
      y = y * 0.2; // flat, ground-hugging underbody
    }

    // Pointed nose, a tucked-in greenhouse waist, and haunches flared
    // wider over the rear than the front — a mid-engine supercar stance.
    const noseTaper = 0.5 + 0.5 * smoothstep(-1, -0.5, t);
    const haunch = 1 + 0.24 * bell(t, 0.55, 0.22) + 0.08 * bell(t, -0.45, 0.18);
    const waist = 1 - 0.22 * bell(t, 0.1, 0.35) * smoothstep(0.1, 0.6, v.y);
    x = x * noseTaper * haunch * waist;

    posAttr.setXYZ(i, x, y, v.z);
  }
  geometry.computeVertexNormals();
  geometry.scale(1.35, 1.35, 2.55);

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1c2b23'),
    metalness: 1,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.35,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(1.15, -0.15, 0);
  mesh.rotation.z = -0.06;
  scene.add(mesh);

  const key = new THREE.DirectionalLight(0xfff4e0, 1.4);
  key.position.set(3.5, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbcd6c4, 0.6);
  rim.position.set(-4, -2, 2);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  function sizeToWrap() {
    const { width, height } = wrap.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  sizeToWrap();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeToWrap, 120);
  });

  const pointerTarget = { x: 0, y: 0 };
  const pointerCurrent = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let running = true;
  const io = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }, { threshold: 0.02 });
  io.observe(wrap);

  gsap.set(mesh.scale, { x: 0.001, y: 0.001, z: 0.001 });
  gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: 'power3.out', delay: 0.3 });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;

    const t = clock.getElapsedTime();
    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.04;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.04;

    // A flattering 3/4 angle by default, easing back and forth like a
    // turntable rather than spinning all the way round.
    const baseYaw = 0.6;
    mesh.rotation.y = baseYaw + Math.sin(t * 0.15) * 0.16 + pointerCurrent.x * 0.22;
    mesh.rotation.x = Math.sin(t * 0.12) * 0.05 + pointerCurrent.y * 0.08;

    renderer.render(scene, camera);
  }
  animate();
}

initHeroScene();
