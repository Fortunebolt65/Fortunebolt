/* ==========================================================================
   Page logic: Disciplinary Management (admin/hrbp/disciplinary.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Query Raised', 'HR Review', 'Closed'];

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
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return e ? ui.personCell(e.firstName + ' ' + e.lastName, e.jobTitle) : '—'; } },
        { key: 'type', label: 'Type', render: function (r) { return ui.tag(r.type); } },
        { key: 'reason', label: 'Reason' },
        { key: 'initiatedBy', label: 'Initiated by', render: function (r) { return ui.escapeHtml(store.employeeName(r.initiatedBy)); } },
        { key: 'payrollDeductionFlag', label: 'Payroll', render: function (r) { return r.payrollDeductionFlag ? ui.badge('escalated', 'Deduction flagged') : '<span class="fb-faint fb-xs">—</span>'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openCaseDrawer,
      emptyMessage: 'No disciplinary cases on file.'
    });
  }

  function caseDisplaySteps(c) {
    var steps = (c.approvalHistory || []).slice();
    if (c.status === 'Pending HR Review') {
      steps.push({ stage: 'HR Review', status: 'current', action: 'Awaiting HR decision' });
      steps.push({ stage: 'Closed', status: 'pending' });
    }
    return steps;
  }

  function openCaseDrawer(c) {
    c = store.getById('disciplinaryCases', c.id) || c;
    var e = store.employee(c.employeeId);
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Type</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.type) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Initiated by</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(c.initiatedBy)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Date raised</div><div class="fb-detail-item__value">' + ui.fmtDate(c.createdAt) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-form-section-title">Reason</div><p class="fb-small">' + ui.escapeHtml(c.reason) + '</p>' +
      '<div class="fb-form-section-title">Initiator recommendation</div><p class="fb-small">' + ui.escapeHtml(c.recommendation) + '</p>' +
      (c.status === 'Closed' ? '<div class="fb-form-section-title">HR counter-recommendation</div><p class="fb-small">' + ui.escapeHtml(c.counterRecommendation || 'None — initiator recommendation upheld.') + '</p>' +
        (c.payrollDeductionFlag ? '<div class="fb-restricted-note">⚠️ Payroll deduction flagged for this case.</div>' : '<div class="fb-scope-note">No payroll deduction applied.</div>') : '');

    var workflowHtml = '<div id="disc-workflow-timeline"></div>';
    if (c.status === 'Pending HR Review') {
      workflowHtml += '<div class="fb-form-card" style="margin-top:20px"><div class="fb-form-card__title">HR decision</div>' +
        '<div class="fb-field"><label>Counter-recommendation (optional)</label><textarea id="dc-counter" placeholder="Leave blank to uphold the initiator\'s recommendation as-is."></textarea></div>' +
        '<div class="fb-checkbox"><input type="checkbox" id="dc-deduction" /><label for="dc-deduction">Flag a payroll deduction for this sanction</label></div></div>';
    }

    ui.drawer({
      eyebrow: 'Disciplinary Case · ' + c.id,
      title: c.type + ' — ' + e.firstName + ' ' + e.lastName,
      subtitle: ui.badge(c.status),
      size: 'xl',
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none">' + workflowHtml + '</section>',
      footer: c.status === 'Pending HR Review' ? '<button class="fb-btn fb-btn--primary" data-act="close">Record decision &amp; close case</button>' : '',
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#disc-workflow-timeline'), caseDisplaySteps(c));
        var btn = box.querySelector('[data-act="close"]');
        if (btn) btn.addEventListener('click', function () {
          var counter = document.getElementById('dc-counter').value.trim();
          var deduction = document.getElementById('dc-deduction').checked;
          store.recordApproval('disciplinaryCases', c.id, { stage: 'HR Review', action: 'Case closed', comment: counter || 'Initiator recommendation upheld.', patch: { status: 'Closed', counterRecommendation: counter, payrollDeductionFlag: deduction } });
          store.auditLog(store.currentUser().id, c.type + ' case closed' + (deduction ? ' with payroll deduction' : ''), 'Employee', e.id);
          if (deduction) store.notify('Payroll deduction flagged', c.type + ' for ' + e.firstName + ' ' + e.lastName + ' closed with a payroll deduction.', 'Disciplinary', 'admin/hrbp/disciplinary.html');
          ui.closeDrawer(); ui.toast('Case closed and recorded to employee profile.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  function openNewCaseModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Who &amp; what</div>' +
      '<div class="fb-field"><label>Employee</label><select id="dn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Type</label><select id="dn-type"><option>Query</option><option>Warning</option><option>Suspension</option></select></div>' +
      '<div class="fb-field"><label>Incident date</label><input type="date" id="dn-date" value="' + new Date().toISOString().slice(0, 10) + '" /></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📝 Details</div>' +
      '<div class="fb-field"><label>Reason / description of incident</label><textarea id="dn-reason" placeholder="Describe the incident in detail..."></textarea></div>' +
      '<div class="fb-field"><label>Witnesses (optional)</label><input type="text" id="dn-witnesses" placeholder="Names of any witnesses" /></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="dn-evidence" /><label for="dn-evidence">Supporting evidence attached</label></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">✅ Recommendation</div>' +
      '<div class="fb-field"><label>Recommended action</label><textarea id="dn-rec" placeholder="Your recommended action..."></textarea></div></div>';
    ui.drawer({
      title: 'Initiate disciplinary case', subtitle: 'Routed to HR for review and final decision.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Send to HR for review</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var reason = document.getElementById('dn-reason').value.trim();
          if (!reason) { ui.toast('Describe the incident first.', 'error'); return; }
          var emp = store.employee(document.getElementById('dn-emp').value);
          var witnesses = document.getElementById('dn-witnesses').value.trim();
          var fullReason = reason + (witnesses ? ' Witnesses: ' + witnesses + '.' : '') + (document.getElementById('dn-evidence').checked ? ' Evidence attached.' : '');
          var c = store.insert('disciplinaryCases', {
            employeeId: emp.id, type: document.getElementById('dn-type').value, initiatedBy: store.currentUser().id,
            reason: fullReason, recommendation: document.getElementById('dn-rec').value.trim() || 'No recommendation provided.',
            counterRecommendation: '', status: 'Pending HR Review', payrollDeductionFlag: false, approvalHistory: []
          });
          store.recordApproval('disciplinaryCases', c.id, { stage: 'Query Raised', action: 'Initiated ' + c.type.toLowerCase(), comment: fullReason });
          store.notify('Disciplinary case pending review', document.getElementById('dn-type').value + ' initiated for ' + emp.firstName + ' ' + emp.lastName + '.', 'Disciplinary', 'admin/hrbp/disciplinary.html');
          ui.closeDrawer(); ui.toast('Case sent to HR for review.', 'success'); renderTable(); renderKpis();
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
