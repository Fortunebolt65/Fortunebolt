/* ==========================================================================
   Page logic: Medical Records (admin/health/medical-records.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderTable() {
    ui.table({
      container: '#fb-med-table', rows: store.get('medicalRecords'), searchable: true, searchKeys: [],
      filter: { key: 'healthStatus', options: ['Fit', 'Fit with monitoring', 'Under review'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'healthStatus', label: 'Health status', render: function (r) { return ui.badge(r.healthStatus); } },
        { key: 'bloodGroup', label: 'Blood group' },
        { key: 'genotype', label: 'Genotype' },
        { key: 'documents', label: 'Documents', render: function (r) { return r.documents.length + ' on file'; } },
        { key: 'incidents', label: 'Incidents', render: function (r) { return (r.incidents || []).length; } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No medical master files yet.'
    });
  }

  function openModal(m) {
    var e = store.employee(m.employeeId);
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Health status</div><div>' + ui.badge(m.healthStatus) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Blood group</div><div class="fb-bold">' + ui.escapeHtml(m.bloodGroup) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Genotype</div><div class="fb-bold">' + ui.escapeHtml(m.genotype) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Last medical check</div><div class="fb-bold">' + ui.fmtDate(m.lastMedicalCheck) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint" style="margin-bottom:6px">Documents on file</div>' + m.documents.map(function (d) { return ui.tag(d); }).join(' ') +
      '<hr class="fb-divider" />' +
      '<div class="fb-flex-between"><span class="fb-xs fb-faint">Medical incidents</span></div>' +
      '<div id="mr-incidents" style="margin:8px 0"></div>' +
      '<div class="fb-form-section-title">Report a new incident</div>' +
      '<div class="fb-field"><label>Description</label><textarea id="mr-incident-desc" placeholder="What happened..."></textarea></div>' +
      '<div class="fb-field"><label>Notify</label><div class="fb-flex" style="flex-wrap:wrap;gap:10px">' +
      ['MRB', 'HHR', 'FM', 'OD', 'SMD'].map(function (p) { return '<label class="fb-checkbox"><input type="checkbox" class="mr-notify" value="' + p + '" checked />' + p + '</label>'; }).join('') +
      '</div></div>';
    ui.modal({
      title: 'Medical master file', wide: true, body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="report">Log &amp; notify</button>',
      onMount: function (box) {
        renderIncidents(box, m);
        box.querySelector('[data-act="report"]').addEventListener('click', function () {
          var desc = document.getElementById('mr-incident-desc').value.trim();
          if (!desc) { ui.toast('Describe the incident first.', 'error'); return; }
          var notifyParties = Array.from(box.querySelectorAll('.mr-notify:checked')).map(function (c) { return c.value; });
          var incidents = (m.incidents || []).concat([{ description: desc, notified: notifyParties, date: new Date().toISOString() }]);
          store.update('medicalRecords', m.id, { incidents: incidents });
          m.incidents = incidents;
          store.notify('Medical incident reported — ' + e.firstName + ' ' + e.lastName, desc + ' (notified: ' + notifyParties.join(', ') + ')', 'Health & Wellness', 'admin/health/medical-records.html');
          document.getElementById('mr-incident-desc').value = '';
          ui.toast('Incident logged and relevant parties notified.', 'success');
          renderIncidents(box, m); renderTable();
        });
      }
    });
  }

  function renderIncidents(box, m) {
    var host = box.querySelector('#mr-incidents');
    var incidents = m.incidents || [];
    host.innerHTML = incidents.length ? incidents.map(function (i) { return '<div class="fb-small" style="padding:6px 0;border-bottom:1px solid var(--fb-border)"><strong>' + ui.fmtDate(i.date) + '</strong> — ' + ui.escapeHtml(i.description) + ' <span class="fb-xs fb-faint">(notified ' + i.notified.join(', ') + ')</span></div>'; }).join('') : '<div class="fb-xs fb-faint">No incidents on file.</div>';
  }

  function openNewModal() {
    var withoutRecord = store.get('employees').filter(function (e) { return e.status !== 'Exiting' && !store.findOne('medicalRecords', function (m) { return m.employeeId === e.id; }); });
    if (!withoutRecord.length) { ui.toast('Every active employee already has a master file.', 'info'); return; }
    var body = '<div class="fb-field"><label>Employee</label><select id="nm-emp">' + withoutRecord.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Blood group</label><select id="nm-bg"><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>AB+</option></select></div>' +
      '<div class="fb-field"><label>Genotype</label><select id="nm-gt"><option>AA</option><option>AS</option><option>AC</option></select></div></div>';
    ui.modal({
      title: 'Create master medical file', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.insert('medicalRecords', { employeeId: document.getElementById('nm-emp').value, healthStatus: 'Fit', bloodGroup: document.getElementById('nm-bg').value, genotype: document.getElementById('nm-gt').value, lastMedicalCheck: new Date().toISOString().slice(0, 10), documents: ['Pre-employment medical report'], incidents: [] });
          ui.closeModal(); ui.toast('Master file created.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-record').addEventListener('click', openNewModal);
  });
})();
