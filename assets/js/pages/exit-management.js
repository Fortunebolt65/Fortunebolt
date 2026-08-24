/* ==========================================================================
   Page logic: Exit Management (admin/hrbp/exit-management.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Notice Received', 'Clearance & Handover', 'Final Settlement', 'Completed'];

  function stageIndex(x) {
    if (x.status === 'Completed') return 3;
    if (x.clearanceStatus === 'Completed' && x.handoverStatus === 'Completed') return 2;
    return 1;
  }

  function renderTable() {
    var rows = store.get('exitCases').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    ui.table({
      container: '#fb-exit-table', rows: rows, searchable: true, searchKeys: [],
      filter: { key: 'status', options: ['In Progress', 'Completed'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? e.jobTitle : ''); } },
        { key: 'type', label: 'Type' },
        { key: 'noticeDate', label: 'Notice date', render: function (r) { return ui.fmtDate(r.noticeDate); } },
        { key: 'lastWorkingDate', label: 'Last working day', render: function (r) { return ui.fmtDate(r.lastWorkingDate); } },
        { key: 'clearanceStatus', label: 'Clearance', render: function (r) { return ui.badge(r.clearanceStatus); } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openExitDrawer,
      emptyMessage: 'No exit cases logged.'
    });
  }

  function assetChecklistHtml(x) {
    return x.assetChecklist.map(function (item, idx) {
      return '<div class="fb-checkbox"><input type="checkbox" class="ex-asset" data-idx="' + idx + '" ' + (item.returned ? 'checked' : '') + ' ' + (x.status === 'Completed' ? 'disabled' : '') + ' /><label>' + ui.escapeHtml(item.item) + '</label></div>';
    }).join('');
  }

  function exitDisplaySteps(x) {
    var steps = (x.approvalHistory || []).slice();
    var idx = stageIndex(x);
    if (x.status !== 'Completed') {
      STAGES.slice(idx).forEach(function (s, i) { steps.push({ stage: s, status: i === 0 ? 'current' : 'pending', action: i === 0 ? 'In progress' : undefined }); });
    }
    return steps;
  }

  function openExitDrawer(x) {
    x = store.getById('exitCases', x.id) || x;
    var e = store.employee(x.employeeId);
    var allReturned = x.assetChecklist.every(function (a) { return a.returned; });
    var readyForSettlement = allReturned && x.clearanceStatus === 'Completed' && x.handoverStatus === 'Completed' && x.exitQuestionnaireStatus === 'Completed';

    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Type</div><div class="fb-detail-item__value">' + ui.escapeHtml(x.type) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Notice date</div><div class="fb-detail-item__value">' + ui.fmtDate(x.noticeDate) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Last working day</div><div class="fb-detail-item__value">' + ui.fmtDate(x.lastWorkingDate) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Resignation document</div><div class="fb-detail-item__value">' + (x.resignationDocSubmitted ? 'Signed copy uploaded' : 'Not yet uploaded') + '</div></div>' +
      '<div><div class="fb-detail-item__label">Final settlement</div><div class="fb-detail-item__value">' + ui.escapeHtml(x.finalSettlementStatus) + '</div></div>' +
      '</div>' + (x.restrictedAccess ? '<div class="fb-restricted-note" style="margin-top:16px">🔒 Final settlement and exit questionnaire results are restricted to a select few.</div>' : '');

    var clearanceHtml = '';
    if (x.status === 'Completed') {
      clearanceHtml = '<div class="fb-scope-note">Exit completed. Final settlement processed and headcount updated.</div>';
    } else {
      clearanceHtml = '<div class="fb-form-section-title">Clearance &amp; handover</div>' +
        '<div class="fb-field-row">' +
        '<div class="fb-field"><label>Clearance status</label><select id="ex-clearance"><option ' + (x.clearanceStatus === 'In Progress' ? 'selected' : '') + '>In Progress</option><option ' + (x.clearanceStatus === 'Completed' ? 'selected' : '') + '>Completed</option></select></div>' +
        '<div class="fb-field"><label>Handover status</label><select id="ex-handover"><option ' + (x.handoverStatus === 'In Progress' ? 'selected' : '') + '>In Progress</option><option ' + (x.handoverStatus === 'Completed' ? 'selected' : '') + '>Completed</option></select></div>' +
        '</div>' +
        '<div class="fb-field"><label>Exit questionnaire</label><select id="ex-quest"><option ' + (x.exitQuestionnaireStatus === 'Not Started' ? 'selected' : '') + '>Not Started</option><option ' + (x.exitQuestionnaireStatus === 'Sent' ? 'selected' : '') + '>Sent</option><option ' + (x.exitQuestionnaireStatus === 'Completed' ? 'selected' : '') + '>Completed</option></select></div>' +
        '<div class="fb-form-section-title">Company property checklist</div>' + assetChecklistHtml(x) +
        '<div class="fb-form-section-title">Final settlement</div>' +
        '<div class="fb-small fb-muted">' + (readyForSettlement ? 'All clearance steps complete — ready to process final payment.' : 'Complete clearance, handover, exit questionnaire, and asset return before processing final settlement.') + '</div>';
    }

    var footer = x.status === 'Completed' ? '' : '<button class="fb-btn" data-act="save">Save progress</button><button class="fb-btn fb-btn--primary" data-act="settle" ' + (readyForSettlement ? '' : 'disabled') + '>Process final settlement &amp; complete exit</button>';

    ui.drawer({
      eyebrow: 'Exit Case · ' + x.id,
      title: e.firstName + ' ' + e.lastName,
      subtitle: ui.badge(x.status),
      size: 'xl',
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }, { key: 'clearance', label: 'Clearance & Assets' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section>' +
        '<section data-fb-tabpanel="workflow" style="display:none"><div id="ex-workflow-timeline"></div></section>' +
        '<section data-fb-tabpanel="clearance" style="display:none">' + clearanceHtml + '</section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#ex-workflow-timeline'), exitDisplaySteps(x));
        var saveBtn = box.querySelector('[data-act="save"]');
        if (saveBtn) saveBtn.addEventListener('click', function () {
          var checklist = x.assetChecklist.map(function (item, idx) {
            var cb = box.querySelector('.ex-asset[data-idx="' + idx + '"]');
            return Object.assign({}, item, { returned: cb ? cb.checked : item.returned });
          });
          var clearance = document.getElementById('ex-clearance').value, handover = document.getElementById('ex-handover').value, quest = document.getElementById('ex-quest').value;
          store.recordApproval('exitCases', x.id, { stage: 'Clearance & Handover', action: 'Progress updated', comment: 'Clearance: ' + clearance + '. Handover: ' + handover + '. Exit questionnaire: ' + quest + '.', patch: { clearanceStatus: clearance, handoverStatus: handover, exitQuestionnaireStatus: quest, assetChecklist: checklist } });
          ui.closeDrawer(); ui.toast('Exit case updated.', 'success'); renderTable();
        });
        var settleBtn = box.querySelector('[data-act="settle"]');
        if (settleBtn) settleBtn.addEventListener('click', function () {
          store.recordApproval('exitCases', x.id, { stage: 'Final Settlement', action: 'Final settlement processed', comment: 'All clearance steps complete. Final payment processed and acknowledgment issued.', patch: { status: 'Completed', finalSettlementStatus: 'Processed' } });
          store.update('employees', e.id, { status: 'Exited' });
          store.notify('Final settlement processed — ' + e.firstName + ' ' + e.lastName, 'Exit completed. Employee moved out of active headcount and payroll.', 'Exit Management', 'admin/hrbp/exit-management.html');
          store.auditLog(store.currentUser().id, 'Completed exit and processed final settlement', 'Employee', e.id);
          ui.closeDrawer(); ui.toast('Exit completed. Final settlement acknowledgment issued.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewExitModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Employee &amp; dates</div>' +
      '<div class="fb-field"><label>Employee</label><select id="ne-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Type</label><select id="ne-type"><option>Resignation</option><option>Termination</option><option>Retirement</option></select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Notice date</label><input type="date" id="ne-notice" value="' + new Date().toISOString().slice(0, 10) + '" /></div><div class="fb-field"><label>Last working day</label><input type="date" id="ne-last" /></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📝 Notes</div>' +
      '<div class="fb-field"><label>Reason / notes (optional)</label><textarea id="ne-notes" placeholder="Context for this exit..."></textarea></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="ne-doc" checked /><label for="ne-doc">Signed resignation document uploaded</label></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="ne-restricted" checked /><label for="ne-restricted">Restrict final settlement &amp; questionnaire results to select personnel</label></div></div>';
    ui.drawer({
      title: 'Log resignation / exit', subtitle: 'Starts the clearance, handover and final settlement workflow.', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create exit case</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('ne-emp').value;
          var emp = store.employee(empId);
          var notice = document.getElementById('ne-notice').value || new Date().toISOString().slice(0, 10);
          var last = document.getElementById('ne-last').value || new Date().toISOString().slice(0, 10);
          var notes = document.getElementById('ne-notes').value.trim();
          var x = store.insert('exitCases', {
            employeeId: empId, type: document.getElementById('ne-type').value, noticeDate: notice, lastWorkingDate: last,
            resignationDocSubmitted: document.getElementById('ne-doc').checked, clearanceStatus: 'In Progress',
            exitQuestionnaireStatus: 'Not Started', handoverStatus: 'In Progress',
            assetChecklist: [{ item: 'Company laptop', returned: false }, { item: 'ID card', returned: false }, { item: 'Access fob', returned: false }, { item: 'Fuel card', returned: false }],
            finalSettlementStatus: 'Not Started', status: 'In Progress', restrictedAccess: document.getElementById('ne-restricted').checked, approvalHistory: []
          });
          store.recordApproval('exitCases', x.id, { stage: 'Notice Received', action: document.getElementById('ne-type').value + ' submitted', comment: notes || 'Signed document uploaded. Clearance process started.' });
          store.update('employees', empId, { status: 'Exiting' });
          store.notify('Resignation received — ' + emp.firstName + ' ' + emp.lastName, 'Last working day ' + ui.fmtDate(last) + '. Clearance process started.', 'Exit Management', 'admin/hrbp/exit-management.html');
          ui.closeDrawer(); ui.toast('Exit case created. HRBP notified.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-exit').addEventListener('click', openNewExitModal);
  });
})();
