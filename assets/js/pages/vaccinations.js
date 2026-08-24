/* ==========================================================================
   Page logic: Vaccinations (admin/health/vaccinations.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderTable() {
    ui.table({
      container: '#fb-vax-table', rows: store.get('vaccinationSchedules').slice().sort(function (a, b) { return new Date(a.dueDate) - new Date(b.dueDate); }),
      searchable: true, searchKeys: ['vaccine'],
      filter: { key: 'status', options: ['Scheduled', 'Completed', 'Overdue'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'vaccine', label: 'Vaccine' },
        { key: 'dueDate', label: 'Due date', render: function (r) { return ui.fmtDate(r.dueDate); } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: function (r) {
        if (r.status === 'Completed') { ui.toast('Already marked completed.', 'info'); return; }
        ui.confirmModal({ title: 'Mark vaccination completed?', message: store.employeeName(r.employeeId) + ' — ' + r.vaccine, confirmLabel: 'Mark completed', onConfirm: function () { store.update('vaccinationSchedules', r.id, { status: 'Completed' }); ui.toast('Marked completed.', 'success'); renderTable(); } });
      },
      emptyMessage: 'No vaccinations scheduled.'
    });
  }

  function openNewModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="nv-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Vaccine</label><select id="nv-type"><option>Hepatitis B Booster</option><option>Yellow Fever</option><option>Tetanus Toxoid</option><option>Annual Flu Shot</option><option>COVID-19 Booster</option></select></div>' +
      '<div class="fb-field"><label>Due date</label><input type="date" id="nv-date" /></div>';
    ui.modal({
      title: 'Schedule vaccination', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Schedule</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.insert('vaccinationSchedules', { employeeId: document.getElementById('nv-emp').value, vaccine: document.getElementById('nv-type').value, dueDate: document.getElementById('nv-date').value || new Date().toISOString().slice(0, 10), status: 'Scheduled' });
          ui.closeModal(); ui.toast('Vaccination scheduled.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-vax').addEventListener('click', openNewModal);
  });
})();
