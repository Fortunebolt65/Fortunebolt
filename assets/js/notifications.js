/* ==========================================================================
   Fortunebolt HR Platform — notification center + toasts.
   Simulates the doc's "email/SMS notification" requirements: FB.store.notify()
   writes a record, this module renders the bell badge, the dropdown feed,
   and transient toasts for in-the-moment feedback.
   ========================================================================== */
(function (global) {
  'use strict';

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function refreshBadge() {
    const dot = document.querySelector('[data-fb-notif-count]');
    if (!dot) return;
    const count = global.FB.store.unreadNotificationCount();
    if (count > 0) {
      dot.textContent = count > 9 ? '9+' : String(count);
      dot.style.display = 'flex';
    } else {
      dot.style.display = 'none';
    }
  }

  function renderPanel() {
    const list = document.querySelector('[data-fb-notif-list]');
    if (!list) return;
    const items = global.FB.store.get('notifications').slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
    if (!items.length) {
      list.innerHTML = '<div class="fb-notif-panel__empty">No notifications yet.</div>';
      return;
    }
    const base = global.FB_BASE || '';
    list.innerHTML = items.map((n) => `
      <a href="${n.link ? base + n.link : '#'}" class="fb-notif-item ${n.read ? '' : 'is-unread'}" data-fb-notif-id="${n.id}">
        <div class="fb-notif-item__icon">${moduleIcon(n.module)}</div>
        <div>
          <div class="fb-notif-item__title">${escapeHtml(n.title)}</div>
          <div class="fb-xs fb-muted">${escapeHtml(n.body || '')}</div>
          <div class="fb-notif-item__meta">${escapeHtml(n.module || '')} · ${timeAgo(n.createdAt)}</div>
        </div>
      </a>`).join('');
    list.querySelectorAll('[data-fb-notif-id]').forEach((el) => {
      el.addEventListener('click', () => {
        global.FB.store.markNotificationRead(el.getAttribute('data-fb-notif-id'));
      });
    });
  }

  function moduleIcon(mod) {
    const map = {
      Recruitment: '🧾', Performance: '📊', 'Exit Management': '🚪', Disciplinary: '⚠️',
      'Health & Wellness': '🩺', 'Learning & Development': '🎓', 'Employee Relations': '🤝'
    };
    return map[mod] || '🔔';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  let toastHost = null;
  function toast(message, type) {
    if (!toastHost || !document.body.contains(toastHost)) {
      toastHost = document.createElement('div');
      toastHost.className = 'fb-toast-stack';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = `fb-toast fb-toast--${type || 'info'}`;
    el.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastHost.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 240ms ease'; setTimeout(() => el.remove(), 260); }, 3600);
  }

  global.FB = global.FB || {};
  global.FB.notifications = { refreshBadge, renderPanel, toast, timeAgo };

  document.addEventListener('DOMContentLoaded', () => {
    global.FB.events.on('notification:new', () => { refreshBadge(); renderPanel(); });
    global.FB.events.on('store:changed', refreshBadge);
    global.FB.events.on('store:reset', () => { refreshBadge(); renderPanel(); });
  });
})(window);
