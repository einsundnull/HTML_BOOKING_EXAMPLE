/**
 * store.js — Central localStorage Service
 *
 * Schema:
 *   users    : User[]    { uid, name, role }
 *   bookings : Booking[] { bookingId, teacherId, studentId, date, start, end, status }
 *   selections: Selection[] { studentId, teacherId }
 *
 * All mutations go through this layer.
 * Future migration: replace read/write fns with API calls.
 */

const KEYS = {
  USERS:      'app_users',
  BOOKINGS:   'app_bookings',
  SELECTIONS: 'app_selections',
};

/* ── Helpers ──────────────────────────────────────────── */
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch { return []; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ── Seed Admin ───────────────────────────────────────── */
function seedAdmin() {
  const users = load(KEYS.USERS);
  if (!users.find(u => u.role === 'admin')) {
    users.push({ uid: 'admin', name: 'Administrator', role: 'admin' });
    save(KEYS.USERS, users);
  }
}
seedAdmin();

/* ── Users ────────────────────────────────────────────── */
const Users = {
  all() { return load(KEYS.USERS); },

  byUid(uid) { return this.all().find(u => u.uid === uid) ?? null; },

  byRole(role) { return this.all().filter(u => u.role === role); },

  create({ uid, name, role }) {
    const users = this.all();
    if (users.find(u => u.uid === uid)) {
      throw new Error(`UID "${uid}" already exists.`);
    }
    if (!uid || !name || !role) {
      throw new Error('UID, name and role are required.');
    }
    const user = { uid: uid.trim(), name: name.trim(), role };
    users.push(user);
    save(KEYS.USERS, users);
    return user;
  },

  delete(uid) {
    if (uid === 'admin') throw new Error('Cannot delete the admin account.');
    let users = this.all();
    if (!users.find(u => u.uid === uid)) throw new Error('User not found.');
    users = users.filter(u => u.uid !== uid);
    save(KEYS.USERS, users);
    // Cascade: remove selections and bookings
    Selections.deleteByUser(uid);
    Bookings.deleteByUser(uid);
  },
};

/* ── Bookings ─────────────────────────────────────────── */
const Bookings = {
  all() { return load(KEYS.BOOKINGS); },

  byTeacher(teacherId) { return this.all().filter(b => b.teacherId === teacherId); },

  byStudent(studentId) { return this.all().filter(b => b.studentId === studentId); },

  create({ teacherId, studentId, date, start, end, status = 'booked' }) {
    const bookings = this.all();
    const booking = { bookingId: uuid(), teacherId, studentId, date, start, end, status };
    bookings.push(booking);
    save(KEYS.BOOKINGS, bookings);
    return booking;
  },

  update(bookingId, patch) {
    const bookings = this.all().map(b =>
      b.bookingId === bookingId ? { ...b, ...patch } : b
    );
    save(KEYS.BOOKINGS, bookings);
  },

  delete(bookingId) {
    save(KEYS.BOOKINGS, this.all().filter(b => b.bookingId !== bookingId));
  },

  deleteByUser(uid) {
    save(KEYS.BOOKINGS, this.all().filter(
      b => b.teacherId !== uid && b.studentId !== uid
    ));
  },
};

/* ── Selections (Student ↔ Teacher) ───────────────────── */
const Selections = {
  all() { return load(KEYS.SELECTIONS); },

  byStudent(studentId) {
    return this.all().filter(s => s.studentId === studentId);
  },

  byTeacher(teacherId) {
    return this.all().filter(s => s.teacherId === teacherId);
  },

  exists(studentId, teacherId) {
    return !!this.all().find(s => s.studentId === studentId && s.teacherId === teacherId);
  },

  create(studentId, teacherId) {
    if (this.exists(studentId, teacherId)) return;
    const list = this.all();
    list.push({ studentId, teacherId });
    save(KEYS.SELECTIONS, list);
  },

  delete(studentId, teacherId) {
    save(KEYS.SELECTIONS, this.all().filter(
      s => !(s.studentId === studentId && s.teacherId === teacherId)
    ));
  },

  deleteByUser(uid) {
    save(KEYS.SELECTIONS, this.all().filter(
      s => s.studentId !== uid && s.teacherId !== uid
    ));
  },
};

/* ── Export ───────────────────────────────────────────── */
window.Store = { Users, Bookings, Selections };
