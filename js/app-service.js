/**
 * app-service.js — AppService
 *
 * Einzige Datenzugriffs-Schnittstelle für alle Consumer-Dateien.
 * Delegiert jeden Aufruf an den in app-config.js konfigurierten Adapter.
 *
 * Consumer-Code (teacher.js, student.js, admin.js, navbar.js,
 * skiing-catalog.js etc.) ruft NUR AppService.* auf — niemals
 * Store.*, ProfileStore.* oder localStorage direkt.
 *
 * Alle Methoden sind asynchron: function(err, result)
 *   err    — Error-Objekt bei Fehler, sonst null
 *   result — Ergebnis bei Erfolg, sonst null
 *
 * Fehler müssen im Consumer-Code immer behandelt werden.
 *
 * Regeln: var only, function(){}, no arrow functions,
 *         no template literals, no ?. or ??
 *
 * Abhängigkeiten (Ladereihenfolge in HTML):
 *   store.js → profile.js → adapter-localstorage.js (oder firestore)
 *   → app-config.js → app-service.js → [consumer files]
 */

var AppService = (function() {

  /* ── Adapter-Zugriff ────────────────────────────────────
     AppAdapter wird in app-config.js gesetzt.
     Fehler hier bedeutet: falsche Script-Ladereihenfolge. */
  function _adapter() {
    if (typeof AppAdapter === 'undefined') {
      throw new Error('[AppService] AppAdapter nicht gefunden. Ladereihenfolge prüfen: app-config.js muss vor app-service.js geladen werden.');
    }
    return AppAdapter;
  }

  /* ── Interner Helfer: Methode prüfen und delegieren ───── */
  function _call(method, args) {
    var adapter = _adapter();
    if (typeof adapter[method] !== 'function') {
      var cb = args[args.length - 1];
      if (typeof cb === 'function') {
        cb(new Error('[AppService] Adapter-Methode "' + method + '" nicht gefunden.'), null);
      }
      return;
    }
    adapter[method].apply(adapter, args);
  }

  /* ══════════════════════════════════════════════════════
     USERS
  ══════════════════════════════════════════════════════ */

  /** Einzelnen User laden.
   *  @param {string}   uid
   *  @param {function} callback — function(err, user|null) */
  function getUser(uid, callback) {
    _call('getUser', [uid, callback]);
  }

  /** Alle User laden.
   *  @param {function} callback — function(err, users[]) */
  function getAllUsers(callback) {
    _call('getAllUsers', [callback]);
  }

  /** User nach Rolle laden.
   *  @param {string}   role — 'teacher'|'student'|'admin'
   *  @param {function} callback — function(err, users[]) */
  function getUsersByRole(role, callback) {
    _call('getUsersByRole', [role, callback]);
  }

  /** User erstellen.
   *  @param {object}   data — {uid, name, role, email}
   *  @param {function} callback — function(err, user) */
  function createUser(data, callback) {
    _call('createUser', [data, callback]);
  }

  function isUsernameAvailable(username, callback) {
    _call('isUsernameAvailable', [username, callback]);
  }

  function generateUsername(name, callback) {
    _call('generateUsername', [name, callback]);
  }

  function getUserByEmailOrUsername(query, callback) {
    _call('getUserByEmailOrUsername', [query, callback]);
  }

  /** User löschen (inkl. zugehörige Slots + Selections).
   *  @param {string}   uid
   *  @param {function} callback — function(err, true) */
  function deleteUser(uid, callback) {
    _call('deleteUser', [uid, callback]);
  }

  function updateUser(uid, patch, callback) {
    _call('updateUser', [uid, patch, callback]);
  }

  /* ══════════════════════════════════════════════════════
     PROFILES
  ══════════════════════════════════════════════════════ */

  /** Profil laden oder null.
   *  @param {string}   uid
   *  @param {function} callback — function(err, profile|null) */
  function getProfile(uid, callback) {
    _call('getProfile', [uid, callback]);
  }

  /** Profil laden oder Default-Objekt (nie null).
   *  @param {string}   uid
   *  @param {function} callback — function(err, profile) */
  function getProfileOrDefault(uid, callback) {
    _call('getProfileOrDefault', [uid, callback]);
  }

  /** Profil speichern.
   *  @param {string}   uid
   *  @param {object}   data
   *  @param {function} callback — function(err, savedProfile) */
  function saveProfile(uid, data, callback) {
    _call('saveProfile', [uid, data, callback]);
  }

  /** Anzeigename: Profil-Name > Store-Name > uid.
   *  @param {string}   uid
   *  @param {function} callback — function(err, name) */
  function getDisplayName(uid, callback) {
    _call('getDisplayName', [uid, callback]);
  }

  /** Profilbild (base64) oder null.
   *  @param {string}   uid
   *  @param {function} callback — function(err, photo|null) */
  function getProfilePhoto(uid, callback) {
    _call('getProfilePhoto', [uid, callback]);
  }

  /* ══════════════════════════════════════════════════════
     GUEST SETTINGS
  ══════════════════════════════════════════════════════ */

  /** Gast-Anzeigewährung lesen.
   *  Priorität: 1) Wert in app_guest_settings, 2) 'EUR'
   *  @param {function} callback — function(err, currencyCode) */
  function getGuestCurrency(callback) {
    _call('getGuestCurrency', [callback]);
  }

  /** Gast-Anzeigewährung setzen (kein Login erforderlich).
   *  Wird von der Navbar aufgerufen wenn der User die Währung wechselt.
   *  @param {string}   code     — ISO 4217, z.B. 'USD'
   *  @param {function} callback — function(err, code) */
  function setGuestCurrency(code, callback) {
    _call('setGuestCurrency', [code, callback]);
  }

  /* ══════════════════════════════════════════════════════
     TEACHERS + PROFILES (kombinierte Abfrage)
  ══════════════════════════════════════════════════════ */

  /** Alle Teacher mit ihren Profilen laden.
   *  Firestore: ein Read aus teacher_profiles Collection.
   *  LocalStorage: join in Adapter.
   *  @param {function} callback — function(err, [{user, profile}]) */
  function getTeachersWithProfiles(callback) {
    _call('getTeachersWithProfiles', [callback]);
  }

  /* ══════════════════════════════════════════════════════
     SLOTS
  ══════════════════════════════════════════════════════ */

  /** Einzelnen Slot per ID laden.
   *  @param {string}   slotId
   *  @param {function} callback — function(err, slot|null) */
  function getSlotById(slotId, callback) {
    _call('getSlotById', [slotId, callback]);
  }

  /** Alle Slots eines Teachers laden.
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, slots[]) */
  function getSlotsByTeacher(teacherId, callback) {
    _call('getSlotsByTeacher', [teacherId, callback]);
  }

  /** Slots eines Teachers für ein bestimmtes Datum (sortiert nach Zeit).
   *  @param {string}   teacherId
   *  @param {string}   date — 'YYYY-MM-DD'
   *  @param {function} callback — function(err, slots[]) */
  function getSlotsByTeacherDate(teacherId, date, callback) {
    _call('getSlotsByTeacherDate', [teacherId, date, callback]);
  }

  /** Alle Slots eines Students laden.
   *  @param {string}   studentId
   *  @param {function} callback — function(err, slots[]) */
  function getSlotsByStudent(studentId, callback) {
    _call('getSlotsByStudent', [studentId, callback]);
  }

  /** Alle Slots laden (nur Admin-Dashboard).
   *  HINWEIS: In Firestore teuer — sparsam verwenden.
   *  @param {function} callback — function(err, slots[]) */
  function getAllSlots(callback) {
    _call('getAllSlots', [callback]);
  }

  /** Prüfen ob ein Slot existiert.
   *  @param {string}   teacherId
   *  @param {string}   date
   *  @param {string}   time — 'HH:MM'
   *  @param {function} callback — function(err, slot|null) */
  function slotExists(teacherId, date, time, callback) {
    _call('slotExists', [teacherId, date, time, callback]);
  }

  /** Einzelnen Slot erstellen.
   *  @param {object}   data — {teacherId, date, time, status, ...}
   *  @param {function} callback — function(err, slot) */
  function createSlot(data, callback) {
    _call('createSlot', [data, callback]);
  }

  /** Mehrere Slots für einen Zeitbereich erstellen.
   *  @param {string}   teacherId
   *  @param {string}   date
   *  @param {string}   startTime — 'HH:MM'
   *  @param {string}   endTime   — 'HH:MM'
   *  @param {string}   status
   *  @param {function} callback — function(err, count) */
  function createSlotRange(teacherId, date, startTime, endTime, status, callback) {
    _call('createSlotRange', [teacherId, date, startTime, endTime, status, callback]);
  }

  /** Slot-Felder aktualisieren (patch).
   *  @param {string}   slotId
   *  @param {object}   patch
   *  @param {function} callback — function(err, true) */
  function updateSlot(slotId, patch, callback) {
    _call('updateSlot', [slotId, patch, callback]);
  }

  /** Verfügbarkeit eines Slots setzen (baseStatus + status).
   *  @param {string}   slotId
   *  @param {string}   newBase — 'available'|'disabled'|'timeout'
   *  @param {function} callback — function(err, true) */
  function setSlotAvailability(slotId, newBase, callback) {
    _call('setSlotAvailability', [slotId, newBase, callback]);
  }

  /** Timeout-Overlay setzen — status=timeout, baseStatus bleibt erhalten.
   *  Entfernen mit removeSlotTimeout().
   *  @param {string}   slotId
   *  @param {function} callback — function(err, true) */
  function applySlotTimeout(slotId, callback) {
    _call('applySlotTimeout', [slotId, callback]);
  }

  /** Timeout entfernen — status wird auf baseStatus zurückgesetzt (nicht blind 'available').
   *  @param {string}   slotId
   *  @param {function} callback — function(err, true) */
  function removeSlotTimeout(slotId, callback) {
    _call('removeSlotTimeout', [slotId, callback]);
  }

  /** Slot buchen (status=booked, studentId setzen).
   *  Firestore: Transaction empfohlen.
   *  @param {string}   slotId
   *  @param {string}   studentId
   *  @param {function} callback — function(err, true) */
  function bookSlot(slotId, studentId, callback, bookedByRole) {
    _call('bookSlot', [slotId, studentId, callback, bookedByRole || 'student']);
  }

  /** Buchung stornieren (status=baseStatus, studentId=null).
   *  @param {string}   slotId
   *  @param {function} callback — function(err, true) */
  function cancelSlotBooking(slotId, callback) {
    _call('cancelSlotBooking', [slotId, callback]);
  }

  /** Slot löschen.
   *  @param {string}   slotId
   *  @param {function} callback — function(err, true) */
  function deleteSlot(slotId, callback) {
    _call('deleteSlot', [slotId, callback]);
  }

  /**
   * Release a confirmed slot — marks as paid+released, frees for others.
   * @param {string}   slotId
   * @param {function} callback  fn(err)
   */
  function releaseSlot(slotId, callback) {
    _call('releaseSlot', [slotId, callback]);
  }

  /* ══════════════════════════════════════════════════════
     RECURRING RULES
  ══════════════════════════════════════════════════════ */

  /** Alle Recurring-Regeln eines Teachers.
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, rules[]) */
  function getRecurringByTeacher(teacherId, callback) {
    _call('getRecurringByTeacher', [teacherId, callback]);
  }

  /** Prüfen ob Recurring-Regel existiert.
   *  @param {string}   teacherId
   *  @param {number}   dayOfWeek — 0=Mo…6=So
   *  @param {string}   time — 'HH:MM'
   *  @param {function} callback — function(err, rule|null) */
  function recurringExists(teacherId, dayOfWeek, time, callback) {
    _call('recurringExists', [teacherId, dayOfWeek, time, callback]);
  }

  /** Recurring-Regel erstellen.
   *  @param {string}   teacherId
   *  @param {number}   dayOfWeek
   *  @param {string}   time
   *  @param {function} callback — function(err, true) */
  function createRecurring(teacherId, dayOfWeek, time, callback) {
    _call('createRecurring', [teacherId, dayOfWeek, time, callback]);
  }

  /** Recurring-Regel per Tag+Zeit löschen.
   *  @param {string}   teacherId
   *  @param {number}   dayOfWeek
   *  @param {string}   time
   *  @param {function} callback — function(err, true) */
  function deleteRecurringByDayTime(teacherId, dayOfWeek, time, callback) {
    _call('deleteRecurringByDayTime', [teacherId, dayOfWeek, time, callback]);
  }

  /** Recurring-Regeln für eine Woche materialisieren (Slots erstellen).
   *  @param {string}   teacherId
   *  @param {Date[]}   weekDates — Array von 7 Date-Objekten (Mo–So)
   *  @param {function} callback — function(err, true) */
  function materialiseWeek(teacherId, weekDates, callback) {
    _call('materialiseWeek', [teacherId, weekDates, callback]);
  }

  /* ══════════════════════════════════════════════════════
     SELECTIONS (Student ↔ Teacher)
  ══════════════════════════════════════════════════════ */

  /** Alle Selections eines Students.
   *  @param {string}   studentId
   *  @param {function} callback — function(err, selections[]) */
  function getSelectionsByStudent(studentId, callback) {
    _call('getSelectionsByStudent', [studentId, callback]);
  }

  /** Alle Selections eines Teachers.
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, selections[]) */
  function getSelectionsByTeacher(teacherId, callback) {
    _call('getSelectionsByTeacher', [teacherId, callback]);
  }

  /** Selection erstellen (Student wählt Teacher).
   *  @param {string}   studentId
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, true) */
  function createSelection(studentId, teacherId, callback) {
    _call('createSelection', [studentId, teacherId, callback]);
  }

  /** Selection löschen.
   *  @param {string}   studentId
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, true) */
  function deleteSelection(studentId, teacherId, callback) {
    _call('deleteSelection', [studentId, teacherId, callback]);
  }

  /** Selection aktualisieren — z.B. priceOverride setzen.
   *  @param {string}   studentId
   *  @param {string}   teacherId
   *  @param {object}   patch — { priceOverride: number|null }
   *  @param {function} callback — function(err, true) */
  function updateSelection(studentId, teacherId, patch, callback) {
    _call('updateSelection', [studentId, teacherId, patch, callback]);
  }

  /** Effektiven Preis für einen Schüler beim Lehrer ermitteln.
   *  Priorität: 1) Selection.priceOverride  2) Teacher-Profil pricePerHalfHour
   *  @param  {string} studentId
   *  @param  {string} teacherId
   *  @returns {number} Preis in der Profil-Währung des Lehrers */
  function getStudentPriceForTeacherSync(studentId, teacherId) {
    var sels = Store.Selections.byTeacher(teacherId);
    for (var i = 0; i < sels.length; i++) {
      if (sels[i].studentId === studentId &&
          sels[i].priceOverride !== undefined &&
          sels[i].priceOverride !== null &&
          sels[i].priceOverride !== '') {
        return parseFloat(sels[i].priceOverride) || 0;
      }
    }
    return getTeacherPriceSync(teacherId);
  }

  /* ── Favorites ──────────────────────────────────────────── */

  /** Alle Favoriten eines Students.
   *  @param {string}   studentId
   *  @param {function} callback — function(err, favorites[]) */
  function getFavoritesByStudent(studentId, callback) {
    _call('getFavoritesByStudent', [studentId, callback]);
  }

  /** Lehrer als Favorit speichern.
   *  @param {string}   studentId
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, bool) */
  function addFavorite(studentId, teacherId, callback) {
    _call('addFavorite', [studentId, teacherId, callback]);
  }

  /** Lehrer aus Favoriten entfernen.
   *  @param {string}   studentId
   *  @param {string}   teacherId
   *  @param {function} callback — function(err, bool) */
  function removeFavorite(studentId, teacherId, callback) {
    _call('removeFavorite', [studentId, teacherId, callback]);
  }

  /** Sync-Lesezugriff auf Favoriten eines Students (kein Adapter-Overhead).
   *  @param  {string} studentId
   *  @return {string[]} Array von teacherIds */
  function getFavoriteTeacherIdsSync(studentId) {
    var favs = Store.Favorites.byStudent(studentId);
    return favs.map(function(f) { return f.teacherId; });
  }

  /* ══════════════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════════════ */

  /** Admin-Dashboard-Statistiken.
   *  @param {function} callback — function(err, {totalUsers, teachers, students, bookings}) */
  function getAdminStats(callback) {
    _call('getAdminStats', [callback]);
  }

  /** User-Statistiken (Slots + Selections).
   *  @param {string}   uid
   *  @param {function} callback — function(err, {slots, selections}) */
  function getUserStats(uid, callback) {
    _call('getUserStats', [uid, callback]);
  }

  /* ══════════════════════════════════════════════════════
     TIME HELPERS
     Kein Datenzugriff — werden direkt an Adapter delegiert
     (FirestoreAdapter hat eigene Implementierung ohne Store-Abhängigkeit)
  ══════════════════════════════════════════════════════ */

  /** Endzeit eines Slots berechnen (+30 Minuten).
   *  @param  {string} timeStr — 'HH:MM'
   *  @return {string} — 'HH:MM' */
  function slotEndTime(timeStr) {
    return _adapter().slotEndTime(timeStr);
  }

  /* ── isSlotVisibleForStudent ──────────────────────────────────────────────
     Returns true if the slot should be shown to the given student, based on
     the slot's visibility config.
     Visibility rules (evaluated in priority order):
       public       → always visible
       new-only     → only students with 0 past bookings with this teacher
       whitelist    → only students in visibilityList
       blacklist    → all except students in visibilityList
       blacklist-new→ blacklist AND also hides students with 0 past bookings
     excludeNewStudents flag on the slot acts as an independent extra filter:
       if true, new students are always hidden regardless of other settings.
  ──────────────────────────────────────────────────────────────────────── */
  function isSlotVisibleForStudent(slot, studentId) {
    if (!slot || !studentId) return false;
    var vis  = slot.visibility  || 'public';
    var list = slot.visibilityList || [];

    /* Determine if this student is "new" (no past bookings with this teacher) */
    function _isNew() {
      var booked = _syncRead('getSlotsByStudent', [studentId]);
      if (!booked) return true;
      for (var i = 0; i < booked.length; i++) {
        if (booked[i].teacherId === slot.teacherId &&
            (booked[i].status === 'booked' || booked[i].confirmedAt)) return false;
      }
      return true;
    }

    if (vis === 'new-only') return _isNew();

    /* excludeNewStudents: additional independent filter */
    if (slot.excludeNewStudents && _isNew()) return false;

    if (vis === 'whitelist') return list.indexOf(studentId) !== -1;
    if (vis === 'blacklist') return list.indexOf(studentId) === -1;
    if (vis === 'blacklist-new') {
      if (_isNew()) return false;
      return list.indexOf(studentId) === -1;
    }
    return true; /* public */
  }

  /** Alle Slot-Zeiten in einem Bereich (30-min-Schritte).
   *  @param  {string} startTime — 'HH:MM'
   *  @param  {string} endTime   — 'HH:MM'
   *  @return {string[]} */
  function slotTimesInRange(startTime, endTime) {
    return _adapter().slotTimesInRange(startTime, endTime);
  }

  /* ══════════════════════════════════════════════════════
     WALLET
  ══════════════════════════════════════════════════════ */

  /**
   * Wallet eines Users laden (oder initialisieren).
   * @param {string}   uid
   * @param {function} callback  fn(err, wallet)
   *   wallet: { uid, balance, currency, updatedAt }
   */
  function getWallet(uid, callback) {
    _call('getWallet', [uid, callback]);
  }

  /* Alle Wallets laden (fuer Admin-Uebersichten).
   * cb: fn(err, walletsObject)  — walletsObject: { uid: {balance, currency, updatedAt} } */
  function getAllWallets(callback) {
    _call('getAllWallets', [callback]);
  }

  /**
   * calcDepositInfo — deposit settings for a teacher + given total amount.
   * cb: fn(err, { depositAmount, depositType, depositPercent, requiresDeposit, paymentMode })
   */
  function calcDepositInfo(teacherId, fullAmount, cb) {
    _call('calcDepositInfo', [teacherId, fullAmount, cb]);
  }

  /**
   * checkPendingAffordability — single service call that answers:
   * "Can studentId afford these pending book slots?"
   *
   * pendingSlots: array of { slotId, teacherId, price } (action='book' entries)
   * cb: fn(err, {
   *   totalCost,        — sum of all pending-book slot prices
   *   walletBalance,    — current student wallet balance
   *   canAfford,        — totalCost <= walletBalance
   *   requiresDeposit,  — teacher requires deposit
   *   depositAmount,    — deposit amount required
   *   depositCovered,   — totalCost <= depositAmount (deposit is enough)
   *   paymentMode       — 'instant' | 'cash_on_site'
   * })
   */
  function checkPendingAffordability(pendingSlots, studentId, cb) {
    if (!pendingSlots || !pendingSlots.length) {
      return cb(null, { totalCost: 0, walletBalance: 0, canAfford: true,
        requiresDeposit: false, depositAmount: 0, depositCovered: true, paymentMode: 'instant' });
    }
    /* All pending slots are for one teacher (single day view) */
    var teacherId  = pendingSlots[0].teacherId;
    var totalCost  = 0;
    for (var i = 0; i < pendingSlots.length; i++) {
      totalCost += parseFloat(pendingSlots[i].price) || 0;
    }
    totalCost = Math.round(totalCost * 100) / 100;

    getWallet(studentId, function(err, wallet) {
      if (err) return cb(err, null);
      var balance = wallet ? (wallet.balance || 0) : 0;
      calcDepositInfo(teacherId, totalCost, function(err2, dep) {
        if (err2) return cb(err2, null);
        cb(null, {
          totalCost:       totalCost,
          walletBalance:   balance,
          canAfford:       totalCost <= balance,
          requiresDeposit: dep.requiresDeposit,
          depositAmount:   dep.depositAmount,
          depositCovered:  dep.requiresDeposit ? (balance >= dep.depositAmount) : true,
          paymentMode:     dep.paymentMode
        });
      });
    });
  }

  /**
   * Guthaben einzahlen.
   * @param {string}   uid
   * @param {number}   amount       — positiver Betrag in EUR
   * @param {string}   description  — optionaler Verwendungszweck
   * @param {function} callback     fn(err, { wallet, transaction })
   */
  function deposit(uid, amount, description, callback) {
    _call('deposit', [uid, amount, description, callback]);
  }

  /**
   * Guthaben auszahlen.
   * Schlaegt fehl wenn balance < amount.
   * @param {string}   uid
   * @param {number}   amount
   * @param {string}   description
   * @param {function} callback  fn(err, { wallet, transaction })
   */
  function withdraw(uid, amount, description, callback) {
    _call('withdraw', [uid, amount, description, callback]);
  }

  /**
   * Transaktionshistorie eines Users laden.
   * @param {string}   uid
   * @param {function} callback  fn(err, transactions[])
   */
  function getTransactions(uid, callback) {
    _call('getTransactions', [uid, callback]);
  }
  function getAllTransactions(opts, callback) {
    _call('getAllTransactions', [opts, callback]);
  }
  function getBookingHistory(uid, opts, callback) {
    _call('getBookingHistory', [uid, opts, callback]);
  }
  function writeBookingRecord(slotId, studentId, teacherId, escrow, callback) {
    _call('writeBookingRecord', [slotId, studentId, teacherId, escrow, callback]);
  }
  /**
   * bookSlotWithEscrowSilent — same as bookSlotWithEscrow but does NOT write
   * per-slot booking/escrow_hold TXs. Used for batch bookings where the caller
   * writes a single block-level TX after all slots are processed.
   * cb: fn(err, { escrow, transaction|null })
   */
  function bookSlotWithEscrowSilent(slotId, studentId, teacherId, cb, bookedByRole) {
    bookSlot(slotId, studentId, function(err) {
      if (err) return cb(err, null);

      /* ── Auto-blacklist promotion on first booking ── */
      var allBooked = _syncRead('getSlotsByStudent', [studentId]) || [];
      var withTeacher = allBooked.filter(function(s) {
        return s.teacherId === teacherId && s.status === 'booked';
      });
      if (withTeacher.length === 1) {
        /* This IS the first booking — promote asynchronously, don't block escrow */
        promoteStudentToBlacklist(studentId, teacherId, function() {});
      }

      createEscrow(slotId, studentId, teacherId, function(err2, escrow) {
        if (err2) {
          cancelSlotBooking(slotId, function() { cb(err2, null); });
          return;
        }
        if (escrow.paymentMode === 'cash_on_site' || !escrow.requiresDeposit) {
          return cb(null, { escrow: escrow, transaction: null });
        }
        /* Use payDepositSilent — no individual escrow_hold TX written */
        _call('payDepositSilent', [escrow.escrowId, function(err3, result) {
          if (err3) {
            cancelSlotBooking(slotId, function() { cb(err3, null); });
            return;
          }
          cb(null, { escrow: escrow, transaction: null });
        }]);
      });
    }, bookedByRole);
  }
  function writeBlockBookingRecord(slots, escrows, initiatorRole, callback) {
    _call('writeBlockBookingRecord', [slots, escrows, initiatorRole, callback]);
  }
  function writeBlockEscrowHold(slots, escrows, callback) {
    _call('writeBlockEscrowHold', [slots, escrows, callback]);
  }

  function writeMoveRecord(oldSlot, newSlot, initiatorId, initiatorRole, callback, moveOpts) {
    _call('writeMoveRecord', [oldSlot, newSlot, initiatorId, initiatorRole, callback, moveOpts || {}]);
  }

  /*
   * PHASE 2 — IMPLEMENTIERT (localStorage Adapter)
   * Für Firestore-Migration: Adapter-Methoden ersetzen.
   */

  /* ══════════════════════════════════════════════════════
     ESCROW
  ══════════════════════════════════════════════════════ */

  /* Create escrow for an extra student on an already-booked slot (multi-student) */
  function createEscrowForStudent(slotId, studentId, teacherId, cb) {
    /* Reuse bookSlotWithEscrowSilent logic but skip the bookSlot store call */
    getEscrowBySlot(slotId, function(err, existing) {
      if (err) return cb ? cb(err) : null;
      /* Use same deposit settings as existing escrow */
      calcDepositInfo(teacherId, getStudentPriceForTeacherSync(studentId, teacherId) || 0, function(depErr, dep) {
        var depAmt  = (!depErr && dep) ? (dep.depositAmount || 0) : 0;
        var wallet  = _syncRead('getWallet', [studentId]);
        var balance = wallet ? (parseFloat(wallet.balance) || 0) : 0;
        if (balance < depAmt) {
          return cb ? cb(new Error('Guthaben zu gering für Deposit.')) : null;
        }
        _call('createEscrow', [slotId, studentId, teacherId, function(escErr, escrow) {
          if (escErr) return cb ? cb(escErr) : null;
          if (depAmt > 0) {
            _call('withdraw', [studentId, depAmt, 'Deposit Buchung', function(wErr) {
              cb ? cb(wErr || null) : null;
            }]);
          } else {
            cb ? cb(null) : null;
          }
        }]);
      });
    });
  }

  function getAllEscrows(callback) { _call('getAllEscrows', [callback]); }
  function createEscrow(slotId, studentId, teacherId, cb) { _call('createEscrow', [slotId, studentId, teacherId, cb]); }
  function getEscrowBySlot(slotId, cb) { _call('getEscrowBySlot', [slotId, cb]); }
  function getEscrowsByStudent(uid, cb) { _call('getEscrowsByStudent', [uid, cb]); }
  function getEscrowsByTeacher(uid, cb) { _call('getEscrowsByTeacher', [uid, cb]); }
  function adminReleaseEscrow(escrowId, adminUid, cb) { _call('adminReleaseEscrow', [escrowId, adminUid, cb]); }
  function payDeposit(escrowId, cb) { _call('payDeposit', [escrowId, cb]); }
  function requestDepositRefund(escrowId, cb) { _call('requestDepositRefund', [escrowId, cb]); }
  function releaseDeposit(escrowId, cb) { _call('releaseDeposit', [escrowId, cb]); }
  function forfeitDeposit(escrowId, cb) { _call('forfeitDeposit', [escrowId, cb]); }
  function confirmLesson(escrowId, cb) { _call('confirmLesson', [escrowId, cb]); }

  /**
   * bookSlotWithEscrow — atomic: book slot + create escrow + pay deposit (if instant).
   * UI always calls this instead of bookSlot directly.
   * cb: fn(err, { escrow, transaction|null })
   */
  function bookSlotWithEscrow(slotId, studentId, teacherId, cb) {
    bookSlot(slotId, studentId, function(err) {
      if (err) return cb(err, null);
      createEscrow(slotId, studentId, teacherId, function(err2, escrow) {
        if (err2) {
          /* Rollback slot booking if escrow creation fails */
          cancelSlotBooking(slotId, function() { cb(err2, null); });
          return;
        }
        /* Only charge wallet if paymentMode is instant and deposit required */
        if (escrow.paymentMode === 'cash_on_site' || !escrow.requiresDeposit) {
          /* Write booking audit record — no deposit charged but booking must be logged */
          _call('writeBookingRecord', [slotId, studentId, teacherId, escrow, function() {}]);
          return cb(null, { escrow: escrow, transaction: null });
        }
        payDeposit(escrow.escrowId, function(err3, result) {
          if (err3) {
            /* Rollback: cancel slot so it doesn't appear as booked without payment */
            cancelSlotBooking(slotId, function() { cb(err3, null); });
            return;
          }
          /* Write booking audit record after successful deposit payment */
          _call('writeBookingRecord', [slotId, studentId, teacherId, escrow, function() {}]);
          cb(null, result);
        });
      });
    });
  }

  /** Confirm a slot booking (mark as confirmed, payment released).
   *  Atomic: sets confirmedAt on slot + releases escrow deposit to teacher.
   *  @param {string}   slotId
   *  @param {function} callback fn(err)  */
  function confirmSlot(slotId, callback) {
    /* 1. Mark slot as confirmed */
    _call('confirmSlot', [slotId, function(err) {
      if (err) return callback ? callback(err) : null;
      /* 2. Find the escrow for this slot and release it */
      getEscrowBySlot(slotId, function(err2, escrow) {
        if (err2 || !escrow) {
          /* No escrow (cash_on_site) — confirm only, no money to release */
          if (callback) callback(null);
          return;
        }
        if (escrow.depositStatus !== 'held') {
          /* Already released or not paid — nothing to do */
          if (callback) callback(null);
          return;
        }
        confirmLesson(escrow.escrowId, function(err3) {
          if (callback) callback(err3 || null);
        });
      });
    }]);
  }

  /* ══════════════════════════════════════════════════════
     CANCELLATION POLICY
  ══════════════════════════════════════════════════════ */

  /**
   * calcCancellationPolicy — computes what happens financially if slotId is cancelled.
   * actorRole: 'student' | 'teacher' | 'admin'
   * cb: fn(err, {
   *   tier,           — 'full_refund'|'partial'|'forfeit'|'teacher_cancel'|'no_escrow'
   *   noticeHours,    — hours remaining until lesson (null if past/unknown)
   *   depositStatus,  — current escrow deposit status or null
   *   depositAmount,  — amount held (0 if no escrow)
   *   refundAmount,   — what student gets back
   *   forfeitAmount,  — what teacher keeps
   *   escrowId        — escrow id or null
   *   paymentMode     — 'instant'|'cash_on_site'
   * })
   */
  function calcCancellationPolicy(slotId, actorRole, cb) {
    /* Read slot for date+time */
    var slot = getAllSlotsSync().filter(function(s) { return s.slotId === slotId; })[0];
    if (!slot) return cb(new Error('Slot nicht gefunden: ' + slotId), null);

    getEscrowBySlot(slotId, function(err, escrow) {
      if (err) return cb(err, null);

      var depositAmount  = escrow ? (escrow.depositAmount || 0) : 0;
      var depositStatus  = escrow ? escrow.depositStatus : null;
      var paymentMode    = escrow ? (escrow.paymentMode || 'instant') : 'instant';
      var escrowId       = escrow ? escrow.escrowId : null;
      var isHeld         = depositStatus === 'held';

      /* Calculate notice hours */
      var noticeHours = null;
      try {
        var lessonMs = new Date(slot.date + 'T' + slot.time + ':00').getTime();
        noticeHours  = Math.max(0, (lessonMs - Date.now()) / 3600000);
      } catch(e) {}

      /* Teacher initiated booking + student cancels → always full refund
         Reason: student was scheduled by teacher (no purchase intent) —
         applying a penalty for teacher-initiated bookings is unfair. */
      if (actorRole === 'student' && slot.bookedByRole === 'teacher' && isHeld) {
        return cb(null, {
          tier:          'full_refund',
          noticeHours:   noticeHours,
          depositStatus: depositStatus,
          depositAmount: depositAmount,
          refundAmount:  depositAmount,
          forfeitAmount: 0,
          escrowId:      escrowId,
          paymentMode:   paymentMode,
          bookedByTeacher: true
        });
      }

      /* Teacher/admin cancels → always full refund to student */
      if (actorRole === 'teacher' || actorRole === 'admin') {
        return cb(null, {
          tier:          'teacher_cancel',
          noticeHours:   noticeHours,
          depositStatus: depositStatus,
          depositAmount: depositAmount,
          refundAmount:  isHeld ? depositAmount : 0,
          forfeitAmount: 0,
          escrowId:      escrowId,
          paymentMode:   paymentMode
        });
      }

      /* No escrow, cash payment, or deposit never paid — just cancel slot */
      if (!escrow || paymentMode === 'cash_on_site' || !isHeld) {
        var noEscrowReason = !escrow ? 'no_escrow'
          : paymentMode === 'cash_on_site' ? 'cash_on_site'
          : 'deposit_unpaid';
        return cb(null, {
          tier:          'no_escrow',
          noEscrowReason: noEscrowReason,
          noticeHours:   noticeHours,
          depositStatus: depositStatus,
          depositAmount: 0,
          refundAmount:  0,
          forfeitAmount: 0,
          escrowId:      escrowId,
          paymentMode:   paymentMode
        });
      }

      /* Read teacher profile for cancellation window settings */
      var profile           = _syncRead('getProfileOrDefault', [slot.teacherId]) || {};
      var windowHours       = parseFloat(profile.cancellationWindow)  || 48;
      var partialPct        = parseFloat(profile.cancellationPartial) || 50;
      var strictMode        = (profile.cancellationStrict === true);

      var tier, refundAmount, forfeitAmount;
      if (strictMode || noticeHours <= 0) {
        /* Lesson already started / strict mode → full forfeit */
        tier          = 'forfeit';
        refundAmount  = 0;
        forfeitAmount = depositAmount;
      } else if (noticeHours < (windowHours / 2)) {
        /* Less than half the window (default < 24h) → forfeit */
        tier          = 'forfeit';
        refundAmount  = 0;
        forfeitAmount = depositAmount;
      } else if (noticeHours < windowHours) {
        /* Between half and full window (default 24–48h) → partial */
        tier          = 'partial';
        forfeitAmount = Math.round(depositAmount * (partialPct / 100) * 100) / 100;
        refundAmount  = Math.round((depositAmount - forfeitAmount) * 100) / 100;
      } else {
        /* More than full window (default > 48h) → full refund */
        tier          = 'full_refund';
        refundAmount  = depositAmount;
        forfeitAmount = 0;
      }

      cb(null, {
        tier:          tier,
        noticeHours:   noticeHours,
        depositStatus: depositStatus,
        depositAmount: depositAmount,
        refundAmount:  refundAmount,
        forfeitAmount: forfeitAmount,
        escrowId:      escrowId,
        paymentMode:   paymentMode
      });
    });
  }

  /**
   * cancelSlotWithPolicy — atomic cancellation respecting policy tier.
   * Calls cancelSlotBooking + correct escrow action.
   * actorRole: 'student'|'teacher'|'admin'
   * cb: fn(err, { policy, transaction|null })
   */
  function cancelSlotWithPolicy(slotId, actorRole, cb) {
    /* Capture slot info BEFORE cancel for notifications */
    var _preSlot = getAllSlotsSync().filter(function(s){ return s.slotId === slotId; })[0] || null;
    /* Wrap cb to fire notifications after successful cancel */
    var _origCb = cb;
    cb = function(err2, result) {
      if (!err2 && _preSlot) {
        try {
          var _cTid = _preSlot.teacherId;
          var _cSid = _preSlot.studentId;
          var snap4 = {
            teacherId:  _cTid, teacherName: getDisplayNameSync ? getDisplayNameSync(_cTid) : _cTid,
            studentId:  _cSid, studentName: getDisplayNameSync ? getDisplayNameSync(_cSid) : _cSid,
            date: _preSlot.date, time: _preSlot.time, endTime: slotEndTime(_preSlot.time),
            actorRole: actorRole
          };
          var _notifTarget = actorRole === 'teacher' ? _cSid : _cTid;
          if (typeof ChatStore !== 'undefined' && ChatStore.sendCancellationNotification) {
            try { ChatStore.sendCancellationNotification(actorRole === 'teacher' ? _cTid : _cSid, _notifTarget, snap4); } catch(e){}
          }
          if (typeof EmailService !== 'undefined' && EmailService.onBookingCancelled) {
            try { EmailService.onBookingCancelled(_notifTarget, snap4); } catch(e){}
          }
        } catch(ne4) {}
      }
      if (_origCb) _origCb(err2, result);
    };
    calcCancellationPolicy(slotId, actorRole, function(err, policy) {
      if (err) return cb(err, null);

      /* Pass actorRole to the slot record so cancelledBy is stored */
      _call('cancelSlotBookingAs', [slotId, actorRole, function(err2) {
        if (err2) return cb(err2, null);

        /* No escrow to settle, or deposit was never paid — still record the cancellation */
        if (!policy.escrowId || policy.tier === 'no_escrow' || policy.depositStatus === 'unpaid') {
          var slot2 = getAllSlotsSync().filter(function(s) { return s.slotId === slotId; })[0] || {};
          _call('writeCancellationRecord', [
            slotId, slot2.studentId || null, slot2.teacherId || null, policy,
            function() { cb(null, { policy: policy, transaction: null }); }
          ]);
          return;
        }

        /* Tag the escrow with cancellation tier so transactions record it */
        _call('_tagEscrowTier', [policy.escrowId, policy.tier, function() {}]);

        if (policy.tier === 'full_refund' || policy.tier === 'teacher_cancel') {
          /* request + auto release = full refund to student */
          requestDepositRefund(policy.escrowId, function(err3) {
            if (err3) return cb(new Error('Rückerstattungsanfrage fehlgeschlagen: ' + err3.message), null);
            releaseDeposit(policy.escrowId, function(err4, result) {
              if (err4) return cb(new Error('Rückerstattung fehlgeschlagen: ' + err4.message), null);
              /* If teacher cancelled, write a teacher_cancel audit TX for the teacher */
              if (policy.tier === 'teacher_cancel') {
                var slot3 = getAllSlotsSync().filter(function(s) { return s.slotId === slotId; })[0] || {};
                _call('writeTeacherCancelRecord', [
                  slotId, slot3.studentId || null, slot3.teacherId || null, policy, function() {}
                ]);
              }
              cb(null, { policy: policy, transaction: result ? result.transaction : null });
            });
          });
        } else if (policy.tier === 'forfeit') {
          /* request + forfeit = deposit goes to teacher */
          requestDepositRefund(policy.escrowId, function(err3) {
            if (err3) return cb(new Error('Deposit-Anfrage fehlgeschlagen: ' + err3.message), null);
            forfeitDeposit(policy.escrowId, function(err4, result) {
              if (err4) return cb(new Error('Deposit-Einbehalt fehlgeschlagen: ' + err4.message), null);
              cb(null, { policy: policy, transaction: result ? result.transaction : null });
            });
          });
        } else {
          /* partial — MVP: forfeit full deposit */
          requestDepositRefund(policy.escrowId, function(err3) {
            if (err3) return cb(new Error('Deposit-Anfrage fehlgeschlagen: ' + err3.message), null);
            forfeitDeposit(policy.escrowId, function(err4, result) {
              if (err4) return cb(new Error('Deposit-Einbehalt fehlgeschlagen: ' + err4.message), null);
              cb(null, { policy: policy, transaction: result ? result.transaction : null });
            });
          });
        }
      }]);
    });
  }

  /** Subscribe to data changes (cross-tab sync).
   *  @param {function} callback fn(event) */
  function onChange(callback) {
    if (Store.onChange) Store.onChange(callback);
  }


  /* ══════════════════════════════════════════════════════
     SYNCHRONOUS READ HELPERS
     Valid with LocalStorageAdapter (synchronous _cb).
     Mark for async migration when switching to Firestore.
  ══════════════════════════════════════════════════════ */

  function _syncRead(method, args) {
    var result = null;
    var cbArgs = args.concat([function(err, res) { result = res; }]);
    _call(method, cbArgs);
    return result;
  }

  /* Slot reads */
  function getAllSlotsSync()                    { return _syncRead('getAllSlots', []); }
  function getSlotsByTeacherSync(uid)           { return _syncRead('getSlotsByTeacher', [uid]); }
  function getSlotsByTeacherDateSync(uid, date) { return _syncRead('getSlotsByTeacherDate', [uid, date]); }
  function getSlotsByStudentSync(uid)           { return _syncRead('getSlotsByStudent', [uid]); }
  function slotExistsSync(uid, date, time)      { return _syncRead('slotExists', [uid, date, time]); }

  /* User reads */
  function getUserSync(uid)                     { return _syncRead('getUser', [uid]); }
  function getUsersByRoleSync(role)             { return _syncRead('getUsersByRole', [role]); }

  /* Selection reads */
  function getSelectionsByStudentSync(uid)      { return _syncRead('getSelectionsByStudent', [uid]); }
  function getSelectionsByTeacherSync(uid)      { return _syncRead('getSelectionsByTeacher', [uid]); }

  /* Recurring reads */
  function recurringExistsSync(uid, dow, time)  { return _syncRead('recurringExists', [uid, dow, time]); }
  function recurringExistsByDaySync(uid, dow)    { return _syncRead('recurringExistsByDay', [uid, dow]); }

  /* Wallet sync */
  function getWalletSync(uid) { return _syncRead('getWallet', [uid]); }

  /* Teacher price sync — reads locked slot price or falls back to current profile price */
  function getTeacherPriceSync(teacherId) {
    var profile = _syncRead('getProfileOrDefault', [teacherId]);
    return profile ? (parseFloat(profile.pricePerHalfHour) || 0) : 0;
  }

  /* Profile sync reads — avoids direct ProfileStore access in consumer code */
  function getProfileSync(uid)           { return _syncRead('getProfile', [uid]); }
  function getProfileOrDefaultSync(uid)  { return _syncRead('getProfileOrDefault', [uid]); }
  function getDisplayNameSync(uid) {
    if (!uid) return '—';
    var profile = _syncRead('getProfile', [uid]);
    if (profile && profile.name && profile.name.trim()) return profile.name.trim();
    var user = _syncRead('getUser', [uid]);
    return user ? user.name : uid;
  }
  function getProfilePhotoSync(uid) {
    var profile = _syncRead('getProfile', [uid]);
    return (profile && profile.photo) ? profile.photo : null;
  }

  /* ══════════════════════════════════════════════════════
     ÖFFENTLICHE SCHNITTSTELLE
  ══════════════════════════════════════════════════════ */

  /* Remove a single student from a multi-student slot with refund */
  function removeStudentFromSlot(slotId, studentId, actorRole, cb) {
    var allSlots = _syncRead('getAllSlots', []);
    var slot = null;
    for (var i = 0; i < allSlots.length; i++) {
      if (allSlots[i].slotId === slotId) { slot = allSlots[i]; break; }
    }
    if (!slot) return cb ? cb(new Error('Slot nicht gefunden')) : null;

    var students  = (slot.students && slot.students.length) ? slot.students.slice() : (slot.studentId ? [slot.studentId] : []);
    var remaining = students.filter(function(uid) { return uid !== studentId; });

    if (remaining.length === 0) {
      /* Last student — cancel entire slot with full policy */
      cancelSlotWithPolicy(slotId, actorRole || 'teacher', function(e) {
        cb ? cb(e) : null;
      });
    } else {
      /* Multi-student: remove this student, keep slot for remaining */
      calcCancellationPolicy(slotId, actorRole || 'teacher', function(err, policy) {
        var refund = (!err && policy) ? (parseFloat(policy.refundAmount) || 0) : 0;
        /* Refund deposit to student wallet */
        if (refund > 0) {
          _call('deposit', [studentId, refund, 'Stornierung Einzelbuchung', function() {}]);
        }
        /* Update slot.students[] — remove this student */
        _call('updateSlot', [slotId, {
          students:  remaining,
          studentId: remaining[0]
        }, function(e) {
          if (e) return cb ? cb(e) : null;
          /* Fire notifications */
          if (typeof ChatStore !== 'undefined' && ChatStore.sendCancellationNotification) {
            var tName = _syncRead('getDisplayName', [slot.teacherId]) || slot.teacherId;
            var sName = _syncRead('getDisplayName', [studentId]) || studentId;
            var end   = _syncRead('slotEndTime', [slot.time]) || '';
            ChatStore.sendCancellationNotification(slot.teacherId, studentId, {
              teacherId: slot.teacherId, teacherName: tName,
              studentId: studentId, studentName: sName,
              date: slot.date, time: slot.time, endTime: end,
              actorRole: actorRole || 'teacher'
            });
          }
          cb ? cb(null) : null;
        }]);
      });
    }
  }


  /* ── promoteStudentToBlacklist ────────────────────────────────────────────
     Called automatically after a student's FIRST booking with a teacher.
     Finds all slots of that teacher with visibility='new-only',
     visibility='blacklist-new', or excludeNewStudents=true that are NOT yet
     blocking the student, and adds the student to their blacklist so that
     the dynamic _isNew() check is no longer needed — visibility stays stable.
     Marks each promoted entry in autoPromotedStudents[] for UI display.
  ──────────────────────────────────────────────────────────────────────── */
  function promoteStudentToBlacklist(studentId, teacherId, cb) {
    if (!studentId || !teacherId) { if (cb) cb(null); return; }
    try {
      var allSlots = _syncRead('getSlotsByTeacher', [teacherId]) || [];
      var toPromote = allSlots.filter(function(s) {
        return s.visibility === 'new-only' ||
               s.visibility === 'blacklist-new' ||
               s.excludeNewStudents === true;
      });
      if (!toPromote.length) { if (cb) cb(null); return; }

      var pending = toPromote.length;
      var errors  = [];

      toPromote.forEach(function(slot) {
        var list     = (slot.visibilityList || []).slice();
        var autoProm = (slot.autoPromotedStudents || []).slice();

        /* Skip if already explicitly listed */
        if (list.indexOf(studentId) !== -1 && autoProm.indexOf(studentId) !== -1) {
          if (--pending === 0) { if (cb) cb(errors[0] || null); }
          return;
        }

        if (list.indexOf(studentId) === -1) list.push(studentId);
        if (autoProm.indexOf(studentId) === -1) autoProm.push(studentId);

        /* Promote new-only → blacklist so old entries stay visible for others */
        var newVis = slot.visibility === 'new-only' ? 'blacklist' : slot.visibility;

        var patch = {
          visibility:            newVis || null,
          visibilityList:        list,
          autoPromotedStudents:  autoProm
        };

        _call('updateSlot', [slot.slotId, patch, function(err) {
          if (err) errors.push(err);
          if (--pending === 0) { if (cb) cb(errors[0] || null); }
        }]);
      });
    } catch (e) {
      if (cb) cb(e);
    }
  }

  return {
    /* Users */
    getUser:                getUser,
    getAllUsers:             getAllUsers,
    getUsersByRole:         getUsersByRole,
    createUser:             createUser,
    deleteUser:             deleteUser,
    updateUser:             updateUser,
    isUsernameAvailable:    isUsernameAvailable,
    generateUsername:       generateUsername,
    getUserByEmailOrUsername: getUserByEmailOrUsername,

    /* Profiles */
    getProfile:             getProfile,
    getProfileOrDefault:    getProfileOrDefault,
    saveProfile:            saveProfile,
    getDisplayName:         getDisplayName,
    getProfilePhoto:        getProfilePhoto,
    /* Sync profile reads — use these instead of ProfileStore.* in consumer code */
    getProfileSync:          getProfileSync,
    getProfileOrDefaultSync: getProfileOrDefaultSync,
    getDisplayNameSync:      getDisplayNameSync,
    getProfilePhotoSync:     getProfilePhotoSync,

    /* GuestSettings */
    getGuestCurrency:       getGuestCurrency,
    setGuestCurrency:       setGuestCurrency,

    /* Teachers + Profiles */
    getTeachersWithProfiles: getTeachersWithProfiles,

    /* Slots */
    getSlotById:            getSlotById,
    getSlotsByTeacher:      getSlotsByTeacher,
    getSlotsByTeacherDate:  getSlotsByTeacherDate,
    getSlotsByStudent:      getSlotsByStudent,
    getAllSlots:             getAllSlots,
    slotExists:             slotExists,
    createSlot:             createSlot,
    createSlotRange:        createSlotRange,
    updateSlot:             updateSlot,
    setSlotAvailability:    setSlotAvailability,
    /* applySlotTimeout / removeSlotTimeout removed — use setSlotAvailability('timeout') */
    /* bookSlot kept for legacy but prefer bookSlotWithEscrowSilent */
    bookSlot:               bookSlot,
    /* cancelSlotBooking kept for legacy but prefer cancelSlotWithPolicy */
    cancelSlotBooking:      cancelSlotBooking,
    deleteSlot:             deleteSlot,
    /* releaseSlot kept for legacy — same as cancelSlotBooking without policy */
    releaseSlot:            releaseSlot,

    /* Recurring */
    getRecurringByTeacher:    getRecurringByTeacher,
    recurringExists:          recurringExists,
    createRecurring:          createRecurring,
    deleteRecurringByDayTime: deleteRecurringByDayTime,
    materialiseWeek:          materialiseWeek,

    /* Selections */
    getSelectionsByStudent: getSelectionsByStudent,
    getSelectionsByTeacher: getSelectionsByTeacher,
    createSelection:        createSelection,
    deleteSelection:        deleteSelection,
    updateSelection:        updateSelection,
    getFavoritesByStudent:  getFavoritesByStudent,
    addFavorite:            addFavorite,
    removeFavorite:         removeFavorite,
    getFavoriteTeacherIdsSync: getFavoriteTeacherIdsSync,

    /* Stats */
    getAdminStats:          getAdminStats,
    getUserStats:           getUserStats,

    /* Time helpers (synchron) */
    slotEndTime:            slotEndTime,
    isSlotVisibleForStudent: isSlotVisibleForStudent,
    promoteStudentToBlacklist: promoteStudentToBlacklist,
    slotTimesInRange:       slotTimesInRange,

    /* Wallet */
    getWallet:              getWallet,
    getAllWallets:           getAllWallets,
    getWalletSync:          getWalletSync,
    getTeacherPriceSync:    getTeacherPriceSync,
    calcDepositInfo:        calcDepositInfo,
    checkPendingAffordability: checkPendingAffordability,
    deposit:                deposit,
    withdraw:               withdraw,
    getTransactions:        getTransactions,
    getAllTransactions:      getAllTransactions,
    getBookingHistory:      getBookingHistory,
    writeBookingRecord:     writeBookingRecord,
    writeBlockBookingRecord: writeBlockBookingRecord,
    writeBlockEscrowHold:   writeBlockEscrowHold,
    bookSlotWithEscrowSilent: bookSlotWithEscrowSilent,
    /* Notification helpers — call after booking/cancel/move instead of direct ChatStore/EmailService */
    notifyBookingCreated:   function(stuId, tid, slots) {
      if (typeof ChatStore !== 'undefined' && ChatStore.sendBookingNotification) {
        /* ChatStore.sendBookingNotification called internally */
      }
      /* Consumer code should call these via AppService, not ChatStore/EmailService directly.
         Full migration: move notification calls from teacher.js/student.js into this method. */
    },
    writeMoveRecord:        writeMoveRecord,
    getMoveLog:             function() { return Store.MoveLog.all(); },
    getMoveLogByTeacher:    function(uid) { return Store.MoveLog.byTeacher(uid); },
    getMoveLogByStudent:    function(uid) { return Store.MoveLog.byStudent(uid); },

    /* Escrow */
    createEscrowForStudent:  createEscrowForStudent,
    getAllEscrows:           getAllEscrows,
    createEscrow:            createEscrow,
    getEscrowBySlot:        getEscrowBySlot,
    getEscrowsByStudent:    getEscrowsByStudent,
    getEscrowsByTeacher:    getEscrowsByTeacher,
    adminReleaseEscrow:     adminReleaseEscrow,
    payDeposit:             payDeposit,
    requestDepositRefund:   requestDepositRefund,
    releaseDeposit:         releaseDeposit,
    forfeitDeposit:         forfeitDeposit,
    confirmLesson:          confirmLesson,
    /* bookSlotWithEscrow removed from exports — use bookSlotWithEscrowSilent */
    cancelSlotWithPolicy:   cancelSlotWithPolicy,
    removeStudentFromSlot:  removeStudentFromSlot,
    cancelBlockWithPolicy:  cancelBlockWithPolicy,
    calcCancellationPolicy: calcCancellationPolicy,
    confirmSlot:            confirmSlot,
    confirmBlock:           confirmBlock,
    onChange:               onChange,

    /* Synchronous read helpers (localStorage only) */
    getAllSlotsSync:              getAllSlotsSync,
    getSlotsByTeacherSync:        getSlotsByTeacherSync,
    getSlotsByTeacherDateSync:    getSlotsByTeacherDateSync,
    getSlotsByStudentSync:        getSlotsByStudentSync,
    slotExistsSync:               slotExistsSync,
    getUserSync:                  getUserSync,
    getUsersByRoleSync:           getUsersByRoleSync,
    getSelectionsByStudentSync:   getSelectionsByStudentSync,
    getSelectionsByTeacherSync:   getSelectionsByTeacherSync,
    getStudentPriceForTeacherSync: getStudentPriceForTeacherSync,
    recurringExistsSync:          recurringExistsSync,
    recurringExistsByDaySync:     recurringExistsByDaySync
  };

  /**
   * confirmBlock — confirms all slots in a block atomically.
   * Marks each slot, releases all escrows silently, writes ONE block TX.
   * slots: array of slot objects · cb: fn(err)
   */
  /**
   * cancelBlockWithPolicy — cancels all slots in a block atomically.
   * Calculates policy from first slot (same tier for all), settles all
   * escrows silently, then writes ONE set of block-level TXs.
   * slots: array of slot objects · actorRole: 'student'|'teacher'
   * cb: fn(err)
   */
  function cancelBlockWithPolicy(slots, actorRole, cb) {
    if (!slots || !slots.length) { if (cb) cb(null); return; }

    /* Get policy from first slot — tier is the same for all (same teacher/date) */
    calcCancellationPolicy(slots[0].slotId, actorRole, function(err, policy) {
      if (err) { if (cb) cb(err); return; }

      var role = actorRole || 'student';
      var done = 0, errors = [];

      /* Cancel all slots silently (no individual TX) */
      slots.forEach(function(slot) {
        _call('cancelSlotBookingAs', [slot.slotId, role, function(e) {
          if (e) errors.push(e);
          done++;
          if (done === slots.length) afterCancel();
        }]);
      });

      function afterCancel() {
        if (errors.length) { if (cb) cb(errors[0]); return; }

        /* Collect escrows for these slots */
        var escrows = [];
        var eDone = 0;
        slots.forEach(function(slot) {
          getEscrowBySlot(slot.slotId, function(e2, escrow) {
            if (!e2 && escrow) escrows.push(escrow);
            eDone++;
            if (eDone === slots.length) afterEscrows(escrows);
          });
        });
      }

      function afterEscrows(escrows) {
        /* No escrow path */
        if (!policy.escrowId || policy.tier === 'no_escrow' || policy.depositStatus === 'unpaid') {
          _call('writeBlockCancellationRecord', [slots, [], policy, role, function() {
            if (cb) cb(null);
          }]);
          return;
        }

        /* Tag all escrows with tier */
        escrows.forEach(function(escrow) {
          _call('_tagEscrowTier', [escrow.escrowId, policy.tier, function() {}]);
        });

        /* Settle all escrows silently, then write one block TX */
        var sErr = null, sDone = 0;

        function settle(escrow, next) {
          if (policy.tier === 'full_refund' || policy.tier === 'teacher_cancel') {
            requestDepositRefund(escrow.escrowId, function(e3) {
              if (e3) { next(e3); return; }
              releaseDeposit(escrow.escrowId, function(e4) { next(e4); });
            });
          } else {
            /* forfeit or partial */
            requestDepositRefund(escrow.escrowId, function(e3) {
              if (e3) { next(e3); return; }
              forfeitDeposit(escrow.escrowId, function(e4) { next(e4); });
            });
          }
        }

        /* Settle all escrows in parallel — but these write individual TXs from
           releaseDeposit/forfeitDeposit. We need silent versions. */
        /* Use cancelSlotWithPolicy-like logic but without per-slot TXs:
           requestDepositRefund is fine (no TX), but releaseDeposit/forfeitDeposit
           write TXs. Use the silent versions. */
        function settleSilent(escrow, next) {
          if (policy.tier === 'full_refund' || policy.tier === 'teacher_cancel') {
            requestDepositRefund(escrow.escrowId, function(e3) {
              if (e3) { next(e3); return; }
              _call('releaseDepositSilent', [escrow.escrowId, function(e4) { next(e4); }]);
            });
          } else {
            requestDepositRefund(escrow.escrowId, function(e3) {
              if (e3) { next(e3); return; }
              _call('forfeitDepositSilent', [escrow.escrowId, function(e4) { next(e4); }]);
            });
          }
        }

        var hDone = 0;
        escrows.forEach(function(escrow) {
          settleSilent(escrow, function(e) {
            if (e) sErr = e;
            hDone++;
            if (hDone === escrows.length) {
              if (sErr) { if (cb) cb(sErr); return; }
              _call('writeBlockCancellationRecord', [slots, escrows, policy, role, function() {
                if (cb) cb(null);
              }]);
            }
          });
        });
        if (!escrows.length) {
          _call('writeBlockCancellationRecord', [slots, [], policy, role, function() {
            if (cb) cb(null);
          }]);
        }
      }
    });
  }

  function confirmBlock(slots, cb) {
  if (!slots || !slots.length) { if (cb) cb(null); return; }

  /* Enrich slot stubs {slotId} with full slot data.
     block.bookedSlots only contains {slotId} stubs — writeBlockLessonConfirmed
     needs .price, .teacherId, .studentId, .date/.slotDate, .time/.slotTime */
  var allSlots = getAllSlotsSync();
  var fullSlots = slots.map(function(stub) {
    for (var i = 0; i < allSlots.length; i++) {
      if (allSlots[i].slotId === stub.slotId) return allSlots[i];
    }
    return stub; /* fallback to stub if not found */
  });

  var done = 0, errors = [];
  var confirmedEscrows = [];

  /* Step 1: mark all slots as confirmed (no TX written yet — silent) */
  fullSlots.forEach(function(slot) {
    _call('confirmSlot', [slot.slotId, function(err) {
      if (err) errors.push(err);
      done++;
      if (done === fullSlots.length) afterConfirm();
    }]);
  });

  function afterConfirm() {
    if (errors.length) { if (cb) cb(errors[0]); return; }

    /* Step 2: collect all held escrows */
    var eDone = 0;
    fullSlots.forEach(function(slot) {
      getEscrowBySlot(slot.slotId, function(err2, escrow) {
        if (!err2 && escrow && escrow.depositStatus === 'held') {
          confirmedEscrows.push(escrow);
        }
        eDone++;
        if (eDone === fullSlots.length) afterEscrows();
      });
    });
  }

  function afterEscrows() {
    if (!confirmedEscrows.length) {
      /* No escrows (cash_on_site) — write block lesson_confirmed TX only */
      _call('writeBlockLessonConfirmed', [fullSlots, [], cb]);
      return;
    }
    /* Step 3: release all escrows silently (wallet updates per slot),
       then write ONE aggregate TX record for the whole block */
    var rDone = 0, rErrors = [];
    confirmedEscrows.forEach(function(escrow) {
      _call('confirmLessonSilent', [escrow.escrowId, function(err3) {
        if (err3) rErrors.push(err3);
        rDone++;
        if (rDone === confirmedEscrows.length) {
          if (rErrors.length) { if (cb) cb(rErrors[0]); return; }
          _call('writeBlockLessonConfirmed', [fullSlots, confirmedEscrows, cb]);
        }
      }]);
    });
  }
}

}());

window.AppService = AppService;
