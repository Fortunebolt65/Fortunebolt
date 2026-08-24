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
      onRowClick: openModal,
      emptyMessage: 'No medical bills submitted.'
    });
  }

  function openModal(b) {
    var stepIdx = b.status === 'Outstanding' ? 3 : STAGES.indexOf(b.status);
    var body = '<div id="mb-stepper"></div><div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(store.employeeName(b.employeeId)) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Provider</div><div class="fb-bold">' + ui.escapeHtml(b.provider) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Amount</div><div class="fb-bold">' + ui.fmtMoney(b.amount) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Outstanding</div><div class="fb-bold">' + (b.outstandingBalance ? ui.fmtMoney(b.outstandingBalance) : '₦0') + '</div></div>' +
      '</div>';
    var footer = '';
    if (b.status === 'Submitted') footer = '<button class="fb-btn fb-btn--primary" data-act="verify">Verify bill</button>';
    else if (b.status === 'Verified') footer = '<button class="fb-btn fb-btn--primary" data-act="approve">Approve for payment</button>';
    else if (b.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="pay">Mark paid</button>';
    else if (b.status === 'Outstanding') footer = '<button class="fb-btn fb-btn--primary" data-act="pay">Mark paid — clear balance</button>';
    ui.modal({
      title: b.provider + ' — ' + store.employeeName(b.employeeId), body: body, footer: footer,
      onMount: function (box) {
        ui.stepper(box.querySelector('#mb-stepper'), STAGES, stepIdx);
        function bind(sel, patch, msg) { var el = box.querySelector(sel); if (el) el.addEventListener('click', function () { store.update('medicalBills', b.id, patch); ui.closeModal(); ui.toast(msg, 'success'); renderTable(); renderKpis(); }); }
        bind('[data-act="verify"]', { status: 'Verified' }, 'Bill verified.');
        bind('[data-act="approve"]', { status: 'Approved' }, 'Approved for payment.');
        bind('[data-act="pay"]', { status: 'Paid', outstandingBalance: 0 }, 'Marked as paid.');
      }
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="nb-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Provider</label><input type="text" id="nb-provider" placeholder="e.g. Reddington Hospital" /></div>' +
      '<div class="fb-field"><label>Amount (₦)</label><input type="number" id="nb-amount" /></div>';
    ui.modal({
      title: 'Submit medical bill', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var amount = Number(document.getElementById('nb-amount').value) || 0;
          store.insert('medicalBills', { employeeId: document.getElementById('nb-emp').value, provider: document.getElementById('nb-provider').value.trim() || 'Unnamed provider', amount: amount, status: 'Submitted', outstandingBalance: 0 });
          ui.closeModal(); ui.toast('Bill submitted for verification.', 'success'); renderTable(); renderKpis();
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
