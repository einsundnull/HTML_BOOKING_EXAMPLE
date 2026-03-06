/**
 * auth.js — Session Management
 *
 * Uses sessionStorage so the session clears on tab close.
 * In production: replace with JWT / server session.
 */

const SESSION_KEY = 'app_session';

const Auth = {
  /**
   * Attempt login with a UID.
   * Returns the user object or throws an error.
   */
  login(uid) {
    const user = Store.Users.byUid(uid.trim());
    if (!user) throw new Error(`No user found with UID "${uid}".`);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  },

  /** Returns the current user or null. */
  current() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? null;
    } catch { return null; }
  },

  /**
   * Guard: call at top of each protected page.
   * Redirects to login if not authenticated or wrong role.
   * @param {string|string[]} requiredRole
   */
  require(requiredRole) {
    const user = this.current();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      // Redirect to the correct page for their role
      const map = { admin: 'admin.html', teacher: 'teacher.html', student: 'student.html' };
      window.location.href = map[user.role] ?? 'index.html';
      return null;
    }
    return user;
  },
};

window.Auth = Auth;
