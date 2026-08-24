/* ==========================================================================
   Page logic: Curriculum Design & Training Schedules (admin/ld/curriculum-schedule.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderTable() {
    ui.table({
      container: '#fb-sched-table', rows: store.get('trainingSchedules').slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); }),
      searchable: true, searchKeys: [],
      filter: { key: 'status', options: ['Planned', 'Confirmed', 'Completed'] },
      columns: [
        { key: 'courseId', label: 'Course', render: function (r) { var c = store.getById('courses', r.courseId); return c ? ui.escapeHtml(c.title) : '—'; } },
        { key: 'facilitator', label: 'Facilitator' },
        { key: 'venue', label: 'Venue' },
        { key: 'date', label: 'Date', render: function (r) { return ui.fmtDate(r.date); } },
        { key: 'capacity', label: 'Capacity' },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No sessions scheduled yet.'
    });
  }

  function openModal(s) {
    var c = store.getById('courses', s.courseId);
    var body = '<div class="fb-xs fb-faint">Course</div><p class="fb-bold">' + (c ? ui.escapeHtml(c.title) : '—') + '</p>' +
      '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Facilitator</div><div class="fb-bold">' + ui.escapeHtml(s.facilitator) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Venue</div><div class="fb-bold">' + ui.escapeHtml(s.venue) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Date</div><div class="fb-bold">' + ui.fmtDate(s.date) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Capacity</div><div class="fb-bold">' + s.capacity + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-field"><label>Status</label><select id="sc-status"><option ' + (s.status === 'Planned' ? 'selected' : '') + '>Planned</option><option ' + (s.status === 'Confirmed' ? 'selected' : '') + '>Confirmed</option><option ' + (s.status === 'Completed' ? 'selected' : '') + '>Completed</option></select></div>';
    ui.modal({
      title: 'Training session', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.update('trainingSchedules', s.id, { status: document.getElementById('sc-status').value });
          ui.closeModal(); ui.toast('Schedule updated.', 'success'); renderTable();
        });
      }
    });
  }

  function openNewModal() {
    var courses = store.get('courses');
    var body = '<div class="fb-field"><label>Course</label><select id="sn-course">' + courses.map(function (c) { return '<option value="' + c.id + '">' + ui.escapeHtml(c.title) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Facilitator</label><input type="text" id="sn-fac" placeholder="e.g. Internal L&D Team" /></div><div class="fb-field"><label>Venue</label><input type="text" id="sn-venue" placeholder="e.g. HQ Training Hall A" /></div></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Date</label><input type="date" id="sn-date" /></div><div class="fb-field"><label>Capacity</label><input type="number" id="sn-cap" value="25" /></div></div>';
    ui.modal({
      title: 'Schedule session', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Publish schedule</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          store.insert('trainingSchedules', {
            courseId: document.getElementById('sn-course').value, facilitator: document.getElementById('sn-fac').value.trim() || 'Internal L&D Team',
            venue: document.getElementById('sn-venue').value.trim() || 'HQ Training Hall A', date: document.getElementById('sn-date').value || new Date().toISOString().slice(0, 10),
            capacity: Number(document.getElementById('sn-cap').value) || 20, status: 'Planned'
          });
          ui.closeModal(); ui.toast('Session scheduled.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-schedule').addEventListener('click', openNewModal);
  });
})();
