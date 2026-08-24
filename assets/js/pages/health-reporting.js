/* ==========================================================================
   Page logic: Health Reporting (admin/health/reporting.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderBills() {
    var bills = store.get('medicalBills');
    var statuses = ['Submitted', 'Verified', 'Approved', 'Paid', 'Outstanding'];
    var counts = statuses.map(function (s) { return bills.filter(function (b) { return b.status === s; }).length; });
    ui.barChart('#rp-bills', { labels: statuses, values: counts });
    document.querySelector('[data-export="bills"]').addEventListener('click', function () {
      ui.exportCsv('medical-bills-report.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Provider', value: function (r) { return r.provider; } },
        { label: 'Amount', value: function (r) { return r.amount; } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], bills);
    });
  }

  function renderVax() {
    var vax = store.get('vaccinationSchedules');
    var statuses = ['Scheduled', 'Completed', 'Overdue'];
    var counts = statuses.map(function (s) { return vax.filter(function (v) { return v.status === s; }).length; });
    ui.barChart('#rp-vax', { labels: statuses, values: counts });
    document.querySelector('[data-export="vax"]').addEventListener('click', function () {
      ui.exportCsv('vaccination-compliance.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Vaccine', value: function (r) { return r.vaccine; } },
        { label: 'Due Date', value: function (r) { return r.dueDate; } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], vax);
    });
  }

  function renderSick() {
    var sick = store.get('sickLeaveRequests');
    var byReason = {};
    sick.forEach(function (s) { byReason[s.reason] = (byReason[s.reason] || 0) + 1; });
    var labels = Object.keys(byReason);
    ui.barChart('#rp-sick', { labels: labels.map(function (l) { return l.split(' ')[0]; }), values: labels.map(function (l) { return byReason[l]; }) });
    document.querySelector('[data-export="sick"]').addEventListener('click', function () {
      ui.exportCsv('sick-leave-report.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Reason', value: function (r) { return r.reason; } },
        { label: 'Status', value: function (r) { return r.status; } }
      ], sick);
    });
  }

  function renderIncidents() {
    var records = store.get('medicalRecords');
    var incidents = [];
    records.forEach(function (r) { (r.incidents || []).forEach(function (i) { incidents.push(Object.assign({ employeeId: r.employeeId }, i)); }); });
    var host = document.getElementById('rp-incidents');
    host.innerHTML = incidents.length ? incidents.map(function (i) { return '<div class="fb-small" style="padding:6px 0;border-bottom:1px solid var(--fb-border)">' + ui.escapeHtml(store.employeeName(i.employeeId)) + ' — ' + ui.escapeHtml(i.description) + '</div>'; }).join('') : '<div class="fb-faint fb-small">No incidents logged.</div>';
    document.querySelector('[data-export="incidents"]').addEventListener('click', function () {
      ui.exportCsv('medical-incidents.csv', [
        { label: 'Employee', value: function (r) { return store.employeeName(r.employeeId); } },
        { label: 'Description', value: function (r) { return r.description; } },
        { label: 'Notified', value: function (r) { return (r.notified || []).join('; '); } },
        { label: 'Date', value: function (r) { return r.date; } }
      ], incidents);
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderBills(); renderVax(); renderSick(); renderIncidents();
  });
})();
