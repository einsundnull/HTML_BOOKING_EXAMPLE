/**
 * admin.js — Admin View Logic
 */

let currentUser = null;
let activeTab = 'teacher'; // 'teacher' | 'student'

/* ── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.require('admin');
  if (!currentUser) return;

  document.getElementById('topbar-name').textContent = currentUser.name;

  // Tab switching
  document.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable();
    });
  });

  // Create user form
  document.getElementById('create-form').addEventListener('submit', handleCreate);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

  renderStats();
  renderTable();
});

/* ── Create User ──────────────────────────────────────── */
function handleCreate(e) {
  e.preventDefault();
  const uid  = document.getElementById('f-uid').value.trim();
  const name = document.getElementById('f-name').value.trim();
  const role = document.getElementById('f-role').value;

  clearErrors();

  let valid = true;
  if (!uid)  { showError('e-uid',  'UID is required.'); valid = false; }
  if (!name) { showError('e-name', 'Name is required.'); valid = false; }
  if (!role) { showError('e-role', 'Select a role.'); valid = false; }
  if (!valid) return;

  try {
    Store.Users.create({ uid, name, role });
    Toast.success(`${role === 'teacher' ? 'Teacher' : 'Student'} <strong>${name}</strong> created.`);
    e.target.reset();
    // Switch to correct tab
    activeTab = role;
    document.querySelectorAll('.segmented-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === role);
    });
    renderStats();
    renderTable();
  } catch (err) {
    showError('e-uid', err.message);
  }
}

/* ── Delete User ──────────────────────────────────────── */
function handleDelete(uid) {
  const user = Store.Users.byUid(uid);
  if (!user) return;

  const { close } = Modal.show({
    title: 'Delete user',
    bodyHTML: `
      <p style="color:var(--neutral-700)">
        Are you sure you want to delete <strong>${user.name}</strong> (${user.uid})?<br>
        <span style="color:var(--neutral-500);font-size:var(--text-caption)">
          All their bookings and teacher selections will also be removed.
        </span>
      </p>
    `,
    footerHTML: `
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm">Delete</button>
    `,
  });

  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    try {
      Store.Users.delete(uid);
      Toast.success(`User <strong>${user.name}</strong> deleted.`);
      renderStats();
      renderTable();
    } catch (err) {
      Toast.error(err.message);
    }
    close();
  });
}

/* ── Render Stats ─────────────────────────────────────── */
function renderStats() {
  const users    = Store.Users.all();
  const teachers = users.filter(u => u.role === 'teacher').length;
  const students = users.filter(u => u.role === 'student').length;
  const bookings = Store.Bookings.all().length;

  document.getElementById('stat-teachers').textContent = teachers;
  document.getElementById('stat-students').textContent = students;
  document.getElementById('stat-bookings').textContent = bookings;
}

/* ── Render Table ─────────────────────────────────────── */
function renderTable() {
  const users = Store.Users.byRole(activeTab);
  const tbody = document.getElementById('user-tbody');

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:var(--sp-7) var(--sp-4);">
          <div class="empty-state">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="10" r="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 28c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <p>No ${activeTab}s yet. Create one using the form.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const bookingCount = activeTab === 'teacher'
      ? Store.Bookings.byTeacher(u.uid).length
      : Store.Bookings.byStudent(u.uid).length;
    const selCount = activeTab === 'teacher'
      ? Store.Selections.byTeacher(u.uid).length
      : Store.Selections.byStudent(u.uid).length;

    return `
      <tr>
        <td>
          <code style="font-family:monospace;font-size:var(--text-caption);background:var(--neutral-100);padding:2px 6px;border-radius:3px;color:var(--neutral-700)">${u.uid}</code>
        </td>
        <td style="font-weight:var(--weight-semibold);color:var(--neutral-900)">${u.name}</td>
        <td style="color:var(--neutral-500)">
          ${activeTab === 'teacher'
            ? `${selCount} student${selCount !== 1 ? 's' : ''} · ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}`
            : `${selCount} teacher${selCount !== 1 ? 's' : ''} · ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}`
          }
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="handleDelete('${u.uid}')">
            ${Icons.trash} Remove
          </button>
        </td>
      </tr>`;
  }).join('');
}

/* ── Error Helpers ────────────────────────────────────── */
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearErrors() {
  ['e-uid','e-name','e-role'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}
