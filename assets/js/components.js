/* ==========================================================================
   Fortunebolt HR Platform — reusable UI component helpers.
   Every module page composes its screens from these instead of hand-rolling
   markup, so ~25 pages stay visually and behaviorally consistent.
   ========================================================================== */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtMoney(n) {
    if (n === null || n === undefined || n === '') return '—';
    return '₦' + Number(n).toLocaleString('en-NG');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const STATUS_MAP = {
    // draft-ish
    'draft': 'draft', 'not started': 'draft', 'planned': 'draft', 'scheduled': 'draft',
    // pending-ish
    'pending': 'pending', 'pending approval': 'pending', 'pending hr review': 'pending', 'pending hod review': 'pending',
    'pending finance approval': 'pending', 'pending clinic review': 'pending', 'pending supervisor review': 'pending',
    'in progress': 'pending', 'submitted': 'pending', 'enrolled': 'pending', 'onboarding': 'pending', 'open': 'pending',
    'applied': 'pending', 'screening': 'pending', 'testing': 'pending', 'interviewing': 'pending', 'shortlisted': 'pending',
    'sent': 'pending', 'active': 'approved', 'under review': 'pending', 'not available': 'draft',
    // approved-ish
    'approved': 'approved', 'completed': 'approved', 'confirmed': 'approved', 'hired': 'approved', 'accepted': 'approved',
    'paid': 'approved', 'passed': 'approved', 'achieved': 'approved', 'procured': 'approved', 'verified': 'approved',
    // rejected-ish
    'rejected': 'rejected', 'closed': 'draft', 'outstanding': 'rejected', 'overdue': 'rejected', 'failed': 'rejected',
    'suspended': 'rejected',
    // escalated-ish
    'escalated': 'escalated', 'on pip': 'escalated', 'exiting': 'escalated', 'restricted': 'escalated'
  };
  function statusVariant(status) {
    if (!status) return 'draft';
    return STATUS_MAP[String(status).toLowerCase()] || 'info';
  }
  function badge(status, label) {
    return `<span class="fb-badge fb-badge--${statusVariant(status)}">${escapeHtml(label || status)}</span>`;
  }
  function tag(text) { return `<span class="fb-tag">${escapeHtml(text)}</span>`; }

  function initials(name) {
    return String(name || '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
  function personCell(name, sub) {
    return `<div class="fb-cell-person"><span class="fb-avatar">${escapeHtml(initials(name))}</span><span><div class="fb-cell-primary">${escapeHtml(name)}</div>${sub ? `<div class="fb-xs fb-faint">${escapeHtml(sub)}</div>` : ''}</span></div>`;
  }

  // ---------------- Data table ----------------
  function table(opts) {
    const container = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    if (!container) return null;
    const state = { search: '', filterValue: opts.filterDefault || '' };

    function build() {
      const toolbarHtml = (opts.searchable !== false || opts.filter) ? `
        <div class="fb-table-toolbar">
          ${opts.searchable !== false ? `<input type="search" placeholder="${escapeHtml(opts.searchPlaceholder || 'Search...')}" data-fb-table-search style="min-width:220px" />` : ''}
          ${opts.filter ? `<select data-fb-table-filter>
              <option value="">${escapeHtml(opts.filter.allLabel || 'All statuses')}</option>
              ${opts.filter.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
            </select>` : ''}
          ${opts.toolbarExtra || ''}
        </div>` : '';
      container.innerHTML = `${toolbarHtml}<div class="fb-table-wrap"><table class="fb-table"><thead><tr>${opts.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody data-fb-table-body></tbody></table></div>`;
      const searchEl = container.querySelector('[data-fb-table-search]');
      const filterEl = container.querySelector('[data-fb-table-filter]');
      if (searchEl) searchEl.addEventListener('input', () => { state.search = searchEl.value.toLowerCase(); render(); });
      if (filterEl) filterEl.addEventListener('change', () => { state.filterValue = filterEl.value; render(); });
    }

    function render(rows) {
      if (rows) opts.rows = rows;
      const body = container.querySelector('[data-fb-table-body]');
      if (!body) { build(); return render(rows); }
      let list = opts.rows || [];
      if (state.search) {
        list = list.filter((r) => (opts.searchKeys || opts.columns.map((c) => c.key)).some((k) => String(row_get(r, k) || '').toLowerCase().includes(state.search)));
      }
      if (state.filterValue && opts.filter) {
        list = list.filter((r) => String(row_get(r, opts.filter.key)) === state.filterValue);
      }
      if (!list.length) {
        body.innerHTML = `<tr><td colspan="${opts.columns.length}"><div class="fb-table__empty">${escapeHtml(opts.emptyMessage || 'No records found.')}</div></td></tr>`;
        return;
      }
      body.innerHTML = list.map((row, i) => `<tr class="${opts.onRowClick ? 'is-clickable' : ''}" data-fb-row-index="${i}">${opts.columns.map((c) => `<td>${c.render ? c.render(row) : escapeHtml(row_get(row, c.key))}</td>`).join('')}</tr>`).join('');
      if (opts.onRowClick) {
        body.querySelectorAll('tr').forEach((tr) => {
          tr.addEventListener('click', () => opts.onRowClick(list[Number(tr.getAttribute('data-fb-row-index'))]));
        });
      }
    }
    function row_get(row, key) { return key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), row); }

    build();
    render(opts.rows);
    return { refresh: render };
  }

  // ---------------- Kanban board ----------------
  function kanban(opts) {
    const container = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    if (!container) return;
    function render(cards) {
      if (cards) opts.cards = cards;
      const cardKey = opts.cardKey;
      container.innerHTML = `<div class="fb-kanban">${opts.columns.map((col) => {
        const colCards = (opts.cards || []).filter((c) => c[cardKey] === col.key);
        return `<div class="fb-kanban__col"><div class="fb-kanban__col-head"><span>${escapeHtml(col.label)}</span><span class="fb-kanban__count">${colCards.length}</span></div>${colCards.map((c) => `<div class="fb-kanban__card" data-fb-card-id="${c.id}">${opts.renderCard(c)}</div>`).join('') || `<div class="fb-xs fb-faint" style="padding:8px">No records</div>`}</div>`;
      }).join('')}</div>`;
      if (opts.onCardClick) {
        container.querySelectorAll('[data-fb-card-id]').forEach((el) => {
          el.addEventListener('click', () => {
            const card = (opts.cards || []).find((c) => c.id === el.getAttribute('data-fb-card-id'));
            if (card) opts.onCardClick(card);
          });
        });
      }
    }
    render(opts.cards);
    return { refresh: render };
  }

  // ---------------- Stepper / workflow tracker ----------------
  function stepper(container, steps, currentIndex, opts) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    opts = opts || {};
    el.innerHTML = `<div class="fb-stepper">${steps.map((label, i) => {
      let cls = '';
      if (opts.rejectedIndex === i) cls = 'is-rejected';
      else if (i < currentIndex) cls = 'is-done';
      else if (i === currentIndex) cls = 'is-current';
      return `<div class="fb-step ${cls}"><div class="fb-step__line"></div><div class="fb-step__dot">${i < currentIndex || opts.rejectedIndex === i ? (opts.rejectedIndex === i ? '✕' : '✓') : i + 1}</div><div class="fb-step__label">${escapeHtml(label)}</div></div>`;
    }).join('')}</div>`;
  }

  // ---------------- Stat card ----------------
  function statCardHtml(opts) {
    const deltaHtml = opts.delta !== undefined && opts.delta !== null ? `<span class="fb-stat__delta fb-stat__delta--${opts.deltaDirection || 'flat'}">${escapeHtml(opts.delta)}</span>` : '';
    return `<div class="fb-card fb-stat"><div class="fb-stat__label">${escapeHtml(opts.label)}</div><div class="fb-stat__value">${escapeHtml(opts.value)}</div>${deltaHtml}${opts.sub ? `<div class="fb-xs fb-faint">${escapeHtml(opts.sub)}</div>` : ''}</div>`;
  }

  // ---------------- Modal ----------------
  let overlayEl = null;
  function ensureOverlay() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'fb-overlay';
    overlayEl.innerHTML = '<div class="fb-modal" data-fb-modal></div>';
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    return overlayEl;
  }
  function closeModal() {
    if (overlayEl) overlayEl.classList.remove('is-open');
  }
  function modal(opts) {
    ensureOverlay();
    const box = overlayEl.querySelector('[data-fb-modal]');
    box.className = `fb-modal ${opts.wide ? 'fb-modal--wide' : ''}`;
    box.innerHTML = `
      <div class="fb-modal__head"><div class="fb-modal__title">${escapeHtml(opts.title)}</div><button class="fb-close-btn" data-fb-modal-close>✕</button></div>
      <div class="fb-modal__body">${opts.body}</div>
      ${opts.footer ? `<div class="fb-modal__foot">${opts.footer}</div>` : ''}`;
    box.querySelector('[data-fb-modal-close]').addEventListener('click', closeModal);
    if (opts.onMount) opts.onMount(box);
    overlayEl.classList.add('is-open');
    return { close: closeModal, el: box };
  }
  function confirmModal(opts) {
    return modal({
      title: opts.title,
      body: `<p class="fb-muted">${escapeHtml(opts.message)}</p>`,
      footer: `<button class="fb-btn" data-fb-cancel>Cancel</button><button class="fb-btn ${opts.danger ? 'fb-btn--danger' : 'fb-btn--primary'}" data-fb-confirm>${escapeHtml(opts.confirmLabel || 'Confirm')}</button>`,
      onMount: (box) => {
        box.querySelector('[data-fb-cancel]').addEventListener('click', closeModal);
        box.querySelector('[data-fb-confirm]').addEventListener('click', () => { closeModal(); if (opts.onConfirm) opts.onConfirm(); });
      }
    });
  }

  // ---------------- Bar chart (pure CSS bars, no SVG dependency needed) ----------------
  function barChart(container, opts) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    const max = Math.max(1, ...opts.values);
    el.innerHTML = `<div class="fb-barchart">${opts.labels.map((label, i) => {
      const v = opts.values[i];
      const h = Math.round((v / max) * 100);
      return `<div class="fb-barchart__col"><div class="fb-barchart__value">${opts.valueFormatter ? opts.valueFormatter(v) : v}</div><div class="fb-barchart__bar" style="height:${Math.max(h, 3)}%"></div><div class="fb-barchart__label">${escapeHtml(label)}</div></div>`;
    }).join('')}</div>`;
  }

  function progressBar(container, percent) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.innerHTML = `<div class="fb-progress"><div class="fb-progress__bar" style="width:${Math.min(100, Math.max(0, percent))}%"></div></div>`;
  }

  function timeline(container, items) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="fb-empty"><div class="fb-empty__icon">🕒</div>No activity yet.</div>'; return; }
    el.innerHTML = `<ul class="fb-timeline">${items.map((it) => `<li><div class="fb-timeline__title">${escapeHtml(it.title)}</div><div class="fb-timeline__meta">${escapeHtml(it.meta || '')}</div></li>`).join('')}</ul>`;
  }

  // ---------------- Tabs ----------------
  function wireTabs(root, onChange) {
    const el = typeof root === 'string' ? document.querySelector(root) : root || document;
    const tabs = el.querySelectorAll('[data-fb-tab]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-fb-tab');
        tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
        document.querySelectorAll('[data-fb-tabpanel]').forEach((panel) => {
          panel.style.display = panel.getAttribute('data-fb-tabpanel') === key ? '' : 'none';
        });
        if (onChange) onChange(key);
      });
    });
  }

  // ---------------- CSV export (genuine client-side download, no backend needed) ----------------
  function exportCsv(filename, columns, rows) {
    var esc = function (v) { var s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [columns.map(function (c) { return esc(c.label); }).join(',')];
    rows.forEach(function (row) { lines.push(columns.map(function (c) { return esc(c.value(row)); }).join(',')); });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.FB = global.FB || {};
  global.FB.ui = {
    wireTabs, exportCsv,
    escapeHtml, fmtMoney, fmtDate, statusVariant, badge, tag, initials, personCell,
    table, kanban, stepper, statCardHtml, modal, confirmModal, closeModal, barChart, progressBar, timeline
  };
  // convenience alias — resolved lazily since notifications.js loads after this file
  global.FB.ui.toast = function (message, type) { return global.FB.notifications.toast(message, type); };
})(window);
