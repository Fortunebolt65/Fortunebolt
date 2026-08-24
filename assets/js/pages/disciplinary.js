/* ==========================================================================
   Page logic: Disciplinary Management (admin/hrbp/disciplinary.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderKpis() {
    var cases = store.get('disciplinaryCases');
    var open = cases.filter(function (c) { return c.status !== 'Closed'; }).length;
    var flagged = cases.filter(function (c) { return c.payrollDeductionFlag; }).length;
    var closed = cases.filter(function (c) { return c.status === 'Closed'; }).length;
    document.getElementById('fb-disc-kpis').innerHTML = [
      ui.statCardHtml({ label: 'Open cases', value: open }),
      ui.statCardHtml({ label: 'Payroll deductions flagged', value: flagged }),
      ui.statCardHtml({ label: 'Closed this cycle', value: closed })
    ].join('');
  }

  function renderTable() {
    var rows = store.get('disciplinaryCases').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-disc-table', rows: rows, searchable: true, searchKeys: ['reason'],
      filter: { key: 'status', options: ['Pending HR Review', 'Closed'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? e.jobTitle : ''); } },
        { key: 'type', label: 'Type', render: function (r) { return ui.tag(r.type); } },
        { key: 'reason', label: 'Reason' },
        { key: 'initiatedBy', label: 'Initiated by', render: function (r) { return ui.escapeHtml(store.employeeName(r.initiatedBy)); } },
        { key: 'payrollDeductionFlag', label: 'Payroll', render: function (r) { return r.payrollDeductionFlag ? ui.badge('escalated', 'Deduction flagged') : '<span class="fb-faint fb-xs">—</span>'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Date', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openCaseModal,
      emptyMessage: 'No disciplinary cases on file.'
    });
  }

  function openCaseModal(c) {
    var e = store.employee(c.employeeId);
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Type</div><div class="fb-bold">' + ui.escapeHtml(c.type) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Initiated by</div><div class="fb-bold">' + ui.escapeHtml(store.employeeName(c.initiatedBy)) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Date</div><div class="fb-bold">' + ui.fmtDate(c.createdAt) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint">Reason</div><p class="fb-small">' + ui.escapeHtml(c.reason) + '</p>' +
      '<div class="fb-xs fb-faint">Initiator recommendation</div><p class="fb-small">' + ui.escapeHtml(c.recommendation) + '</p>' +
      (c.status === 'Closed'
        ? '<div class="fb-xs fb-faint">HR counter-recommendation</div><p class="fb-small">' + ui.escapeHtml(c.counterRecommendation || 'None — initiator recommendation upheld.') + '</p>' +
          (c.payrollDeductionFlag ? '<div class="fb-restricted-note">⚠️ Payroll deduction flagged for this case.</div>' : '')
        : '<div class="fb-field"><label>HR counter-recommendation (optional)</label><textarea id="dc-counter" placeholder="Leave blank to uphold the recommendation as-is."></textarea></div>' +
          '<div class="fb-checkbox"><input type="checkbox" id="dc-deduction" /><label for="dc-deduction">Flag a payroll deduction for this sanction</label></div>');

    ui.modal({
      title: c.type + ' — ' + e.firstName + ' ' + e.lastName, body: body,
      footer: c.status === 'Closed' ? '' : '<button class="fb-btn fb-btn--primary" data-act="close">Record decision &amp; close case</button>',
      onMount: function (box) {
        var btn = box.querySelector('[data-act="close"]');
        if (btn) btn.addEventListener('click', function () {
          var counter = document.getElementById('dc-counter').value.trim();
          var deduction = document.getElementById('dc-deduction').checked;
          store.update('disciplinaryCases', c.id, { status: 'Closed', counterRecommendation: counter, payrollDeductionFlag: deduction });
          store.auditLog(store.currentUser().id, c.type + ' case closed' + (deduction ? ' with payroll deduction' : ''), 'Employee', e.id);
          if (deduction) store.notify('Payroll deduction flagged', c.type + ' for ' + e.firstName + ' ' + e.lastName + ' closed with a payroll deduction.', 'Disciplinary', 'admin/hrbp/disciplinary.html');
          ui.closeModal(); ui.toast('Case closed and recorded to employee profile.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  function openNewCaseModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="dn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Type</label><select id="dn-type"><option>Query</option><option>Warning</option><option>Suspension</option></select></div>' +
      '<div class="fb-field"><label>Reason</label><textarea id="dn-reason" placeholder="Describe the incident..."></textarea></div>' +
      '<div class="fb-field"><label>Recommendation</label><textarea id="dn-rec" placeholder="Your recommended action..."></textarea></div>';
    ui.modal({
      title: 'Initiate disciplinary case', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Send to HR for review</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var reason = document.getElementById('dn-reason').value.trim();
          if (!reason) { ui.toast('Describe the incident first.', 'error'); return; }
          var emp = store.employee(document.getElementById('dn-emp').value);
          store.insert('disciplinaryCases', {
            employeeId: emp.id, type: document.getElementById('dn-type').value, initiatedBy: store.currentUser().id,
            reason: reason, recommendation: document.getElementById('dn-rec').value.trim() || 'No recommendation provided.',
            counterRecommendation: '', status: 'Pending HR Review', payrollDeductionFlag: false
          });
          store.notify('Disciplinary case pending review', document.getElementById('dn-type').value + ' initiated for ' + emp.firstName + ' ' + emp.lastName + '.', 'Disciplinary', 'admin/hrbp/disciplinary.html');
          ui.closeModal(); ui.toast('Case sent to HR for review.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderKpis(); renderTable();
    document.getElementById('fb-btn-new-case').addEventListener('click', openNewCaseModal);
  });
})();
