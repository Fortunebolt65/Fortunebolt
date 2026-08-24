/* ==========================================================================
   Page logic: L&D Reporting (admin/ld/reporting.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderPopularity() {
    var courses = store.get('courses');
    var counts = courses.map(function (c) { return store.find('enrollments', function (e) { return e.courseId === c.id; }).length; });
    ui.barChart('#rp-popularity', { labels: courses.map(function (c) { return c.title.split(' ').slice(0, 2).join(' '); }), values: counts });
    document.querySelector('[data-export="popularity"]').addEventListener('click', function () {
      ui.exportCsv('course-popularity.csv', [{ label: 'Course', value: function (r) { return r.title; } }, { label: 'Enrollments', value: function (r) { return r.count; } }], courses.map(function (c, i) { return { title: c.title, count: counts[i] }; }));
    });
  }

  function renderDept() {
    var depts = store.get('departments');
    var rows = depts.map(function (d) {
      var staffIds = store.find('employees', function (e) { return e.departmentId === d.id; }).map(function (e) { return e.id; });
      var completions = store.find('enrollments', function (e) { return staffIds.indexOf(e.employeeId) !== -1 && e.status === 'Completed'; }).length;
      return { name: d.name, completions: completions };
    });
    document.getElementById('rp-dept').innerHTML = rows.map(function (r) { return '<div class="fb-flex-between" style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">' + ui.escapeHtml(r.name) + '</span><span class="fb-bold">' + r.completions + '</span></div>'; }).join('');
    document.querySelector('[data-export="dept"]').addEventListener('click', function () {
      ui.exportCsv('departmental-training-report.csv', [{ label: 'Department', value: function (r) { return r.name; } }, { label: 'Completions', value: function (r) { return r.completions; } }], rows);
    });
  }

  function renderTnaFunnel() {
    var needs = store.get('trainingNeeds');
    var statuses = ['Pending HOD Review', 'Approved', 'Rejected'];
    var counts = statuses.map(function (s) { return needs.filter(function (n) { return n.status === s; }).length; });
    ui.barChart('#rp-tna', { labels: statuses.map(function (s) { return s.split(' ')[0]; }), values: counts });
    document.querySelector('[data-export="tna"]').addEventListener('click', function () {
      ui.exportCsv('training-needs-funnel.csv', [{ label: 'Status', value: function (r) { return r.status; } }, { label: 'Count', value: function (r) { return r.count; } }], statuses.map(function (s, i) { return { status: s, count: counts[i] }; }));
    });
  }

  function renderDelivery() {
    var schedules = store.get('trainingSchedules');
    var external = schedules.filter(function (s) { return s.facilitator.indexOf('External') === 0; }).length;
    var internal = schedules.length - external;
    ui.barChart('#rp-delivery', { labels: ['Internal', 'External'], values: [internal, external] });
    document.querySelector('[data-export="delivery"]').addEventListener('click', function () {
      ui.exportCsv('internal-vs-external.csv', [{ label: 'Type', value: function (r) { return r.type; } }, { label: 'Sessions', value: function (r) { return r.count; } }], [{ type: 'Internal', count: internal }, { type: 'External', count: external }]);
    });
  }

  function renderPrePost() {
    var completed = store.get('enrollments').filter(function (e) { return e.status === 'Completed' && e.score !== null; });
    var pairs = completed.map(function (en) {
      var prior = store.find('appraisals', function (a) { return a.employeeId === en.employeeId && a.type === 'Annual' && a.score !== null; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })[0];
      return prior ? { name: store.employeeName(en.employeeId), before: prior.score, after: en.score } : null;
    }).filter(Boolean);
    var host = document.getElementById('rp-prepost');
    if (!pairs.length) { host.innerHTML = '<div class="fb-faint fb-small">Not enough paired data yet.</div>'; }
    else {
      var avgBefore = Math.round(pairs.reduce(function (s, p) { return s + p.before; }, 0) / pairs.length);
      var avgAfter = Math.round(pairs.reduce(function (s, p) { return s + p.after; }, 0) / pairs.length);
      ui.barChart(host, { labels: ['Avg. before', 'Avg. after'], values: [avgBefore, avgAfter], valueFormatter: function (v) { return v + '%'; } });
    }
    document.querySelector('[data-export="prepost"]').addEventListener('click', function () {
      ui.exportCsv('pre-post-training-scores.csv', [{ label: 'Employee', value: function (r) { return r.name; } }, { label: 'Before (%)', value: function (r) { return r.before; } }, { label: 'After (%)', value: function (r) { return r.after; } }], pairs);
    });
  }

  function renderBudget() {
    var b = store.get('trainingBudget');
    var totalSpent = b.byMonth.reduce(function (s, m) { return s + m.spent; }, 0);
    document.getElementById('rp-budget').innerHTML =
      '<div class="fb-flex-between" style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Total budget</span><span class="fb-bold">' + ui.fmtMoney(b.totalBudget) + '</span></div>' +
      '<div class="fb-flex-between" style="padding:7px 0"><span class="fb-small">Utilized</span><span class="fb-bold">' + Math.round((totalSpent / b.totalBudget) * 100) + '%</span></div>' +
      '<a class="fb-btn fb-btn--ghost fb-btn--sm" style="margin-top:10px" href="budgeting.html">Open Training Budget →</a>';
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderPopularity(); renderDept(); renderTnaFunnel(); renderDelivery(); renderPrePost(); renderBudget();
  });
})();
