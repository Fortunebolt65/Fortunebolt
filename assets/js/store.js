/* ==========================================================================
   Fortunebolt HR Platform — client-side "database".
   Wraps localStorage around the seed dataset. Every module page reads and
   writes through this single object, which is what makes the system feel
   connected without a real backend: one shared store, many views.
   ========================================================================== */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'fb_hr_db_v3';
  let data = null;

  function loadFromDisk() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[FB.store] could not read localStorage, reseeding', err);
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[FB.store] failed to persist store', err);
    }
  }

  function init() {
    if (data) return data;
    data = loadFromDisk();
    if (!data) {
      data = global.FB_SEED_BUILDER();
      persist();
    } else {
      const fresh = global.FB_SEED_BUILDER();
      if (!data._meta || data._meta.seedVersion !== fresh._meta.seedVersion) {
        data = fresh;
        persist();
      }
    }
    return data;
  }

  function reset() {
    data = global.FB_SEED_BUILDER();
    persist();
    global.FB.events.emit('store:reset', {});
    return data;
  }

  function all() { return data; }
  function get(collection) { init(); return data[collection] || []; }
  function setSingleton(key, value) {
    init();
    data[key] = value;
    persist();
    global.FB.events.emit('store:changed', { collection: key, action: 'updated' });
    return value;
  }
  function getById(collection, id) { return get(collection).find((r) => r.id === id) || null; }
  function find(collection, predicate) { return get(collection).filter(predicate); }
  function findOne(collection, predicate) { return get(collection).find(predicate) || null; }

  let idCounters = {};
  function nextId(prefix) {
    idCounters[prefix] = (idCounters[prefix] || 0) + 1;
    const existing = new Set(Object.values(data).flat().filter(Array.isArray).flat()
      .filter((r) => r && typeof r.id === 'string' && r.id.startsWith(prefix + '-'))
      .map((r) => r.id));
    let n = idCounters[prefix];
    let id = `${prefix}-${String(n).padStart(4, '0')}`;
    while (existing.has(id)) { n += 1; id = `${prefix}-${String(n).padStart(4, '0')}`; }
    idCounters[prefix] = n;
    return id;
  }

  function insert(collection, record) {
    init();
    if (!data[collection]) data[collection] = [];
    if (!record.id) record.id = nextId(collectionPrefix(collection));
    if (!record.createdAt) record.createdAt = new Date().toISOString();
    data[collection].push(record);
    persist();
    global.FB.events.emit(`${collection}:created`, record);
    global.FB.events.emit('store:changed', { collection, id: record.id, action: 'created' });
    return record;
  }

  function update(collection, id, patch) {
    init();
    const list = data[collection] || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch, { updatedAt: new Date().toISOString() });
    persist();
    global.FB.events.emit(`${collection}:updated`, list[idx]);
    global.FB.events.emit('store:changed', { collection, id, action: 'updated' });
    return list[idx];
  }

  function remove(collection, id) {
    init();
    const before = (data[collection] || []).length;
    data[collection] = (data[collection] || []).filter((r) => r.id !== id);
    persist();
    if ((data[collection] || []).length !== before) {
      global.FB.events.emit(`${collection}:deleted`, { id });
      global.FB.events.emit('store:changed', { collection, id, action: 'deleted' });
    }
  }

  function collectionPrefix(collection) {
    const map = {
      employees: 'EMP', requisitions: 'REQ', candidates: 'CAN', assessments: 'TST', interviews: 'INT',
      offers: 'OFR', onboardingTasks: 'ONB', appraisals: 'APR', careerPlans: 'CAR', trainingNeeds: 'TNA',
      trainingPlans: 'TPL', courses: 'CRS', enrollments: 'ENR', evaluations: 'EVL', disciplinaryCases: 'DSC',
      exitCases: 'EXI', welfareRequests: 'WEL', surveys: 'SUR', medicalRecords: 'MED', medicalBills: 'BIL',
      vaccinationSchedules: 'VAC', drugRequisitions: 'DRG', sickLeaveRequests: 'SCK', notifications: 'NOT', auditLog: 'AUD',
      leaveRequests: 'LVE', essRequests: 'ESR', guarantorChecks: 'GTV'
    };
    return map[collection] || 'REC';
  }

  // ---------------- Relational convenience helpers ----------------
  function employee(id) { return getById('employees', id); }
  function employeeName(id) { const e = employee(id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; }
  function department(id) { return getById('departments', id); }
  function departmentName(id) { const d = department(id); return d ? d.name : 'Unknown'; }
  function hrUnit(id) { return getById('hrUnits', id); }
  function cadre(id) { return getById('cadres', id); }
  function cadreName(id) { const c = cadre(id); return c ? c.name : ''; }
  function currentUser() { init(); return employee(data.currentUserId); }

  // Appends one completed step to a record's approval audit trail and (optionally) patches
  // its other fields in the same write — the single place every workflow action goes through
  // so "who did what, when" is never just inferred from a status flag.
  function recordApproval(collection, id, step) {
    const record = getById(collection, id);
    if (!record) return null;
    const actorEmp = step.actorId ? employee(step.actorId) : currentUser();
    const entry = {
      stage: step.stage,
      actor: step.actor || (actorEmp ? `${actorEmp.firstName} ${actorEmp.lastName}` : 'System'),
      actorRole: step.actorRole !== undefined ? step.actorRole : (actorEmp ? actorEmp.jobTitle : ''),
      action: step.action || step.stage,
      comment: step.comment || '',
      timestamp: new Date().toISOString(),
      status: step.status || 'done'
    };
    const history = (record.approvalHistory || []).concat([entry]);
    const patch = Object.assign({ approvalHistory: history }, step.patch || {});
    return update(collection, id, patch);
  }

  function notify(title, body, module, link) {
    const record = insert('notifications', { title, body, module, link: link || '#', read: false });
    global.FB.events.emit('notification:new', record);
    return record;
  }

  function auditLog(actor, action, entity, entityId) {
    return insert('auditLog', { actor, action, entity, entityId, timestamp: new Date().toISOString() });
  }

  function unreadNotificationCount() {
    return get('notifications').filter((n) => !n.read).length;
  }

  function markNotificationRead(id) {
    return update('notifications', id, { read: true });
  }
  function markAllNotificationsRead() {
    get('notifications').forEach((n) => { if (!n.read) update('notifications', n.id, { read: true }); });
  }

  global.FB = global.FB || {};
  global.FB.store = {
    init, reset, all, get, setSingleton, getById, find, findOne, insert, update, remove, nextId,
    employee, employeeName, department, departmentName, hrUnit, cadre, cadreName, currentUser,
    recordApproval, notify, auditLog, unreadNotificationCount, markNotificationRead, markAllNotificationsRead
  };
})(window);
