/* ==========================================================================
   Page logic: Talent Management (admin/ld/talent-management.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var ROLES = ['Team Lead', 'Regional Manager', 'Specialist Track', 'HOD Successor', 'Cross-functional Rotation'];
  var STAGE_PCT = { 'Active': 45, 'Under Review': 20, 'Achieved': 100 };

  function renderKpis() {
    var plans = store.get('careerPlans');
    document.getElementById('fb-tm-kpis').innerHTML = [
      ui.statCardHtml({ label: 'Active career plans', value: plans.filter(function (p) { return p.status === 'Active'; }).length }),
      ui.statCardHtml({ label: 'Under review', value: plans.filter(function (p) { return p.status === 'Under Review'; }).length }),
      ui.statCardHtml({ label: 'Achieved', value: plans.filter(function (p) { return p.status === 'Achieved'; }).length })
    ].join('');
  }

  function renderTable() {
    ui.table({
      container: '#fb-tm-table', rows: store.get('careerPlans'), searchable: true, searchKeys: ['desiredRole', 'area'],
      filter: { key: 'status', options: ['Active', 'Under Review', 'Achieved'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return e ? ui.personCell(e.firstName + ' ' + e.lastName, e.jobTitle) : '—'; } },
        { key: 'desiredRole', label: 'Desired role' },
        { key: 'area', label: 'Area' },
        { key: 'timing', label: 'Timing' },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'progress', label: 'Career tracker', render: function (r) { return '<div style="width:120px"><div class="fb-progress"><div class="fb-progress__bar" style="width:' + (STAGE_PCT[r.status] || 0) + '%"></div></div></div>'; } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No career plans yet.'
    });
  }

  function openModal(p) {
    var e = store.employee(p.employeeId);
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + (e ? ui.escapeHtml(e.firstName + ' ' + e.lastName) : '—') + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Current role</div><div class="fb-bold">' + (e ? ui.escapeHtml(e.jobTitle) : '—') + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-field"><label>Desired role</label><select id="tm-role">' + ROLES.map(function (r) { return '<option ' + (r === p.desiredRole ? 'selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Timing</label><select id="tm-timing"><option ' + (p.timing === '6-12 months' ? 'selected' : '') + '>6-12 months</option><option ' + (p.timing === '1-2 years' ? 'selected' : '') + '>1-2 years</option><option ' + (p.timing === '2-3 years' ? 'selected' : '') + '>2-3 years</option></select></div>' +
      '<div class="fb-field"><label>Status</label><select id="tm-status"><option ' + (p.status === 'Under Review' ? 'selected' : '') + '>Under Review</option><option ' + (p.status === 'Active' ? 'selected' : '') + '>Active</option><option ' + (p.status === 'Achieved' ? 'selected' : '') + '>Achieved</option></select></div>' +
      '<div class="fb-form-section-title">Career tracker</div><div id="tm-progress"></div>';
    ui.modal({
      title: 'Career plan', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save</button>',
      onMount: function (box) {
        ui.progressBar(box.querySelector('#tm-progress'), STAGE_PCT[p.status] || 0);
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var status = document.getElementById('tm-status').value;
          store.update('careerPlans', p.id, { desiredRole: document.getElementById('tm-role').value, timing: document.getElementById('tm-timing').value, status: status });
          if (status === 'Achieved' && e) store.notify('Career milestone achieved — ' + e.firstName + ' ' + e.lastName, 'Reached the "' + p.desiredRole + '" milestone in their career plan.', 'Learning & Development', 'admin/ld/talent-management.html');
          ui.closeModal(); ui.toast('Career plan updated.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  function openNewPlanModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="tn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Desired role</label><select id="tn-role">' + ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Timing</label><select id="tn-timing"><option>6-12 months</option><option>1-2 years</option><option>2-3 years</option></select></div>';
    ui.modal({
      title: 'New career plan', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create plan</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('tn-emp').value;
          if (store.findOne('careerPlans', function (p) { return p.employeeId === empId; })) { ui.toast('This employee already has a career plan.', 'error'); return; }
          store.insert('careerPlans', { employeeId: empId, desiredRole: document.getElementById('tn-role').value, area: store.departmentName(store.employee(empId).departmentId), timing: document.getElementById('tn-timing').value, status: 'Under Review' });
          ui.closeModal(); ui.toast('Career plan created.', 'success'); renderTable(); renderKpis();
        });
      }
    });
  }

  function autoGenerate() {
    var recentApproved = store.get('appraisals').filter(function (a) { return a.type === 'Annual' && a.status === 'Approved'; });
    var created = 0;
    recentApproved.forEach(function (a) {
      if (store.findOne('careerPlans', function (p) { return p.employeeId === a.employeeId; })) return;
      var e = store.employee(a.employeeId);
      if (!e || e.status !== 'Active') return;
      store.insert('careerPlans', { employeeId: e.id, desiredRole: ROLES[Math.floor(Math.random() * ROLES.length)], area: store.departmentName(e.departmentId), timing: '1-2 years', status: 'Under Review' });
      created += 1;
    });
    ui.toast(created ? 'Generated ' + created + ' career plan(s) from completed appraisals.' : 'No new plans to generate — every appraised employee already has one.', created ? 'success' : 'info');
    renderTable(); renderKpis();
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderKpis(); renderTable();
    document.getElementById('fb-btn-new-plan').addEventListener('click', openNewPlanModal);
    document.getElementById('fb-btn-auto-generate').addEventListener('click', autoGenerate);
  });
})();
