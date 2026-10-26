/**
 * FATESA - Controlador de Navegação e Menus com Esboços
 * (Versão Atualizada: Menus com Lições e Submenus de Esboço • Sem Parâmetros Legais)
 */
(function() {
  function initNav() {
    // 1. Dropdown Desktop "Lições & Esboços"
    const dropdown = document.getElementById("navLicoesDropdown");
    if (dropdown) {
      const trigger = dropdown.querySelector(".btn-nav-dropdown");
      if (trigger) {
        trigger.addEventListener("click", function(e) {
          e.stopPropagation();
          dropdown.classList.toggle("open");
          const expanded = dropdown.classList.contains("open");
          trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
        });
      }
      document.addEventListener("click", function(e) {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("open");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      });
    }

    // 2. Drawer Mobile
    const drawer = document.getElementById("fatesaDrawer");
    const btnHamburger = document.getElementById("btnHamburger");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const drawerBackdrop = document.getElementById("drawerBackdrop");

    function openDrawer() {
      if (!drawer) return;
      drawer.style.visibility = "visible";
      drawer.style.opacity = "1";
      drawer.classList.add("open");
      document.body.style.overflow = "hidden";
      if (btnHamburger) btnHamburger.setAttribute("aria-expanded", "true");
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove("open");
      setTimeout(function() {
        drawer.style.visibility = "hidden";
        drawer.style.opacity = "0";
      }, 300);
      document.body.style.overflow = "";
      if (btnHamburger) btnHamburger.setAttribute("aria-expanded", "false");
    }

    if (btnHamburger) btnHamburger.addEventListener("click", openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

    // 3. Accordions no Drawer Mobile
    document.querySelectorAll(".drawer-accordion-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        const item = this.closest(".drawer-accordion-item");
        if (item) {
          const isActive = item.classList.contains("active");
          document.querySelectorAll(".drawer-accordion-item").forEach(i => i.classList.remove("active"));
          if (!isActive) item.classList.add("active");
        }
      });
    });

    // 4. Fechar ao Pressionar ESC
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        if (drawer && drawer.classList.contains("open")) closeDrawer();
        if (dropdown) dropdown.classList.remove("open");
      }
    });

    // 5. Barra de Progresso de Leitura
    const progressBar = document.getElementById("progressBar");
    if (progressBar) {
      window.addEventListener("scroll", function() {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled + "%";
      });
    }

    // 6. Botão Voltar ao Topo
    const btnTop = document.getElementById("btnTop");
    if (btnTop) {
      window.addEventListener("scroll", function() {
        if (window.scrollY > 350) {
          btnTop.classList.add("visible");
        } else {
          btnTop.classList.remove("visible");
        }
      });
      btnTop.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // 7. Navegação Suave em Âncoras
    document.querySelectorAll('a[href*="#"]').forEach(function(anchor) {
      anchor.addEventListener("click", function(e) {
        const href = this.getAttribute("href");
        if (!href || href === "#") return;
        const parts = href.split("#");
        const targetPage = parts[0];
        const targetId = parts[1];

        const currentPage = window.location.pathname.split("/").pop() || "index.html";

        if (!targetPage || targetPage === currentPage) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            e.preventDefault();
            if (drawer && drawer.classList.contains("open")) closeDrawer();
            if (dropdown) dropdown.classList.remove("open");
            const navOffset = 80;
            const elementPosition = targetEl.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
          }
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNav);
  } else {
    initNav();
  }
})();
