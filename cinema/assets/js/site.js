/* Complete Funding — Concept A "Cinema" interactions (GSAP + ScrollTrigger + SplitText + Lenis) */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-AU");

  $("#year").textContent = new Date().getFullYear();
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.8 });
    else (typeof target === "number" ? window.scrollTo({ top: target }) : target.scrollIntoView());
  };

  /* ---------- Mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const menu = $("#mobile-menu");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      menu.hidden = false;
      lenis && lenis.stop();
      gsap.fromTo(menu, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: .8, ease: "expo.inOut" });
      gsap.fromTo($$("nav a", menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .06, duration: .9, delay: .3, ease: "expo.out" });
    } else {
      gsap.to(menu, { clipPath: "inset(0 0 100% 0)", duration: .6, ease: "expo.inOut", onComplete: () => (menu.hidden = true) });
      lenis && lenis.start();
    }
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));

  /* ---------- Anchor links ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      if (a.dataset.finance) $("#enquiry-type").value = a.dataset.finance;
      if (toggle.getAttribute("aria-expanded") === "true") setMenu(false);
      scrollToTarget(t);
    });
  });

  /* ---------- Header state ---------- */
  const header = $(".site-header");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      header.classList.toggle("is-scrolled", y > 40);
      header.classList.toggle("is-hidden", y > window.innerHeight * 1.2 && self.direction === 1 && toggle.getAttribute("aria-expanded") !== "true");
    }
  });

  /* ---------- HUD: scene label + timecode ---------- */
  const hudScene = $("#hud-scene");
  const hudTc = $("#hud-tc");
  const setScene = (label) => { if (hudScene.textContent !== label) hudScene.textContent = label; };
  $$("[data-scene]").forEach((sec) => {
    ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", refreshPriority: -1, onToggle: (s) => s.isActive && setScene(sec.dataset.scene) });
  });
  const pad = (n) => String(n).padStart(2, "0");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const frames = Math.floor(self.progress * 168 * 24);
      const ff = frames % 24, s = Math.floor(frames / 24);
      hudTc.textContent = `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(ff)}`;
    }
  });

  /* ---------- Lazy videos ---------- */
  const lazyVideos = $$("video[data-src]");
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src) { v.src = v.dataset.src; v.load(); }
        if (!reduced) v.play().catch(() => {});
      } else if (v.src) v.pause();
    });
  }, { rootMargin: "300px 0px" });
  lazyVideos.forEach((v) => vio.observe(v));
  const heroVideo = $(".hero__video");
  if (reduced) { heroVideo.removeAttribute("autoplay"); heroVideo.pause(); }

  /* ---------- Count-up ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    if (reduced) { el.textContent = end; return; }
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v)) }) });
  });

  /* ---------- Calculator ---------- */
  const amount = $("#calc-amount"), rate = $("#calc-rate"), term = $("#calc-term");
  const ringInt = $("#ring-int");
  const C = 2 * Math.PI * 52;
  const shown = { pay: 0, int: 0, total: 0, share: 0 };
  const labels = { 52: "Weekly", 26: "Fortnightly", 12: "Monthly" };
  const setFill = (r) => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
  function calc(instant) {
    const P = +amount.value, yr = +term.value, f = +$('input[name="freq"]:checked').value;
    const r = +rate.value / 100 / f, n = yr * f;
    const pay = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
    const total = pay * n, int = total - P;
    $("#out-amount").textContent = fmt(P);
    $("#out-rate").textContent = (+rate.value).toFixed(1) + "%";
    $("#out-term").textContent = yr + (yr === 1 ? " year" : " years");
    $("#res-label").textContent = labels[f];
    [amount, rate, term].forEach(setFill);
    const target = { pay, int, total, share: int / total };
    const render = () => {
      $("#res-pay").textContent = fmt(shown.pay);
      $("#res-int").textContent = fmt(shown.int);
      $("#res-total").textContent = fmt(shown.total);
      ringInt.style.strokeDashoffset = C * (1 - shown.share);
    };
    if (instant || reduced) { Object.assign(shown, target); render(); return; }
    gsap.to(shown, { ...target, duration: .8, ease: "power3.out", overwrite: true, onUpdate: render });
  }
  ringInt.style.strokeDasharray = C;
  $("#calc").addEventListener("input", () => calc());
  calc(true);

  /* ---------- Quotes carousel ---------- */
  const quotes = $$(".quote");
  const dots = $$(".quotes__nav button");
  const nav = $(".quotes__nav");
  let qi = 0, qTimer = null;
  function showQuote(i) {
    if (i === qi) return;
    const out = quotes[qi], inn = quotes[i];
    dots[qi].setAttribute("aria-selected", "false");
    dots[i].setAttribute("aria-selected", "true");
    if (reduced) { out.classList.remove("is-active"); inn.classList.add("is-active"); }
    else {
      gsap.to(out, { autoAlpha: 0, y: -24, filter: "blur(6px)", duration: .8, ease: "power2.in", onComplete: () => out.classList.remove("is-active") });
      inn.classList.add("is-active");
      gsap.fromTo(inn, { autoAlpha: 0, y: 30, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2, delay: .55, ease: "expo.out" });
    }
    qi = i;
    schedule();
  }
  function schedule() { qTimer && qTimer.kill(); qTimer = gsap.delayedCall(7, () => showQuote((qi + 1) % quotes.length)); }
  dots.forEach((d, i) => d.addEventListener("click", () => showQuote(i)));
  const qWrap = $("#quotes");
  [qWrap, nav].forEach((el) => {
    el.addEventListener("mouseenter", () => { qTimer && qTimer.pause(); nav.classList.add("is-paused"); });
    el.addEventListener("mouseleave", () => { qTimer && qTimer.resume(); nav.classList.remove("is-paused"); });
  });
  if (!reduced) schedule();

  /* ---------- Enquiry form (static hosting: compose email) ---------- */
  $("#enquiry").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    let ok = true;
    $$("input[required]", f).forEach((i) => { const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle("is-invalid", bad); if (bad) ok = false; });
    const status = $("#enquiry-status");
    if (!ok) { status.textContent = "Please complete your name, phone and a valid email."; return; }
    const d = Object.fromEntries(new FormData(f));
    const body = `Name: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nFinance type: ${d.type}\nAmount: ${d.amount || "-"}`;
    window.location.href = `mailto:info@completefunding.com.au?subject=${encodeURIComponent("Finance enquiry — " + d.type)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Thank you. Your email app will open to send the enquiry — or call 1300 008 618.";
  });

  /* ---------- Reduced motion: stop here ---------- */
  if (reduced) { document.body.classList.remove("is-loading"); return; }

  /* ---------- Motion (after fonts) ---------- */
  document.fonts.ready.then(() => {
    const heroSplit = SplitText.create(".hero__title", { type: "lines", mask: "lines", linesClass: "split-line" });
    const finaleSplit = SplitText.create(".finale__title", { type: "lines", mask: "lines", linesClass: "split-line" });
    const proSplit = SplitText.create("#prologue-text", { type: "words", wordsClass: "w" });

    /* Title sequence */
    const intro = $("#intro");
    gsap.set([".site-header", ".hud"], { autoAlpha: 0 });
    gsap.set(heroSplit.lines, { yPercent: 110 });
    gsap.set([".hero .eyebrow", ".hero__lede", ".hero__actions", ".hero__scroll"], { autoAlpha: 0, y: 24 });
    gsap.set(heroVideo, { scale: 1.22 });

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(".intro__presents", { opacity: 1, y: 0, duration: 1.2 }, .3)
      .to(".intro__rule", { width: 140, duration: 1.2, ease: "expo.inOut" }, .5)
      .fromTo(".intro__logo", { opacity: 0, scale: .94, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6 }, 1.0)
      .to([".intro__presents", ".intro__rule", ".intro__logo", ".intro__skip"], { opacity: 0, y: -10, duration: .7, ease: "power2.in" }, 2.7)
      .to(intro, { clipPath: "inset(50% 0% 50% 0%)", duration: 1.4, ease: "expo.inOut" }, 3.2)
      .to(heroVideo, { scale: 1, duration: 3.2, ease: "power2.out" }, 3.2)
      .to(heroSplit.lines, { yPercent: 0, duration: 1.6, stagger: .12 }, 3.8)
      .to([".hero .eyebrow", ".hero__lede", ".hero__actions", ".hero__scroll"], { autoAlpha: 1, y: 0, duration: 1.4, stagger: .1 }, 4.2)
      .to([".site-header", ".hud"], { autoAlpha: 1, duration: 1.2 }, 4.4)
      .add(() => { intro.style.display = "none"; document.body.classList.remove("is-loading"); lenis && lenis.start(); ScrollTrigger.refresh(); }, 4.6);
    $(".intro__skip").addEventListener("click", () => tl.progress(1));

    /* Hero scroll-out: push in, cut to black */
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } })
      .to(".hero__media", { scale: 1.16, ease: "none" }, 0)
      .to(".hero__content", { y: -120, opacity: 0, ease: "none" }, 0)
      .to(".letterbox", { height: "50vh", ease: "power1.in" }, 0.15);

    /* Prologue: words light up */
    gsap.to(proSplit.words, { opacity: 1, stagger: .1, ease: "none", scrollTrigger: { trigger: "#prologue-text", start: "top 78%", end: "bottom 42%", scrub: true } });

    /* Chapters */
    const mm = gsap.matchMedia();
    const scenes = $$(".scene");
    const railBtns = $$(".chapters__rail button");
    const counter = $("#chapter-now");
    const setActive = (i) => {
      railBtns.forEach((b, j) => b.classList.toggle("is-active", j === i));
      counter.textContent = pad(i + 1);
      setScene(scenes[i].dataset.title);
    };
    mm.add("(min-width: 901px)", () => {
      const n = scenes.length;
      const HOLD = .6;
      scenes.forEach((s, i) => {
        if (i) gsap.set(s, { clipPath: "inset(0% 0% 0% 100%)" });
        gsap.set($(".scene__media", s), { scale: i ? 1.28 : 1.08 });
        if (i) gsap.set($$(".scene__body > *", s), { y: 50, opacity: 0 });
      });
      const marks = [0];
      let ctl = null;
      const syncActive = (p) => {
        if (!ctl) return;
        const t = p * ctl.duration();
        let a = 0; marks.forEach((m, i) => { if (t >= m - .5) a = i; });
        setActive(a);
      };
      ctl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".chapters", pin: ".chapters__pin", start: "top top",
          end: () => "+=" + (n - 1) * window.innerHeight * 1.5, scrub: 1, anticipatePin: 1,
          onUpdate: (self) => syncActive(self.progress),
          onToggle: (self) => syncActive(self.progress)
        }
      });
      ctl.to($(".scene__media", scenes[0]), { scale: 1, duration: HOLD }, 0);
      let t = HOLD;
      for (let i = 1; i < n; i++) {
        const prev = scenes[i - 1], cur = scenes[i];
        ctl.to($$(".scene__body > *", prev), { y: -40, opacity: 0, stagger: .02, duration: .35 }, t + .05)
           .to($(".scene__media", prev), { xPercent: -12, filter: "brightness(.35)", duration: 1 }, t)
           .to(cur, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power2.inOut" }, t)
           .to($(".scene__media", cur), { scale: 1, duration: 1 + HOLD }, t)
           .to($$(".scene__body > *", cur), { y: 0, opacity: 1, stagger: .05, duration: .45, ease: "power2.out" }, t + .55);
        t += 1;
        marks.push(t);
        t += HOLD;
      }
      railBtns.forEach((b, i) => b.addEventListener("click", () => {
        const st = ctl.scrollTrigger;
        scrollToTarget(st.start + (st.end - st.start) * ((marks[i] + (i ? HOLD / 2 : 0)) / ctl.duration()));
      }));
      return () => { gsap.set(scenes, { clearProps: "clipPath" }); };
    });
    mm.add("(max-width: 900px)", () => {
      scenes.forEach((s) => {
        gsap.from($$(".scene__body > *", s), { y: 40, opacity: 0, stagger: .07, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 60%" } });
        gsap.fromTo($(".scene__media", s), { yPercent: -8, scale: 1.15 }, { yPercent: 8, scale: 1.15, ease: "none", scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });

    /* Interlude: widescreen frame opens to full bleed */
    gsap.timeline({ scrollTrigger: { trigger: ".interlude", start: "top top", end: "+=110%", pin: true, scrub: 1 } })
      .fromTo(".interlude__frame", { clipPath: "inset(22% 16% 22% 16%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", duration: 1 }, 0)
      .fromTo(".interlude__frame video", { scale: 1.25 }, { scale: 1, ease: "none", duration: 1 }, 0)
      .fromTo(".interlude__line", { opacity: 0, y: 40, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .5 }, .45);

    /* Process line draw */
    gsap.to(".process__line span", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".process", start: "top 60%", end: "bottom 70%", scrub: true } });
    gsap.from(".process__steps li", { y: 60, opacity: 0, stagger: .15, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: ".process__steps", start: "top 80%" } });

    /* Credits roll (seamless loop) */
    const track = $("#credits-track");
    [...track.children].forEach((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); if (k.alt !== undefined) k.alt = ""; track.appendChild(k); });
    track.style.padding = "0";
    const gap = parseFloat(getComputedStyle(track).rowGap) || 70;
    const roll = gsap.to(track, { y: () => -(track.scrollHeight + gap) / 2, duration: 46, ease: "none", repeat: -1 });
    const rollBox = $(".credits__roll");
    rollBox.addEventListener("mouseenter", () => gsap.to(roll, { timeScale: .15, duration: .8 }));
    rollBox.addEventListener("mouseleave", () => gsap.to(roll, { timeScale: 1, duration: .8 }));
    ScrollTrigger.create({ trigger: ".credits", start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? roll.play() : roll.pause()) });

    /* Finale title */
    gsap.from(finaleSplit.lines, { yPercent: 110, duration: 1.6, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".finale", start: "top 60%" } });
    gsap.fromTo(".finale__media video", { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".finale", start: "top bottom", end: "bottom bottom", scrub: true } });

    /* Generic reveals */
    const reveal = $$(".kicker, .section-title, .numbers__intro .muted, .calc, .credits__intro .muted, .laurel, .finale__lede, .finale__phone, .finale__mail, .enquiry, .stats > div, .footer__grid > div, .footer__fin");
    gsap.set(reveal, { y: 50, opacity: 0 });
    ScrollTrigger.batch(reveal, { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1.4, stagger: .1, ease: "expo.out" }) });

    /* Keep splits correct on significant resize */
    let lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (Math.abs(window.innerWidth - lastW) < 80) return;
      lastW = window.innerWidth;
      heroSplit.revert(); finaleSplit.revert();
    });

    ScrollTrigger.refresh();
  });
})();
