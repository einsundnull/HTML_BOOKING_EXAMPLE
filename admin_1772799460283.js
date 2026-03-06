/**
 * admin.js — Admin View Logic
 */

var currentUser = null;
var activeTab   = 'teacher';

document.addEventListener('DOMContentLoaded', function() {
  currentUser = Auth.require('admin');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  // Tab switching
  document.querySelectorAll('.segmented-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.segmented-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderTable();
    });
  });

  document.getElementById('create-form').addEventListener('submit', handleCreate);
  document.getElementById('logout-btn').addEventListener('click', function() { Auth.logout(); });

  renderStats();
  renderTable();
});

function handleCreate(e) {
  e.preventDefault();
  var uid  = document.getElementById('f-uid').value.trim();
  var name = document.getElementById('f-name').value.trim();
  var role = document.getElementById('f-role').value;

  clearErrors();
  var valid = true;
  if (!uid)  { showError('e-uid',  'UID is required.');    valid = false; }
  if (!name) { showError('e-name', 'Name is required.');   valid = false; }
  if (!role) { showError('e-role', 'Select a role.');      valid = false; }
  if (!valid) return;

  try {
    Store.Users.create({ uid: uid, name: name, role: role });
    Toast.success((role === 'teacher' ? 'Teacher' : 'Student') + ' <strong>' + name + '</strong> created.');
    e.target.reset();
    activeTab = role;
    document.querySelectorAll('.segmented-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.tab === role);
    });
    renderStats();
    renderTable();
  } catch(err) {
    showError('e-uid', err.message);
  }
}

function handleDelete(uid) {
  var user = Store.Users.byUid(uid);
  if (!user) return;

  var result = Modal.show({
    title: 'Delete user',
    bodyHTML: '<p style="color:var(--neutral-700)">Delete <strong>' + user.name + '</strong> (' + user.uid + ')? All their bookings and selections will also be removed.</p>',
    footerHTML: '<button class="btn btn-ghost" id="modal-cancel">Cancel</button><button class="btn btn-danger" id="modal-confirm">Delete</button>'
  });

  document.getElementById('modal-cancel').addEventListener('click', result.close);
  document.getElementById('modal-confirm').addEventListener('click', function() {
    try {
      Store.Users.delete(uid);
      Toast.success('User <strong>' + user.name + '</strong> deleted.');
      renderStats();
      renderTable();
    } catch(err) {
      Toast.error(err.message);
    }
    result.close();
  });
}

function renderStats() {
  var users    = Store.Users.all();
  var teachers = users.filter(function(u) { return u.role === 'teacher'; }).length;
  var students = users.filter(function(u) { return u.role === 'student'; }).length;
  var bookings = Store.Bookings.all().length;
  document.getElementById('stat-teachers').textContent = teachers;
  document.getElementById('stat-students').textContent = students;
  document.getElementById('stat-bookings').textContent = bookings;
}

function renderTable() {
  var users = Store.Users.byRole(activeTab);
  var tbody = document.getElementById('user-tbody');

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--sp-6) var(--sp-4);color:var(--neutral-500);font-size:var(--text-caption)">No ' + activeTab + 's yet.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(function(u) {
    var bookingCount = activeTab === 'teacher'
      ? Store.Bookings.byTeacher(u.uid).length
      : Store.Bookings.byStudent(u.uid).length;
    var selCount = activeTab === 'teacher'
      ? Store.Selections.byTeacher(u.uid).length
      : Store.Selections.byStudent(u.uid).length;

    return '<tr>'
      + '<td><code style="font-family:monospace;font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-700)">' + u.uid + '</code></td>'
      + '<td style="font-weight:var(--weight-semibold);color:var(--neutral-900)">' + u.name + '</td>'
      + '<td style="color:var(--neutral-500);font-size:var(--text-caption)">'
        + (activeTab === 'teacher'
            ? selCount + ' student' + (selCount !== 1 ? 's' : '') + ' · ' + bookingCount + ' slot' + (bookingCount !== 1 ? 's' : '')
            : selCount + ' teacher' + (selCount !== 1 ? 's' : '') + ' · ' + bookingCount + ' booking' + (bookingCount !== 1 ? 's' : ''))
      + '</td>'
      + '<td><button class="btn btn-danger btn-sm" onclick="handleDelete(\'' + u.uid + '\')">'
        + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        + ' Remove</button></td>'
      + '</tr>';
  }).join('');
}

function showError(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearErrors() {
  ['e-uid','e-name','e-role'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}
