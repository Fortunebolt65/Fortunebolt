/* ==========================================================================
   Page logic: Guarantor Verification (admin/hrbp/guarantor-verification.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STATUSES = ['Pending Contact', 'Contacted — Awaiting Response', 'Verified', 'Flagged for Review'];

  function renderKpis() {
    var rows = store.get('guarantorChecks');
    document.getElementById('fb-gtv-kpis').innerHTML = [
      ui.statCardHtml({ label: 'Awaiting verification', value: rows.filter(function (r) { return r.status !== 'Verified' && r.status !== 'Flagged for Review'; }).length }),
      ui.statCardHtml({ label: 'Verified', value: rows.filter(function (r) { return r.status === 'Verified'; }).length }),
      ui.statCardHtml({ label: 'Flagged for review', value: rows.filter(function (r) { return r.status === 'Flagged for Review'; }).length })
    ].join('');
  }

  function renderTable() {
    var rows = store.get('guarantorChecks').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-gtv-table', rows: rows, searchable: true, searchKeys: ['guarantor1Name', 'guarantor2Name'],
      filter: { key: 'status', options: STATUSES },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'guarantor1Name', label: 'Guarantor 1', render: function (r) { return ui.escapeHtml(r.guarantor1Name) + '<div class="fb-xs fb-faint">' + ui.escapeHtml(r.guarantor1Relationship) + '</div>'; } },
        { key: 'guarantor2Name', label: 'Guarantor 2', render: function (r) { return ui.escapeHtml(r.guarantor2Name) + '<div class="fb-xs fb-faint">' + ui.escapeHtml(r.guarantor2Relationship) + '</div>'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No guarantor checks on file.'
    });
  }

  function openModal(r) {
    var body = '<div class="fb-xs fb-faint">Employee</div><p class="fb-bold">' + ui.escapeHtml(store.employeeName(r.employeeId)) + '</p>' +
      '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Guarantor 1</div><div class="fb-bold">' + ui.escapeHtml(r.guarantor1Name) + '</div><div class="fb-xs fb-muted">' + ui.escapeHtml(r.guarantor1Relationship) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Guarantor 2</div><div class="fb-bold">' + ui.escapeHtml(r.guarantor2Name) + '</div><div class="fb-xs fb-muted">' + ui.escapeHtml(r.guarantor2Relationship) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-field"><label>Verification status</label><select id="gv-status">' + STATUSES.map(function (s) { return '<option ' + (s === r.status ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Notes</label><textarea id="gv-notes" placeholder="Call notes, discrepancies, etc.">' + ui.escapeHtml(r.notes || '') + '</textarea></div>';
    ui.modal({
      title: 'Guarantor verification', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.update('guarantorChecks', r.id, { status: document.getElementById('gv-status').value, notes: document.getElementById('gv-notes').value.trim() });
          ui.closeModal(); ui.toast('Verification status updated.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderKpis(); renderTable();
  });
})();
