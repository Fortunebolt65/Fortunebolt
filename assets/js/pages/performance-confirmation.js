/* ==========================================================================
   Page logic: Interim & Confirmation Appraisals (admin/hrbp/performance-confirmation.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var TYPES = ['Interim', 'Pre-confirmation', 'Acting Confirmation'];

  function rows() { return store.get('appraisals').filter(function (a) { return TYPES.indexOf(a.type) !== -1; }); }

  function renderTable() {
    ui.table({
      container: '#fb-pc-table', rows: rows().slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['period'],
      filter: { key: 'type', options: TYPES },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? e.jobTitle : ''); } },
        { key: 'type', label: 'Type', render: function (r) { return ui.tag(r.type); } },
        { key: 'period', label: 'Period' },
        { key: 'score', label: 'Score', render: function (r) { return r.score !== null && r.score !== undefined ? r.score + '%' : '—'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openDrawer,
      emptyMessage: 'No interim or confirmation appraisals yet.'
    });
  }

  function displaySteps(a, e) {
    var steps = (a.approvalHistory || []).slice();
    if (a.status !== 'Approved') steps.push({ stage: 'Review', status: 'current', action: 'Awaiting score & approval' });
    else if (e.confirmationStatus !== 'Confirmed') steps.push({ stage: 'Confirmation Decision', status: 'current', action: 'Awaiting HR decision — confirm or place on PIP' });
    return steps;
  }

  function openDrawer(a) {
    a = store.getById('appraisals', a.id) || a;
    var e = store.employee(a.employeeId);
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Type</div><div class="fb-detail-item__value">' + ui.escapeHtml(a.type) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Period</div><div class="fb-detail-item__value">' + ui.escapeHtml(a.period) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Reviewer</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(a.reviewerId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Current confirmation status</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.confirmationStatus) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Score</div><div class="fb-detail-item__value">' + (a.score !== null ? a.score + '%' : 'Not yet scored') + '</div></div>' +
      '</div><hr class="fb-divider" />';

    if (a.status === 'Approved') {
      overviewHtml += '<div class="fb-form-section-title">Reviewer notes</div><p class="fb-small">' + ui.escapeHtml(a.resultNotes || '—') + '</p>';
    } else {
      overviewHtml += '<div class="fb-form-card"><div class="fb-form-card__title">📋 Score this review</div>' +
        '<div class="fb-field"><label>Score (%)</label><input type="number" id="pc-score" min="0" max="100" value="' + (a.score || '') + '" /></div>' +
        '<div class="fb-field"><label>Reviewer notes</label><textarea id="pc-notes" placeholder="Performance narrative for this review period...">' + ui.escapeHtml(a.resultNotes || '') + '</textarea></div></div>';
    }

    var workflowHtml = '<div id="pc-workflow-timeline"></div>';

    var footer = '';
    if (a.status !== 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="submit">Submit &amp; approve</button>';
    else if (e.confirmationStatus !== 'Confirmed') footer = '<button class="fb-btn fb-btn--danger" data-act="pip">Place on PIP (notify L&amp;D)</button><button class="fb-btn fb-btn--primary" data-act="confirm">Confirm employee</button>';

    ui.drawer({
      eyebrow: a.type + ' Appraisal · ' + a.id,
      title: e.firstName + ' ' + e.lastName,
      subtitle: ui.badge(a.status),
      size: 'xl',
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none">' + workflowHtml + '</section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#pc-workflow-timeline'), displaySteps(a, e));
        var submitBtn = box.querySelector('[data-act="submit"]');
        if (submitBtn) submitBtn.addEventListener('click', function () {
          var score = Number(document.getElementById('pc-score').value) || 0;
          var notes = document.getElementById('pc-notes').value.trim();
          store.recordApproval('appraisals', a.id, { stage: 'Review', action: 'Scored ' + score + '%', comment: notes || (a.type + ' review completed.'), patch: { score: score, resultNotes: notes, status: 'Approved' } });
          ui.closeDrawer(); ui.toast('Appraisal scored and approved.', 'success'); renderTable();
        });
        var confirmBtn = box.querySelector('[data-act="confirm"]');
        if (confirmBtn) confirmBtn.addEventListener('click', function () {
          store.recordApproval('appraisals', a.id, { stage: 'Confirmation Decision', action: 'Confirmed', comment: 'Scored ' + a.score + '%. Employee confirmed.' });
          store.update('employees', e.id, { confirmationStatus: 'Confirmed' });
          store.auditLog(store.currentUser().id, 'Confirmed employee following ' + a.type, 'Employee', e.id);
          store.notify('Confirmed — ' + e.firstName + ' ' + e.lastName, a.type + ' completed with a score of ' + a.score + '%. Employee confirmed.', 'Performance', 'admin/hrbp/performance-confirmation.html');
          ui.closeDrawer(); ui.toast(e.firstName + ' has been confirmed. Employee profile updated.', 'success'); renderTable();
        });
        var pipBtn = box.querySelector('[data-act="pip"]');
        if (pipBtn) pipBtn.addEventListener('click', function () {
          store.recordApproval('appraisals', a.id, { stage: 'Confirmation Decision', action: 'Placed on PIP', comment: 'Scored ' + a.score + '% — did not meet confirmation bar. L&D notified.', status: 'rejected' });
          store.update('employees', e.id, { status: 'On PIP' });
          var pip = store.insert('appraisals', { employeeId: e.id, type: 'PIP', period: 'PIP following ' + a.type, score: null, status: 'Pending Approval', reviewerId: a.reviewerId, resultNotes: 'Auto-generated after ' + a.type + ' scored ' + a.score + '%.', approvalHistory: [] });
          store.recordApproval('appraisals', pip.id, { stage: 'PIP Drafted', action: 'Auto-generated', comment: 'Generated after ' + a.type + ' scored ' + a.score + '%.' });
          store.notify('PIP triggered — ' + e.firstName + ' ' + e.lastName, a.type + ' scored ' + a.score + '%. L&D notified to support a Performance Improvement Plan.', 'Performance', 'admin/ld/performance-pip.html');
          store.auditLog(store.currentUser().id, 'Placed employee on PIP following ' + a.type, 'Employee', e.id);
          ui.closeDrawer(); ui.toast('L&D notified. PIP record created.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active' || e.status === 'Onboarding'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Appraisal details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="pn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Appraisal type</label><select id="pn-type">' + TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Period label</label><input type="text" id="pn-period" placeholder="e.g. 3-month interim review" /></div></div>' +
      '<div class="fb-field"><label>Appraiser (reviewer)</label><select id="pn-reviewer">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div></div>';
    ui.drawer({
      title: 'Start appraisal', subtitle: 'Interim (3-month), pre-confirmation (9-month), or acting-role confirmation review.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create draft</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('pn-emp').value;
          var emp = store.employee(empId);
          store.insert('appraisals', { employeeId: empId, type: document.getElementById('pn-type').value, period: document.getElementById('pn-period').value.trim() || document.getElementById('pn-type').value, score: null, status: 'Draft', reviewerId: document.getElementById('pn-reviewer').value || emp.managerId || store.currentUser().id, resultNotes: '', approvalHistory: [] });
          ui.closeDrawer(); ui.toast('Appraisal draft created.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-appraisal').addEventListener('click', openNewModal);
  });
})();
