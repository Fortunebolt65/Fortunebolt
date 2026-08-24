/* ==========================================================================
   Page logic: HRBP Reporting (admin/hrbp/reporting.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderHeadcount() {
    var depts = store.get('departments');
    var counts = depts.map(function (d) { return store.find('employees', function (e) { return e.departmentId === d.id && e.status !== 'Exiting' && e.status !== 'Exited'; }).length; });
    ui.barChart('#rp-headcount-chart', { labels: depts.map(function (d) { return d.short; }), values: counts });
    document.querySelector('[data-export="headcount"]').addEventListener('click', function () {
      ui.exportCsv('headcount-by-department.csv', [{ label: 'Department', value: function (r) { return r.name; } }, { label: 'Active Headcount', value: function (r) { return r.count; } }], depts.map(function (d, i) { return { name: d.name, count: counts[i] }; }));
    });
  }

  function renderFunnel() {
    var stages = ['Applied', 'Screening', 'Shortlisted', 'Testing', 'Interviewing', 'Offer', 'Hired', 'Rejected'];
    var candidates = store.get('candidates');
    var counts = stages.map(function (s) { return candidates.filter(function (c) { return c.status === s; }).length; });
    ui.barChart('#rp-funnel-chart', { labels: stages, values: counts });
    document.querySelector('[data-export="funnel"]').addEventListener('click', function () {
      ui.exportCsv('recruitment-funnel.csv', [{ label: 'Stage', value: function (r) { return r.stage; } }, { label: 'Candidates', value: function (r) { return r.count; } }], stages.map(function (s, i) { return { stage: s, count: counts[i] }; }));
    });
  }

  function renderDisciplinary() {
    var cases = store.get('disciplinaryCases');
    var byType = {};
    cases.forEach(function (c) { byType[c.type] = (byType[c.type] || 0) + 1; });
    document.getElementById('rp-disc-table').innerHTML = Object.keys(byType).map(function (t) { return '<div class="fb-flex-between" style="padding:8px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">' + ui.escapeHtml(t) + '</span><span class="fb-bold">' + byType[t] + '</span></div>'; }).join('') || '<div class="fb-faint fb-small">No cases on file.</div>';
    document.querySelector('[data-export="disciplinary"]').addEventListener('click', function () {
      ui.exportCsv('disciplinary-cases.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Type', value: function (r) { return r.type; } },
        { label: 'Status', value: function (r) { return r.status; } },
        { label: 'Payroll Deduction', value: function (r) { return r.payrollDeductionFlag ? 'Yes' : 'No'; } },
        { label: 'Date', value: function (r) { return r.createdAt; } }
      ], cases);
    });
  }

  function renderExit() {
    var cases = store.get('exitCases');
    var byType = {};
    cases.forEach(function (c) { byType[c.type] = (byType[c.type] || 0) + 1; });
    document.getElementById('rp-exit-table').innerHTML = (Object.keys(byType).map(function (t) { return '<div class="fb-flex-between" style="padding:8px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">' + ui.escapeHtml(t) + '</span><span class="fb-bold">' + byType[t] + '</span></div>'; }).join('') || '<div class="fb-faint fb-small">No exit cases on file.</div>') +
      '<div class="fb-xs fb-faint" style="margin-top:10px">' + cases.filter(function (c) { return c.status === 'Completed'; }).length + ' completed · ' + cases.filter(function (c) { return c.status === 'In Progress'; }).length + ' in progress</div>';
    document.querySelector('[data-export="exit"]').addEventListener('click', function () {
      ui.exportCsv('exit-cases.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Type', value: function (r) { return r.type; } },
        { label: 'Last Working Day', value: function (r) { return r.lastWorkingDate; } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], cases);
    });
  }

  function renderWelfare() {
    var reqs = store.get('welfareRequests');
    var totalPaid = reqs.filter(function (r) { return r.status === 'Paid'; }).reduce(function (s, r) { return s + r.amount; }, 0);
    document.getElementById('rp-welfare-table').innerHTML =
      '<div class="fb-flex-between" style="padding:8px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Total requests</span><span class="fb-bold">' + reqs.length + '</span></div>' +
      '<div class="fb-flex-between" style="padding:8px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Paid out</span><span class="fb-bold">' + ui.fmtMoney(totalPaid) + '</span></div>' +
      '<div class="fb-flex-between" style="padding:8px 0"><span class="fb-small">Pending review/approval</span><span class="fb-bold">' + reqs.filter(function (r) { return r.status.indexOf('Pending') === 0; }).length + '</span></div>';
    document.querySelector('[data-export="welfare"]').addEventListener('click', function () {
      ui.exportCsv('welfare-requests.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Benefit', value: function (r) { return r.benefitType; } },
        { label: 'Amount', value: function (r) { return r.amount; } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], reqs);
    });
  }

  function renderGuarantor() {
    var checks = store.get('guarantorChecks');
    var statuses = ['Pending Contact', 'Contacted — Awaiting Response', 'Verified', 'Flagged for Review'];
    var counts = statuses.map(function (s) { return checks.filter(function (c) { return c.status === s; }).length; });
    ui.barChart('#rp-guarantor-chart', { labels: statuses.map(function (s) { return s.split(' ')[0]; }), values: counts });
    document.querySelector('[data-export="guarantor"]').addEventListener('click', function () {
      ui.exportCsv('guarantor-verification.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], checks);
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderHeadcount(); renderFunnel(); renderDisciplinary(); renderExit(); renderWelfare(); renderGuarantor();
  });
})();
