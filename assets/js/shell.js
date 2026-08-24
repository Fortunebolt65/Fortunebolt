/* ==========================================================================
   Fortunebolt HR Platform — app shell (topbar + sidebar + notification
   center), injected into every page at load time. A page only needs to:
     1. set  window.FB_BASE  (relative path back to repo root)
     2. set  window.FB_PAGE  (nav key, e.g. "hrbp/recruitment")
     3. wrap its content in <div id="fb-page-root">...</div>
   before loading this script. Editing the NAV manifest below updates
   navigation on all ~25 pages at once.
   ========================================================================== */
(function (global) {
  'use strict';

  const NAV = [
    { group: null, items: [{ key: 'dashboard', label: 'Dashboard', href: 'admin/dashboard.html', icon: '🏠' }] },
    {
      group: 'HR Business Partnering', items: [
        { key: 'hrbp/recruitment', label: 'Recruitment & Selection', href: 'admin/hrbp/recruitment.html', icon: '🧾', restricted: true },
        { key: 'hrbp/employee-relations', label: 'Employee Relations & ESS', href: 'admin/hrbp/employee-relations.html', icon: '🤝' },
        { key: 'hrbp/disciplinary', label: 'Disciplinary Management', href: 'admin/hrbp/disciplinary.html', icon: '⚠️' },
        { key: 'hrbp/org-structure', label: 'Organizational Structure', href: 'admin/hrbp/org-structure.html', icon: '🏢' },
        { key: 'hrbp/exit-management', label: 'Exit Management', href: 'admin/hrbp/exit-management.html', icon: '🚪', restricted: true },
        { key: 'hrbp/performance-confirmation', label: 'Interim & Confirmation Appraisals', href: 'admin/hrbp/performance-confirmation.html', icon: '📋' },
        { key: 'hrbp/guarantor-verification', label: 'Guarantor Verification', href: 'admin/hrbp/guarantor-verification.html', icon: '🛡️' },
        { key: 'hrbp/reporting', label: 'HRBP Reporting', href: 'admin/hrbp/reporting.html', icon: '📑' },
        { key: 'hrbp/hr-analytics', label: 'HR Analytics', href: 'admin/hrbp/hr-analytics.html', icon: '📈' }
      ]
    },
    {
      group: 'Learning & Development', items: [
        { key: 'ld/performance-pip', label: 'Performance Mgmt / PIP', href: 'admin/ld/performance-pip.html', icon: '🎯' },
        { key: 'ld/talent-management', label: 'Talent Management', href: 'admin/ld/talent-management.html', icon: '🌟' },
        { key: 'ld/tna', label: 'Training Needs Analysis', href: 'admin/ld/tna.html', icon: '🔍' },
        { key: 'ld/lms', label: 'Learning Management (LMS)', href: 'admin/ld/lms.html', icon: '🎓' },
        { key: 'ld/correspondence', label: 'Correspondence', href: 'admin/ld/correspondence.html', icon: '✉️' },
        { key: 'ld/evaluation', label: 'Evaluation', href: 'admin/ld/evaluation.html', icon: '📝' },
        { key: 'ld/curriculum-schedule', label: 'Curriculum & Schedules', href: 'admin/ld/curriculum-schedule.html', icon: '🗓️' },
        { key: 'ld/budgeting', label: 'Training Budget', href: 'admin/ld/budgeting.html', icon: '💰' },
        { key: 'ld/reporting', label: 'L&D Reporting', href: 'admin/ld/reporting.html', icon: '📑' }
      ]
    },
    {
      group: 'Health & Wellness (Clinic)', items: [
        { key: 'health/medical-bills', label: 'Medical Bills', href: 'admin/health/medical-bills.html', icon: '🧾' },
        { key: 'health/vaccinations', label: 'Vaccinations', href: 'admin/health/vaccinations.html', icon: '💉' },
        { key: 'health/medical-records', label: 'Medical Records', href: 'admin/health/medical-records.html', icon: '📁', restricted: true },
        { key: 'health/drug-requisition', label: 'Drug Requisition', href: 'admin/health/drug-requisition.html', icon: '💊' },
        { key: 'health/sick-leave', label: 'Sick Leave / Excuse Duty', href: 'admin/health/sick-leave.html', icon: '🤒' },
        { key: 'health/reporting', label: 'Health Reporting', href: 'admin/health/reporting.html', icon: '📑' }
      ]
    },
    {
      group: 'Out of current scope', items: [
        { key: 'rewards-benefits', label: 'Rewards & Benefits', href: null, icon: '🎁', disabled: true, note: 'Not covered by the requirements document — no detailed spec to build against yet.' },
        { key: 'admin-facilities', label: 'Admin (Facilities)', href: null, icon: '🏗️', disabled: true, note: 'Not covered by the requirements document — no detailed spec to build against yet.' }
      ]
    }
  ];

  function buildSidebar(base, activeKey) {
    return NAV.map((section) => `
      <div class="fb-sidebar__group">
        ${section.group ? `<div class="fb-sidebar__group-title">${section.group}</div>` : ''}
        ${section.items.map((item) => {
          if (item.disabled) {
            return `<div class="fb-sidebar__link is-disabled" title="${FB.ui.escapeHtml(item.note || 'Out of scope')}"><span>${item.icon}</span><span>${item.label}</span></div>`;
          }
          const active = item.key === activeKey;
          return `<a class="fb-sidebar__link ${active ? 'is-active' : ''}" href="${base}${item.href}"><span>${item.icon}</span><span>${item.label}</span>${item.restricted ? '<span class="fb-sidebar__badge" title="Restricted access module">🔒</span>' : ''}</a>`;
        }).join('')}
      </div>`).join('');
  }

  function findNavItem(key) {
    for (const section of NAV) { const found = section.items.find((i) => i.key === key); if (found) return found; }
    return null;
  }

  function currentUnitLabel(key) {
    for (const section of NAV) { if (section.items.some((i) => i.key === key) && section.group) return section.group; }
    return null;
  }

  function searchIndex() {
    const store = global.FB.store;
    const emps = store.get('employees').map((e) => ({ type: 'Employee', label: `${e.firstName} ${e.lastName}`, sub: e.jobTitle, href: 'admin/hrbp/org-structure.html?focus=' + e.id }));
    const reqs = store.get('requisitions').map((r) => ({ type: 'Requisition', label: r.title, sub: store.departmentName(r.departmentId), href: 'admin/hrbp/recruitment.html?focus=' + r.id }));
    const cands = store.get('candidates').map((c) => ({ type: 'Candidate', label: c.name, sub: c.status, href: 'admin/hrbp/recruitment.html?focus=' + c.requisitionId }));
    return emps.concat(reqs, cands);
  }

  function initShell() {
    const base = global.FB_BASE || '';
    const pageKey = global.FB_PAGE || '';
    const root = document.getElementById('fb-page-root');
    if (!root) { console.error('[FB.shell] no #fb-page-root found on this page'); return; }
    const pageContent = root.innerHTML;

    global.FB.store.init();
    const session = global.FB.auth.currentSession();
    const navItem = findNavItem(pageKey);
    const unitLabel = currentUnitLabel(pageKey);

    document.body.innerHTML = `
      <a class="fb-skiplink" href="#fb-main">Skip to content</a>
      <div class="fb-app" id="fb-app">
        <header class="fb-topbar">
          <button class="fb-icon-btn fb-menu-btn" data-fb-menu-toggle title="Menu" aria-label="Toggle navigation">☰</button>
          <a class="fb-topbar__brand" href="${base}admin/dashboard.html">
            <span class="fb-topbar__brand-mark">FB</span>
            <span>Fortunebolt Pharma HR</span>
          </a>
          ${unitLabel ? `<span class="fb-topbar__unit">${unitLabel}</span>` : ''}
          <div class="fb-topbar__search">
            <input type="search" placeholder="Search employees, requisitions, candidates..." data-fb-global-search autocomplete="off" />
            <div class="fb-notif-panel" data-fb-search-panel style="position:absolute;top:auto;right:auto;width:380px;"></div>
          </div>
          <div class="fb-topbar__spacer"></div>
          <div class="fb-topbar__actions">
            <button class="fb-icon-btn" data-fb-theme-toggle title="Toggle light/dark">🌓</button>
            <button class="fb-icon-btn" data-fb-reset-demo title="Reset demo data">↺</button>
            <button class="fb-icon-btn" data-fb-notif-bell title="Notifications">
              🔔<span class="fb-icon-btn__dot" data-fb-notif-count style="display:none"></span>
            </button>
            <div class="fb-user-chip" data-fb-user-menu>
              <span class="fb-avatar">${FB.ui.initials(session.displayName)}</span>
              <span class="fb-user-chip__meta"><div class="fb-user-chip__name">${FB.ui.escapeHtml(session.displayName)}</div><div class="fb-user-chip__role">${FB.ui.escapeHtml(session.role.label)}</div></span>
            </div>
          </div>
        </header>
        <div class="fb-notif-panel" data-fb-notif-panel>
          <div class="fb-notif-panel__head"><span>Notifications</span><button class="fb-btn fb-btn--ghost fb-btn--sm" data-fb-mark-all-read>Mark all read</button></div>
          <div class="fb-notif-panel__list" data-fb-notif-list></div>
        </div>
        <nav class="fb-sidebar">${buildSidebar(base, pageKey)}</nav>
        <main class="fb-main" id="fb-main"><div id="fb-page-root">${pageContent}</div></main>
      </div>`;

    // mobile nav toggle
    const appEl = document.getElementById('fb-app');
    document.querySelector('[data-fb-menu-toggle]').addEventListener('click', (e) => { e.stopPropagation(); appEl.classList.toggle('is-sidebar-open'); });
    appEl.addEventListener('click', (e) => {
      if (!appEl.classList.contains('is-sidebar-open')) return;
      const sidebar = appEl.querySelector('.fb-sidebar');
      if (!sidebar.contains(e.target) && e.target.closest('[data-fb-menu-toggle]') === null) appEl.classList.remove('is-sidebar-open');
    });

    // theme
    const savedTheme = localStorage.getItem('fb_theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    document.querySelector('[data-fb-theme-toggle]').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('fb_theme', next);
    });

    // reset demo data
    document.querySelector('[data-fb-reset-demo]').addEventListener('click', () => {
      FB.ui.confirmModal({
        title: 'Reset demo data?',
        message: 'This restores every module to the original seeded dataset and clears anything you’ve created or changed in this browser. This cannot be undone.',
        confirmLabel: 'Reset data', danger: true,
        onConfirm: () => { global.FB.store.reset(); FB.notifications.toast('Demo data reset.', 'success'); setTimeout(() => location.reload(), 500); }
      });
    });

    // notifications
    const bell = document.querySelector('[data-fb-notif-bell]');
    const panel = document.querySelector('[data-fb-notif-panel]');
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('is-open');
      if (panel.classList.contains('is-open')) FB.notifications.renderPanel();
    });
    document.querySelector('[data-fb-mark-all-read]').addEventListener('click', () => { global.FB.store.markAllNotificationsRead(); FB.notifications.renderPanel(); FB.notifications.refreshBadge(); });
    document.addEventListener('click', (e) => { if (!panel.contains(e.target) && e.target !== bell) panel.classList.remove('is-open'); });
    FB.notifications.refreshBadge();

    // global search
    const searchInput = document.querySelector('[data-fb-global-search]');
    const searchPanel = document.querySelector('[data-fb-search-panel]');
    let idx = null;
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { searchPanel.classList.remove('is-open'); return; }
      idx = idx || searchIndex();
      const matches = idx.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8);
      searchPanel.innerHTML = matches.length ? matches.map((m) => `<a class="fb-notif-item" href="${base}${m.href}"><div class="fb-notif-item__icon">🔎</div><div><div class="fb-notif-item__title">${FB.ui.escapeHtml(m.label)}</div><div class="fb-notif-item__meta">${m.type} · ${FB.ui.escapeHtml(m.sub || '')}</div></div></a>`).join('') : '<div class="fb-notif-panel__empty">No matches.</div>';
      searchPanel.classList.add('is-open');
    });
    document.addEventListener('click', (e) => { if (!searchPanel.contains(e.target) && e.target !== searchInput) searchPanel.classList.remove('is-open'); });

    // mobile sidebar toggle placeholder (brand click also usable); keep simple for now
    global.FB.events.emit('shell:ready', { pageKey, navItem });
  }

  global.FB = global.FB || {};
  global.FB.shell = { initShell, NAV, findNavItem };

  document.addEventListener('DOMContentLoaded', initShell);
})(window);
