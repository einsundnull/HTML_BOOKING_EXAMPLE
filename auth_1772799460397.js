/**
 * auth.js — Session Management
 *
 * Uses localStorage (not sessionStorage) for file:// compatibility.
 * sessionStorage is sometimes blocked or scoped per-file in browsers.
 */

const SESSION_KEY = 'app_session';

const Auth = {
  login(uid) {
    const user = Store.Users.byUid(uid.trim());
    if (!user) throw new Error('No user found with UID "' + uid + '".');
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch(e) {
      throw new Error('Could not save session. Check browser storage settings.');
    }
    return user;
  },

  logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
    window.location.href = './index.html';
  },

  current() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) || null;
    } catch(e) { return null; }
  },

  /**
   * Guard for protected pages.
   * Returns the user if authenticated + correct role, otherwise redirects.
   */
  require(requiredRole) {
    const user = this.current();
    if (!user) {
      window.location.href = './index.html';
      return null;
    }
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      const map = { admin: './admin.html', teacher: './teacher.html', student: './student.html' };
      window.location.href = map[user.role] || './index.html';
      return null;
    }
    return user;
  },
};

window.Auth = Auth;
