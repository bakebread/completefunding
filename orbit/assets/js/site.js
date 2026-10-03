/* Complete Funding — Concept B "Orbit" interactions
   GSAP + ScrollTrigger + SplitText + Lenis drive the DOM and the WebGL state (window.orbit). */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-AU");
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const orbit = window.orbit || { state: {}, setArc() {} };

  $("#year").textContent = new Date().getFullYear();
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const go = (t) => (lenis ? lenis.scrollTo(t, { duration: 1.6 }) : (typeof t === "number" ? window.scrollTo(0, t) : t.scrollIntoView()));

  /* ---------- Drawer ---------- */
  const menuBtn = $(".hdr__menu"), drawer = $("#drawer");
  const setDrawer = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      drawer.hidden = false; lenis && lenis.stop();
      gsap.fromTo(drawer, { opacity: 0 }, { opacity: 1, duration: .4 });
      gsap.fromTo($$("nav a", drawer), { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: .05, duration: .8, ease: "expo.out" });
    } else {
      gsap.to(drawer, { opacity: 0, duration: .3, onComplete: () => (drawer.hidden = true) });
      lenis && lenis.start();
    }
  };
  menuBtn.addEventListener("click", () => setDrawer(menuBtn.getAttribute("aria-expanded") !== "true"));

  /* ---------- Anchors ---------- */
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    if (a.dataset.finance) { const r = $(`.chips input[value="${a.dataset.finance}"]`); if (r) r.checked = true; }
    if (menuBtn.getAttribute("aria-expanded") === "true") setDrawer(false);
    go(t);
  }));

  /* ---------- Header ---------- */
  const hdr = $(".hdr");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (s) => {
      hdr.classList.toggle("is-scrolled", s.scroll() > 30);
      hdr.classList.toggle("is-hidden", s.scroll() > innerHeight && s.direction === 1);
    }
  });
  const navLinks = $$(".hdr__nav a");
  navLinks.forEach((l) => {
    const sec = $(l.getAttribute("href"));
    ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", refreshPriority: -1, onToggle: (s) => l.classList.toggle("is-active", s.isActive) });
  });

  /* ---------- Cursor + magnetic ---------- */
  if (finePointer && !reduced) {
    const cur = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $("#cursor-label");
    const dx = gsap.quickTo(dot, "x", { duration: .08 }), dy = gsap.quickTo(dot, "y", { duration: .08 });
    const rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    gsap.set(cur, { opacity: 0 });
    window.addEventListener("pointermove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); if (!cur._on) { cur._on = 1; gsap.to(cur, { opacity: 1, duration: .4 }); } });
    document.addEventListener("pointerover", (e) => {
      const lab = e.target.closest("[data-cursor]");
      const link = e.target.closest("a, button, label, input");
      cur.classList.toggle("is-label", !!lab && !link);
      cur.classList.toggle("is-link", !!link);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    $$("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: .6, ease: "power3" }), yTo = gsap.quickTo(el, "y", { duration: .6, ease: "power3" });
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .4); });
      el.addEventListener("pointerleave", () => { gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, .35)" }); });
    });
  } else $(".cursor").remove();

  /* ---------- Count-up ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    if (reduced) { el.textContent = end; return; }
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v)) }) });
  });

  /* ---------- Calculator ---------- */
  const amount = $("#calc-amount"), rate = $("#calc-rate"), term = $("#calc-term");
  const thumb = $(".seg__thumb");
  const shown = { pay: 0, int: 0, total: 0, p: 0 };
  const per = { 52: "per week", 26: "per fortnight", 12: "per month" };
  let principalShare = .8, calcActive = false;
  const fill = (r) => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
  function calc(instant) {
    const P = +amount.value, yr = +term.value, f = +$('input[name="freq"]:checked').value;
    const r = +rate.value / 100 / f, n = yr * f;
    const pay = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
    const total = pay * n, int = total - P;
    principalShare = P / total;
    $("#out-amount").textContent = fmt(P);
    $("#out-rate").textContent = (+rate.value).toFixed(1) + "%";
    $("#out-term").textContent = yr + (yr === 1 ? " yr" : " yrs");
    $("#res-label").textContent = per[f];
    [amount, rate, term].forEach(fill);
    const idx = [52, 26, 12].indexOf(f);
    thumb.style.transform = `translateX(${idx * 100}%)`;
    $("#split-p").style.flexBasis = (principalShare * 100).toFixed(1) + "%";
    if (calcActive) orbit.setArc(principalShare * 2);
    const target = { pay, int, total, p: P };
    const render = () => { $("#res-pay").textContent = fmt(shown.pay); $("#res-int").textContent = fmt(shown.int); $("#res-total").textContent = fmt(shown.total); $("#res-p").textContent = fmt(shown.p); };
    if (instant || reduced) { Object.assign(shown, target); render(); return; }
    gsap.to(shown, { ...target, duration: .7, ease: "power3.out", overwrite: true, onUpdate: render });
  }
  $("#calc").addEventListener("input", () => calc());
  calc(true);
  ScrollTrigger.create({
    trigger: "#instrument", start: "top 65%", end: "bottom 35%",
    onToggle: (s) => { calcActive = s.isActive; orbit.setArc(s.isActive ? principalShare * 2 : 1.72); orbit.render && orbit.render(); }
  });

  /* ---------- Enquiry ---------- */
  $("#enquiry").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target; let ok = true;
    $$("input[required]", f).forEach((i) => { const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle("is-invalid", bad); if (bad) ok = false; });
    const st = $("#enquiry-status");
    if (!ok) { st.textContent = "Please add your name, phone and a valid email."; return; }
    const d = Object.fromEntries(new FormData(f));
    const body = `Name: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nFinance type: ${d.type}`;
    window.location.href = `mailto:info@completefunding.com.au?subject=${encodeURIComponent("Finance enquiry — " + d.type)}&body=${encodeURIComponent(body)}`;
    st.textContent = "Launching your email app — or call us on 1300 008 618.";
  });

  /* ---------- Reviews carousel (CSS 3D) ---------- */
  const ringEl = $("#carousel-ring");
  $$(".rv", ringEl).forEach((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); ringEl.appendChild(k); });
  const cards = $$(".rv", ringEl), N = cards.length, STEP = 360 / N;
  const car = { rot: 0 };
  let radius = 0, autoOn = !reduced, dragging = false, inView = false;
  function layout() {
    const w = cards[0].offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N)) + (innerWidth < 760 ? 10 : 50);
    cards.forEach((c, i) => (c.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`));
    paint();
  }
  function paint() {
    ringEl.style.transform = `translateZ(${-radius}px) rotateY(${car.rot}deg)`;
    cards.forEach((c, i) => { const a = ((i * STEP + car.rot) % 360 + 360) % 360; const f = Math.cos(a * Math.PI / 180); c.style.opacity = (.18 + Math.max(0, f) * .82).toFixed(3); });
  }
  layout();
  window.addEventListener("resize", layout);
  ScrollTrigger.create({ trigger: "#carousel", start: "top bottom", end: "bottom top", onToggle: (s) => (inView = s.isActive) });
  gsap.ticker.add(() => { if (autoOn && !dragging && inView) { car.rot -= .06; paint(); } });
  const snapTo = (dir) => { const target = Math.round(car.rot / STEP) * STEP + dir * STEP; gsap.to(car, { rot: target, duration: reduced ? 0 : 1, ease: "expo.out", onUpdate: paint }); };
  $("#rv-prev").addEventListener("click", () => snapTo(1));
  $("#rv-next").addEventListener("click", () => snapTo(-1));
  const carEl = $("#carousel");
  let lastX = 0, vel = 0;
  carEl.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; vel = 0; gsap.killTweensOf(car); carEl.setPointerCapture(e.pointerId); });
  carEl.addEventListener("pointermove", (e) => { if (!dragging) return; const d = e.clientX - lastX; lastX = e.clientX; vel = d; car.rot += d * .25; paint(); });
  const release = () => { if (!dragging) return; dragging = false; gsap.to(car, { rot: Math.round((car.rot + vel * 3) / STEP) * STEP, duration: 1.2, ease: "expo.out", onUpdate: paint }); };
  carEl.addEventListener("pointerup", release); carEl.addEventListener("pointercancel", release);
  carEl.addEventListener("mouseenter", () => (autoOn = false));
  carEl.addEventListener("mouseleave", () => (autoOn = !reduced));

  /* ---------- Reduced motion: static ---------- */
  if (reduced) {
    document.body.classList.remove("is-loading");
    $("#loader").remove();
    const gl = $("#gl");
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => (gl.style.opacity = s.scroll() > innerHeight * .8 ? .35 : 1) });
    return;
  }

  /* ---------- Motion ---------- */
  const fontsReady = document.fonts.ready;
  const glReady = new Promise((res) => { if (orbit.ready || document.documentElement.classList.contains("no-webgl")) res(); else { window.addEventListener("orbit:ready", res, { once: true }); setTimeout(res, 2500); } });
  const minTime = new Promise((res) => setTimeout(res, 1300));
  const loadN = { v: 0 };
  const loadTween = gsap.to(loadN, { v: 88, duration: 1.3, ease: "power2.out", onUpdate: () => { $("#load-n").textContent = Math.round(loadN.v); $("#load-bar").style.transform = `scaleX(${loadN.v / 100})`; } });

  Promise.all([fontsReady, glReady, minTime]).then(() => {
    loadTween.kill();
    const heroSplit = SplitText.create(".hero__title .ln", { type: "words,chars", charsClass: "ch", wordsClass: "wd" });
    const contactSplit = SplitText.create(".contact__title .ln", { type: "lines", mask: "lines" });
    const isMobile = () => innerWidth < 761;

    const S = orbit.state;
    Object.assign(S, { camZ: 18, partOpacity: 0, warp: .8 });
    gsap.set(".hero__title", { perspective: 900 });
    gsap.set(heroSplit.chars, { yPercent: 110, rotateX: -80, opacity: 0, transformOrigin: "50% 100%" });
    gsap.set([".tag", ".hero__lede", ".hero__actions > *", ".hero__foot", ".hdr"], { opacity: 0, y: 24 });

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(loadN, { v: 100, duration: .5, ease: "power2.inOut", onUpdate: () => { $("#load-n").textContent = Math.round(loadN.v); $("#load-bar").style.transform = `scaleX(${loadN.v / 100})`; } })
      .to(".loader__count, .loader__bar, .loader__note, .loader__logo", { opacity: 0, y: -30, duration: .6, stagger: .04, ease: "power2.in" })
      .to("#loader", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, "-=.2")
      .add(() => { $("#loader").remove(); document.body.classList.remove("is-loading"); lenis && lenis.start(); }, "-=.3")
      .to(S, { camZ: 9, partOpacity: 1, warp: 0, duration: 2.6, ease: "power3.out" }, "-=1")
      .to(heroSplit.chars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, stagger: .025 }, "-=2.2")
      .to([".hdr", ".tag", ".hero__lede", ".hero__actions > *", ".hero__foot"], { opacity: 1, y: 0, duration: 1.2, stagger: .08, clearProps: "transform" }, "-=1.4")
      .add(() => { introDone = true; ScrollTrigger.refresh(); });
    let introDone = false;

    /* Finance horizontal scroll */
    const mm = gsap.matchMedia();
    const track = $("#finance-track");
    mm.add("(min-width: 761px)", () => {
      const dist = () => track.scrollWidth - innerWidth;
      const h = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: "#finance", pin: ".finance__pin", start: "top top", end: () => "+=" + dist(), scrub: 1, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (s) => ($("#finance-bar").style.transform = `scaleX(${s.progress})`) }
      });
      $$(".card", track).forEach((c) => {
        const img = $(".card__img img", c);
        if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: c, containerAnimation: h, start: "left right", end: "right left", scrub: true } });
        gsap.from(c, { z: -160, opacity: .15, ease: "power2.out", scrollTrigger: { trigger: c, containerAnimation: h, start: "left 105%", end: "left 62%", scrub: true } });
        c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - .5) * 8, rotateX: -((e.clientY - r.top) / r.height - .5) * 8, transformPerspective: 900, duration: .6, ease: "power3" }); });
        c.addEventListener("pointerleave", () => gsap.to(c, { rotateY: 0, rotateX: 0, duration: .9, ease: "power3" }));
      });
    });

    /* Manifesto: decode lines */
    const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789$%#&+";
    const man = $(".manifesto__text");
    man.setAttribute("aria-label", $$(".scramble", man).map((s) => s.textContent.trim()).join(" "));
    $$(".scramble", man).forEach((el, li) => {
      el.setAttribute("aria-hidden", "true");
      const orig = el.textContent;
      el.style.minHeight = "1em";
      const o = { p: 0 };
      const draw = () => {
        const n = Math.floor(o.p * orig.length);
        let out = orig.slice(0, n);
        for (let i = n; i < orig.length; i++) out += orig[i] === " " ? " " : (i < n + 10 ? glyphs[(Math.random() * glyphs.length) | 0] : "\u00a0");
        el.textContent = out;
      };
      o.p = 0; draw();
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => gsap.to(o, { p: 1, duration: 1.4, delay: li * .12, ease: "power2.out", onUpdate: draw, onComplete: () => (el.textContent = orig) }) });
    });

    /* Process stack: previous cards recede */
    // Sticky cards: measure live positions (sticky elements break precomputed trigger offsets)
    const stackCards = $$(".stack__card");
    const stackTick = () => {
      const vh = innerHeight;
      stackCards.forEach((c, i) => {
        const next = stackCards[i + 1]; if (!next) return;
        const stickTop = parseFloat(getComputedStyle(next).top) || 110;
        const t = Math.min(1, Math.max(0, (vh * .85 - next.getBoundingClientRect().top) / (vh * .85 - stickTop)));
        c.style.transform = `scale(${(1 - t * .07).toFixed(4)})`;
        c.style.filter = t > 0 ? `brightness(${(1 - t * .5).toFixed(3)})` : "";
      });
    };
    ScrollTrigger.create({ trigger: ".stack", start: "top bottom", end: "bottom top", onUpdate: stackTick, onRefresh: stackTick });

    /* Marquees with scroll-velocity boost */
    const tweens = $$(".marquee").map((m) => {
      const t = $(".marquee__track", m);
      [...t.children].forEach((c) => { const k = c.cloneNode(true); k.alt = ""; k.setAttribute("aria-hidden", "true"); t.appendChild(k); });
      const dir = +m.dataset.dir;
      return gsap.fromTo(t, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 38, ease: "none", repeat: -1 });
    });
    let boost = { v: 1 };
    ScrollTrigger.create({ trigger: ".lenders", start: "top bottom", end: "bottom top", onUpdate: (s) => {
      const v = Math.min(6, 1 + Math.abs(s.getVelocity()) / 250);
      gsap.to(boost, { v, duration: .2, overwrite: true, onUpdate: () => tweens.forEach((t) => t.timeScale(boost.v)), onComplete: () => gsap.to(boost, { v: 1, duration: 1.2, onUpdate: () => tweens.forEach((t) => t.timeScale(boost.v)) }) });
    } });

    /* Contact reveal */
    gsap.from(contactSplit.lines, { yPercent: 110, duration: 1.4, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 65%" } });

    /* Generic reveals */
    const rev = $$(".label, .h2, .metric, .panel, .stack__card h3, .reviews__head, .contact__phone, .contact__mail, .form, .ftr__grid > *");
    gsap.set(rev, { y: 40, opacity: 0 });
    ScrollTrigger.batch(rev, { start: "top 90%", once: true, onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1.2, stagger: .08, ease: "expo.out" }) });

    /* ---------- WebGL choreography: keyframes along the page ---------- */
    const D = {
      hero:   { camZ: 9,   camY: 0,  ringX: 1.6,  ringY: .35, ringScale: 1,   tilt: .42, warp: 0, partOpacity: 1,   glow: 1 },
      portal: { camZ: 1.6, camY: 0,  ringX: 0,    ringY: 0,   ringScale: 1.3, tilt: .05, warp: 1, partOpacity: 1,   glow: 1.6 },
      calm:   { camZ: 13,  camY: 0,  ringX: 3,    ringY: -1.1, ringScale: .8, tilt: .9,  warp: 0, partOpacity: .55, glow: .5 },
      finA:   { camZ: 12,  camY: 0,  ringX: 3.3,  ringY: -.5, ringScale: .9,  tilt: .6,  warp: 0, partOpacity: .6,  glow: .6 },
      finB:   { camZ: 12,  camY: 0,  ringX: -3.3, ringY: .6,  ringScale: .9,  tilt: .6,  warp: 0, partOpacity: .6,  glow: .6 },
      calc:   { camZ: 8.6, camY: 0,  ringX: -1.85, ringY: -.05, ringScale: 1, tilt: .04, warp: 0, partOpacity: .75, glow: 1.3 },
      stack:  { camZ: 10,  camY: 0,  ringX: 0,    ringY: 0,   ringScale: 1.5, tilt: 1.2, warp: 0, partOpacity: .35, glow: .3 },
      lend:   { camZ: 12,  camY: 0,  ringX: 3.5,  ringY: -1.5, ringScale: .62, tilt: .5,  warp: 0, partOpacity: .6,  glow: .6 },
      end:    { camZ: 7.8, camY: 0,  ringX: 1.95, ringY: .1,  ringScale: 1.05, tilt: .35, warp: 0, partOpacity: 1,  glow: 1.5 }
    };
    const M = { // mobile overrides: keep ring centred, above text
      hero:  { ringX: 0, ringY: 1.75, ringScale: .72, camZ: 10 },
      calm:  { ringX: .8, ringY: 1.6, ringScale: .6 },
      finA:  { ringX: 0, ringY: 1.8, ringScale: .6 }, finB: { ringX: 0, ringY: 1.8, ringScale: .6 },
      calc:  { ringX: 0, ringY: .9, ringScale: .7, camZ: 10 },
      lend:  { ringX: 0, ringY: 1.6, ringScale: .6 },
      end:   { ringX: 0, ringY: 1.3, ringScale: .75, camZ: 10 }
    };
    const pick = (k) => (isMobile() ? { ...D[k], ...(M[k] || {}) } : D[k]);
    const marks = [
      ["#hero", "top top", "hero"], [".manifesto", "top 95%", "hero"], [".manifesto", "top 15%", "portal"], [".manifesto", "bottom 60%", "calm"],
      ["#finance", "top top", "finA"], ["#finance", "bottom bottom", "finB"], ["#instrument", "top 55%", "calc"], ["#instrument", "bottom 75%", "calc"],
      ["#process", "top 35%", "stack"], ["#process", "bottom 80%", "stack"], ["#lenders", "top 45%", "lend"], ["#reviews", "bottom 70%", "lend"], ["#contact", "top 55%", "end"]
    ].map(([trigger, start, key]) => ({ st: ScrollTrigger.create({ trigger, start, refreshPriority: -2 }), key }));
    const keys = Object.keys(D.hero);
    function choreograph() {
      if (!introDone) return;
      const y = lenis ? lenis.animatedScroll : scrollY;
      let i = 0;
      while (i < marks.length - 1 && y > marks[i + 1].st.start) i++;
      const a = marks[i], b = marks[Math.min(i + 1, marks.length - 1)];
      const span = b.st.start - a.st.start;
      const t = span > 0 ? smooth(Math.min(1, Math.max(0, (y - a.st.start) / span))) : 1;
      const A = pick(a.key), B = pick(b.key);
      keys.forEach((k) => (S[k] = lerp(A[k], B[k], t)));
    }
    let spinTarget = 0;
    gsap.ticker.add(() => { choreograph(); spinTarget *= .92; S.spinBoost += (spinTarget - S.spinBoost) * .1; });
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => { spinTarget = Math.min(4, Math.abs(s.getVelocity()) / 900); } });

    ScrollTrigger.refresh();
  });
})();
