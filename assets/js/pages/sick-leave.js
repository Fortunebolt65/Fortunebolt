/* ==========================================================================
   Page logic: Sick Leave / Excuse Duty (admin/health/sick-leave.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Pending Supervisor Review', 'Pending Clinic Review', 'Approved'];

  function renderTable() {
    ui.table({
      container: '#fb-sck-table', rows: store.get('sickLeaveRequests').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['reason'],
      filter: { key: 'status', options: ['Pending Supervisor Review', 'Pending Clinic Review', 'Approved', 'Rejected'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'reason', label: 'Reason' },
        { key: 'startDate', label: 'From', render: function (r) { return ui.fmtDate(r.startDate); } },
        { key: 'endDate', label: 'To', render: function (r) { return ui.fmtDate(r.endDate); } },
        { key: 'medicalReportAttached', label: 'Medical report', render: function (r) { return r.medicalReportAttached ? '✅ Attached' : '— Missing'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openDrawer,
      emptyMessage: 'No sick leave requests logged.'
    });
  }

  function displaySteps(r) {
    var steps = (r.approvalHistory || []).slice();
    if (r.status !== 'Approved' && r.status !== 'Rejected') {
      var idx = STAGES.indexOf(r.status);
      STAGES.slice(idx).forEach(function (s, i) { steps.push({ stage: s, status: i === 0 ? 'current' : 'pending', action: i === 0 ? 'Awaiting decision' : undefined }); });
    }
    return steps;
  }

  function openDrawer(r) {
    r = store.getById('sickLeaveRequests', r.id) || r;
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(r.employeeId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">From</div><div class="fb-detail-item__value">' + ui.fmtDate(r.startDate) + '</div></div>' +
      '<div><div class="fb-detail-item__label">To</div><div class="fb-detail-item__value">' + ui.fmtDate(r.endDate) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Medical report</div><div class="fb-detail-item__value">' + (r.medicalReportAttached ? 'Attached' : 'Not attached') + '</div></div>' +
      '</div><hr class="fb-divider" /><div class="fb-form-section-title">Reason</div><p class="fb-small">' + ui.escapeHtml(r.reason) + '</p>' +
      (r.medicalReportAttached ? '<div class="fb-attachment"><span class="fb-attachment__icon">📄</span> Medical_report.pdf</div>' : '<p class="fb-small fb-faint">Clinic may request a report before final approval.</p>');
    var footer = '';
    if (r.status === 'Pending Supervisor Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="supervisor-approve">Supervisor approve</button>';
    else if (r.status === 'Pending Clinic Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="clinic-approve">Clinic approve &amp; record to profile</button>';
    ui.drawer({
      eyebrow: 'Sick Leave · ' + r.id,
      title: store.employeeName(r.employeeId),
      subtitle: ui.badge(r.status),
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none"><div id="sl-workflow-timeline"></div></section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#sl-workflow-timeline'), displaySteps(r));
        var supBtn = box.querySelector('[data-act="supervisor-approve"]');
        if (supBtn) supBtn.addEventListener('click', function () {
          store.recordApproval('sickLeaveRequests', r.id, { stage: 'Supervisor Review', action: 'Endorsed', comment: 'Endorsed, forwarded to Clinic.', patch: { status: 'Pending Clinic Review' } });
          ui.closeDrawer(); ui.toast('Forwarded to Clinic for review.', 'success'); renderTable();
        });
        var clinicBtn = box.querySelector('[data-act="clinic-approve"]');
        if (clinicBtn) clinicBtn.addEventListener('click', function () {
          store.recordApproval('sickLeaveRequests', r.id, { stage: 'Clinic Review', action: 'Approved', comment: 'Medical report reviewed and accepted. Recorded to employee profile.', patch: { status: 'Approved' } });
          store.auditLog(store.currentUser().id, 'Approved sick leave and recorded to profile', 'Employee', r.employeeId);
          ui.closeDrawer(); ui.toast('Approved and recorded to employee profile.', 'success'); renderTable();
        });
        var rejectBtn = box.querySelector('[data-act="reject"]');
        if (rejectBtn) rejectBtn.addEventListener('click', function () {
          store.recordApproval('sickLeaveRequests', r.id, { stage: r.status === 'Pending Supervisor Review' ? 'Supervisor Review' : 'Clinic Review', action: 'Rejected', comment: 'Insufficient documentation provided.', status: 'rejected', patch: { status: 'Rejected' } });
          ui.closeDrawer(); ui.toast('Request rejected.', 'error'); renderTable();
        });
      }
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">🤒 Request details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="sn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>From</label><input type="date" id="sn-start" /></div><div class="fb-field"><label>To</label><input type="date" id="sn-end" /></div></div>' +
      '<div class="fb-field"><label>Reason</label><input type="text" id="sn-reason" placeholder="e.g. Malaria treatment" /></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="sn-report" checked /><label for="sn-report">Medical report attached</label></div></div>';
    ui.drawer({
      title: 'Log sick leave request', subtitle: 'Routes through the line supervisor, then Clinic, before it is recorded to profile.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var r = store.insert('sickLeaveRequests', {
            employeeId: document.getElementById('sn-emp').value, startDate: document.getElementById('sn-start').value || new Date().toISOString().slice(0, 10),
            endDate: document.getElementById('sn-end').value || new Date().toISOString().slice(0, 10), reason: document.getElementById('sn-reason').value.trim() || 'Not specified',
            medicalReportAttached: document.getElementById('sn-report').checked, status: 'Pending Supervisor Review', approvalHistory: []
          });
          store.recordApproval('sickLeaveRequests', r.id, { stage: 'Request Submitted', action: 'Applied for sick leave', comment: r.medicalReportAttached ? 'Medical report attached.' : 'No medical report attached yet.' });
          ui.closeDrawer(); ui.toast('Request logged for supervisor review.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-sick').addEventListener('click', openNewModal);
  });
})();
