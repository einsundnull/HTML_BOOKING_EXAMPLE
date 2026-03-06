/**
 * store.js — Central localStorage Service
 *
 * Schema:
 *   users      : [{ uid, name, role }]
 *   bookings   : [{ bookingId, teacherId, studentId, date, start, end, status }]
 *   selections : [{ studentId, teacherId }]
 */

var KEYS = {
  USERS:      'app_users',
  BOOKINGS:   'app_bookings',
  SELECTIONS: 'app_selections'
};

function _load(key) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) || []) : [];
  } catch(e) { return []; }
}

function _save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
}

function _uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Seed admin on first load
(function seedAdmin() {
  var users = _load(KEYS.USERS);
  var hasAdmin = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].role === 'admin') { hasAdmin = true; break; }
  }
  if (!hasAdmin) {
    users.push({ uid: 'admin', name: 'Administrator', role: 'admin' });
    _save(KEYS.USERS, users);
  }
})();

var Users = {
  all: function() { return _load(KEYS.USERS); },

  byUid: function(uid) {
    var users = this.all();
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid === uid) return users[i];
    }
    return null;
  },

  byRole: function(role) {
    return this.all().filter(function(u) { return u.role === role; });
  },

  create: function(opts) {
    var uid = opts.uid; var name = opts.name; var role = opts.role;
    var users = this.all();
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid === uid) throw new Error('UID "' + uid + '" already exists.');
    }
    if (!uid || !name || !role) throw new Error('UID, name and role are required.');
    var user = { uid: uid.trim(), name: name.trim(), role: role };
    users.push(user);
    _save(KEYS.USERS, users);
    return user;
  },

  delete: function(uid) {
    if (uid === 'admin') throw new Error('Cannot delete the admin account.');
    var users = this.all();
    var found = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].uid === uid) { found = true; break; }
    }
    if (!found) throw new Error('User not found.');
    _save(KEYS.USERS, users.filter(function(u) { return u.uid !== uid; }));
    Selections.deleteByUser(uid);
    Bookings.deleteByUser(uid);
  }
};

var Bookings = {
  all: function() { return _load(KEYS.BOOKINGS); },

  byTeacher: function(teacherId) {
    return this.all().filter(function(b) { return b.teacherId === teacherId; });
  },

  byStudent: function(studentId) {
    return this.all().filter(function(b) { return b.studentId === studentId; });
  },

  create: function(opts) {
    var bookings = this.all();
    var booking = {
      bookingId: _uuid(),
      teacherId: opts.teacherId,
      studentId: opts.studentId || null,
      date:      opts.date,
      start:     opts.start,
      end:       opts.end,
      status:    opts.status || 'available'
    };
    bookings.push(booking);
    _save(KEYS.BOOKINGS, bookings);
    return booking;
  },

  update: function(bookingId, patch) {
    var bookings = this.all().map(function(b) {
      if (b.bookingId !== bookingId) return b;
      var updated = {};
      for (var k in b) updated[k] = b[k];
      for (var p in patch) updated[p] = patch[p];
      return updated;
    });
    _save(KEYS.BOOKINGS, bookings);
  },

  delete: function(bookingId) {
    _save(KEYS.BOOKINGS, this.all().filter(function(b) { return b.bookingId !== bookingId; }));
  },

  deleteByUser: function(uid) {
    _save(KEYS.BOOKINGS, this.all().filter(function(b) { return b.teacherId !== uid && b.studentId !== uid; }));
  }
};

var Selections = {
  all: function() { return _load(KEYS.SELECTIONS); },

  byStudent: function(studentId) {
    return this.all().filter(function(s) { return s.studentId === studentId; });
  },

  byTeacher: function(teacherId) {
    return this.all().filter(function(s) { return s.teacherId === teacherId; });
  },

  exists: function(studentId, teacherId) {
    var list = this.all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].studentId === studentId && list[i].teacherId === teacherId) return true;
    }
    return false;
  },

  create: function(studentId, teacherId) {
    if (this.exists(studentId, teacherId)) return;
    var list = this.all();
    list.push({ studentId: studentId, teacherId: teacherId });
    _save(KEYS.SELECTIONS, list);
  },

  delete: function(studentId, teacherId) {
    _save(KEYS.SELECTIONS, this.all().filter(function(s) {
      return !(s.studentId === studentId && s.teacherId === teacherId);
    }));
  },

  deleteByUser: function(uid) {
    _save(KEYS.SELECTIONS, this.all().filter(function(s) {
      return s.studentId !== uid && s.teacherId !== uid;
    }));
  }
};

window.Store = { Users: Users, Bookings: Bookings, Selections: Selections };
