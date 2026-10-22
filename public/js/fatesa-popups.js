// FATESA - Interatividade de Pop-ups de Hover
document.addEventListener('DOMContentLoaded', () => {
  // Load JSON dictionary from script tag
  const dictScript = document.getElementById('popup-dictionary');
  if (!dictScript) return;

  let popupDict = {};
  try {
    popupDict = JSON.parse(dictScript.textContent || '{}');
  } catch (e) {
    console.error('Erro ao processar dicionário de popups:', e);
    return;
  }

  // Create single floating card
  let card = document.getElementById('fatesa-tooltip-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'fatesa-tooltip-card';
    card.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-termo"></span>
        <span class="tooltip-categoria"></span>
      </div>
      <p class="tooltip-descricao"></p>
    `;
    document.body.appendChild(card);
  }

  const termoEl = card.querySelector('.tooltip-termo');
  const catEl = card.querySelector('.tooltip-categoria');
  const descEl = card.querySelector('.tooltip-descricao');

  let activeTarget = null;
  let hideTimeout = null;

  function showTooltip(target) {
    clearTimeout(hideTimeout);
    const key = target.getAttribute('data-popup-key');
    const data = popupDict[key];
    if (!data) return;

    termoEl.textContent = data.termo || target.textContent;
    catEl.textContent = data.categoria || 'Referência';
    descEl.textContent = data.descricao || '';

    // Position tooltip
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.bottom + scrollTop + 6;
    let left = rect.left + scrollLeft + (rect.width / 2) - 160;

    // Boundary checks
    if (left < 10) left = 10;
    if (left + 330 > window.innerWidth) left = window.innerWidth - 340;

    card.style.top = top + 'px';
    card.style.left = left + 'px';
    card.classList.add('visible');
    activeTarget = target;
  }

  function hideTooltip() {
    hideTimeout = setTimeout(() => {
      card.classList.remove('visible');
      activeTarget = null;
    }, 150);
  }

  document.querySelectorAll('.termo-popup').forEach(el => {
    el.addEventListener('mouseenter', () => showTooltip(el));
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', () => showTooltip(el));
    el.addEventListener('blur', hideTooltip);
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (activeTarget === el) {
        hideTooltip();
      } else {
        showTooltip(el);
      }
    });
  });

  card.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
  card.addEventListener('mouseleave', hideTooltip);
});
