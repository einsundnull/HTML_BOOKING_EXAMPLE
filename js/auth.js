/**
 * auth.js — URL-Parameter Session
 *
 * Session = ?uid=xxx in der URL.
 * Kein localStorage/sessionStorage — funktioniert bei file://
 */

var Auth = {

  /** Liest UID aus URL, gibt User-Objekt oder null zurück. */
  current: function() {
    try {
      var search = window.location.search;
      if (!search) return null;
      var params = new URLSearchParams(search);
      var uid = params.get('uid');
      if (!uid) return null;
      uid = decodeURIComponent(uid).trim();
      var user = Store.Users.byUid(uid);
      return user;
    } catch(e) {
      return null;
    }
  },

  /** Redirect zur richtigen Seite nach Login. */
  login: function(uid) {
    uid = uid.trim();
    var user = Store.Users.byUid(uid);
    if (!user) throw new Error('Kein Benutzer mit UID "' + uid + '" gefunden.');
    var map = { admin: './admin.html', teacher: './teacher.html', student: './student.html' };
    var target = map[user.role];
    if (!target) throw new Error('Unbekannte Rolle: ' + user.role);
    var url = target + '?uid=' + encodeURIComponent(user.uid);
    window.location.href = url;
    return user;
  },

  /** Zurück zu Login. */
  logout: function() {
    window.location.href = './index.html';
  },

  /** Login per E-Mail + Passwort */
  loginByEmail: function(email, password) {
    email    = (email    || '').trim().toLowerCase();
    password = (password || '').trim();
    if (!email || !password) throw new Error('E-Mail und Passwort eingeben.');
    var users = Store.Users.all();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if ((u.email || '').trim().toLowerCase() === email) {
        if (!u.password) throw new Error('Kein Passwort gesetzt. Bitte UID verwenden.');
        if (u.password !== password) throw new Error('Falsches Passwort.');
        return this.login(u.uid);
      }
    }
    throw new Error('Kein Benutzer mit dieser E-Mail-Adresse gefunden.');
  },

  /**
   * Login per E-Mail ODER Benutzername + Passwort.
   * Erkennt automatisch: enthält @domain → E-Mail, sonst → Username.
   * Nutzt AppService als einzigen Zugriffspunkt — kein direkter Store-Zugriff.
   * Async wegen AppService-Adapter-Architektur.
   */
  loginByEmailOrUsername: function(query, password, onSuccess, onError) {
    var self = this;
    query    = (query    || '').trim();
    password = (password || '').trim();
    if (!query || !password) {
      if (onError) onError('E-Mail / Benutzername und Passwort eingeben.');
      return;
    }
    AppService.getUserByEmailOrUsername(query, function(err, user) {
      if (err) { if (onError) onError(err.message || String(err)); return; }
      if (!user) {
        if (onError) onError('Kein Benutzer mit dieser E-Mail oder diesem Benutzernamen gefunden.');
        return;
      }
      if (!user.password) {
        if (onError) onError('Kein Passwort gesetzt. Bitte UID verwenden.');
        return;
      }
      if (user.password !== password) {
        if (onError) onError('Falsches Passwort.');
        return;
      }
      try {
        self.login(user.uid);
        if (onSuccess) onSuccess(user);
      } catch(e) {
        if (onError) onError(e.message || String(e));
      }
    });
  },

  /** Gibt alle User mit gesetzter E-Mail zurück (für Google-Mock) */
  googleAccounts: function() {
    return Store.Users.all().filter(function(u) {
      return u.email && u.email.trim() !== '' && u.role !== 'admin';
    });
  },

  /** Login per Google-Mock-Auswahl */
  loginByGoogle: function(uid) {
    return this.login(uid);
  },

  /**
   * Guard für geschützte Seiten.
   * Gibt User zurück wenn OK, sonst redirect + null.
   * NACH dem Aufruf sofort auf null prüfen und return!
   */
  require: function(requiredRole) {
    var user = this.current();

    if (!user) {
      window.location.href = './index.html';
      return null;
    }

    var roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (roles.indexOf(user.role) === -1) {
      var map = { admin: './admin.html', teacher: './teacher.html', student: './student.html' };
      var target = map[user.role] || './index.html';
      window.location.href = target + '?uid=' + encodeURIComponent(user.uid);
      return null;
    }

    return user;
  }
};

window.Auth = Auth;
