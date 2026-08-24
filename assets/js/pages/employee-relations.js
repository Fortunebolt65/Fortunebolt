/* ==========================================================================
   Page logic: Employee Relations & Self-Service (admin/hrbp/employee-relations.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderEss() {
    var rows = store.get('essRequests').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-ess-table', rows: rows, searchable: true, searchKeys: ['detail'],
      filter: { key: 'type', options: ['Document Update', 'Life Event'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? store.departmentName(e.departmentId) : ''); } },
        { key: 'type', label: 'Type', render: function (r) { return ui.tag(r.type); } },
        { key: 'detail', label: 'Detail' },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Submitted', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openEssModal,
      emptyMessage: 'No self-service requests.'
    });
  }

  function openEssModal(r) {
    var e = store.employee(r.employeeId);
    var pending = r.status.indexOf('Pending') === 0;
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Department</div><div class="fb-bold">' + ui.escapeHtml(store.departmentName(e.departmentId)) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint">' + (r.type === 'Document Update' ? 'Document / profile change requested' : 'Life event reported') + '</div>' +
      '<p class="fb-small">' + ui.escapeHtml(r.detail) + '</p>' +
      (r.type === 'Document Update' ? '<div class="fb-scope-note">Uploaded document is attached to the employee profile pending your approval.</div>' : '');
    ui.modal({
      title: r.type + ' — ' + e.firstName + ' ' + e.lastName, body: body,
      footer: pending ? '<button class="fb-btn fb-btn--primary" data-act="resolve">' + (r.type === 'Document Update' ? 'Approve update' : 'Acknowledge') + '</button>' : '',
      onMount: function (box) {
        var btn = box.querySelector('[data-act="resolve"]');
        if (btn) btn.addEventListener('click', function () {
          var nextStatus = r.type === 'Document Update' ? 'Approved' : 'Acknowledged';
          store.update('essRequests', r.id, { status: nextStatus });
          store.auditLog(store.currentUser().id, (r.type === 'Document Update' ? 'Approved profile update' : 'Acknowledged life event') + ' for ' + e.firstName + ' ' + e.lastName, 'Employee', e.id);
          ui.closeModal(); ui.toast('Request updated.', 'success'); renderEss();
        });
      }
    });
  }

  function renderLeave() {
    var rows = store.get('leaveRequests').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-leave-table', rows: rows, searchable: true, searchKeys: ['leaveType'],
      filter: { key: 'status', options: ['Pending Line Manager Approval', 'Approved', 'Rejected'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? e.jobTitle : ''); } },
        { key: 'leaveType', label: 'Type' },
        { key: 'startDate', label: 'From', render: function (r) { return ui.fmtDate(r.startDate); } },
        { key: 'days', label: 'Days' },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: function (r) {
        if (r.status.indexOf('Pending') !== 0) { ui.toast('This leave request has already been decided (' + r.status + ').', 'info'); return; }
        ui.confirmModal({
          title: 'Decide on leave request', message: (store.employeeName(r.employeeId)) + ' requested ' + r.days + ' day(s) of ' + r.leaveType + ' starting ' + ui.fmtDate(r.startDate) + '. Approve it?',
          confirmLabel: 'Approve', onConfirm: function () { store.update('leaveRequests', r.id, { status: 'Approved' }); ui.toast('Leave approved.', 'success'); renderLeave(); }
        });
      },
      emptyMessage: 'No leave requests.'
    });
  }

  var WELFARE_STAGES = ['Pending HRBP Review', 'Pending Finance Approval', 'Approved', 'Paid'];
  function renderWelfare() {
    var rows = store.get('welfareRequests').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-welfare-table', rows: rows, searchable: true, searchKeys: ['benefitType'],
      filter: { key: 'status', options: WELFARE_STAGES.concat(['Rejected']) },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'benefitType', label: 'Benefit' },
        { key: 'amount', label: 'Amount', render: function (r) { return ui.fmtMoney(r.amount); } },
        { key: 'evidenceUploaded', label: 'Evidence', render: function (r) { return r.evidenceUploaded ? '✅ Attached' : '— Missing'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openWelfareModal,
      emptyMessage: 'No welfare requests logged.'
    });
  }

  function welfareDisplaySteps(r) {
    var steps = (r.approvalHistory || []).slice();
    if (r.status !== 'Rejected' && r.status !== 'Paid') {
      var idx = WELFARE_STAGES.indexOf(r.status);
      WELFARE_STAGES.slice(idx).forEach(function (s, i) { steps.push({ stage: s, status: i === 0 ? 'current' : 'pending', action: i === 0 ? 'Awaiting decision' : undefined }); });
    }
    return steps;
  }

  function openWelfareModal(r) {
    r = store.getById('welfareRequests', r.id) || r;
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(r.employeeId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Benefit type</div><div class="fb-detail-item__value">' + ui.escapeHtml(r.benefitType) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Amount requested</div><div class="fb-detail-item__value">' + ui.fmtMoney(r.amount) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Evidence</div><div class="fb-detail-item__value">' + (r.evidenceUploaded ? 'Uploaded' : 'Not uploaded') + '</div></div>' +
      '<div><div class="fb-detail-item__label">Date requested</div><div class="fb-detail-item__value">' + ui.fmtDate(r.createdAt) + '</div></div>' +
      '</div>' + (r.evidenceUploaded ? '<div class="fb-attachment" style="margin-top:16px"><span class="fb-attachment__icon">📎</span> Supporting_evidence.pdf</div>' : '');

    var workflowHtml = '<div id="wf-workflow-timeline"></div>';
    var footer = '';
    if (r.status === 'Pending HRBP Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="hrbp-approve">Approve &amp; forward to Finance</button>';
    else if (r.status === 'Pending Finance Approval') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="finance-approve">Finance approve</button>';
    else if (r.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="mark-paid">Mark payment processed</button>';
    if (footer) workflowHtml += '<div class="fb-form-card" style="margin-top:20px"><div class="fb-form-card__title">Decision note</div><textarea id="wf-note" placeholder="Optional note..."></textarea></div>';

    ui.drawer({
      eyebrow: 'Welfare Request · ' + r.id,
      title: r.benefitType,
      subtitle: ui.badge(r.status),
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none">' + workflowHtml + '</section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#wf-workflow-timeline'), welfareDisplaySteps(r));
        function note() { var el = box.querySelector('#wf-note'); return el ? el.value.trim() : ''; }
        function bind(sel, stage, next, msg, notif) {
          var el = box.querySelector(sel); if (!el) return;
          el.addEventListener('click', function () {
            store.recordApproval('welfareRequests', r.id, { stage: stage, action: next === 'Rejected' ? 'Rejected' : next, comment: note() || msg, status: next === 'Rejected' ? 'rejected' : 'done', patch: { status: next } });
            if (notif) store.notify(notif.title, notif.body, 'Employee Relations', 'admin/hrbp/employee-relations.html');
            ui.closeDrawer(); ui.toast(msg, next === 'Rejected' ? 'error' : 'success'); renderWelfare();
          });
        }
        bind('[data-act="hrbp-approve"]', 'HRBP Review', 'Pending Finance Approval', 'Forwarded to Finance for approval.', { title: 'Welfare request awaiting Finance approval', body: store.employeeName(r.employeeId) + '’s ' + r.benefitType + ' request (' + ui.fmtMoney(r.amount) + ') needs Finance sign-off.' });
        bind('[data-act="finance-approve"]', 'Finance Approval', 'Approved', 'Approved by Finance. Ready for payment.', { title: 'Welfare request approved', body: store.employeeName(r.employeeId) + '’s ' + r.benefitType + ' request was approved by Finance.' });
        bind('[data-act="mark-paid"]', 'Payment Processed', 'Paid', 'Payment marked as processed.', { title: 'Welfare payment processed', body: store.employeeName(r.employeeId) + '’s ' + r.benefitType + ' payment has been processed.' });
        bind('[data-act="reject"]', r.status === 'Pending HRBP Review' ? 'HRBP Review' : 'Finance Approval', 'Rejected', 'Request rejected.');
      }
    });
  }

  function openNewWelfareModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Request details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="nw-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Benefit type</label><select id="nw-type"><option>Bereavement Support</option><option>Childbirth Allowance</option><option>Wedding Gift</option><option>Educational Grant</option><option>Emergency Welfare</option></select></div>' +
      '<div class="fb-field"><label>Amount (₦)</label><input type="number" id="nw-amount" placeholder="e.g. 50000" /></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📎 Supporting information</div>' +
      '<div class="fb-field"><label>Context / notes</label><textarea id="nw-notes" placeholder="Brief context for the request..."></textarea></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="nw-evidence" checked /><label for="nw-evidence">Evidence uploaded</label></div></div>';
    ui.drawer({
      title: 'Log welfare request', subtitle: 'Routes to HRBP, then Finance, before payment.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit for HRBP review</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var r = store.insert('welfareRequests', { employeeId: document.getElementById('nw-emp').value, benefitType: document.getElementById('nw-type').value, amount: Number(document.getElementById('nw-amount').value) || 0, evidenceUploaded: document.getElementById('nw-evidence').checked, status: 'Pending HRBP Review', approvalHistory: [] });
          store.recordApproval('welfareRequests', r.id, { stage: 'Request Submitted', action: 'Submitted welfare request', comment: document.getElementById('nw-notes').value.trim() || ('Requesting ' + r.benefitType.toLowerCase() + '.') });
          ui.closeDrawer(); ui.toast('Welfare request logged.', 'success'); renderWelfare();
        });
      }
    });
  }

  function renderSurveys() {
    var surveys = store.get('surveys');
    document.getElementById('fb-survey-cards').innerHTML = surveys.map(function (s) {
      var pct = s.targetCount ? Math.round((s.responseCount / s.targetCount) * 100) : 0;
      return '<div class="fb-card"><div class="fb-card__head"><span class="fb-card__title">' + ui.escapeHtml(s.title) + '</span>' + ui.badge(s.status) + '</div>' +
        '<div class="fb-xs fb-faint">Deployed to ' + s.deployedTo.length + ' department(s)</div>' +
        '<div id="sv-prog-' + s.id + '" style="margin:12px 0 6px"></div>' +
        '<div class="fb-small fb-muted">' + s.responseCount + ' of ' + s.targetCount + ' responses (' + pct + '%)</div></div>';
    }).join('');
    surveys.forEach(function (s) { ui.progressBar('#sv-prog-' + s.id, s.targetCount ? (s.responseCount / s.targetCount) * 100 : 0); });
  }

  function openNewSurveyModal() {
    var depts = store.get('departments');
    var body = '<div class="fb-field"><label>Survey title</label><input type="text" id="ns-title" placeholder="e.g. Manufacturing Safety Climate Survey" /></div>' +
      '<div class="fb-field"><label>Deploy to</label>' + depts.map(function (d) { return '<div class="fb-checkbox"><input type="checkbox" class="ns-dept" value="' + d.id + '" checked /><label>' + ui.escapeHtml(d.name) + '</label></div>'; }).join('') + '</div>';
    ui.modal({
      title: 'Deploy employee opinion survey', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="deploy">Notify HRBPs &amp; deploy</button>',
      onMount: function (box) {
        box.querySelector('[data-act="deploy"]').addEventListener('click', function () {
          var title = document.getElementById('ns-title').value.trim();
          if (!title) { ui.toast('Enter a survey title.', 'error'); return; }
          var depts = Array.from(box.querySelectorAll('.ns-dept:checked')).map(function (c) { return c.value; });
          store.insert('surveys', { title: title, status: 'Open', deployedTo: depts, responseCount: 0, targetCount: depts.length * 20 });
          store.notify('New survey deployed: ' + title, 'HRBPs notified prior to deployment, per policy.', 'Employee Relations', 'admin/hrbp/employee-relations.html');
          ui.closeModal(); ui.toast('Survey deployed.', 'success'); renderSurveys();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    ui.wireTabs('#fb-page-root');
    renderEss(); renderLeave(); renderWelfare(); renderSurveys();
    document.getElementById('fb-btn-new-welfare').addEventListener('click', openNewWelfareModal);
    document.getElementById('fb-btn-new-survey').addEventListener('click', openNewSurveyModal);
  });
})();
