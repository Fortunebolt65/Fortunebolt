/* ==========================================================================
   Page logic: Drug Requisition (admin/health/drug-requisition.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Pending Approval', 'Approved', 'Procured'];

  function renderTable() {
    ui.table({
      container: '#fb-drg-table', rows: store.get('drugRequisitions').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['drugs'],
      filter: { key: 'status', options: STAGES },
      columns: [
        { key: 'requestedBy', label: 'Requested by', render: function (r) { return ui.escapeHtml(store.employeeName(r.requestedBy)); } },
        { key: 'drugs', label: 'Items' },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Date', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No drug requisitions logged.'
    });
  }

  function openModal(r) {
    var body = '<div id="dr-stepper"></div><div class="fb-xs fb-faint">Requested by</div><p class="fb-bold">' + ui.escapeHtml(store.employeeName(r.requestedBy)) + '</p>' +
      '<div class="fb-xs fb-faint">Items</div><p class="fb-small">' + ui.escapeHtml(r.drugs) + '</p>';
    var footer = '';
    if (r.status === 'Pending Approval') footer = '<button class="fb-btn fb-btn--primary" data-act="approve">Approve</button>';
    else if (r.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="procure">Mark procured</button>';
    ui.modal({
      title: 'Drug requisition', body: body, footer: footer,
      onMount: function (box) {
        ui.stepper(box.querySelector('#dr-stepper'), STAGES, STAGES.indexOf(r.status));
        var approveBtn = box.querySelector('[data-act="approve"]');
        if (approveBtn) approveBtn.addEventListener('click', function () {
          store.update('drugRequisitions', r.id, { status: 'Approved' });
          store.notify('Drug requisition approved', 'Forwarded to Procurement Manager for sourcing.', 'Health & Wellness', 'admin/health/drug-requisition.html');
          ui.closeModal(); ui.toast('Approved. Procurement Manager notified.', 'success'); renderTable();
        });
        var procureBtn = box.querySelector('[data-act="procure"]');
        if (procureBtn) procureBtn.addEventListener('click', function () {
          store.update('drugRequisitions', r.id, { status: 'Procured' });
          store.notify('Drugs procured', 'Requisition fulfilled and stock delivered to the clinic.', 'Health & Wellness', 'admin/health/drug-requisition.html');
          ui.closeModal(); ui.toast('Marked procured. Nurse notified.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewModal() {
    var body = '<div class="fb-field"><label>Items requested</label><textarea id="dn-items" placeholder="e.g. Paracetamol 500mg, ORS sachets..."></textarea></div>';
    ui.modal({
      title: 'New drug requisition', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var items = document.getElementById('dn-items').value.trim();
          if (!items) { ui.toast('List the items requested.', 'error'); return; }
          store.insert('drugRequisitions', { requestedBy: store.currentUser().id, drugs: items, status: 'Pending Approval' });
          ui.closeModal(); ui.toast('Requisition submitted for approval.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-drug').addEventListener('click', openNewModal);
  });
})();
