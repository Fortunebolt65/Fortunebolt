/* ==========================================================================
   Page logic: Medical Bills (admin/health/medical-bills.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Submitted', 'Verified', 'Approved', 'Paid'];

  function renderKpis() {
    var bills = store.get('medicalBills');
    var outstanding = bills.filter(function (b) { return b.status === 'Outstanding'; });
    document.getElementById('fb-bill-kpis').innerHTML = [
      ui.statCardHtml({ label: 'Bills on file', value: bills.length }),
      ui.statCardHtml({ label: 'Outstanding balance', value: ui.fmtMoney(outstanding.reduce(function (s, b) { return s + b.outstandingBalance; }, 0)) }),
      ui.statCardHtml({ label: 'Paid this cycle', value: bills.filter(function (b) { return b.status === 'Paid'; }).length })
    ].join('');
  }

  function renderTable() {
    ui.table({
      container: '#fb-bill-table', rows: store.get('medicalBills').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['provider'],
      filter: { key: 'status', options: STAGES.concat(['Outstanding']) },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'provider', label: 'Provider' },
        { key: 'amount', label: 'Amount', render: function (r) { return ui.fmtMoney(r.amount); } },
        { key: 'outstandingBalance', label: 'Outstanding', render: function (r) { return r.outstandingBalance ? ui.fmtMoney(r.outstandingBalance) : '—'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openDrawer,
      emptyMessage: 'No medical bills submitted.'
    });
  }

  function displaySteps(b) {
    var steps = (b.approvalHistory || []).slice();
    if (b.status !== 'Paid') {
      var idx = b.status === 'Outstanding' ? 2 : STAGES.indexOf(b.status);
      STAGES.slice(idx).forEach(function (s, i) { steps.push({ stage: s, status: i === 0 ? 'current' : 'pending', action: i === 0 ? 'Awaiting action' : undefined }); });
    }
    return steps;
  }

  function openDrawer(b) {
    b = store.getById('medicalBills', b.id) || b;
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(b.employeeId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Provider</div><div class="fb-detail-item__value">' + ui.escapeHtml(b.provider) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Amount</div><div class="fb-detail-item__value">' + ui.fmtMoney(b.amount) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Outstanding</div><div class="fb-detail-item__value">' + (b.outstandingBalance ? ui.fmtMoney(b.outstandingBalance) : '₦0') + '</div></div>' +
      '<div><div class="fb-detail-item__label">Date submitted</div><div class="fb-detail-item__value">' + ui.fmtDate(b.createdAt) + '</div></div>' +
      '</div><hr class="fb-divider" /><div class="fb-attachment"><span class="fb-attachment__icon">📄</span> Invoice_' + ui.escapeHtml(b.id) + '.pdf</div>';
    var footer = '';
    if (b.status === 'Submitted') footer = '<button class="fb-btn fb-btn--primary" data-act="verify">Verify bill</button>';
    else if (b.status === 'Verified') footer = '<button class="fb-btn fb-btn--primary" data-act="approve">Approve for payment</button>';
    else if (b.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="pay">Mark paid</button>';
    else if (b.status === 'Outstanding') footer = '<button class="fb-btn fb-btn--primary" data-act="pay">Mark paid — clear balance</button>';
    ui.drawer({
      eyebrow: 'Medical Bill · ' + b.id,
      title: b.provider,
      subtitle: ui.badge(b.status),
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none"><div id="mb-workflow-timeline"></div></section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#mb-workflow-timeline'), displaySteps(b));
        function bind(sel, stage, action, comment, patch) {
          var el = box.querySelector(sel); if (!el) return;
          el.addEventListener('click', function () {
            store.recordApproval('medicalBills', b.id, { stage: stage, action: action, comment: comment, patch: patch });
            ui.closeDrawer(); ui.toast(action + '.', 'success'); renderTable(); renderKpis();
          });
        }
        bind('[data-act="verify"]', 'Verification', 'Verified', 'Invoice checked against treatment record — genuine.', { status: 'Verified' });
        bind('[data-act="approve"]', 'Approval', 'Approved', 'Approved for payment against staff medical benefit.', { status: 'Approved' });
        bind('[data-act="pay"]', 'Payment', 'Paid', 'Payment disbursed to provider.', { status: 'Paid', outstandingBalance: 0 });
      }
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">🧾 Bill details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="nb-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Provider</label><input type="text" id="nb-provider" placeholder="e.g. Reddington Hospital" /></div>' +
      '<div class="fb-field"><label>Amount (₦)</label><input type="number" id="nb-amount" /></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📎 Evidence</div><div class="fb-attachment"><span class="fb-attachment__icon">📄</span> Invoice attached</div></div>';
    ui.drawer({
      title: 'Submit medical bill', subtitle: 'Routes through Clinic verification then HR approval before payment.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var amount = Number(document.getElementById('nb-amount').value) || 0;
          var provider = document.getElementById('nb-provider').value.trim() || 'Unnamed provider';
          var b = store.insert('medicalBills', { employeeId: document.getElementById('nb-emp').value, provider: provider, amount: amount, status: 'Submitted', outstandingBalance: 0, approvalHistory: [] });
          store.recordApproval('medicalBills', b.id, { stage: 'Bill Submitted', action: 'Submitted for verification', comment: provider + ' invoice uploaded.' });
          ui.closeDrawer(); ui.toast('Bill submitted for verification.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderKpis(); renderTable();
    document.getElementById('fb-btn-new-bill').addEventListener('click', openNewModal);
  });
})();
