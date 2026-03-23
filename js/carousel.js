/* IMSA IntelliBook - Carrousels (accueil) */
(function () {
  class Carousel {
    constructor(containerOrSelector, options = {}) {
      this.container =
        typeof containerOrSelector === "string"
          ? document.querySelector(containerOrSelector)
          : containerOrSelector;
      if (!this.container) return;

      this.track = this.container.querySelector(".imsa-carousel-track");
      this.dots = this.container.querySelector(".imsa-carousel-dots");
      this.prevBtn = this.container.querySelector(".imsa-carousel-arrow.prev");
      this.nextBtn = this.container.querySelector(".imsa-carousel-arrow.next");

      this.items = Array.from(this.track ? this.track.children : []);

      this.options = {
        autoplay: options.autoplay ?? true,
        interval: options.interval ?? 3500,
        pauseOnHover: options.pauseOnHover ?? true,
        perViewDesktop: options.perViewDesktop ?? 5,
        perViewMobile: options.perViewMobile ?? 2,
        startIndex: options.startIndex ?? 0,
        touchThreshold: options.touchThreshold ?? 40
      };

      this.index = Number(this.options.startIndex) || 0;
      this.maxIndex = 0;
      this.timer = null;

      this._boundNext = () => this.next();
      this._boundPrev = () => this.prev();
      this._boundResize = this._debounce(() => this.updateLayout(), 120);
    }

    _debounce(fn, waitMs) {
      let t = null;
      return (...args) => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), waitMs);
      };
    }

    getPerView() {
      const w = window.innerWidth || 0;
      if (w < 576) return this.options.perViewMobile;
      if (w < 992) return this.options.perViewMobile;
      return this.options.perViewDesktop;
    }

    updateLayout() {
      if (!this.track) return;
      this.items = Array.from(this.track.children);
      if (!this.items.length) return;

      this.perView = this.getPerView();
      this.maxIndex = Math.max(0, Math.ceil(this.items.length / this.perView) - 1);
      this.index = Math.min(this.index, this.maxIndex);

      // Ajuste largeur des cartes pour respecter "perView" à l'écran.
      const trackGap = parseFloat(getComputedStyle(this.track).columnGap || getComputedStyle(this.track).gap || "14") || 14;
      const containerW = this.container.clientWidth || 0;
      const available = Math.max(0, containerW - trackGap * (this.perView - 1));
      const itemW = available / this.perView;
      if (itemW > 0) {
        this.items.forEach((it) => {
          it.style.flex = `0 0 ${itemW}px`;
          it.style.maxWidth = `${itemW}px`;
        });
      }

      // Transform basé sur la position réelle du "premier item" de la page.
      const first = this.items[this.index * this.perView] || this.items[0];
      const left = first.offsetLeft;
      this.track.style.transform = `translateX(${-left}px)`;

      this.renderDots();
    }

    renderDots() {
      if (!this.dots) return;
      const count = this.maxIndex + 1;
      this.dots.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "imsa-carousel-dot";
        btn.setAttribute("aria-label", `Aller à la page ${i + 1}`);
        if (i === this.index) btn.classList.add("is-active");
        btn.addEventListener("click", () => this.goTo(i));
        this.dots.appendChild(btn);
      }
    }

    syncDots() {
      if (!this.dots) return;
      const dots = Array.from(this.dots.querySelectorAll(".imsa-carousel-dot"));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === this.index));
    }

    goTo(i) {
      this.index = Math.max(0, Math.min(i, this.maxIndex));
      if (!this.track) return;
      const first = this.items[this.index * this.perView] || this.items[0];
      const left = first.offsetLeft;
      this.track.style.transform = `translateX(${-left}px)`;
      this.syncDots();
    }

    next() {
      if (this.maxIndex <= 0) return;
      const next = this.index + 1 > this.maxIndex ? 0 : this.index + 1;
      this.goTo(next);
    }

    prev() {
      if (this.maxIndex <= 0) return;
      const prev = this.index - 1 < 0 ? this.maxIndex : this.index - 1;
      this.goTo(prev);
    }

    pause() {
      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
    }

    resume() {
      if (!this.options.autoplay || this.maxIndex <= 0) return;
      if (this.timer) return;
      this.timer = window.setInterval(() => this.next(), this.options.interval);
    }

    init() {
      if (!this.container || !this.track) return;
      if (this.prevBtn) this.prevBtn.addEventListener("click", this._boundPrev);
      if (this.nextBtn) this.nextBtn.addEventListener("click", this._boundNext);

      this.updateLayout();

      window.addEventListener("resize", this._boundResize, { passive: true });

      if (this.options.pauseOnHover) {
        this.container.addEventListener("mouseenter", () => this.pause());
        this.container.addEventListener("mouseleave", () => this.resume());
      }

      // Swipe tactile (gauche/droite).
      let touchStartX = null;
      this.container.addEventListener("touchstart", (e) => {
        if (!e.touches || !e.touches[0]) return;
        touchStartX = e.touches[0].clientX;
      });
      this.container.addEventListener("touchend", (e) => {
        if (touchStartX === null) return;
        const endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null;
        if (endX === null) return;
        const diff = endX - touchStartX;
        touchStartX = null;
        if (Math.abs(diff) < this.options.touchThreshold) return;
        if (diff < 0) this.next();
        else this.prev();
      });

      // Autoplay
      this.resume();
    }
  }

  async function renderHomeCategoryCarousels() {
    const placeholders = document.querySelectorAll("[data-imsa-home-carousel-key]");
    if (!placeholders.length) return;

    const API_BASE = 'http://localhost:5000/api';

    for (const root of placeholders) {
      const key = root.getAttribute("data-imsa-home-carousel-key");
      let books = [];
      
      try {
        const res = await fetch(`${API_BASE}/books?category=${encodeURIComponent(key)}&per_page=10`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          books = json.data;
        } else {
          books = (window.booksData && window.booksData[key]) ? window.booksData[key] : [];
        }
      } catch (err) {
        books = (window.booksData && window.booksData[key]) ? window.booksData[key] : [];
      }

      const top = books.slice(0, 8);
      const track = root.querySelector(".imsa-carousel-track");
      if (!track) continue;
      
      track.innerHTML = top
        .map((b) =>
          window.imsaUtils.renderBookCardHTML(b, {
            variant: "default",
            showNewBadge: true,
            showBorrowButton: true,
            showCategoryChip: true
          })
        )
        .join("");
        
      // Re-init layout for this carousel
      const carouselNode = root.closest('.imsa-carousel');
      if (carouselNode && window.__imsaCarousels) {
         const instance = window.__imsaCarousels.find(c => c.container === carouselNode);
         if (instance) instance.updateLayout();
      }
    }
  }

  function initCarouselsOnPage() {
    const nodes = document.querySelectorAll(".imsa-carousel[data-imsa-carousel='home']");
    window.__imsaCarousels = [];
    nodes.forEach((n) => {
      const perDesktop = Number(n.getAttribute("data-perview-desktop") || "5");
      const perMobile = Number(n.getAttribute("data-perview-mobile") || "2");
      const c = new Carousel(n, {
        autoplay: true,
        interval: 3500,
        perViewDesktop: perDesktop,
        perViewMobile: perMobile
      });
      c.init();
      window.__imsaCarousels.push(c);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.booksData && window.imsaUtils) renderHomeCategoryCarousels();
    initCarouselsOnPage();
  });

  window.Carousel = Carousel;
})();

