// FATESA - Interatividade e Identificação de Marcações Históricas e Geográficas
document.addEventListener("DOMContentLoaded", () => {
  const dictScript = document.getElementById("popup-dictionary");
  if (!dictScript) return;

  let popupDict = {};
  try {
    popupDict = JSON.parse(dictScript.textContent || "{}");
  } catch (e) {
    console.error("Erro ao processar dicionário de popups:", e);
    return;
  }

  // Create single floating card
  let card = document.getElementById("fatesa-tooltip-card");
  if (!card) {
    card = document.createElement("div");
    card.id = "fatesa-tooltip-card";
    card.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-termo"></span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="tooltip-categoria"></span>
          <button type="button" class="btn-close-tooltip" aria-label="Fechar">✕</button>
        </div>
      </div>
      <p class="tooltip-descricao"></p>
    `;
    document.body.appendChild(card);
  }

  const termoEl = card.querySelector(".tooltip-termo");
  const catEl = card.querySelector(".tooltip-categoria");
  const descEl = card.querySelector(".tooltip-descricao");
  const btnClose = card.querySelector(".btn-close-tooltip");

  if (btnClose) {
    btnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTooltip(0);
    });
  }

  // Helper to categorize
  function getCategoryMeta(categoriaRaw) {
    const cat = (categoriaRaw || "").toLowerCase();
    if (cat.includes("geogr") || cat.includes("localidade") || cat.includes("lugar")) {
      return { cssClass: "popup-geo", catClass: "cat-geo", icon: "🗺️", label: categoriaRaw || "Localidade Geográfica" };
    }
    if (cat.includes("personagem") || cat.includes("pessoa") || cat.includes("autor")) {
      return { cssClass: "popup-pers", catClass: "cat-pers", icon: "📜", label: categoriaRaw || "Personagem Histórico" };
    }
    if (cat.includes("evento") || cat.includes("concílio") || cat.includes("período") || cat.includes("batalha")) {
      return { cssClass: "popup-evento", catClass: "cat-evento", icon: "🏛️", label: categoriaRaw || "Evento Histórico" };
    }
    if (cat.includes("povo") || cat.includes("grupo") || cat.includes("tribo") || cat.includes("seita")) {
      return { cssClass: "popup-povo", catClass: "cat-povo", icon: "👥", label: categoriaRaw || "Povo ou Grupo Histórico" };
    }
    return { cssClass: "popup-pers", catClass: "cat-pers", icon: "📌", label: categoriaRaw || "Referência Histórica" };
  }

  // Tag all terms in the document
  document.querySelectorAll(".termo-popup").forEach(el => {
    const key = el.getAttribute("data-popup-key");
    const data = popupDict[key];
    if (data) {
      const meta = getCategoryMeta(data.categoria);
      el.classList.add(meta.cssClass);
      el.setAttribute("title", meta.icon + " [" + meta.label + "] " + (data.termo || el.textContent));
    }
  });

  // Inject legend into lesson-article if not present
  const article = document.querySelector(".lesson-article");
  if (article && !document.querySelector(".fatesa-referencias-legenda")) {
    const legenda = document.createElement("div");
    legenda.className = "fatesa-referencias-legenda";
    legenda.innerHTML = `
      <span class="legenda-titulo">Marcações no Texto:</span>
      <span class="legenda-item geo"><span class="legenda-dot"></span>🗺️ Geografia</span>
      <span class="legenda-item pers"><span class="legenda-dot"></span>📜 Personagens</span>
      <span class="legenda-item evento"><span class="legenda-dot"></span>🏛️ Eventos</span>
      <span class="legenda-item povo"><span class="legenda-dot"></span>👥 Povos</span>
    `;
    article.insertBefore(legenda, article.firstChild);
  }

  let activeTarget = null;
  let hideTimeout = null;

  function showTooltip(target) {
    clearTimeout(hideTimeout);
    const key = target.getAttribute("data-popup-key");
    const data = popupDict[key];
    if (!data) return;

    const meta = getCategoryMeta(data.categoria);
    termoEl.textContent = data.termo || target.textContent;
    catEl.className = "tooltip-categoria " + meta.catClass;
    catEl.textContent = meta.icon + " " + meta.label;
    descEl.textContent = data.descricao || "";

    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.bottom + scrollTop + 6;
    let left = rect.left + scrollLeft + (rect.width / 2) - 170;

    const maxRight = window.innerWidth - 350;
    if (left > maxRight) left = Math.max(10, maxRight);
    if (left < 10) left = 10;

    card.style.top = top + "px";
    card.style.left = left + "px";
    card.classList.add("visible");
    activeTarget = target;
  }

  function hideTooltip(delay = 180) {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      card.classList.remove("visible");
      activeTarget = null;
    }, delay);
  }

  document.querySelectorAll(".termo-popup").forEach(el => {
    el.addEventListener("mouseenter", () => showTooltip(el));
    el.addEventListener("mouseleave", () => hideTooltip(180));
    el.addEventListener("focus", () => showTooltip(el));
    el.addEventListener("blur", () => hideTooltip(180));
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (activeTarget === el) {
        hideTooltip(0);
      } else {
        showTooltip(el);
      }
    });
  });

  card.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
  card.addEventListener("mouseleave", () => hideTooltip(180));
});
