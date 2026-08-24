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
      onRowClick: openExitModal,
      emptyMessage: 'No exit cases logged.'
    });
  }

  function assetChecklistHtml(x) {
    return x.assetChecklist.map(function (item, idx) {
      return '<div class="fb-checkbox"><input type="checkbox" class="ex-asset" data-idx="' + idx + '" ' + (item.returned ? 'checked' : '') + ' ' + (x.status === 'Completed' ? 'disabled' : '') + ' /><label>' + ui.escapeHtml(item.item) + '</label></div>';
    }).join('');
  }

  function openExitModal(x) {
    var e = store.employee(x.employeeId);
    var allReturned = x.assetChecklist.every(function (a) { return a.returned; });
    var readyForSettlement = allReturned && x.clearanceStatus === 'Completed' && x.handoverStatus === 'Completed' && x.exitQuestionnaireStatus === 'Completed';
    var body = '<div id="ex-stepper"></div>' +
      '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Type</div><div class="fb-bold">' + ui.escapeHtml(x.type) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Notice date</div><div class="fb-bold">' + ui.fmtDate(x.noticeDate) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Last working day</div><div class="fb-bold">' + ui.fmtDate(x.lastWorkingDate) + '</div></div>' +
      '</div><hr class="fb-divider" />';

    if (x.status === 'Completed') {
      body += '<div class="fb-scope-note">Exit completed. Final settlement processed and headcount updated.</div>';
    } else {
      body += '<div class="fb-form-section-title">Clearance &amp; handover</div>' +
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

    ui.modal({
      title: 'Exit — ' + e.firstName + ' ' + e.lastName, wide: true, body: body, footer: footer,
      onMount: function (box) {
        ui.stepper(box.querySelector('#ex-stepper'), STAGES, stageIndex(x));
        var saveBtn = box.querySelector('[data-act="save"]');
        if (saveBtn) saveBtn.addEventListener('click', function () {
          var checklist = x.assetChecklist.map(function (item, idx) {
            var cb = box.querySelector('.ex-asset[data-idx="' + idx + '"]');
            return Object.assign({}, item, { returned: cb ? cb.checked : item.returned });
          });
          store.update('exitCases', x.id, {
            clearanceStatus: document.getElementById('ex-clearance').value,
            handoverStatus: document.getElementById('ex-handover').value,
            exitQuestionnaireStatus: document.getElementById('ex-quest').value,
            assetChecklist: checklist
          });
          ui.closeModal(); ui.toast('Exit case updated.', 'success'); renderTable();
        });
        var settleBtn = box.querySelector('[data-act="settle"]');
        if (settleBtn) settleBtn.addEventListener('click', function () {
          store.update('exitCases', x.id, { status: 'Completed', finalSettlementStatus: 'Processed' });
          store.update('employees', e.id, { status: 'Exited' });
          store.notify('Final settlement processed — ' + e.firstName + ' ' + e.lastName, 'Exit completed. Employee moved out of active headcount and payroll.', 'Exit Management', 'admin/hrbp/exit-management.html');
          store.auditLog(store.currentUser().id, 'Completed exit and processed final settlement', 'Employee', e.id);
          ui.closeModal(); ui.toast('Exit completed. Final settlement acknowledgment issued.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewExitModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="ne-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Type</label><select id="ne-type"><option>Resignation</option><option>Termination</option><option>Retirement</option></select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Notice date</label><input type="date" id="ne-notice" /></div><div class="fb-field"><label>Last working day</label><input type="date" id="ne-last" /></div></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="ne-doc" checked /><label for="ne-doc">Signed resignation document uploaded</label></div>';
    ui.modal({
      title: 'Log resignation / exit', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create exit case</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('ne-emp').value;
          var emp = store.employee(empId);
          var notice = document.getElementById('ne-notice').value || new Date().toISOString().slice(0, 10);
          var last = document.getElementById('ne-last').value || new Date().toISOString().slice(0, 10);
          store.insert('exitCases', {
            employeeId: empId, type: document.getElementById('ne-type').value, noticeDate: notice, lastWorkingDate: last,
            resignationDocSubmitted: document.getElementById('ne-doc').checked, clearanceStatus: 'In Progress',
            exitQuestionnaireStatus: 'Not Started', handoverStatus: 'In Progress',
            assetChecklist: [{ item: 'Company laptop', returned: false }, { item: 'ID card', returned: false }, { item: 'Access fob', returned: false }, { item: 'Fuel card', returned: false }],
            finalSettlementStatus: 'Not Started', status: 'In Progress', restrictedAccess: true
          });
          store.update('employees', empId, { status: 'Exiting' });
          store.notify('Resignation received — ' + emp.firstName + ' ' + emp.lastName, 'Last working day ' + ui.fmtDate(last) + '. Clearance process started.', 'Exit Management', 'admin/hrbp/exit-management.html');
          ui.closeModal(); ui.toast('Exit case created. HRBP notified.', 'success'); renderTable();
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
