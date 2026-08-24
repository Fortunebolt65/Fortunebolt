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
      onRowClick: openDrawer,
      emptyMessage: 'No drug requisitions logged.'
    });
  }

  function displaySteps(r) {
    var steps = (r.approvalHistory || []).slice();
    if (r.status !== 'Procured') {
      var idx = STAGES.indexOf(r.status);
      STAGES.slice(idx).forEach(function (s, i) { steps.push({ stage: s, status: i === 0 ? 'current' : 'pending', action: i === 0 ? 'Awaiting action' : undefined }); });
    }
    return steps;
  }

  function openDrawer(r) {
    r = store.getById('drugRequisitions', r.id) || r;
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Requested by</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(r.requestedBy)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Date</div><div class="fb-detail-item__value">' + ui.fmtDate(r.createdAt) + '</div></div>' +
      '</div><hr class="fb-divider" /><div class="fb-form-section-title">Items requested</div><p class="fb-small">' + ui.escapeHtml(r.drugs) + '</p>';
    var footer = '';
    if (r.status === 'Pending Approval') footer = '<button class="fb-btn fb-btn--primary" data-act="approve">Approve</button>';
    else if (r.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="procure">Mark procured</button>';
    ui.drawer({
      eyebrow: 'Drug Requisition · ' + r.id,
      title: 'Requisition — ' + store.employeeName(r.requestedBy),
      subtitle: ui.badge(r.status),
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none"><div id="dr-workflow-timeline"></div></section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#dr-workflow-timeline'), displaySteps(r));
        var approveBtn = box.querySelector('[data-act="approve"]');
        if (approveBtn) approveBtn.addEventListener('click', function () {
          store.recordApproval('drugRequisitions', r.id, { stage: 'Procurement Approval', action: 'Approved', comment: 'Approved for purchase — within budget.', patch: { status: 'Approved' } });
          store.notify('Drug requisition approved', 'Forwarded to Procurement Manager for sourcing.', 'Health & Wellness', 'admin/health/drug-requisition.html');
          ui.closeDrawer(); ui.toast('Approved. Procurement Manager notified.', 'success'); renderTable();
        });
        var procureBtn = box.querySelector('[data-act="procure"]');
        if (procureBtn) procureBtn.addEventListener('click', function () {
          store.recordApproval('drugRequisitions', r.id, { stage: 'Fulfilled', action: 'Procured', comment: 'Stock delivered to clinic.', patch: { status: 'Procured' } });
          store.notify('Drugs procured', 'Requisition fulfilled and stock delivered to the clinic.', 'Health & Wellness', 'admin/health/drug-requisition.html');
          ui.closeDrawer(); ui.toast('Marked procured. Nurse notified.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewModal() {
    var body = '<div class="fb-form-card"><div class="fb-form-card__title">💊 Requisition details</div>' +
      '<div class="fb-field"><label>Items requested</label><textarea id="dn-items" placeholder="e.g. Paracetamol 500mg, ORS sachets..."></textarea></div>' +
      '<div class="fb-field"><label>Justification</label><input type="text" id="dn-reason" placeholder="e.g. Monthly restock, emergency stock..." /></div></div>';
    ui.drawer({
      title: 'New drug requisition', subtitle: 'Routes to Procurement for approval before fulfillment.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var items = document.getElementById('dn-items').value.trim();
          if (!items) { ui.toast('List the items requested.', 'error'); return; }
          var reason = document.getElementById('dn-reason').value.trim();
          var r = store.insert('drugRequisitions', { requestedBy: store.currentUser().id, drugs: items, status: 'Pending Approval', approvalHistory: [] });
          store.recordApproval('drugRequisitions', r.id, { stage: 'Requisition Submitted', action: 'Submitted requisition', comment: reason || 'Essential medicines restock.' });
          ui.closeDrawer(); ui.toast('Requisition submitted for approval.', 'success'); renderTable();
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
