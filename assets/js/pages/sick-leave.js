/* ==========================================================================
   Page logic: Sick Leave / Excuse Duty (admin/health/sick-leave.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

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
      onRowClick: openModal,
      emptyMessage: 'No sick leave requests logged.'
    });
  }

  function openModal(r) {
    var body = '<div class="fb-xs fb-faint">Employee</div><p class="fb-bold">' + ui.escapeHtml(store.employeeName(r.employeeId)) + '</p>' +
      '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">From</div><div class="fb-bold">' + ui.fmtDate(r.startDate) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">To</div><div class="fb-bold">' + ui.fmtDate(r.endDate) + '</div></div>' +
      '</div><div class="fb-xs fb-faint" style="margin-top:10px">Reason</div><p class="fb-small">' + ui.escapeHtml(r.reason) + '</p>' +
      '<div class="fb-xs fb-faint">Medical report</div><p class="fb-small">' + (r.medicalReportAttached ? 'Attached' : 'Not attached — clinic may request one before approval.') + '</p>';
    var footer = '';
    if (r.status === 'Pending Supervisor Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="supervisor-approve">Supervisor approve</button>';
    else if (r.status === 'Pending Clinic Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="clinic-approve">Clinic approve &amp; record to profile</button>';
    ui.modal({
      title: 'Sick leave request', body: body, footer: footer,
      onMount: function (box) {
        var supBtn = box.querySelector('[data-act="supervisor-approve"]');
        if (supBtn) supBtn.addEventListener('click', function () { store.update('sickLeaveRequests', r.id, { status: 'Pending Clinic Review' }); ui.closeModal(); ui.toast('Forwarded to Clinic for review.', 'success'); renderTable(); });
        var clinicBtn = box.querySelector('[data-act="clinic-approve"]');
        if (clinicBtn) clinicBtn.addEventListener('click', function () {
          store.update('sickLeaveRequests', r.id, { status: 'Approved' });
          store.auditLog(store.currentUser().id, 'Approved sick leave and recorded to profile', 'Employee', r.employeeId);
          ui.closeModal(); ui.toast('Approved and recorded to employee profile.', 'success'); renderTable();
        });
        var rejectBtn = box.querySelector('[data-act="reject"]');
        if (rejectBtn) rejectBtn.addEventListener('click', function () { store.update('sickLeaveRequests', r.id, { status: 'Rejected' }); ui.closeModal(); ui.toast('Request rejected.', 'error'); renderTable(); });
      }
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="sn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>From</label><input type="date" id="sn-start" /></div><div class="fb-field"><label>To</label><input type="date" id="sn-end" /></div></div>' +
      '<div class="fb-field"><label>Reason</label><input type="text" id="sn-reason" placeholder="e.g. Malaria treatment" /></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="sn-report" checked /><label for="sn-report">Medical report attached</label></div>';
    ui.modal({
      title: 'Log sick leave request', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Submit</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.insert('sickLeaveRequests', {
            employeeId: document.getElementById('sn-emp').value, startDate: document.getElementById('sn-start').value || new Date().toISOString().slice(0, 10),
            endDate: document.getElementById('sn-end').value || new Date().toISOString().slice(0, 10), reason: document.getElementById('sn-reason').value.trim() || 'Not specified',
            medicalReportAttached: document.getElementById('sn-report').checked, status: 'Pending Supervisor Review'
          });
          ui.closeModal(); ui.toast('Request logged for supervisor review.', 'success'); renderTable();
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
