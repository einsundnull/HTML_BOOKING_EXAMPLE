/**
 * adapter-firestore.js — Firestore Adapter (Stub)
 *
 * Identische öffentliche Schnittstelle wie LocalStorageAdapter.
 * Alle Methoden sind als Stubs implementiert — sie loggen den Aufruf
 * und rufen den Callback mit einem Fehler auf, bis die echte
 * Firestore-Implementierung eingefügt wird.
 *
 * MIGRATION: Jede Methode einzeln implementieren.
 * Sobald eine Methode implementiert ist, den _stub()-Aufruf entfernen
 * und durch die echte Firestore-Logik ersetzen.
 *
 * Voraussetzungen (beim Wechsel auf diesen Adapter):
 *   1. Firebase SDK in allen HTML-Dateien eingebunden
 *   2. firebase.initializeApp(FirebaseConfig) aufgerufen (in app-config.js)
 *   3. var db = firebase.firestore(); verfügbar
 *
 * Firestore-Collections:
 *   users/            {uid, name, role, email}
 *   profiles/         {uid, name, age, gender, location, bio, photo,
 *                      pricePerHalfHour, experienceYears, languages[],
 *                      lessonTypes[], audience[], ageFrom, ageTo, levels[],
 *                      maxGroupSize, terrain[], certifications[],
 *                      specializations[], email, emailVisible, phone,
 *                      phoneVisible, instagram, website, updatedAt}
 *   slots/            {slotId, teacherId, studentId, date, time,
 *                      status, baseStatus}
 *   recurring/        {recurringId, teacherId, dayOfWeek, time}
 *   selections/       {studentId, teacherId}
 *   teacher_profiles/ {uid, ...user, ...profile}  — denormalisiert für Catalog
 *
 * Regeln: var only, function(){}, no arrow functions,
 *         no template literals, no ?. or ??
 */

var FirestoreAdapter = (function() {

  /* ── Stub-Helfer ────────────────────────────────────────
     Gibt einen klaren Fehler zurück solange eine Methode
     noch nicht implementiert ist.                        */
  function _stub(methodName, callback) {
    var err = new Error('[FirestoreAdapter] ' + methodName + ' ist noch nicht implementiert.');
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(err.message);
    }
    if (typeof callback === 'function') {
      callback(err, null);
    }
  }

  /* ── Firestore-Referenz (verfügbar nach initializeApp) ─ */
  function _db() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      throw new Error('[FirestoreAdapter] Firebase SDK nicht geladen.');
    }
    return firebase.firestore();
  }

  /* ══════════════════════════════════════════════════════
     USERS
     Collection: users/{uid}
  ══════════════════════════════════════════════════════ */

  function getUser(uid, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('users').doc(uid).get()
      .then(function(doc) {
        callback(null, doc.exists ? doc.data() : null);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getUser', callback);
  }

  function getAllUsers(callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('users').get()
      .then(function(snap) {
        var users = [];
        snap.forEach(function(doc) { users.push(doc.data()); });
        callback(null, users);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getAllUsers', callback);
  }

  function getUsersByRole(role, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('users').where('role', '==', role).get()
      .then(function(snap) {
        var users = [];
        snap.forEach(function(doc) { users.push(doc.data()); });
        callback(null, users);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getUsersByRole', callback);
  }

  function createUser(data, callback) {
    /* IMPLEMENTIERUNG:
    var ref = _db().collection('users').doc(data.uid);
    ref.set(data)
      .then(function() { callback(null, data); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('createUser', callback);
  }

  function deleteUser(uid, callback) {
    /* IMPLEMENTIERUNG:
    var batch = _db().batch();
    batch.delete(_db().collection('users').doc(uid));
    batch.delete(_db().collection('profiles').doc(uid));
    // Selections und Slots ebenfalls in Batch löschen (Query + batch.delete)
    batch.commit()
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('deleteUser', callback);
  }

  function updateUser(uid, patch, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('users').doc(uid).update(patch)
      .then(function() {
        return _db().collection('users').doc(uid).get();
      })
      .then(function(doc) { callback(null, doc.data()); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('updateUser', callback);
  }

  /* ══════════════════════════════════════════════════════
     PROFILES
     Collection: profiles/{uid}
  ══════════════════════════════════════════════════════ */

  function getProfile(uid, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('profiles').doc(uid).get()
      .then(function(doc) {
        callback(null, doc.exists ? doc.data() : null);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getProfile', callback);
  }

  function getProfileOrDefault(uid, callback) {
    /* IMPLEMENTIERUNG:
    getProfile(uid, function(err, profile) {
      if (err) { callback(err, null); return; }
      if (profile) { callback(null, profile); return; }
      getUser(uid, function(err2, user) {
        if (err2) { callback(err2, null); return; }
        callback(null, _buildDefaultProfile(uid, user));
      });
    });
    */
    _stub('getProfileOrDefault', callback);
  }

  function saveProfile(uid, data, callback) {
    /* IMPLEMENTIERUNG:
    data.uid       = uid;
    data.updatedAt = new Date().toISOString();
    var batch = _db().batch();
    batch.set(_db().collection('profiles').doc(uid), data, { merge: true });
    // teacher_profiles denormalisiert mitschreiben:
    // batch.set(_db().collection('teacher_profiles').doc(uid), data, { merge: true });
    batch.commit()
      .then(function() { callback(null, data); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('saveProfile', callback);
  }

  function getDisplayName(uid, callback) {
    /* IMPLEMENTIERUNG:
    getProfile(uid, function(err, profile) {
      if (!err && profile && profile.name && profile.name.trim()) {
        callback(null, profile.name.trim());
        return;
      }
      getUser(uid, function(err2, user) {
        callback(null, user ? user.name : uid);
      });
    });
    */
    _stub('getDisplayName', callback);
  }

  function getProfilePhoto(uid, callback) {
    /* IMPLEMENTIERUNG:
    getProfile(uid, function(err, profile) {
      callback(null, (profile && profile.photo) ? profile.photo : null);
    });
    */
    _stub('getProfilePhoto', callback);
  }

  /* ══════════════════════════════════════════════════════
     TEACHERS + PROFILES (kombinierte Abfrage)
     Collection: teacher_profiles/{uid}  — denormalisiert
     Firestore-Vorteil: ein einziger Read statt N+1
  ══════════════════════════════════════════════════════ */

  function getTeachersWithProfiles(callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('teacher_profiles').get()
      .then(function(snap) {
        var result = [];
        snap.forEach(function(doc) {
          var data = doc.data();
          result.push({
            user:    { uid: data.uid, name: data.name, role: data.role, email: data.email },
            profile: data
          });
        });
        callback(null, result);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getTeachersWithProfiles', callback);
  }

  /* ══════════════════════════════════════════════════════
     SLOTS
     Collection: slots/{slotId}
  ══════════════════════════════════════════════════════ */

  function getSlotById(slotId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots').doc(slotId).get()
      .then(function(doc) {
        callback(null, doc.exists ? doc.data() : null);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSlotById', callback);
  }

  function getSlotsByTeacher(teacherId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots').where('teacherId', '==', teacherId).get()
      .then(function(snap) {
        var slots = [];
        snap.forEach(function(doc) { slots.push(doc.data()); });
        callback(null, slots);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSlotsByTeacher', callback);
  }

  function getSlotsByTeacherDate(teacherId, date, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots')
      .where('teacherId', '==', teacherId)
      .where('date', '==', date)
      .orderBy('time')
      .get()
      .then(function(snap) {
        var slots = [];
        snap.forEach(function(doc) { slots.push(doc.data()); });
        callback(null, slots);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSlotsByTeacherDate', callback);
  }

  function getSlotsByStudent(studentId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots').where('studentId', '==', studentId).get()
      .then(function(snap) {
        var slots = [];
        snap.forEach(function(doc) { slots.push(doc.data()); });
        callback(null, slots);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSlotsByStudent', callback);
  }

  function getAllSlots(callback) {
    /* IMPLEMENTIERUNG:
    HINWEIS: getAllSlots() ist in Firestore teuer (full collection scan).
    Nur für Admin-Dashboard verwenden. In Produktion durch gefilterte
    Queries ersetzen wo immer möglich.

    _db().collection('slots').get()
      .then(function(snap) {
        var slots = [];
        snap.forEach(function(doc) { slots.push(doc.data()); });
        callback(null, slots);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getAllSlots', callback);
  }

  function slotExists(teacherId, date, time, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots')
      .where('teacherId', '==', teacherId)
      .where('date', '==', date)
      .where('time', '==', time)
      .limit(1)
      .get()
      .then(function(snap) {
        callback(null, snap.empty ? null : snap.docs[0].data());
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('slotExists', callback);
  }

  function createSlot(data, callback) {
    /* IMPLEMENTIERUNG:
    var ref = _db().collection('slots').doc(); // auto-ID
    data.slotId = ref.id;
    ref.set(data)
      .then(function() { callback(null, data); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('createSlot', callback);
  }

  function createSlotRange(teacherId, date, startTime, endTime, status, callback) {
    /* IMPLEMENTIERUNG:
    Alle Zeiten berechnen, existierende prüfen, Batch-Write.
    Firestore Batch max. 500 Operationen.
    */
    _stub('createSlotRange', callback);
  }

  function updateSlot(slotId, patch, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots').doc(slotId).update(patch)
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('updateSlot', callback);
  }

  function setSlotAvailability(slotId, newBase, callback) {
    /* IMPLEMENTIERUNG:
    Lesen + baseStatus + status setzen, dann update.
    Oder Transaction verwenden für Konsistenz.
    */
    _stub('setSlotAvailability', callback);
  }

  function bookSlot(slotId, studentId, callback) {
    /* IMPLEMENTIERUNG: Firestore Transaction empfohlen
    _db().runTransaction(function(tx) {
      var ref = _db().collection('slots').doc(slotId);
      return tx.get(ref).then(function(doc) {
        if (!doc.exists) throw new Error('Slot nicht gefunden.');
        if (doc.data().status !== 'available') throw new Error('Slot nicht verfügbar.');
        tx.update(ref, { status: 'booked', studentId: studentId });
      });
    })
    .then(function() { callback(null, true); })
    .catch(function(e) { callback(e, null); });
    */
    _stub('bookSlot', callback);
  }

  function cancelSlotBooking(slotId, callback) {
    /* IMPLEMENTIERUNG: Transaction empfohlen (baseStatus lesen + status zurücksetzen) */
    _stub('cancelSlotBooking', callback);
  }

  function deleteSlot(slotId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('slots').doc(slotId).delete()
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('deleteSlot', callback);
  }

  /* ══════════════════════════════════════════════════════
     RECURRING RULES
     Collection: recurring/{recurringId}
  ══════════════════════════════════════════════════════ */

  function getRecurringByTeacher(teacherId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('recurring').where('teacherId', '==', teacherId).get()
      .then(function(snap) {
        var rules = [];
        snap.forEach(function(doc) { rules.push(doc.data()); });
        callback(null, rules);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getRecurringByTeacher', callback);
  }

  function recurringExists(teacherId, dayOfWeek, time, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('recurring')
      .where('teacherId', '==', teacherId)
      .where('dayOfWeek', '==', dayOfWeek)
      .where('time', '==', time)
      .limit(1)
      .get()
      .then(function(snap) {
        callback(null, snap.empty ? null : snap.docs[0].data());
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('recurringExists', callback);
  }

  function createRecurring(teacherId, dayOfWeek, time, callback) {
    /* IMPLEMENTIERUNG:
    var ref = _db().collection('recurring').doc();
    var data = { recurringId: ref.id, teacherId: teacherId, dayOfWeek: dayOfWeek, time: time };
    ref.set(data)
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('createRecurring', callback);
  }

  function deleteRecurringByDayTime(teacherId, dayOfWeek, time, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('recurring')
      .where('teacherId', '==', teacherId)
      .where('dayOfWeek', '==', dayOfWeek)
      .where('time', '==', time)
      .get()
      .then(function(snap) {
        var batch = _db().batch();
        snap.forEach(function(doc) { batch.delete(doc.ref); });
        return batch.commit();
      })
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('deleteRecurringByDayTime', callback);
  }

  function materialiseWeek(teacherId, weekDates, callback) {
    /* IMPLEMENTIERUNG:
    getRecurringByTeacher(teacherId, function(err, rules) {
      if (err) { callback(err, null); return; }
      // Für jede Rule + Datum: slotExists prüfen, dann createSlot
      // In Firestore: Promise.all() über alle Checks, dann Batch-Write
    });
    */
    _stub('materialiseWeek', callback);
  }

  /* ══════════════════════════════════════════════════════
     SELECTIONS
     Collection: selections/{studentId_teacherId}
  ══════════════════════════════════════════════════════ */

  function getSelectionsByStudent(studentId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('selections').where('studentId', '==', studentId).get()
      .then(function(snap) {
        var sels = [];
        snap.forEach(function(doc) { sels.push(doc.data()); });
        callback(null, sels);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSelectionsByStudent', callback);
  }

  function getSelectionsByTeacher(teacherId, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('selections').where('teacherId', '==', teacherId).get()
      .then(function(snap) {
        var sels = [];
        snap.forEach(function(doc) { sels.push(doc.data()); });
        callback(null, sels);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getSelectionsByTeacher', callback);
  }

  function createSelection(studentId, teacherId, callback) {
    /* IMPLEMENTIERUNG:
    var docId = studentId + '_' + teacherId;
    _db().collection('selections').doc(docId).set({ studentId: studentId, teacherId: teacherId })
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('createSelection', callback);
  }

  function deleteSelection(studentId, teacherId, callback) {
    /* IMPLEMENTIERUNG:
    var docId = studentId + '_' + teacherId;
    _db().collection('selections').doc(docId).delete()
      .then(function() { callback(null, true); })
      .catch(function(e) { callback(e, null); });
    */
    _stub('deleteSelection', callback);
  }

  /* ══════════════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════════════ */

  function getAdminStats(callback) {
    /* IMPLEMENTIERUNG:
    Firestore hat keine COUNT()-Abfrage in der kostenlosen Tier.
    Optionen:
      a) Alle Collections lesen + client-seitig zählen (teuer)
      b) Counter-Dokument führen (stats/global) und bei jeder
         Mutation per Cloud Function inkrementieren (empfohlen)
    */
    _stub('getAdminStats', callback);
  }

  function getUserStats(uid, callback) {
    _stub('getUserStats', callback);
  }

  /* ══════════════════════════════════════════════════════
     WALLET
     Collections:
       wallets/{uid}       — { uid, balance, currency, updatedAt }
       transactions/{txId} — { txId, uid, type, amount, balance,
                               description, status, createdAt, relatedUid }

     STRIPE-INTEGRATION:
       deposit()  → Stripe PaymentIntent erstellen + Webhook
       withdraw() → Stripe Payout an hinterlegtes Bankkonto
       escrowHold/Release → Stripe Connect Transfer
  ══════════════════════════════════════════════════════ */

  function getWallet(uid, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('wallets').doc(uid).get()
      .then(function(doc) {
        if (doc.exists) { callback(null, doc.data()); return; }
        var wallet = { uid: uid, balance: 0, currency: 'EUR', updatedAt: new Date().toISOString() };
        _db().collection('wallets').doc(uid).set(wallet)
          .then(function() { callback(null, wallet); })
          .catch(function(e) { callback(e, null); });
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getWallet', callback);
  }

  function deposit(uid, amount, description, callback) {
    /* IMPLEMENTIERUNG: Firestore Transaction empfohlen
    _db().runTransaction(function(tx) {
      var ref = _db().collection('wallets').doc(uid);
      return tx.get(ref).then(function(doc) {
        var wallet = doc.exists ? doc.data() : { uid, balance: 0, currency: 'EUR' };
        wallet.balance   = Math.round((wallet.balance + amount) * 100) / 100;
        wallet.updatedAt = new Date().toISOString();
        tx.set(ref, wallet);
        var txRef = _db().collection('transactions').doc();
        tx.set(txRef, { txId: txRef.id, uid, type: 'deposit', amount,
          balance: wallet.balance, description: description || '',
          status: 'completed', createdAt: wallet.updatedAt, relatedUid: null });
        return wallet;
      });
    })
    .then(function(wallet) { callback(null, wallet); })
    .catch(function(e) { callback(e, null); });
    */
    _stub('deposit', callback);
  }

  function withdraw(uid, amount, description, callback) {
    /* IMPLEMENTIERUNG: Firestore Transaction empfohlen
    Wie deposit(), aber Prüfung wallet.balance >= amount vor Abzug.
    In Produktion: Stripe Payout API aufrufen.
    */
    _stub('withdraw', callback);
  }

  function getTransactions(uid, callback) {
    /* IMPLEMENTIERUNG:
    _db().collection('transactions')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function(snap) {
        var txs = [];
        snap.forEach(function(doc) { txs.push(doc.data()); });
        callback(null, txs);
      })
      .catch(function(e) { callback(e, null); });
    */
    _stub('getTransactions', callback);
  }

  /* ══════════════════════════════════════════════════════
     TIME HELPERS (keine DB-Zugriffe — direkte Implementierung)
  ══════════════════════════════════════════════════════ */

  function slotEndTime(timeStr) {
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) + 30;
    if (m >= 60) { h += 1; m -= 60; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function slotTimesInRange(startTime, endTime) {
    var times  = [];
    var parts  = startTime.split(':');
    var h      = parseInt(parts[0], 10);
    var m      = parseInt(parts[1], 10);
    while (true) {
      var t = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      if (t >= endTime) break;
      times.push(t);
      m += 30;
      if (m >= 60) { h += 1; m -= 60; }
      if (h >= 24) break;
    }
    return times;
  }

  /* ══════════════════════════════════════════════════════
     ÖFFENTLICHE SCHNITTSTELLE
     Identisch mit LocalStorageAdapter
  ══════════════════════════════════════════════════════ */

  return {
    /* Users */
    getUser:                getUser,
    getAllUsers:             getAllUsers,
    getUsersByRole:         getUsersByRole,
    createUser:             createUser,
    deleteUser:             deleteUser,
    updateUser:             updateUser,

    /* Profiles */
    getProfile:             getProfile,
    getProfileOrDefault:    getProfileOrDefault,
    saveProfile:            saveProfile,
    getDisplayName:         getDisplayName,
    getProfilePhoto:        getProfilePhoto,

    /* Teachers + Profiles (joined) */
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
    bookSlot:               bookSlot,
    cancelSlotBooking:      cancelSlotBooking,
    deleteSlot:             deleteSlot,

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

    /* Stats */
    getAdminStats:          getAdminStats,
    getUserStats:           getUserStats,

    /* Time helpers */
    slotEndTime:            slotEndTime,
    slotTimesInRange:       slotTimesInRange,

    /* Wallet */
    getWallet:              getWallet,
    deposit:                deposit,
    withdraw:               withdraw,
    getTransactions:        getTransactions
  };

}());
