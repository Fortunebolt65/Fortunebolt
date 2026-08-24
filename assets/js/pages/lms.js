/* ==========================================================================
   Page logic: Learning Management System (admin/ld/lms.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;

  function renderCatalog() {
    var courses = store.get('courses');
    document.getElementById('fb-course-cards').innerHTML = courses.map(function (c) {
      var enrolled = store.find('enrollments', function (e) { return e.courseId === c.id; }).length;
      var completed = store.find('enrollments', function (e) { return e.courseId === c.id && e.status === 'Completed'; }).length;
      return '<div class="fb-card" data-course-card="' + c.id + '" style="cursor:pointer">' +
        '<div class="fb-card__head"><span class="fb-card__title">' + ui.escapeHtml(c.title) + '</span><span class="fb-tag">' + ui.escapeHtml(c.format) + '</span></div>' +
        '<div class="fb-small fb-muted">' + ui.escapeHtml(c.category) + ' · ' + c.durationHrs + 'h · ' + c.points + ' pts</div>' +
        '<div class="fb-xs fb-faint" style="margin-top:10px">' + enrolled + ' enrolled · ' + completed + ' completed</div></div>';
    }).join('');
    document.querySelectorAll('[data-course-card]').forEach(function (card) {
      card.addEventListener('click', function () { openCourseModal(store.getById('courses', card.getAttribute('data-course-card'))); });
    });
  }

  function openCourseModal(c) {
    var enrollments = store.find('enrollments', function (e) { return e.courseId === c.id; });
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Category</div><div class="fb-bold">' + ui.escapeHtml(c.category) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Format</div><div class="fb-bold">' + ui.escapeHtml(c.format) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Duration</div><div class="fb-bold">' + c.durationHrs + ' hour(s)</div></div>' +
      '<div><div class="fb-xs fb-faint">Gamification points</div><div class="fb-bold">' + c.points + ' pts</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint" style="margin-bottom:8px">Enrolled staff (' + enrollments.length + ')</div>' +
      (enrollments.length ? '<div class="fb-table-wrap"><table class="fb-table"><tbody>' + enrollments.map(function (e) {
        return '<tr><td>' + ui.escapeHtml(store.employeeName(e.employeeId)) + '</td><td>' + ui.badge(e.status) + '</td><td class="fb-cell-muted">' + (e.score !== null ? e.score + '%' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="fb-faint fb-small">No enrollments yet.</div>');
    ui.modal({ title: c.title, wide: true, body: body });
  }

  function renderEnrollments() {
    ui.table({
      container: '#fb-enr-table', rows: store.get('enrollments'), searchable: true, searchKeys: [],
      filter: { key: 'status', options: ['Enrolled', 'In Progress', 'Completed'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'courseId', label: 'Course', render: function (r) { var c = store.getById('courses', r.courseId); return c ? ui.escapeHtml(c.title) : '—'; } },
        { key: 'progress', label: 'Progress', render: function (r) { return '<div style="width:110px"><div class="fb-progress"><div class="fb-progress__bar" style="width:' + r.progress + '%"></div></div></div>'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'score', label: 'Score', render: function (r) { return r.score !== null ? r.score + '%' : '—'; } }
      ],
      onRowClick: openEnrollmentModal,
      emptyMessage: 'No enrollments yet.'
    });
  }

  function openEnrollmentModal(en) {
    var c = store.getById('courses', en.courseId);
    var body = '<div class="fb-xs fb-faint">Employee</div><p class="fb-bold">' + ui.escapeHtml(store.employeeName(en.employeeId)) + '</p>' +
      '<div class="fb-xs fb-faint">Course</div><p class="fb-bold">' + ui.escapeHtml(c ? c.title : '—') + '</p><hr class="fb-divider" />' +
      '<div class="fb-field"><label>Progress (%)</label><input type="number" id="lm-progress" min="0" max="100" value="' + en.progress + '" /></div>';
    ui.modal({
      title: 'Update enrollment', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save progress</button>' + (en.status !== 'Completed' ? '<button class="fb-btn" data-act="complete">Mark complete</button>' : ''),
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var progress = Math.min(100, Math.max(0, Number(document.getElementById('lm-progress').value) || 0));
          store.update('enrollments', en.id, { progress: progress, status: progress >= 100 ? 'Completed' : (progress > 0 ? 'In Progress' : 'Enrolled') });
          if (progress >= 100) completeEnrollment(en, c);
          ui.closeModal(); ui.toast('Progress updated.', 'success'); renderEnrollments(); renderCatalog();
        });
        var completeBtn = box.querySelector('[data-act="complete"]');
        if (completeBtn) completeBtn.addEventListener('click', function () {
          store.update('enrollments', en.id, { progress: 100, status: 'Completed', score: Number((Math.random() * 30 + 65).toFixed(0)), completedAt: new Date().toISOString() });
          completeEnrollment(en, c);
          ui.closeModal(); ui.toast('Marked complete. Evaluation chain created.', 'success'); renderEnrollments(); renderCatalog(); renderLeaderboard();
        });
      }
    });
  }

  function completeEnrollment(en, c) {
    var existing = store.find('evaluations', function (ev) { return ev.enrollmentId === en.id; });
    if (existing.length) return;
    var completedAt = new Date().toISOString();
    store.insert('evaluations', { employeeId: en.employeeId, enrollmentId: en.id, type: 'Pre-Evaluation', status: 'Completed', createdAt: completedAt });
    store.insert('evaluations', { employeeId: en.employeeId, enrollmentId: en.id, type: 'Training Evaluation', status: 'Completed', createdAt: completedAt });
    store.insert('evaluations', { employeeId: en.employeeId, enrollmentId: en.id, type: 'Post-Learning Evaluation', status: 'Pending (due 3 months post-training)', createdAt: completedAt });
    store.notify('Course completed — ' + store.employeeName(en.employeeId), (c ? c.title : 'Course') + ' completed. Evaluation forms generated.', 'Learning & Development', 'admin/ld/evaluation.html');
  }

  function renderLeaderboard() {
    var employees = store.get('employees');
    var scores = employees.map(function (e) {
      var points = store.find('enrollments', function (en) { return en.employeeId === e.id && en.status === 'Completed'; })
        .reduce(function (sum, en) { var c = store.getById('courses', en.courseId); return sum + (c ? c.points : 0); }, 0);
      return { e: e, points: points };
    }).filter(function (r) { return r.points > 0; }).sort(function (a, b) { return b.points - a.points; }).slice(0, 15);
    var host = document.getElementById('fb-leaderboard');
    if (!scores.length) { host.innerHTML = '<div class="fb-empty"><div class="fb-empty__icon">🏅</div>No completed courses yet.</div>'; return; }
    host.innerHTML = '<div class="fb-table-wrap"><table class="fb-table"><thead><tr><th>Rank</th><th>Employee</th><th>Department</th><th>Points</th></tr></thead><tbody>' +
      scores.map(function (r, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        return '<tr><td class="fb-bold">' + medal + '</td><td>' + ui.personCell(r.e.firstName + ' ' + r.e.lastName) + '</td><td class="fb-cell-muted">' + ui.escapeHtml(store.departmentName(r.e.departmentId)) + '</td><td class="fb-bold">' + r.points + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function openNewCourseModal() {
    var body = '<div class="fb-field"><label>Course title</label><input type="text" id="cn-title" /></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Category</label><input type="text" id="cn-cat" placeholder="e.g. Compliance" /></div><div class="fb-field"><label>Format</label><select id="cn-format"><option>Video</option><option>E-Learning</option><option>Webinar</option><option>In-person</option><option>SCORM Package</option><option>Book + Workshop</option></select></div></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Duration (hours)</label><input type="number" id="cn-dur" value="2" /></div><div class="fb-field"><label>Points</label><input type="number" id="cn-points" value="30" /></div></div>';
    ui.modal({
      title: 'New course', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Publish course</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var title = document.getElementById('cn-title').value.trim();
          if (!title) { ui.toast('Enter a course title.', 'error'); return; }
          store.insert('courses', { title: title, category: document.getElementById('cn-cat').value.trim() || 'General', format: document.getElementById('cn-format').value, durationHrs: Number(document.getElementById('cn-dur').value) || 1, points: Number(document.getElementById('cn-points').value) || 10 });
          ui.closeModal(); ui.toast('Course published to the catalog.', 'success'); renderCatalog();
        });
      }
    });
  }

  function openEnrollModal() {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting'; });
    var courses = store.get('courses');
    var body = '<div class="fb-field"><label>Employee</label><select id="en-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Course</label><select id="en-course">' + courses.map(function (c) { return '<option value="' + c.id + '">' + ui.escapeHtml(c.title) + '</option>'; }).join('') + '</select></div>';
    ui.modal({
      title: 'Enroll employee', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Enroll</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('en-emp').value, courseId = document.getElementById('en-course').value;
          if (store.findOne('enrollments', function (e) { return e.employeeId === empId && e.courseId === courseId; })) { ui.toast('Already enrolled in this course.', 'error'); return; }
          store.insert('enrollments', { employeeId: empId, courseId: courseId, status: 'Enrolled', progress: 0, score: null, completedAt: null });
          ui.closeModal(); ui.toast('Employee enrolled.', 'success'); renderEnrollments(); renderCatalog();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    ui.wireTabs('#fb-page-root', function (key) { if (key === 'leaderboard') renderLeaderboard(); });
    renderCatalog(); renderEnrollments();
    document.getElementById('fb-btn-new-course').addEventListener('click', openNewCourseModal);
    document.getElementById('fb-btn-enroll').addEventListener('click', openEnrollModal);
  });
})();
