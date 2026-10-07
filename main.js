(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  if (reduced || !hasGsap) root.classList.add("reduced");
  // Always start at the top so the hero never opens half-scrolled
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);

  /* ---------- Nav: hide on scroll down, burger sheet ---------- */
  const nav = $("#nav");
  const burger = $(".burger");
  const sheet = $("#sheet");
  let lastY = 0;
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    sheet.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$("a", sheet).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const onScrollNav = (y) => {
    if (document.body.classList.contains("menu-open")) return;
    nav.classList.toggle("hide", y > lastY && y > 300);
    lastY = y;
  };

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && hasGsap && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.stop(); // locked until the intro finishes
    lenis.on("scroll", (e) => { ScrollTrigger.update(); onScrollNav(e.scroll); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = id === "#top" ? 0 : $(id);
      if (el === null) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === "#top" ? 0 : -20 });
    }));
  } else {
    addEventListener("scroll", () => onScrollNav(scrollY), { passive: true });
  }

  /* ---------- Booking days (next open days, Tue-Sat) ---------- */
  const daysEl = $("#days");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date();
  let made = 0;
  while (made < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 1) continue;
    const b = document.createElement("button");
    b.type = "button"; b.className = "day";
    b.setAttribute("aria-pressed", made === 0);
    b.innerHTML = `<small>${names[d.getDay()]}</small><b>${d.getDate()}</b>`;
    b.setAttribute("aria-label", d.toLocaleDateString("en-TT", { weekday: "long", month: "long", day: "numeric" }));
    daysEl.appendChild(b);
    made++;
  }
  // single-select groups
  [...$$(".chips"), daysEl].forEach((g) => g.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $$("button", g).forEach((x) => x.setAttribute("aria-pressed", x === btn));
  }));

  const form = $("#book");
  const note = $("#bookNote");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.name;
    if (!name.value.trim()) {
      name.setAttribute("aria-invalid", "true");
      note.className = "book-note";
      note.textContent = "Please add your name so we know who's coming.";
      name.focus();
      return;
    }
    name.removeAttribute("aria-invalid");
    const t = $('[data-group="treatment"] [aria-pressed="true"]').textContent;
    const day = $('#days [aria-pressed="true"]').getAttribute("aria-label");
    const time = $('[data-group="time"] [aria-pressed="true"]').textContent;
    note.className = "book-note ok";
    note.textContent = `Thank you, ${name.value.trim().split(" ")[0]}. ${t} requested for ${day} at ${time}. (Demo: on the live site this goes straight to the studio's booking calendar.)`;
  });

  /* ---------- Price tabs ---------- */
  const tabs = $$('[role="tab"]');
  const ink = $(".tab-ink");
  const placeInk = (t) => { ink.style.width = t.offsetWidth + "px"; ink.style.transform = `translateX(${t.offsetLeft}px)`; };
  const selectTab = (t) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      $("#" + x.getAttribute("aria-controls")).hidden = !on;
    });
    placeInk(t);
    if (!reduced && hasGsap) gsap.fromTo($$("li", $("#" + t.getAttribute("aria-controls"))), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .05, ease: "expo.out" });
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      const n = tabs[(i + dir + tabs.length) % tabs.length];
      n.focus(); selectTab(n);
    });
  });
  requestAnimationFrame(() => placeInk(tabs[0]));
  addEventListener("resize", () => placeInk($('[role="tab"][aria-selected="true"]')));

  /* ---------- Compare slider ---------- */
  const cmp = $("#compare");
  const range = $("input", cmp);
  const setPos = (v) => cmp.style.setProperty("--pos", v + "%");
  range.addEventListener("input", () => setPos(range.value));

  /* ---------- Gift card tiers ---------- */
  const gPay = $("#g-pay"), gGet = $("#g-get"), gVal = $("#gcValue");
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
  let current = { v: 550 };
  $$(".tiers button").forEach((b) => b.addEventListener("click", () => {
    $$(".tiers button").forEach((x) => x.setAttribute("aria-checked", x === b));
    const pay = +b.dataset.pay, get = +b.dataset.get;
    gPay.textContent = fmt(pay); gGet.textContent = fmt(get);
    if (reduced || !hasGsap) { gVal.textContent = fmt(get); return; }
    gsap.to(current, { v: get, duration: 1, ease: "expo.out", onUpdate: () => (gVal.textContent = fmt(current.v)) });
    gsap.fromTo("#giftCard", { rotateY: -18 }, { rotateY: 0, duration: 1.2, ease: "elastic.out(1,.6)" });
  }));

  if (reduced || !hasGsap) {
    $$(".fill-text").forEach((el) => el.classList.add("filled"));
    return;
  }

  /* ================= MOTION ================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add("motion");

  // Split philosophy statement into words
  $$(".fill-text").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  });

  /* Loader → hero intro */
  const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" }, onComplete: () => lenis && lenis.start() });
  intro
    .to(".loader-word", { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut" })
    .to(".loader-rule", { scaleX: 1, duration: .9 }, "-=.5")
    .to(".loader-sub", { opacity: 1, duration: .6 }, "-=.6")
    .to(".loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "+=.25")
    .from(".hero-copy .line > span", { yPercent: 110, duration: 1.3, stagger: .09 }, "-=.55")
    .from(".hero-copy .eyebrow, .hero-copy .lede, .hero-copy .cta-row", { y: 30, opacity: 0, duration: 1.1, stagger: .08 }, "-=1")
    .from(".hero-media", { opacity: 0, duration: 1.6 }, "-=1.6")
    .from(".nav", { autoAlpha: 0, duration: 1.2 }, "-=1.6")
    .set(".loader", { display: "none" });

  // Wait for the hero photo to be fully decoded so it never pops in mid-animation
  const heroImg = $(".hero-media img");
  Promise.race([
    (heroImg.complete ? Promise.resolve() : new Promise((r) => heroImg.addEventListener("load", r, { once: true })))
      .then(() => heroImg.decode && heroImg.decode()).catch(() => {}),
    new Promise((r) => setTimeout(r, 3500))
  ]).then(() => intro.play());

  const mm = gsap.matchMedia();

  /* HERO: arch opens to full bleed */
  mm.add({ desk: "(min-width: 861px)", mob: "(max-width: 860px)" }, (ctx) => {
    const { desk } = ctx.conditions;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    tl.to(".hero-media", {
      clipPath: desk ? "inset(0vh 0vw 0vh 0vw round 0vw 0vw 0px 0px)" : "inset(0vh 0px 0vh 0px round 0vw 0vw 0px 0px)",
      ease: "none", duration: 1
    })
      .fromTo(".hero-media img", desk ? { x: "40vw", y: 0, scale: .9 } : { x: "23vw", y: "26vh", scale: 1.6 }, { x: 0, y: 0, scale: 1, ease: "none", duration: 1 }, 0)
      .to(".hero-copy", { y: desk ? -120 : -80, opacity: 0, ease: "power1.in", duration: .55 }, 0)
      .to(".scroll-cue", { opacity: 0, duration: .2 }, 0)
      .to(".hero-shade", { opacity: 1, duration: .5 }, .45)
      .fromTo(".hero-after", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .45 }, .62);
  });

  /* Marquee drifts with scroll velocity */
  const track = $(".marquee-track");
  let halfW = track.scrollWidth / 2;
  addEventListener("resize", () => (halfW = track.scrollWidth / 2));
  const half = () => halfW;
  const setX = gsap.quickSetter(track, "x", "px");
  let mx = 0, boost = 0;
  gsap.ticker.add(() => {
    mx -= .6 + boost;
    boost *= .92;
    if (-mx >= half()) mx += half();
    setX(mx);
  });
  ScrollTrigger.create({ onUpdate: (s) => { boost = Math.min(Math.abs(s.getVelocity()) / 220, 14); } });

  /* Philosophy: words fill in */
  gsap.to(".fill-text .w", {
    color: "#3A2D25", stagger: .05, ease: "none",
    scrollTrigger: { trigger: ".fill-text", start: "top 78%", end: "bottom 45%", scrub: true }
  });

  /* Generic reveal: heavy fade-up with blur */
  $$(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, filter: "blur(0px)", duration: 1.3, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* Parallax images inside bezels */
  $$("[data-parallax]").forEach((img) => {
    gsap.fromTo(img, { yPercent: -9 }, {
      yPercent: 0, ease: "none",
      scrollTrigger: { trigger: img.closest(".bezel") || img, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* TREATMENTS: horizontal pinned track */
  mm.add("(min-width: 861px)", () => {
    const tx = $(".tx-track");
    const dist = () => tx.scrollWidth - innerWidth;
    const horiz = gsap.to(tx, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: ".tx", pin: ".tx-pin", start: "top top", end: () => "+=" + dist(),
        scrub: 1, invalidateOnRefresh: true
      }
    });
    gsap.to(".tx-progress span", {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: ".tx", start: "top top", end: () => "+=" + dist(), scrub: true }
    });
    $$(".tx-img img").forEach((img) => {
      gsap.fromTo(img, { xPercent: 6 }, {
        xPercent: -6, ease: "none",
        scrollTrigger: { trigger: img, containerAnimation: horiz, start: "left right", end: "right left", scrub: true }
      });
    });
    $$(".tx-card").forEach((card) => {
      gsap.from(card.querySelector(".tx-body"), {
        y: 40, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: card, containerAnimation: horiz, start: "left 85%" }
      });
    });
  });
  mm.add("(max-width: 860px)", () => {
    $$(".tx-card").forEach((card) => gsap.from(card, {
      y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 85%" }
    }));
  });

  /* RESULTS: stacked cards settle back as the next arrives */
  const cards = $$(".stack-card");
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.fromTo(card, { scale: 1, filter: "brightness(1)" }, {
      scale: .92 + i * .015, filter: "brightness(.9)", ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top 20%", scrub: true }
    });
  });
  cards.forEach((card) => {
    const img = card.querySelector(".stack-img img");
    gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top 20%", scrub: true } });
  });

  /* Compare: auto-sweep once when it enters, so people notice it */
  ScrollTrigger.create({
    trigger: "#compare", start: "top 70%", once: true,
    onEnter: () => {
      const o = { v: 50 };
      gsap.timeline()
        .to(o, { v: 82, duration: 1, ease: "power3.inOut", onUpdate: () => { setPos(o.v); range.value = o.v; } })
        .to(o, { v: 22, duration: 1.3, ease: "power3.inOut", onUpdate: () => { setPos(o.v); range.value = o.v; } })
        .to(o, { v: 50, duration: 1, ease: "power3.inOut", onUpdate: () => { setPos(o.v); range.value = o.v; } });
    }
  });

  /* MENU list stagger on first view */
  gsap.from("#p-facial li", {
    y: 24, opacity: 0, duration: 1, stagger: .06, ease: "expo.out",
    scrollTrigger: { trigger: ".price-list", start: "top 85%" }
  });

  /* HOLIDAY: ribbon draws itself, heading lines rise, packages cascade */
  const path = $(".ribbon-path");
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(path, {
    strokeDashoffset: 0, ease: "none",
    scrollTrigger: { trigger: ".holiday", start: "top 80%", end: "bottom 60%", scrub: 1.2 }
  });
  gsap.from(".holiday-head .line > span", {
    yPercent: 110, duration: 1.3, stagger: .1, ease: "expo.out",
    scrollTrigger: { trigger: ".holiday-head", start: "top 80%" }
  });
  gsap.from(".holiday-head p, .holiday-head .eyebrow", {
    y: 30, opacity: 0, duration: 1.1, stagger: .08, ease: "expo.out",
    scrollTrigger: { trigger: ".holiday-head", start: "top 80%" }
  });
  gsap.from(".pkg", {
    y: 120, opacity: 0, rotate: (i) => [-3, 0, 3][i], duration: 1.4, stagger: .12, ease: "expo.out",
    scrollTrigger: { trigger: ".packages", start: "top 85%" }
  });

  /* Gift card: rotates into place on scroll, tilts with the cursor */
  const card = $("#giftCard");
  gsap.fromTo(card, { rotateY: -38, rotateX: 18, y: 80 }, {
    rotateY: 8, rotateX: -4, y: 0, ease: "none",
    scrollTrigger: { trigger: ".gift", start: "top bottom", end: "center 55%", scrub: 1 }
  });
  gsap.fromTo(card, { "--shine": "-60%" }, {
    "--shine": "60%", ease: "none",
    scrollTrigger: { trigger: ".gift", start: "top 80%", end: "bottom 40%", scrub: true }
  });
  const stage = $(".gift-stage");
  if (matchMedia("(hover: hover)").matches) {
    const rx = gsap.quickTo(card, "rotateX", { duration: .8, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotateY", { duration: .8, ease: "power3.out" });
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - .5) * 26);
      rx(-((e.clientY - r.top) / r.height - .5) * 18);
    });
    stage.addEventListener("pointerleave", () => { rx(-4); ry(8); });
  }
  gsap.fromTo(".gift-box", { y: 80 }, { y: -40, ease: "none", scrollTrigger: { trigger: ".gift", start: "top bottom", end: "bottom top", scrub: true } });

  /* Footer wordmark letters rise */
  gsap.from(".foot-big span", {
    yPercent: 100, opacity: 0, duration: 1.4, stagger: .06, ease: "expo.out",
    scrollTrigger: { trigger: ".foot", start: "top 85%" }
  });

  /* Magnetic buttons */
  if (matchMedia("(hover: hover)").matches) {
    $$(".magnetic").forEach((btn) => {
      const x = gsap.quickTo(btn, "x", { duration: .6, ease: "power3.out" });
      const y = gsap.quickTo(btn, "y", { duration: .6, ease: "power3.out" });
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .22);
        y((e.clientY - r.top - r.height / 2) * .3);
      });
      btn.addEventListener("pointerleave", () => { x(0); y(0); });
    });
  }

  addEventListener("load", () => { halfW = track.scrollWidth / 2; ScrollTrigger.refresh(); });
})();
