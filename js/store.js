/**
 * store.js — Central localStorage Service
 *
 * Schema:
 *   app_users      : [{ uid, name, role, email }]
 *   app_slots      : [{ slotId, teacherId, studentId, date, time, status }]
 *                    status: 'available' | 'booked' | 'disabled' | 'timeout'
 *   app_recurring  : [{ recurringId, teacherId, dayOfWeek (0=Mon…6=Sun), time }]
 *   app_selections : [{ studentId, teacherId }]
 *
 * SLOT_DURATION: 30 minutes (fixed, end = time + 30min)
 */

var SLOT_DURATION = 30;

var KEYS = {
  USERS:          'app_users',
  SLOTS:          'app_slots',
  RECURRING:      'app_recurring',
  SELECTIONS:     'app_selections',
  MOVE_LOG:       'app_move_log',
  FAVORITES:      'app_favorites',
  GUEST_SETTINGS: 'app_guest_settings'
};

/* ── In-memory cache ────────────────────────────────────────────────────
   Every _load() returns the cached array. Every _save() updates the cache
   AND writes to localStorage. This eliminates repeated JSON.parse calls
   on the same key within a single render cycle (the dominant perf cost).
   Cache is keyed by localStorage key string. ──────────────────────────── */
var _cache = {};

function _load(key) {
  if (_cache[key]) return _cache[key];
  try {
    var raw = localStorage.getItem(key);
    _cache[key] = raw ? (JSON.parse(raw) || []) : [];
    return _cache[key];
  } catch(e) { return []; }
}

function _save(key, data) {
  _cache[key] = data; /* update cache before writing to storage */
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
}

/* Invalidate the cache for a key — call if localStorage is written
   outside of Store (should not happen per architecture, but safety-net). */
function _invalidateCache(key) {
  delete _cache[key];
}

function _uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Migrate old 'app_bookings' to 'app_slots'
(function migrateBookings() {
  try {
    var old = localStorage.getItem('app_bookings');
    if (!old) return;
    var bookings = JSON.parse(old) || [];
    if (!bookings.length) return;
    var existing = _load(KEYS.SLOTS);
    var seen = {};
    for (var i = 0; i < existing.length; i++) seen[existing[i].slotId] = true;
    for (var j = 0; j < bookings.length; j++) {
      var b = bookings[j];
      if (seen[b.bookingId]) continue;
      var status = b.status;
      if (status === 'blocked') status = 'disabled';
      existing.push({ slotId: b.bookingId, teacherId: b.teacherId, studentId: b.studentId || null, date: b.date, time: b.start, status: status });
    }
    _save(KEYS.SLOTS, existing);
    localStorage.removeItem('app_bookings');
  } catch(e) {}
})();

// Remove legacy session key
try { localStorage.removeItem('app_session'); } catch(e) {}

// Seed admin
(function seedAdmin() {
  var users = _load(KEYS.USERS);
  for (var i = 0; i < users.length; i++) {
    if (users[i].role === 'admin') return;
  }
  users.push({ uid: 'admin', name: 'Administrator', role: 'admin' });
  _save(KEYS.USERS, users);
})();

/* ── Time helpers ─────────────────────────────────────────── */
function slotEndTime(timeStr) {
  var parts = timeStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) + SLOT_DURATION;
  if (m >= 60) { h += 1; m -= 60; }
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function slotTimesInRange(startTime, endTime) {
  var times = [];
  var parts = startTime.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  while (true) {
    var t = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    if (t >= endTime) break;
    times.push(t);
    m += SLOT_DURATION;
    if (m >= 60) { h += 1; m -= 60; }
    if (h >= 24) break;
  }
  return times;
}

/* ── Users ────────────────────────────────────────────────── */
var Users = {
  all: function() { return _load(KEYS.USERS); },
  byUid: function(uid) {
    if (!uid) return null;
    var users = this.all();
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid && users[i].uid.trim() === uid.trim()) return users[i];
    }
    return null;
  },
  byRole: function(role) { return this.all().filter(function(u) { return u.role === role; }); },
  create: function(opts) {
    var users = this.all();
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid === opts.uid) throw new Error('UID "' + opts.uid + '" already exists.');
    }
    if (!opts.uid || !opts.name || !opts.role) throw new Error('UID, name and role are required.');
    /* Username uniqueness check */
    if (opts.username) {
      for (var j = 0; j < users.length; j++) {
        if ((users[j].username || '').toLowerCase() === opts.username.toLowerCase()) {
          throw new Error('Username "@' + opts.username + '" ist bereits vergeben.');
        }
      }
    }
    var user = {
      uid:        opts.uid.trim(),
      name:       opts.name.trim(),
      username:   opts.username ? opts.username.trim().toLowerCase() : '',
      role:       opts.role,
      email:      opts.email      ? opts.email.trim()    : '',
      password:   opts.password   ? opts.password        : '',
      discipline: opts.discipline ? opts.discipline       : ''
    };
    users.push(user);
    _save(KEYS.USERS, users);
    return user;
  },
  delete: function(uid) {
    if (uid === 'admin') throw new Error('Cannot delete the admin account.');
    var users = this.all();
    var found = false;
    for (var i = 0; i < users.length; i++) { if (users[i].uid === uid) { found = true; break; } }
    if (!found) throw new Error('User not found.');
    _save(KEYS.USERS, users.filter(function(u) { return u.uid !== uid; }));
    Selections.deleteByUser(uid);
    Slots.deleteByUser(uid);
    Recurring.deleteByTeacher(uid);
  },
  update: function(uid, patch) {
    var users = this.all();
    var found = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid === uid) {
        if (patch.name       !== undefined) users[i].name       = patch.name.trim();
        if (patch.email      !== undefined) users[i].email      = patch.email.trim();
        if (patch.discipline !== undefined) users[i].discipline = patch.discipline;
        if (patch.password   !== undefined) users[i].password   = patch.password;
        if (patch.username   !== undefined) {
          /* Uniqueness check for username update */
          var newU = (patch.username || '').trim().toLowerCase();
          for (var j = 0; j < users.length; j++) {
            if (users[j].uid !== uid && (users[j].username || '').toLowerCase() === newU) {
              throw new Error('Username "@' + newU + '" ist bereits vergeben.');
            }
          }
          users[i].username = newU;
        }
        found = true;
        break;
      }
    }
    if (!found) throw new Error('User not found: ' + uid);
    _save(KEYS.USERS, users);
  },
  byUsername: function(username) {
    var u = (username || '').trim().toLowerCase();
    var all = this.all();
    for (var i = 0; i < all.length; i++) {
      if ((all[i].username || '').toLowerCase() === u) return all[i];
    }
    return null;
  }
};

/* ── Slots ────────────────────────────────────────────────── */
var Slots = {
  all: function() { return _load(KEYS.SLOTS); },
  byTeacher: function(tid) { return this.all().filter(function(s) { return s.teacherId === tid; }); },
  byStudent: function(sid) {
    return this.all().filter(function(s) {
      if (s.students && s.students.length) return s.students.indexOf(sid) !== -1;
      return s.studentId === sid;
    });
  },
  byTeacherDate: function(tid, date) {
    return this.byTeacher(tid).filter(function(s) { return s.date === date; })
      .sort(function(a, b) { return a.time.localeCompare(b.time); });
  },
  exists: function(tid, date, time) {
    var list = this.all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].teacherId === tid && list[i].date === date && list[i].time === time) return list[i];
    }
    return null;
  },
  create: function(opts) {
    var slots = this.all();
    var st   = opts.status || 'available';
    var base = opts.baseStatus || (st === 'booked' ? 'available' : st);
    var primaryStu = opts.studentId || (opts.students && opts.students[0]) || null;
    var allStudents = opts.students && opts.students.length ? opts.students : (primaryStu ? [primaryStu] : []);
    var slot = { slotId: _uuid(), teacherId: opts.teacherId, studentId: primaryStu, students: allStudents, date: opts.date, time: opts.time, status: st, baseStatus: base };
    slots.push(slot);
    _save(KEYS.SLOTS, slots);
    return slot;
  },
  createRange: function(tid, date, startTime, endTime, status) {
    var times = slotTimesInRange(startTime, endTime);
    var slots = this.all();
    var existSet = {};
    for (var j = 0; j < slots.length; j++) {
      var s = slots[j];
      if (s.teacherId === tid && s.date === date) existSet[s.time] = true;
    }
    var count = 0;
    var st = status || 'available';
    var base = (st === 'booked') ? 'available' : st;
    for (var i = 0; i < times.length; i++) {
      if (!existSet[times[i]]) {
        slots.push({ slotId: _uuid(), teacherId: tid, studentId: null, date: date, time: times[i], status: st, baseStatus: base });
        existSet[times[i]] = true;
        count++;
      }
    }
    if (count) _save(KEYS.SLOTS, slots);
    return count;
  },
  update: function(slotId, patch) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k]; for (var p in patch) u[p] = patch[p]; return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Mark a slot as the result of a move — stores original date/time for audit */
  markMoved: function(newSlotId, fromDate, fromTime) {
    var now   = new Date().toISOString();
    var slots = this.all().map(function(s) {
      if (s.slotId !== newSlotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.movedFrom = { date: fromDate, time: fromTime };
      u.movedAt   = now;
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Set availability — updates both status and baseStatus.
     Recurring rule management is handled by the caller
     since store.js does not have access to dayOfWeek here.
     Use setAvailabilityWithRecurring() from teacher.js instead. */
  setAvailability: function(slotId, newBase) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.baseStatus = newBase;
      if (!u.studentId) u.status = newBase;
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Apply timeout overlay — sets status=timeout but preserves baseStatus.
     Cancelling a timeout restores status=baseStatus, NOT always 'available'. */
  applyTimeout: function(slotId) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      /* Preserve baseStatus so we know what to restore to */
      /* Safety-net: preserve original status as baseStatus.
         Never default to 'available' — a teacher-booked slot on a
         non-available time must return to 'disabled' after cancel,
         not become visible to students as available. */
      if (!u.baseStatus) u.baseStatus = (u.status && u.status !== 'booked') ? u.status : 'disabled';
      if (!u.studentId) u.status = 'timeout';
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Remove timeout — restores status to baseStatus (not blindly to 'available') */
  removeTimeout: function(slotId) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      if (!u.studentId) u.status = u.baseStatus || 'available';
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Cancel a booking — restore status to baseStatus */
  cancelBooking: function(slotId, cancelledBy) {
    var now   = new Date().toISOString();
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.studentId   = null;
      u.students    = [];
      u.status      = u.baseStatus || 'available';
      u.cancelledAt = now;
      if (cancelledBy) u.cancelledBy = cancelledBy;
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Book a slot — sets status booked, preserves baseStatus, locks price */
  bookSlot: function(slotId, studentId, price, bookedByRole) {
    var now   = new Date().toISOString();
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.studentId    = studentId;
      u.students     = u.students && u.students.length > 1
        ? u.students  /* preserve existing multi-student array */
        : [studentId];
      u.status       = 'booked';
      if (!u.baseStatus) u.baseStatus = 'available';
      if (price !== undefined && price !== null) u.price = price;
      u.bookedAt     = now;
      u.bookedByRole = bookedByRole || 'student';
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Confirm a booked slot — sets confirmedAt timestamp */
  confirm: function(slotId) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.confirmedAt = new Date().toISOString();
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  /* Release a confirmed slot — marks as paid+released, frees slot for others */
  release: function(slotId) {
    var slots = this.all().map(function(s) {
      if (s.slotId !== slotId) return s;
      var u = {}; for (var k in s) u[k] = s[k];
      u.status      = u.baseStatus || 'available';
      u.studentId   = null;
      u.students    = [];
      u.releasedAt  = new Date().toISOString();
      return u;
    });
    _save(KEYS.SLOTS, slots);
  },
  delete: function(slotId) { _save(KEYS.SLOTS, this.all().filter(function(s) { return s.slotId !== slotId; })); },
  deleteByUser: function(uid) {
    _save(KEYS.SLOTS, this.all().filter(function(s) {
      if (s.teacherId === uid) return false;
      if (s.students && s.students.length) return s.students.indexOf(uid) === -1;
      return s.studentId !== uid;
    }));
  }
};

/* ── Migration: add baseStatus to legacy slots ─────────────── */
(function() {
  var slots = _load(KEYS.SLOTS);
  var changed = false;
  for (var i = 0; i < slots.length; i++) {
    if (!slots[i].baseStatus) {
      changed = true;
      if (slots[i].status === 'booked') {
        slots[i].baseStatus = 'available';
      } else {
        slots[i].baseStatus = slots[i].status;
      }
    }
  }
  if (changed) _save(KEYS.SLOTS, slots);
})();

/* ── Recurring ────────────────────────────────────────────── */
var Recurring = {
  all: function() { return _load(KEYS.RECURRING); },
  byTeacher: function(tid) { return this.all().filter(function(r) { return r.teacherId === tid; }); },
  exists: function(tid, dayOfWeek, time) {
    var list = this.all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].teacherId === tid && list[i].dayOfWeek === dayOfWeek && list[i].time === time) return list[i];
    }
    return null;
  },
  create: function(tid, dayOfWeek, time) {
    if (this.exists(tid, dayOfWeek, time)) return;
    var list = this.all();
    list.push({ recurringId: _uuid(), teacherId: tid, dayOfWeek: dayOfWeek, time: time });
    _save(KEYS.RECURRING, list);
  },
  delete: function(recurringId) { _save(KEYS.RECURRING, this.all().filter(function(r) { return r.recurringId !== recurringId; })); },
  deleteByTeacherDayTime: function(tid, dayOfWeek, time) {
    _save(KEYS.RECURRING, this.all().filter(function(r) {
      return !(r.teacherId === tid && r.dayOfWeek === dayOfWeek && r.time === time);
    }));
  },
  deleteByTeacher: function(tid) { _save(KEYS.RECURRING, this.all().filter(function(r) { return r.teacherId !== tid; })); },

  /**
   * Materialise recurring rules for a given week into app_slots.
   * weekDates: array of 7 Date objects (Mon–Sun)
   * For each recurring rule, if no slot exists for that date+time, create one as 'available'.
   * Existing slots (including timeouts) are NOT overwritten.
   */
  materialiseWeek: function(tid, weekDates) {
    var rules = this.byTeacher(tid);
    if (!rules.length) return;
    var existing = Slots.all();
    var existSet = {};
    for (var j = 0; j < existing.length; j++) {
      var s = existing[j];
      existSet[s.teacherId + '|' + s.date + '|' + s.time] = true;
    }
    var added = 0;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var date = weekDates[rule.dayOfWeek];
      if (!date) continue;
      var dateStr = _fmtDate(date);
      var key = tid + '|' + dateStr + '|' + rule.time;
      if (!existSet[key]) {
        existing.push({ slotId: _uuid(), teacherId: tid, studentId: null, date: dateStr, time: rule.time, status: 'available', baseStatus: 'available' });
        existSet[key] = true;
        added++;
      }
    }
    if (added) _save(KEYS.SLOTS, existing);
  }
};

function _fmtDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

/* ── Selections ───────────────────────────────────────────── */
var Selections = {
  all: function() { return _load(KEYS.SELECTIONS); },
  byStudent: function(sid) { return this.all().filter(function(s) { return s.studentId === sid; }); },
  byTeacher: function(tid) { return this.all().filter(function(s) { return s.teacherId === tid; }); },
  exists: function(sid, tid) {
    var list = this.all();
    for (var i = 0; i < list.length; i++) { if (list[i].studentId === sid && list[i].teacherId === tid) return true; }
    return false;
  },
  create: function(sid, tid) {
    if (this.exists(sid, tid)) return;
    var list = this.all(); list.push({ studentId: sid, teacherId: tid }); _save(KEYS.SELECTIONS, list);
  },
  /* Merge patch into an existing selection — used for priceOverride per student */
  update: function(sid, tid, patch) {
    var list = this.all().map(function(s) {
      if (s.studentId !== sid || s.teacherId !== tid) return s;
      var u = {}; for (var k in s) u[k] = s[k]; for (var p in patch) u[p] = patch[p]; return u;
    });
    _save(KEYS.SELECTIONS, list);
  },
  delete: function(sid, tid) { _save(KEYS.SELECTIONS, this.all().filter(function(s) { return !(s.studentId === sid && s.teacherId === tid); })); },
  deleteByUser: function(uid) { _save(KEYS.SELECTIONS, this.all().filter(function(s) { return s.studentId !== uid && s.teacherId !== uid; })); }
};

/* ── MoveLog ─────────────────────────────────────────────
   Immutable audit log of all slot reschedules.
   Schema MoveLogEntry:
     { moveId, slotId, oldSlotId, teacherId, studentId,
       movedBy, movedByRole, oldDate, oldTime, newDate, newTime,
       reason, reasonLabel, note, createdAt }
*/
var MoveLog = {
  all: function() { return _load(KEYS.MOVE_LOG); },
  add: function(entry) {
    var list = this.all();
    list.unshift(entry);
    _save(KEYS.MOVE_LOG, list);
  },
  byTeacher: function(tid) {
    return this.all().filter(function(e) { return e.teacherId === tid; });
  },
  byStudent: function(sid) {
    return this.all().filter(function(e) { return e.studentId === sid; });
  },
  bySlot: function(slotId) {
    return this.all().filter(function(e) { return e.slotId === slotId || e.oldSlotId === slotId; });
  }
};

/* ── Favorites ────────────────────────────────────────────
   Student marks teachers as favorites for quick reference.
   Schema: [{ studentId, teacherId }]
   Favorites do NOT grant booking access — use Selections for that.
*/
var Favorites = {
  all:     function()       { return _load(KEYS.FAVORITES); },
  byStudent: function(sid)  { return this.all().filter(function(f) { return f.studentId === sid; }); },
  exists:  function(sid, tid) {
    var list = this.all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].studentId === sid && list[i].teacherId === tid) return true;
    }
    return false;
  },
  add: function(sid, tid) {
    if (this.exists(sid, tid)) return;
    var list = this.all();
    list.push({ studentId: sid, teacherId: tid });
    _save(KEYS.FAVORITES, list);
  },
  remove: function(sid, tid) {
    _save(KEYS.FAVORITES, this.all().filter(function(f) {
      return !(f.studentId === sid && f.teacherId === tid);
    }));
  },
  deleteByUser: function(uid) {
    _save(KEYS.FAVORITES, this.all().filter(function(f) {
      return f.studentId !== uid && f.teacherId !== uid;
    }));
  }
};

/* ── GuestSettings ───────────────────────────────────────────
   Stores visitor-level preferences (currency) for unauthenticated
   users or pages without a session uid.
   Schema: { currency: 'EUR' }
   Key: app_guest_settings (plain object, not an array)        */
var GuestSettings = {
  _key: KEYS.GUEST_SETTINGS,
  _load: function() {
    try {
      var raw = localStorage.getItem(this._key);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch(e) { return {}; }
  },
  _save: function(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch(e) {}
  },
  getCurrency: function() {
    return this._load().currency || 'EUR';
  },
  setCurrency: function(code) {
    var data = this._load();
    data.currency = code || 'EUR';
    this._save(data);
  }
};

window.Store = {
  Users: Users, Slots: Slots, Recurring: Recurring, Selections: Selections,
  MoveLog: MoveLog, Favorites: Favorites, GuestSettings: GuestSettings,
  slotEndTime: slotEndTime, slotTimesInRange: slotTimesInRange, SLOT_DURATION: SLOT_DURATION
};

/* ── Shared helpers (used by chat.js, email.js) ──────────── */
window._uuid = _uuid;
window._now  = function() { return new Date().toISOString(); };

/* ── Cross-tab sync ──────────────────────────────────────── */
/* When another tab writes to localStorage, the 'storage' event fires.
   Register callbacks via Store.onChange(fn).
   fn receives { key: string } — the localStorage key that changed.
   Later: replace with Firebase onSnapshot(). */
(function() {
  var _listeners = [];

  Store.onChange = function(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  };

  window.addEventListener('storage', function(e) {
    if (!e.key) return;
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i]({ key: e.key }); } catch(err) { console.error('[Store.onChange]', err); }
    }
  });
})();
