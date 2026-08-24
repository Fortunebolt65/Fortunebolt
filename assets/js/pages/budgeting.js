/* ==========================================================================
   Page logic: Training Budget (admin/ld/budgeting.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function budget() { return store.get('trainingBudget'); }

  function renderKpis() {
    var b = budget();
    var totalSpent = b.byMonth.reduce(function (s, m) { return s + m.spent; }, 0);
    document.getElementById('fb-budget-kpis').innerHTML = [
      ui.statCardHtml({ label: 'Annual budget (' + b.year + ')', value: ui.fmtMoney(b.totalBudget) }),
      ui.statCardHtml({ label: 'Spent to date', value: ui.fmtMoney(totalSpent) }),
      ui.statCardHtml({ label: 'Remaining', value: ui.fmtMoney(b.totalBudget - totalSpent) }),
      ui.statCardHtml({ label: 'Utilization', value: Math.round((totalSpent / b.totalBudget) * 100) + '%' })
    ].join('');
  }

  function renderChart() {
    var b = budget();
    ui.barChart('#fb-budget-chart', { labels: b.byMonth.map(function (m) { return m.month; }), values: b.byMonth.map(function (m) { return m.spent; }), valueFormatter: function (v) { return '₦' + Math.round(v / 1000) + 'k'; } });
  }

  function renderTable() {
    var b = budget();
    ui.table({
      container: '#fb-budget-table', rows: b.byMonth, searchable: false,
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'allocated', label: 'Allocated', render: function (r) { return ui.fmtMoney(r.allocated); } },
        { key: 'spent', label: 'Spent', render: function (r) { return ui.fmtMoney(r.spent); } },
        { key: 'remaining', label: 'Remaining', render: function (r) { return ui.fmtMoney(r.allocated - r.spent); } },
        { key: 'pct', label: 'Usage', render: function (r) { var pct = Math.round((r.spent / r.allocated) * 100); return '<div style="width:100px"><div class="fb-progress"><div class="fb-progress__bar" style="width:' + Math.min(100, pct) + '%;' + (pct > 100 ? 'background:var(--fb-status-rejected-fg)' : '') + '"></div></div></div><div class="fb-xs fb-faint">' + pct + '%</div>'; } }
      ]
    });
  }

  function openLogExpenseModal() {
    var b = budget();
    var body = '<div class="fb-field"><label>Month</label><select id="be-month">' + b.byMonth.map(function (m) { return '<option value="' + m.month + '">' + m.month + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Amount (₦)</label><input type="number" id="be-amount" placeholder="e.g. 250000" /></div>';
    ui.modal({
      title: 'Log training expense', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Log expense</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var month = document.getElementById('be-month').value;
          var amount = Number(document.getElementById('be-amount').value) || 0;
          var b2 = budget();
          b2.byMonth = b2.byMonth.map(function (m) { return m.month === month ? Object.assign({}, m, { spent: m.spent + amount }) : m; });
          store.setSingleton('trainingBudget', b2);
          ui.closeModal(); ui.toast('Expense logged against ' + month + '.', 'success'); renderKpis(); renderChart(); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderKpis(); renderChart(); renderTable();
    document.getElementById('fb-btn-log-expense').addEventListener('click', openLogExpenseModal);
  });
})();
