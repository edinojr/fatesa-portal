// bible-popup.js
document.addEventListener('DOMContentLoaded', () => {
    // Inject popup HTML into body
    const overlay = document.createElement('div');
    overlay.id = 'bible-popup-overlay';
    
    const popup = document.createElement('div');
    popup.id = 'bible-popup';
    
    popup.innerHTML = `
        <div class="bible-popup-header">
            <h3 class="bible-popup-title" id="bible-popup-title">Reference</h3>
            <button class="bible-popup-close" id="bible-popup-close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="bible-popup-content" id="bible-popup-content"></div>
        <div class="bible-popup-footer">Bíblia ACF (Almeida Corrigida Fiel)</div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    const closeBtn = document.getElementById('bible-popup-close');
    const titleEl = document.getElementById('bible-popup-title');
    const contentEl = document.getElementById('bible-popup-content');
    
    function closePopup() {
        popup.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);
    
    // Add click event to all bible references
    const refs = document.querySelectorAll('.bible-ref');
    refs.forEach(ref => {
        ref.addEventListener('click', (e) => {
            const referenceName = ref.textContent.trim();
            const versesHTML = ref.getAttribute('data-verses') || 'Texto não encontrado.';
            
            titleEl.textContent = referenceName;
            contentEl.innerHTML = versesHTML;
            
            overlay.classList.add('show');
            popup.classList.add('show');
        });
    });
});
