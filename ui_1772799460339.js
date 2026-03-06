/**
 * ui.js — Shared UI Utilities
 * Toast notifications, modal helpers, icon snippets.
 */

/* ── Toast ────────────────────────────────────────────── */
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, { type = 'success', title = null, duration = 4000 } = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    el.innerHTML = `
      ${type === 'success'
        ? `<svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
             <circle cx="8" cy="8" r="7" stroke="#4d7aa0" stroke-width="1.5"/>
             <path d="M5 8l2 2 4-4" stroke="#4d7aa0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>`
        : `<svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
             <circle cx="8" cy="8" r="7" stroke="#e74c3c" stroke-width="1.5"/>
             <path d="M8 5v3M8 11v.5" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>
           </svg>`
      }
      <div>
        ${title ? `<strong>${title}</strong>` : ''}
        <span>${message}</span>
      </div>
    `;
    getContainer().appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-exit');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }

  return {
    success: (msg, opts) => show(msg, { type: 'success', ...opts }),
    error:   (msg, opts) => show(msg, { type: 'error',   ...opts }),
  };
})();

/* ── Modal ────────────────────────────────────────────── */
const Modal = {
  /**
   * Show a modal with custom body HTML.
   * Returns { overlay, modal, close }
   */
  show({ title, bodyHTML, footerHTML = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <span class="modal-title" id="modal-title">${title}</span>
          <button class="modal-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    return { overlay, modal: overlay.querySelector('.modal'), close };
  },
};

/* ── Icons ────────────────────────────────────────────── */
const Icons = {
  user: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l4-4-4-4M11 8H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

window.Toast = Toast;
window.Modal = Modal;
window.Icons = Icons;
