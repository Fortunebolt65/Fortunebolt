/* ==========================================================================
   Page logic: Organizational Structure (admin/hrbp/org-structure.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderDeptChart() {
    var depts = store.get('departments');
    var counts = depts.map(function (d) { return store.find('employees', function (e) { return e.departmentId === d.id && e.status !== 'Exiting'; }).length; });
    ui.barChart('#fb-dept-chart', { labels: depts.map(function (d) { return d.short; }), values: counts });
  }

  function renderDeptCards() {
    var depts = store.get('departments');
    document.getElementById('fb-dept-cards').innerHTML = depts.map(function (d) {
      var staff = store.find('employees', function (e) { return e.departmentId === d.id; });
      var active = staff.filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
      var hod = staff.find(function (e) { return e.cadreId === 'CAD-6' || e.cadreId === 'CAD-7'; });
      return '<div class="fb-card">' +
        '<div class="fb-card__head"><span class="fb-card__title">' + ui.escapeHtml(d.name) + '</span></div>' +
        '<div class="fb-stat__value" style="font-size:1.6rem">' + active.length + '</div>' +
        '<div class="fb-xs fb-faint" style="margin-bottom:10px">active headcount</div>' +
        (hod ? '<div class="fb-small">Head: <strong>' + ui.escapeHtml(hod.firstName + ' ' + hod.lastName) + '</strong></div>' : '<div class="fb-small fb-faint">No HOD on file</div>') +
        '<button class="fb-btn fb-btn--ghost fb-btn--sm" style="margin-top:10px" data-view-dept="' + d.id + '">View roster →</button>' +
        '</div>';
    }).join('');
    document.querySelectorAll('[data-view-dept]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDeptRosterModal(btn.getAttribute('data-view-dept')); });
    });
  }

  function openDeptRosterModal(deptId) {
    var d = store.department(deptId);
    var staff = store.find('employees', function (e) { return e.departmentId === deptId; }).sort(function (a, b) { return store.cadre(b.cadreId).level - store.cadre(a.cadreId).level; });
    var body = '<div class="fb-table-wrap"><table class="fb-table"><thead><tr><th>Name</th><th>Title</th><th>Grade</th><th>Reports to</th><th>Status</th></tr></thead><tbody>' +
      staff.map(function (e) {
        return '<tr><td>' + ui.personCell(e.firstName + ' ' + e.lastName) + '</td><td class="fb-cell-muted">' + ui.escapeHtml(e.jobTitle) + '</td><td>' + ui.escapeHtml(store.cadreName(e.cadreId)) + '</td><td class="fb-cell-muted">' + (e.managerId ? ui.escapeHtml(store.employeeName(e.managerId)) : '—') + '</td><td>' + ui.badge(e.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    ui.modal({ title: d.name + ' — roster (' + staff.length + ')', wide: true, body: body });
  }

  function employee360(e) {
    var appraisals = store.find('appraisals', function (a) { return a.employeeId === e.id; });
    var enrollments = store.find('enrollments', function (n) { return n.employeeId === e.id; });
    var discCases = store.find('disciplinaryCases', function (c) { return c.employeeId === e.id; });
    var exitCase = store.findOne('exitCases', function (x) { return x.employeeId === e.id; });
    var medBills = store.find('medicalBills', function (b) { return b.employeeId === e.id; });
    var chips = [];
    chips.push(appraisals.length + ' appraisal(s)');
    chips.push(enrollments.length + ' training enrollment(s)');
    if (discCases.length) chips.push(discCases.length + ' disciplinary case(s)');
    if (exitCase) chips.push('Exit case: ' + exitCase.status);
    if (medBills.length) chips.push(medBills.length + ' medical bill(s)');
    return chips.map(function (c) { return ui.tag(c); }).join(' ');
  }

  function openEmployeeModal(e) {
    var body = '<div class="fb-flex" style="margin-bottom:16px"><span class="fb-avatar fb-avatar--lg">' + ui.escapeHtml(e.photoInitials) + '</span>' +
      '<div><div class="fb-bold" style="font-size:1.05rem">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div><div class="fb-small fb-muted">' + ui.escapeHtml(e.jobTitle) + '</div></div></div>' +
      '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Staff ID</div><div class="fb-bold">' + ui.escapeHtml(e.staffId) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Department</div><div class="fb-bold">' + ui.escapeHtml(store.departmentName(e.departmentId)) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Grade</div><div class="fb-bold">' + ui.escapeHtml(store.cadreName(e.cadreId)) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Reports to</div><div class="fb-bold">' + (e.managerId ? ui.escapeHtml(store.employeeName(e.managerId)) : '—') + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Email</div><div class="fb-bold">' + ui.escapeHtml(e.email) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Phone</div><div class="fb-bold">' + ui.escapeHtml(e.phone) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Location</div><div class="fb-bold">' + ui.escapeHtml(e.location) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Employment date</div><div class="fb-bold">' + ui.fmtDate(e.employmentDate) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint" style="margin-bottom:8px">Status</div>' + ui.badge(e.status) + ' <span class="fb-tag" style="margin-left:6px">' + ui.escapeHtml(e.confirmationStatus) + '</span>' +
      '<hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint" style="margin-bottom:8px">Across other modules (Employee 360)</div><div>' + employee360(e) + '</div>';
    ui.modal({ title: 'Employee record', wide: true, body: body });
  }

  function renderDirectory() {
    var all = store.get('employees');
    var emps = all.filter(function (e) { return e.status !== 'Exiting'; }).concat(all.filter(function (e) { return e.status === 'Exiting'; }))
      .map(function (e) { return Object.assign({ __deptName: store.departmentName(e.departmentId) }, e); });
    document.getElementById('fb-emp-count').textContent = emps.length + ' employee(s)';
    var deptOptions = store.get('departments').map(function (d) { return d.name; });
    ui.table({
      container: '#fb-emp-table', rows: emps, searchable: true, searchKeys: ['firstName', 'lastName', 'jobTitle', 'staffId'],
      searchPlaceholder: 'Search by name, title, staff ID...',
      filter: { key: '__deptName', options: deptOptions, allLabel: 'All departments' },
      columns: [
        { key: 'firstName', label: 'Employee', render: function (e) { return ui.personCell(e.firstName + ' ' + e.lastName, e.staffId); } },
        { key: 'jobTitle', label: 'Title' },
        { key: '__deptName', label: 'Department', render: function (e) { return ui.escapeHtml(store.departmentName(e.departmentId)); } },
        { key: 'cadreId', label: 'Grade', render: function (e) { return ui.escapeHtml(store.cadreName(e.cadreId)); } },
        { key: 'status', label: 'Status', render: function (e) { return ui.badge(e.status); } }
      ],
      onRowClick: openEmployeeModal,
      emptyMessage: 'No employees match.'
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    ui.wireTabs('#fb-page-root');
    renderDeptChart(); renderDeptCards(); renderDirectory();

    var focus = new URLSearchParams(location.search).get('focus');
    if (focus) {
      var emp = store.employee(focus);
      if (emp) openEmployeeModal(emp);
    }
  });
})();
