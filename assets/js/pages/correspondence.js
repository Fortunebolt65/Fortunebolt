/* ==========================================================================
   Page logic: Correspondence (admin/ld/correspondence.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var TEMPLATES = [
    { id: 'nomination', title: 'Training Nomination Memo', body: 'You have been nominated to attend the upcoming training programme. Please confirm your availability.', icon: '📋' },
    { id: 'reminder', title: 'Training Reminder', body: 'This is a reminder of your upcoming training session. Please ensure you are available and prepared.', icon: '⏰' },
    { id: 'eval-reminder', title: 'Evaluation Reminder', body: 'Please complete your pending training evaluation form at your earliest convenience.', icon: '📝' }
  ];

  function renderTemplates() {
    document.getElementById('fb-templates').innerHTML = TEMPLATES.map(function (t) {
      return '<div class="fb-card"><div class="fb-card__head"><span class="fb-card__title">' + t.icon + ' ' + ui.escapeHtml(t.title) + '</span></div>' +
        '<p class="fb-small fb-muted">' + ui.escapeHtml(t.body) + '</p>' +
        '<button class="fb-btn fb-btn--primary fb-btn--sm" data-template="' + t.id + '">Compose &amp; send</button></div>';
    }).join('');
    document.querySelectorAll('[data-template]').forEach(function (btn) {
      btn.addEventListener('click', function () { openComposeModal(TEMPLATES.find(function (t) { return t.id === btn.getAttribute('data-template'); })); });
    });
  }

  function openComposeModal(tpl) {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
    var body = '<div class="fb-field"><label>Subject</label><input type="text" id="cm-subject" value="' + ui.escapeHtml(tpl.title) + '" /></div>' +
      '<div class="fb-field"><label>Message</label><textarea id="cm-body">' + ui.escapeHtml(tpl.body) + '</textarea></div>' +
      '<div class="fb-field"><label>Recipients</label><div style="max-height:220px;overflow-y:auto;border:1px solid var(--fb-border);border-radius:8px;padding:8px">' +
      employees.map(function (e) { return '<div class="fb-checkbox"><input type="checkbox" class="cm-recipient" value="' + e.id + '" /><label>' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(store.departmentName(e.departmentId)) + '</label></div>'; }).join('') +
      '</div></div>';
    ui.modal({
      title: tpl.title, wide: true, body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="send">Send memo</button>',
      onMount: function (box) {
        box.querySelector('[data-act="send"]').addEventListener('click', function () {
          var recipients = Array.from(box.querySelectorAll('.cm-recipient:checked')).map(function (c) { return c.value; });
          if (!recipients.length) { ui.toast('Select at least one recipient.', 'error'); return; }
          var subject = document.getElementById('cm-subject').value.trim() || tpl.title;
          var msg = document.getElementById('cm-body').value.trim();
          store.notify(subject, msg + ' — sent to ' + recipients.length + ' staff: ' + recipients.map(function (id) { return store.employeeName(id); }).slice(0, 5).join(', ') + (recipients.length > 5 ? '…' : ''), 'Correspondence', 'admin/ld/correspondence.html');
          ui.closeModal(); ui.toast('Memo sent to ' + recipients.length + ' recipient(s).', 'success'); renderLog();
        });
      }
    });
  }

  function renderLog() {
    var log = store.get('notifications').filter(function (n) { return n.module === 'Correspondence'; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    var host = document.getElementById('fb-corr-log');
    if (!log.length) { host.innerHTML = '<div class="fb-empty">No correspondence sent yet.</div>'; return; }
    ui.timeline(host, log.map(function (n) { return { title: n.title, meta: n.body + ' · ' + FB.notifications.timeAgo(n.createdAt) }; }));
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTemplates(); renderLog();
  });
})();
