/* ==========================================================================
   Page logic: Training Needs Analysis (admin/ld/tna.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderTable() {
    ui.table({
      container: '#fb-tna-table', rows: store.get('trainingNeeds').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['need'],
      filter: { key: 'status', options: ['Pending HOD Review', 'Approved', 'Rejected'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return e ? ui.personCell(e.firstName + ' ' + e.lastName, e.jobTitle) : '—'; } },
        { key: 'need', label: 'Identified need' },
        { key: 'hodId', label: 'HOD', render: function (r) { return ui.escapeHtml(store.employeeName(r.hodId)); } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Logged', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openDrawer,
      emptyMessage: 'No training needs logged.'
    });
  }

  function renderPlan() {
    var plan = store.get('trainingPlans')[store.get('trainingPlans').length - 1];
    var host = document.getElementById('fb-tna-plan');
    if (!plan) { host.innerHTML = '<div class="fb-empty">No active training plan.</div>'; return; }
    var items = plan.itemIds.map(function (id) { return store.getById('trainingNeeds', id); }).filter(Boolean);
    host.innerHTML = '<div class="fb-flex-between" style="margin-bottom:10px"><span class="fb-bold">' + ui.escapeHtml(plan.month) + '</span>' + ui.badge(plan.status) + '</div>' +
      (items.length ? '<div class="fb-table-wrap"><table class="fb-table"><thead><tr><th>Employee</th><th>Need</th></tr></thead><tbody>' +
        items.map(function (n) { return '<tr><td>' + ui.escapeHtml(store.employeeName(n.employeeId)) + '</td><td class="fb-cell-muted">' + ui.escapeHtml(n.need) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="fb-faint fb-small">No approved needs promoted to this plan yet.</div>');
  }

  function promoteToPlanAndLms(need) {
    var plans = store.get('trainingPlans');
    var plan = plans[plans.length - 1];
    if (plan && plan.itemIds.indexOf(need.id) === -1) store.update('trainingPlans', plan.id, { itemIds: plan.itemIds.concat([need.id]) });
    var courses = store.get('courses');
    var match = courses.find(function (c) { return c.title === need.need; }) || courses[Math.floor(Math.random() * courses.length)];
    var existing = store.findOne('enrollments', function (en) { return en.employeeId === need.employeeId && en.courseId === match.id; });
    if (!existing) store.insert('enrollments', { employeeId: need.employeeId, courseId: match.id, status: 'Enrolled', progress: 0, score: null, completedAt: null });
  }

  function displaySteps(n) {
    var steps = (n.approvalHistory || []).slice();
    if (n.status === 'Pending HOD Review') steps.push({ stage: 'HOD Review', status: 'current', action: 'Awaiting decision' });
    return steps;
  }

  function openDrawer(n) {
    n = store.getById('trainingNeeds', n.id) || n;
    var e = store.employee(n.employeeId);
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-detail-item__label">HOD</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(n.hodId)) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-form-section-title">Identified need</div><p class="fb-small fb-bold">' + ui.escapeHtml(n.need) + '</p>' +
      '<div class="fb-form-section-title">Justification</div><p class="fb-small">' + ui.escapeHtml(n.justification) + '</p>' +
      (n.status === 'Approved' ? '<div class="fb-scope-note">Approved — promoted to the current Training Plan and enrolled in the LMS.</div>' : '');
    var footer = n.status === 'Pending HOD Review' ? '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="approve">Approve as HOD</button>' : '';
    ui.drawer({
      eyebrow: 'Training Need · ' + n.id,
      title: e.firstName + ' ' + e.lastName,
      subtitle: ui.badge(n.status),
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none"><div id="tn-workflow-timeline"></div></section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#tn-workflow-timeline'), displaySteps(n));
        var approveBtn = box.querySelector('[data-act="approve"]');
        if (approveBtn) approveBtn.addEventListener('click', function () {
          store.recordApproval('trainingNeeds', n.id, { stage: 'HOD Review', action: 'Approved', comment: 'Approved — promoted to Training Plan and LMS enrollment.', patch: { status: 'Approved' } });
          promoteToPlanAndLms(n);
          store.notify('Training need approved — ' + e.firstName + ' ' + e.lastName, n.need + ' promoted to the Training Plan and LMS enrollment created.', 'Learning & Development', 'admin/ld/lms.html');
          ui.closeDrawer(); ui.toast('Approved. Promoted to Training Plan + LMS enrollment.', 'success'); renderTable(); renderPlan();
        });
        var rejectBtn = box.querySelector('[data-act="reject"]');
        if (rejectBtn) rejectBtn.addEventListener('click', function () {
          store.recordApproval('trainingNeeds', n.id, { stage: 'HOD Review', action: 'Rejected', comment: 'Not aligned with current departmental priorities.', status: 'rejected', patch: { status: 'Rejected' } });
          ui.closeDrawer(); ui.toast('Training need rejected.', 'info'); renderTable();
        });
      }
    });
  }

  function openNewNeedModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var courses = store.get('courses');
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">🔍 Need details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="tn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Identified need</label><select id="tn-need">' + courses.map(function (c) { return '<option>' + ui.escapeHtml(c.title) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Justification</label><textarea id="tn-just" placeholder="Why is this training needed? e.g. skill-gap identified via appraisal."></textarea></div></div>';
    ui.drawer({
      title: 'Log training need', subtitle: 'Sent to the employee\'s HOD for accept/reject before promotion to the Training Plan.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Send to HOD</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('tn-emp').value;
          var emp = store.employee(empId);
          var justification = document.getElementById('tn-just').value.trim() || 'No justification provided.';
          var n = store.insert('trainingNeeds', { employeeId: empId, need: document.getElementById('tn-need').value, justification: justification, status: 'Pending HOD Review', hodId: emp.managerId || store.currentUser().id, approvalHistory: [] });
          store.recordApproval('trainingNeeds', n.id, { stage: 'Need Identified', action: 'Logged training need', comment: justification });
          ui.closeDrawer(); ui.toast('Sent to HOD for review.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable(); renderPlan();
    document.getElementById('fb-btn-new-need').addEventListener('click', openNewNeedModal);
  });
})();
