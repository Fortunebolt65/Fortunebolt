/* ==========================================================================
   Fortunebolt HR Platform — tiny pub/sub event bus.
   Modules publish domain events ("requisition:approved", "offer:accepted"...)
   so other modules / the shell can react without knowing about each other.
   ========================================================================== */
(function (global) {
  'use strict';
  const listeners = {};

  function on(name, cb) {
    (listeners[name] = listeners[name] || []).push(cb);
    return () => off(name, cb);
  }
  function off(name, cb) {
    if (!listeners[name]) return;
    listeners[name] = listeners[name].filter((fn) => fn !== cb);
  }
  function emit(name, payload) {
    (listeners[name] || []).slice().forEach((fn) => {
      try { fn(payload); } catch (err) { console.error('[FB.events] listener error for', name, err); }
    });
    (listeners['*'] || []).slice().forEach((fn) => {
      try { fn(name, payload); } catch (err) { console.error('[FB.events] wildcard listener error', err); }
    });
  }

  global.FB = global.FB || {};
  global.FB.events = { on, off, emit };
})(window);
