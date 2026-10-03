/* Complete Funding — Concept C "Atelier" interactions (GSAP + ScrollTrigger + SplitText + Lenis) */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const money = (n, cents = true) => "$" + n.toLocaleString("en-AU", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

  $("#year").textContent = new Date().getFullYear();
  $("#letter-date").textContent = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ duration: 1.35, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const go = (t) => (lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.8 }) : t.scrollIntoView());

  /* ---------- Menu sheet ---------- */
  const menuBtn = $(".top__menu"), sheet = $("#sheet");
  const setSheet = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.querySelector("span").textContent = open ? "Close" : "Menu";
    if (open) {
      sheet.hidden = false; lenis && lenis.stop();
      gsap.fromTo(sheet, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: .9, ease: "expo.inOut" });
      gsap.fromTo($$("nav a", sheet), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .06, delay: .35, duration: 1, ease: "expo.out" });
    } else {
      gsap.to(sheet, { clipPath: "inset(0 0 100% 0)", duration: .7, ease: "expo.inOut", onComplete: () => (sheet.hidden = true) });
      lenis && lenis.start();
    }
  };
  menuBtn.addEventListener("click", () => setSheet(menuBtn.getAttribute("aria-expanded") !== "true"));

  /* ---------- Anchors ---------- */
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    if (a.dataset.finance) $("#enquiry-type").value = a.dataset.finance;
    if (menuBtn.getAttribute("aria-expanded") === "true") setSheet(false);
    go(t);
  }));

  /* ---------- Header ---------- */
  const top = $(".top");
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => {
    top.classList.toggle("is-scrolled", s.scroll() > 40);
    top.classList.toggle("is-hidden", s.scroll() > innerHeight && s.direction === 1 && menuBtn.getAttribute("aria-expanded") !== "true");
  } });
  $$(".top__nav a").forEach((l) => ScrollTrigger.create({ trigger: $(l.getAttribute("href")), start: "top 50%", end: "bottom 50%", refreshPriority: -1, onToggle: (s) => l.classList.toggle("is-active", s.isActive) }));

  /* ---------- Hero video (responsive source) ---------- */
  const vid = $(".arch__video");
  vid.src = innerWidth < 760 ? vid.dataset.srcSm : vid.dataset.srcLg;
  if (reduced) { vid.removeAttribute("autoplay"); vid.preload = "none"; } else vid.play().catch(() => {});

  /* ---------- Folio accordion ---------- */
  const leaves = $$(".leaf");
  const openLeaf = (l) => leaves.forEach((x) => x.classList.toggle("is-open", x === l));
  leaves.forEach((l) => {
    if (canHover) l.addEventListener("mouseenter", () => openLeaf(l));
    l.addEventListener("click", () => openLeaf(l));
    l.addEventListener("focus", () => openLeaf(l));
    l.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLeaf(l); } });
  });

  /* ---------- Count-up ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    if (reduced) { el.textContent = end; return; }
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v)) }) });
  });

  /* ---------- Ledger ---------- */
  const amount = $("#calc-amount"), rate = $("#calc-rate"), term = $("#calc-term");
  const W = 600, H = 240, PTS = 61;
  let cur = null;
  const shown = { pay: 0, p: 0, int: 0, total: 0 };
  const per = { 52: "Weekly repayment", 26: "Fortnightly repayment", 12: "Monthly repayment" };
  const fill = (r) => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
  function series(P, r, n, pay) {
    const bal = [], int = [];
    let b = P, paidInt = 0;
    for (let k = 0; k < PTS; k++) {
      const target = Math.round((k / (PTS - 1)) * n);
      const prevK = k ? Math.round(((k - 1) / (PTS - 1)) * n) : 0;
      for (let j = prevK; j < target; j++) { const i = b * r; paidInt += i; b = Math.max(0, b - (pay - i)); }
      bal.push(b); int.push(paidInt);
    }
    return { bal, int };
  }
  const toPath = (arr, max) => arr.map((v, i) => `${i ? "L" : "M"}${((i / (PTS - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 16)).toFixed(1)}`).join("");
  function draw(s) {
    const max = Math.max(s.bal[0], s.int[PTS - 1]) || 1;
    const line = toPath(s.bal, max);
    $("#chart-line").setAttribute("d", line);
    $("#chart-area").setAttribute("d", `${line}L${W},${H}L0,${H}Z`);
    $("#chart-int").setAttribute("d", toPath(s.int, max));
  }
  function calc(instant) {
    const P = +amount.value, yr = +term.value, f = +$('input[name="freq"]:checked').value;
    const r = +rate.value / 100 / f, n = yr * f;
    const pay = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
    const total = pay * n, intTotal = total - P;
    $("#out-amount").textContent = money(P, false);
    $("#out-rate").textContent = (+rate.value).toFixed(2) + "%";
    $("#out-term").textContent = yr + (yr === 1 ? " year" : " years");
    $("#res-label").textContent = per[f];
    $("#axis-end").textContent = "Year " + yr;
    [amount, rate, term].forEach(fill);
    const next = series(P, r, n, pay);
    const target = { pay, p: P, int: intTotal, total };
    const render = () => { $("#res-pay").textContent = money(shown.pay); $("#res-p").textContent = money(shown.p); $("#res-int").textContent = money(shown.int); $("#res-total").textContent = money(shown.total); };
    if (instant || reduced || !cur) { Object.assign(shown, target); render(); cur = next; draw(cur); return; }
    const from = { bal: [...cur.bal], int: [...cur.int] }, mix = { t: 0 };
    gsap.to(mix, { t: 1, duration: .9, ease: "power3.out", overwrite: true, onUpdate: () => {
      cur = { bal: from.bal.map((v, i) => v + (next.bal[i] - v) * mix.t), int: from.int.map((v, i) => v + (next.int[i] - v) * mix.t) };
      draw(cur);
    } });
    gsap.to(shown, { ...target, duration: .9, ease: "power3.out", overwrite: true, onUpdate: render });
  }
  $("#calc").addEventListener("input", () => calc());
  calc(true);

  /* ---------- Voices ---------- */
  const voices = $$(".voice");
  let vi = 0, vTimer = null, vSplits = [];
  function showVoice(i) {
    i = (i + voices.length) % voices.length;
    if (i === vi) return;
    const out = voices[vi], inn = voices[i];
    $("#voice-n").textContent = String(i + 1).padStart(2, "0");
    if (reduced || !vSplits.length) { out.classList.remove("is-active"); inn.classList.add("is-active"); vi = i; return; }
    gsap.to(vSplits[vi].lines, { yPercent: -110, duration: .7, stagger: .05, ease: "power3.in", onComplete: () => out.classList.remove("is-active") });
    gsap.to($("figcaption", out), { opacity: 0, duration: .4 });
    inn.classList.add("is-active");
    gsap.fromTo(vSplits[i].lines, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: .08, delay: .55, ease: "expo.out" });
    gsap.fromTo($("figcaption", inn), { opacity: 0, y: 10 }, { opacity: 1, y: 0, delay: 1, duration: .8 });
    vi = i;
    queue();
  }
  function queue() { if (reduced) return; vTimer && vTimer.kill(); vTimer = gsap.delayedCall(8, () => showVoice(vi + 1)); }
  $("#v-prev").addEventListener("click", () => showVoice(vi - 1));
  $("#v-next").addEventListener("click", () => showVoice(vi + 1));

  /* ---------- Letter (static hosting: compose email) ---------- */
  $("#enquiry").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target; let ok = true;
    $$("input[required]", f).forEach((i) => { const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle("is-invalid", bad); if (bad) ok = false; });
    const st = $("#enquiry-status");
    if (!ok) { st.textContent = "Kindly complete your name, telephone and email."; return; }
    const d = Object.fromEntries(new FormData(f));
    const body = `Dear Complete Funding,\n\nMy name is ${d.name} and I would like to discuss ${d.type}${d.amount ? " of approximately " + d.amount : ""}.\nYou may reach me on ${d.phone} or at ${d.email}.\n\nWith thanks.`;
    window.location.href = `mailto:info@completefunding.com.au?subject=${encodeURIComponent("Private consultation — " + d.type)}&body=${encodeURIComponent(body)}`;
    st.textContent = "Thank you — your email app will open with the letter ready to send.";
  });

  if (reduced) { document.body.classList.remove("is-loading"); $("#curtain").remove(); return; }

  /* ---------- Motion ---------- */
  document.fonts.ready.then(() => {
    const heroSplit = SplitText.create("#hero-title", { type: "lines", mask: "lines" });
    const titleSplits = $$(".title").map((t) => SplitText.create(t, { type: "lines", mask: "lines" }));
    const quoteSplit = SplitText.create("#phil-quote", { type: "words", wordsClass: "w" });
    vSplits = voices.map((v) => SplitText.create($("blockquote", v), { type: "lines", mask: "lines" }));
    voices.forEach((v, i) => { if (i) gsap.set(vSplits[i].lines, { yPercent: 110 }); });

    /* Curtain + hero */
    gsap.set(heroSplit.lines, { yPercent: 110 });
    gsap.set([".eyebrow", ".hero__lede", ".hero__actions"].map((s) => $(".hero " + s)), { opacity: 0, y: 20 });
    gsap.set(".hero__meta", { clipPath: "inset(0 100% 0 0)" });
    gsap.set(".arch", { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(".arch__video", { scale: 1.45 });
    gsap.set(".badge", { scale: 0, rotate: -90 });
    gsap.set([".top", ".hero__arch figcaption"], { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(".curtain__mark img", { opacity: 1, duration: 1.2 }, .2)
      .to(".curtain__mark span", { opacity: 1, duration: 1 }, .6)
      .to(".curtain__mark", { opacity: 0, y: -14, duration: .6, ease: "power2.in" }, 1.8)
      .to(".curtain__panel--l", { xPercent: -101, duration: 1.5, ease: "expo.inOut" }, 2.1)
      .to(".curtain__panel--r", { xPercent: 101, duration: 1.5, ease: "expo.inOut" }, 2.1)
      .to(".hero__meta", { clipPath: "inset(0 0% 0 0)", duration: 1.6, ease: "expo.inOut" }, 2.4)
      .to(heroSplit.lines, { yPercent: 0, duration: 1.5, stagger: .1 }, 2.8)
      .to(".arch", { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "expo.inOut" }, 2.6)
      .to(".arch__video", { scale: 1.15, duration: 2.6, ease: "power3.out" }, 2.6)
      .to([".hero .eyebrow", ".hero__lede", ".hero__actions"], { opacity: 1, y: 0, duration: 1.2, stagger: .1 }, 3.2)
      .to(".badge", { scale: 1, rotate: 0, duration: 1.6, ease: "back.out(1.4)" }, 3.6)
      .to([".top", ".hero__arch figcaption"], { opacity: 1, duration: 1 }, 3.4)
      .add(() => { $("#curtain").remove(); document.body.classList.remove("is-loading"); lenis && lenis.start(); ScrollTrigger.refresh(); }, 3.7);

    /* Hero scroll */
    gsap.to(".arch__video", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".badge svg", { rotate: 360, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .5 } });

    /* Ribbon follows scroll */
    gsap.fromTo("#ribbon", { xPercent: 0 }, { xPercent: -38, ease: "none", scrollTrigger: { trigger: ".ribbon", start: "top bottom", end: "bottom top", scrub: .6 } });

    /* Section titles */
    titleSplits.forEach((sp, i) => gsap.from(sp.lines, { yPercent: 110, duration: 1.4, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: $$(".title")[i], start: "top 85%" } }));

    /* Folio leaves rise */
    gsap.from(".leaf", { clipPath: "inset(100% 0% 0% 0%)", duration: 1.6, stagger: .08, ease: "expo.inOut", scrollTrigger: { trigger: ".folio", start: "top 80%" } });

    /* Philosophy */
    gsap.fromTo(".frame img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".frame", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.to(quoteSplit.words, { opacity: 1, stagger: .1, ease: "none", scrollTrigger: { trigger: "#phil-quote", start: "top 80%", end: "bottom 50%", scrub: true } });

    /* Journey path draw */
    const path = $("#journey-line");
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(path, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".journey__path", start: "top 75%", end: "bottom 60%", scrub: true } });
    $$(".steps li").forEach((li, i) => gsap.from(li, { opacity: 0, y: 40, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".journey__path", start: `top+=${i * 120} 70%` } }));

    /* Partners grid */
    gsap.set(".logos li", { opacity: 0, y: 20 });
    ScrollTrigger.batch(".logos li", { start: "top 92%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, stagger: .05, duration: 1, ease: "expo.out" }) });

    /* Voices */
    gsap.fromTo(".voices__img img", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".voices", start: "top bottom", end: "bottom top", scrub: true } });
    ScrollTrigger.create({ trigger: ".voices", start: "top 70%", end: "bottom 30%", onToggle: (s) => { if (s.isActive) queue(); else vTimer && vTimer.pause(); } });

    /* Letter + misc reveals */
    gsap.fromTo(".letter", { y: 90, rotate: -3, opacity: 0 }, { y: 0, rotate: () => (innerWidth > 640 ? -0.6 : 0), opacity: 1, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".letter", start: "top 85%" } });
    const rev = $$(".collection .head__note, .philosophy__img, .figures > div, .ledger__form .field, .tabs, .ledger__sheet, .partners .head__note, .consult__phone, .consult .head__note, .foot__top, .foot__grid > div");
    gsap.set(rev, { opacity: 0, y: 40 });
    ScrollTrigger.batch(rev, { start: "top 90%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, stagger: .08, duration: 1.3, ease: "expo.out" }) });
    gsap.set(".eyebrow:not(.hero .eyebrow)", { opacity: 0, x: -20 });
    ScrollTrigger.batch(".eyebrow:not(.hero .eyebrow)", { start: "top 92%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, x: 0, duration: 1, ease: "expo.out" }) });

    ScrollTrigger.refresh();
  });
})();
