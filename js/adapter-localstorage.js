/**
 * adapter-localstorage.js — LocalStorage Adapter
 *
 * Implementiert die vollständige AppService-Schnittstelle
 * auf Basis von Store (store.js) und ProfileStore (profile.js).
 *
 * WICHTIG: Diese Datei ist die einzige erlaubte Stelle, an der
 * Store.* und ProfileStore.* direkt aufgerufen werden dürfen.
 * Consumer-Code (teacher.js, student.js etc.) darf das NICHT.
 *
 * Callbacks folgen immer Node.js-Konvention: function(err, result)
 * Callbacks werden synchron aufgerufen — das ist gültig.
 * FirestoreAdapter ruft sie asynchron auf — Consumer-Code
 * unterscheidet das nicht.
 *
 * Regeln: var only, function(){}, no arrow functions,
 *         no template literals, no ?. or ??
 */

var LocalStorageAdapter = (function() {

  /* ── Interner Helfer: sicherer Callback-Aufruf ────────── */
  function _cb(callback, err, result) {
    if (typeof callback === 'function') {
      callback(err, result !== undefined ? result : null);
    }
  }

  /* ══════════════════════════════════════════════════════
     USERS
  ══════════════════════════════════════════════════════ */

  function getUser(uid, callback) {
    try {
      var user = Store.Users.byUid(uid);
      _cb(callback, null, user);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getAllUsers(callback) {
    try {
      var users = Store.Users.all();
      _cb(callback, null, users);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getUsersByRole(role, callback) {
    try {
      var users = Store.Users.byRole(role);
      _cb(callback, null, users);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function createUser(data, callback) {
    try {
      var user = Store.Users.create(data);
      _cb(callback, null, user);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ── Username helpers ───────────────────────────────────── */

  /* Derive a clean username slug from a display name */
  function _slugify(name) {
    return (name || '')
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 28) || 'user';
  }

  function isUsernameAvailable(username, callback) {
    try {
      var u = (username || '').trim().toLowerCase();
      if (!u) { _cb(callback, new Error('Username darf nicht leer sein.'), false); return; }
      if (u.length < 3) { _cb(callback, new Error('Username muss mindestens 3 Zeichen haben.'), false); return; }
      if (!/^[a-z0-9._]+$/.test(u)) { _cb(callback, new Error('Nur Buchstaben, Zahlen, Punkt und Unterstrich.'), false); return; }
      var existing = Store.Users.byUsername(u);
      _cb(callback, null, !existing);
    } catch(e) {
      _cb(callback, e, false);
    }
  }

  function generateUsername(name, callback) {
    try {
      var base = _slugify(name);
      /* Try base, then base2, base3 … */
      if (!Store.Users.byUsername(base)) { _cb(callback, null, base); return; }
      for (var i = 2; i <= 999; i++) {
        var candidate = base + i;
        if (!Store.Users.byUsername(candidate)) { _cb(callback, null, candidate); return; }
      }
      _cb(callback, new Error('Kein verfügbarer Username gefunden.'), null);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function getUserByEmailOrUsername(query, callback) {
    try {
      var q = (query || '').trim().toLowerCase();
      if (!q) { _cb(callback, new Error('Bitte E-Mail oder Benutzername eingeben.'), null); return; }
      var all = Store.Users.all();
      /* E-Mail: contains @ followed by domain (e.g. user@domain) */
      var isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(q);
      for (var i = 0; i < all.length; i++) {
        var u = all[i];
        if (isEmail) {
          if ((u.email || '').trim().toLowerCase() === q) { _cb(callback, null, u); return; }
        } else {
          /* Username match — strip leading @ if present */
          var handle = q.replace(/^@/, '');
          if ((u.username || '').toLowerCase() === handle) { _cb(callback, null, u); return; }
        }
      }
      _cb(callback, null, null); /* not found — caller decides error message */
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function deleteUser(uid, callback) {
    try {
      Store.Users.delete(uid);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function updateUser(uid, patch, callback) {
    try {
      Store.Users.update(uid, patch);
      _cb(callback, null, Store.Users.byUid(uid));
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     PROFILES
  ══════════════════════════════════════════════════════ */

  function getProfile(uid, callback) {
    try {
      var profile = ProfileStore.get(uid);
      _cb(callback, null, profile);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getProfileOrDefault(uid, callback) {
    try {
      var profile = ProfileStore.getOrDefault(uid);
      _cb(callback, null, profile);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function saveProfile(uid, data, callback) {
    try {
      var saved = ProfileStore.save(uid, data);
      _cb(callback, null, saved);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ── GuestSettings ─────────────────────────────────────── */
  function getGuestCurrency(callback) {
    try {
      var code = Store.GuestSettings.getCurrency();
      _cb(callback, null, code);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function setGuestCurrency(code, callback) {
    try {
      Store.GuestSettings.setCurrency(code);
      _cb(callback, null, code);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function getDisplayName(uid, callback) {
    try {
      var name = ProfileStore.getDisplayName(uid);
      _cb(callback, null, name);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getProfilePhoto(uid, callback) {
    try {
      var photo = ProfileStore.getPhoto(uid);
      _cb(callback, null, photo);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     TEACHERS + PROFILES (kombinierte Abfrage)
     In Firestore: eine denormalisierte Collection
     teacher_profiles/{uid} = { ...user, ...profile }
     Hier: zwei separate Reads, im Adapter gejoined.
  ══════════════════════════════════════════════════════ */

  function getTeachersWithProfiles(callback) {
    try {
      var teachers = Store.Users.byRole('teacher');
      var result   = [];
      for (var i = 0; i < teachers.length; i++) {
        var user    = teachers[i];
        var profile = ProfileStore.getOrDefault(user.uid);
        result.push({ user: user, profile: profile });
      }
      _cb(callback, null, result);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     SLOTS
  ══════════════════════════════════════════════════════ */

  function getSlotById(slotId, callback) {
    try {
      var slots = Store.Slots.all();
      var slot  = null;
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].slotId === slotId) { slot = slots[i]; break; }
      }
      _cb(callback, null, slot);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getSlotsByTeacher(teacherId, callback) {
    try {
      var slots = Store.Slots.byTeacher(teacherId);
      _cb(callback, null, slots);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getSlotsByTeacherDate(teacherId, date, callback) {
    try {
      /* Fix 3: fetch ±1 UTC day to catch cross-midnight slots for non-UTC teachers */
      var slots;
      if (typeof TimezoneService !== 'undefined') {
        var teacherTZ = TimezoneService.getUserTimezone(teacherId);
        var offsetMin = TimezoneService.getOffsetMinutes(teacherTZ, date);
        /* Only need adjacent dates if offset != 0 */
        if (offsetMin !== 0) {
          var d = new Date(date + 'T12:00:00');
          var prevDate = new Date(d); prevDate.setDate(d.getDate() - 1);
          var nextDate = new Date(d); nextDate.setDate(d.getDate() + 1);
          var prevStr  = prevDate.toISOString().slice(0, 10);
          var nextStr  = nextDate.toISOString().slice(0, 10);
          var allRaw   = Store.Slots.byTeacher(teacherId).filter(function(s) {
            return s.date === date || s.date === prevStr || s.date === nextStr;
          });
          /* Keep only slots whose LOCAL date matches requested date */
          slots = allRaw.filter(function(s) {
            var loc = TimezoneService.utcToLocal(s.time, s.date, teacherTZ);
            var locDate = new Date((s.date) + 'T12:00:00');
            locDate.setDate(locDate.getDate() + (loc.dateOffset || 0));
            return locDate.toISOString().slice(0, 10) === date;
          });
          /* Sort by local time */
          slots.sort(function(a, b) {
            var la = TimezoneService.utcToLocal(a.time, a.date, teacherTZ).localTime;
            var lb = TimezoneService.utcToLocal(b.time, b.date, teacherTZ).localTime;
            return la.localeCompare(lb);
          });
        } else {
          slots = Store.Slots.byTeacherDate(teacherId, date);
        }
      } else {
        slots = Store.Slots.byTeacherDate(teacherId, date);
      }
      _cb(callback, null, slots);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getSlotsByStudent(studentId, callback) {
    try {
      var slots = Store.Slots.byStudent(studentId);
      _cb(callback, null, slots);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getAllSlots(callback) {
    try {
      var slots = Store.Slots.all();
      _cb(callback, null, slots);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function slotExists(teacherId, date, time, callback) {
    try {
      var slot = Store.Slots.exists(teacherId, date, time);
      _cb(callback, null, slot);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function createSlot(data, callback) {
    try {
      var slotData = {};
      for (var k in data) slotData[k] = data[k];
      /* Convert time from teacher local TZ → UTC before storing.
         Skip if caller already provides UTC (data._utc === true). */
      if (slotData.time && slotData.teacherId && !slotData._utc && typeof TimezoneService !== 'undefined') {
        var teacherTZ = TimezoneService.getUserTimezone(slotData.teacherId);
        var conv = TimezoneService.localToUtc(slotData.time, slotData.date || '', teacherTZ);
        slotData.time = conv.utcTime;
        if (conv.dateOffset !== 0 && slotData.date) {
          var d = new Date(slotData.date + 'T12:00:00');
          d.setDate(d.getDate() + conv.dateOffset);
          slotData.date = d.toISOString().slice(0, 10);
        }
      }
      /* Mark slot as UTC — migration will skip it.
         Slots created via createSlot always have UTC time (either
         passed with _utc:true, or converted above). */
      slotData._utc = true;
      var slot = Store.Slots.create(slotData);
      _cb(callback, null, slot.slotId); /* return slotId (string) so callers can filter by s.slotId === newId */
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function createSlotRange(teacherId, date, startTime, endTime, status, callback) {
    try {
      /* Convert start/end from teacher local TZ → UTC before storing (Option B) */
      var utcStart = startTime;
      var utcEnd   = endTime;
      if (typeof TimezoneService !== 'undefined') {
        var teacherTZ2 = TimezoneService.getUserTimezone(teacherId);
        utcStart = TimezoneService.localToUtc(startTime, date, teacherTZ2).utcTime;
        utcEnd   = TimezoneService.localToUtc(endTime,   date, teacherTZ2).utcTime;
      }
      var count = Store.Slots.createRange(teacherId, date, utcStart, utcEnd, status);
      _cb(callback, null, count);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function updateSlot(slotId, patch, callback) {
    try {
      Store.Slots.update(slotId, patch);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function setSlotAvailability(slotId, newBase, callback) {
    try {
      Store.Slots.setAvailability(slotId, newBase);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function applySlotTimeout(slotId, callback) {
    try {
      Store.Slots.applyTimeout(slotId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function removeSlotTimeout(slotId, callback) {
    try {
      Store.Slots.removeTimeout(slotId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function bookSlot(slotId, studentId, callback, bookedByRole) {
    try {
      /* Lock price at booking time —
         Priority: 1) Selection.priceOverride (student-specific)
                   2) Teacher profile pricePerHalfHour (default) */
      var slot        = Store.Slots.all().filter(function(s) { return s.slotId === slotId; })[0];
      var teacherProf = slot ? ProfileStore.get(slot.teacherId) : null;
      var priceCur    = (teacherProf && teacherProf.priceCurrency) ? teacherProf.priceCurrency : 'EUR';

      /* Check for student-specific price override on the Selection */
      var sel = slot ? Store.Selections.all().filter(function(s) {
        return s.studentId === studentId && s.teacherId === slot.teacherId;
      })[0] : null;
      var rawPrice = (sel && sel.priceOverride !== undefined && sel.priceOverride !== null && sel.priceOverride !== '')
        ? parseFloat(sel.priceOverride)
        : (slot ? (parseFloat(ProfileStore.getPrice(slot.teacherId)) || null) : null);

      var price = rawPrice;
      /* Convert to EUR (system currency) synchronously using cached rates */
      if (rawPrice && priceCur !== 'EUR' && typeof CurrencyService !== 'undefined') {
        var converted = CurrencyService.convertSync(rawPrice, priceCur, 'EUR');
        if (converted !== null) price = converted;
      }
      Store.Slots.bookSlot(slotId, studentId, price, bookedByRole || 'student');
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function cancelSlotBooking(slotId, callback) {
    try {
      Store.Slots.cancelBooking(slotId, null);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* cancelSlotBookingAs — same as cancelSlotBooking but records who cancelled */
  function cancelSlotBookingAs(slotId, role, callback) {
    try {
      Store.Slots.cancelBooking(slotId, role || null);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function deleteSlot(slotId, callback) {
    try {
      Store.Slots.delete(slotId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function releaseSlot(slotId, callback) {
    try {
      Store.Slots.release(slotId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function confirmSlot(slotId, callback) {
    try {
      Store.Slots.confirm(slotId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     RECURRING RULES
  ══════════════════════════════════════════════════════ */

  function getRecurringByTeacher(teacherId, callback) {
    try {
      var rules = Store.Recurring.byTeacher(teacherId);
      _cb(callback, null, rules);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function recurringExists(teacherId, dayOfWeek, time, callback) {
    try {
      var rule = Store.Recurring.exists(teacherId, dayOfWeek, time);
      _cb(callback, null, rule);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* Returns true if the teacher has ANY recurring rule for the given dayOfWeek.
     Used by renderCalendar to show dots on days that have rules but no
     materialised slots yet (e.g. pending changes blocked materialisation). */
  function recurringExistsByDay(teacherId, dayOfWeek, callback) {
    try {
      var rules = Store.Recurring.byTeacher(teacherId);
      var found = false;
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].dayOfWeek === dayOfWeek) { found = true; break; }
      }
      _cb(callback, null, found);
    } catch (e) {
      _cb(callback, e, false);
    }
  }

  function createRecurring(teacherId, dayOfWeek, time, callback) {
    try {
      Store.Recurring.create(teacherId, dayOfWeek, time);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function deleteRecurringByDayTime(teacherId, dayOfWeek, time, callback) {
    try {
      Store.Recurring.deleteByTeacherDayTime(teacherId, dayOfWeek, time);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ── Step 6: One-time migration — convert all existing naive slot times to UTC ──
     Runs once on app load if migration flag not set.
     Uses each slot's teacherId to look up their current timezone.
     Imperfect for historical data (teacher may have changed TZ),
     but best possible for existing naive strings.
  ── */
  function migrateTimesToUtc(callback) {
    var FLAG_KEY = 'app_tz_migrated_v1';
    if (localStorage.getItem(FLAG_KEY)) {
      if (callback) callback(null);
      return;
    }
    if (typeof TimezoneService === 'undefined') {
      if (callback) callback(null);
      return;
    }
    try {
      var raw = localStorage.getItem('app_slots');
      var slots = raw ? JSON.parse(raw) : [];
      var changed = 0;
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        if (!slot.time || !slot.teacherId) continue;
        /* Skip already-migrated slots (marked with _utc flag) */
        if (slot._utc) continue;
        var teacherTZ = TimezoneService.getUserTimezone(slot.teacherId);
        /* If teacher TZ is UTC, no conversion needed */
        if (teacherTZ === 'UTC' || teacherTZ === 'Etc/UTC') {
          slot._utc = true;
          changed++;
          continue;
        }
        var conv = TimezoneService.localToUtc(slot.time, slot.date || '', teacherTZ);
        slot.time = conv.utcTime;
        if (conv.dateOffset !== 0 && slot.date) {
          var d = new Date(slot.date + 'T12:00:00');
          d.setDate(d.getDate() + conv.dateOffset);
          slot.date = d.toISOString().slice(0, 10);
        }
        slot._utc = true;
        changed++;
      }
      if (changed) {
        localStorage.setItem('app_slots', JSON.stringify(slots));
      }
      localStorage.setItem(FLAG_KEY, '1');
      console.log('[TZ Migration] migrated ' + changed + ' slots to UTC');
      if (callback) callback(null);
    } catch (e) {
      console.error('[TZ Migration] failed:', e);
      if (callback) callback(e);
    }
  }

  function materialiseWeek(teacherId, weekDates, callback) {
    try {
      /* Recurring rules store UTC time — absolute, timezone-independent.
         No conversion needed: rule.time is already the correct UTC value for the slot. */
      var rules = Store.Recurring.byTeacher(teacherId);

      /* Build the set of date strings for this week */
      var weekDateStrs = {};
      for (var wi = 0; wi < weekDates.length; wi++) {
        if (!weekDates[wi]) continue;
        var wds = (weekDates[wi] instanceof Date)
          ? weekDates[wi].toISOString().slice(0, 10)
          : String(weekDates[wi]);
        weekDateStrs[wds] = true;
      }

      /* Build set of recurring UTC (date|utcTime) keys so we know which slots
         are rule-backed. rule.time is LOCAL — convert to UTC per-date. */
      var _rTZ = (typeof TimezoneService !== 'undefined')
        ? TimezoneService.getUserTimezone(teacherId)
        : 'UTC';
      var recurringKeys = {};
      for (var ri = 0; ri < rules.length; ri++) {
        var rule  = rules[ri];
        var wDate = weekDates[rule.dayOfWeek];
        if (!wDate) continue;
        var rDateStr = (wDate instanceof Date)
          ? wDate.toISOString().slice(0, 10)
          : String(wDate);
        var rUtcTime = rule.time;
        var rUtcDate = rDateStr;
        if (typeof TimezoneService !== 'undefined' && _rTZ !== 'UTC') {
          var rConv = TimezoneService.localToUtc(rule.time, rDateStr, _rTZ);
          rUtcTime = rConv.utcTime;
          if (rConv.dateOffset !== 0) {
            var rAdj = new Date(rDateStr + 'T12:00:00');
            rAdj.setDate(rAdj.getDate() + rConv.dateOffset);
            rUtcDate = rAdj.toISOString().slice(0, 10);
          }
        }
        recurringKeys[rUtcDate + '|' + rUtcTime] = true;
      }

      /* PURGE: remove non-booked available slots for this teacher+week
         ONLY if they are rule-backed (have a matching recurring rule).
         Manual slots (no matching rule) are NEVER purged — they persist.
         EXCEPTION: preserve slots with pending availability changes.

         This fix prevents two bugs:
         1. Slots with visibility/groupMax config being wiped on week navigation
            (they are only re-created if they match a recurring rule key)
         2. Manual one-off slots disappearing when navigating away and back */
      var _pendingIds = (typeof pendingSlotChanges !== 'undefined')
        ? Object.keys(pendingSlotChanges) : [];
      var allSlots = Store.Slots.all();
      var purged = allSlots.filter(function(s) {
        if (s.teacherId !== teacherId) return true;
        if (!weekDateStrs[s.date]) return true;
        /* Never purge slots with pending changes */
        if (_pendingIds.indexOf(s.slotId) !== -1) return true;
        /* Never purge booked/confirmed slots */
        if (s.studentId || (s.students && s.students.length)) return true;
        if (s.confirmedAt || s.bookedAt) return true;
        /* Never purge timeout/disabled — they represent explicit teacher actions */
        if (s.status === 'timeout' || s.baseStatus === 'timeout') return true;
        if (s.status === 'disabled' || s.baseStatus === 'disabled') return true;
        /* Never purge slots with visibility config or group config —
           these hold teacher-configured data that must not be lost */
        if (s.visibility && s.visibility !== 'public') return true;
        if (s.visibilityList && s.visibilityList.length) return true;
        if (s.excludeNewStudents) return true;
        if (s.autoPromotedStudents && s.autoPromotedStudents.length) return true;
        if (s.groupMax && s.groupMax > 1) return true;
        /* Only purge plain available slots that ARE backed by a recurring rule.
           Manual slots (no matching rule) survive. */
        var slotKey = s.date + '|' + s.time;
        if (!recurringKeys[slotKey]) return true; /* no rule → keep */
        return false; /* rule-backed plain slot → purge and recreate */
      });
      var purgedCount = allSlots.length - purged.length;

      /* Recurring rules store TEACHER LOCAL time (e.g. "12:30").
         materialiseWeek must convert local → UTC per-date so that:
         1. DST transitions are handled correctly (each date gets its own offset)
         2. Seed data (stored as local times) materialises at the right UTC time
         3. Rules set by the teacher via the grid (also stored as local) work correctly

         Per the architecture doc (Section 3 + DOC_TIMEZONE_IMPLEMENTATION_20260325):
         "Recurring rules always store teacher-local time. materialiseWeek converts
         local → UTC using the teacher's timezone + the specific date." */
      var teacherTZForMat = (typeof TimezoneService !== 'undefined')
        ? TimezoneService.getUserTimezone(teacherId)
        : 'UTC';

      if (rules.length) {
        var existSet = {};
        for (var j = 0; j < purged.length; j++) {
          var es = purged[j];
          existSet[es.teacherId + '|' + es.date + '|' + es.time] = true;
        }
        /* Build a lookup of ALL original slots by date|utcTime for config inheritance */
        var originalByKey = {};
        for (var oi = 0; oi < allSlots.length; oi++) {
          var os = allSlots[oi];
          if (os.teacherId === teacherId) {
            originalByKey[os.date + '|' + os.time] = os;
          }
        }
        var added = 0;
        for (var i = 0; i < rules.length; i++) {
          var rule  = rules[i];
          var wDate = weekDates[rule.dayOfWeek];
          if (!wDate) continue;
          var dateStr3 = (wDate instanceof Date)
            ? wDate.toISOString().slice(0, 10)
            : String(wDate);

          /* Convert rule.time (teacher local) → UTC for this specific date (DST-correct) */
          var utcTime3 = rule.time; /* fallback: treat as UTC if no TZ service */
          var utcDate3 = dateStr3;
          if (typeof TimezoneService !== 'undefined' && teacherTZForMat !== 'UTC') {
            var conv3 = TimezoneService.localToUtc(rule.time, dateStr3, teacherTZForMat);
            utcTime3 = conv3.utcTime;
            /* Handle midnight crossings — slot belongs to adjacent UTC date */
            if (conv3.dateOffset !== 0) {
              var adjDate3 = new Date(dateStr3 + 'T12:00:00');
              adjDate3.setDate(adjDate3.getDate() + conv3.dateOffset);
              utcDate3 = adjDate3.toISOString().slice(0, 10);
            }
          }

          var key3 = teacherId + '|' + utcDate3 + '|' + utcTime3;
          if (!existSet[key3]) {
            /* Inherit visibility/group config from the original slot if it existed */
            var origSlot = originalByKey[utcDate3 + '|' + utcTime3];
            var newSlot = {
              slotId:    (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)),
              teacherId: teacherId, studentId: null, students: [],
              date:      utcDate3, time: utcTime3,
              status:    'available', baseStatus: 'available',
              _utc:      true   /* time is UTC — skip migration */
            };
            /* Copy visibility config fields from original slot if present */
            if (origSlot) {
              if (origSlot.visibility)             newSlot.visibility             = origSlot.visibility;
              if (origSlot.visibilityList)         newSlot.visibilityList         = origSlot.visibilityList;
              if (origSlot.excludeNewStudents)     newSlot.excludeNewStudents     = origSlot.excludeNewStudents;
              if (origSlot.autoPromotedStudents)   newSlot.autoPromotedStudents   = origSlot.autoPromotedStudents;
              if (origSlot.groupMax)               newSlot.groupMax               = origSlot.groupMax;
            }
            purged.push(newSlot);
            existSet[key3] = true;
            added++;
          }
        }
        if (added || purgedCount) {
          try { localStorage.setItem('app_slots', JSON.stringify(purged)); } catch(e) {}
        }
      } else if (purgedCount) {
        try { localStorage.setItem('app_slots', JSON.stringify(purged)); } catch(e) {}
      }
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     SELECTIONS (Student ↔ Teacher)
  ══════════════════════════════════════════════════════ */

  function getSelectionsByStudent(studentId, callback) {
    try {
      var sels = Store.Selections.byStudent(studentId);
      _cb(callback, null, sels);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getSelectionsByTeacher(teacherId, callback) {
    try {
      var sels = Store.Selections.byTeacher(teacherId);
      _cb(callback, null, sels);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function createSelection(studentId, teacherId, callback) {
    try {
      Store.Selections.create(studentId, teacherId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function deleteSelection(studentId, teacherId, callback) {
    try {
      Store.Selections.delete(studentId, teacherId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* Update a selection — used to store priceOverride per student */
  function updateSelection(studentId, teacherId, patch, callback) {
    try {
      Store.Selections.update(studentId, teacherId, patch);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ── Favorites ──────────────────────────────────────── */

  function getFavoritesByStudent(studentId, callback) {
    try {
      var favs = Store.Favorites.byStudent(studentId);
      _cb(callback, null, favs);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function addFavorite(studentId, teacherId, callback) {
    try {
      Store.Favorites.add(studentId, teacherId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function removeFavorite(studentId, teacherId, callback) {
    try {
      Store.Favorites.remove(studentId, teacherId);
      _cb(callback, null, true);
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function isFavorite(studentId, teacherId, callback) {
    try {
      _cb(callback, null, Store.Favorites.exists(studentId, teacherId));
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     STATS (Dashboard-Aggregate)
  ══════════════════════════════════════════════════════ */

  function getAdminStats(callback) {
    try {
      var users    = Store.Users.all();
      var slots    = Store.Slots.all();
      var teachers = 0;
      var students = 0;
      var booked   = 0;
      for (var i = 0; i < users.length; i++) {
        if (users[i].role === 'teacher') teachers++;
        if (users[i].role === 'student') students++;
      }
      for (var j = 0; j < slots.length; j++) {
        if (slots[j].status === 'booked') booked++;
      }
      _cb(callback, null, {
        totalUsers: users.length,
        teachers:   teachers,
        students:   students,
        bookings:   booked
      });
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  function getUserStats(uid, callback) {
    try {
      var slotCount = Store.Slots.byTeacher(uid).length;
      var selCount  = Store.Selections.byTeacher(uid).length;
      _cb(callback, null, { slots: slotCount, selections: selCount });
    } catch (e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     TIME HELPERS (Passthrough — kein Datenzugriff)
  ══════════════════════════════════════════════════════ */

  function slotEndTime(timeStr) {
    return Store.slotEndTime(timeStr);
  }

  function slotTimesInRange(startTime, endTime) {
    return Store.slotTimesInRange(startTime, endTime);
  }

  /* ══════════════════════════════════════════════════════
     WALLET
     localStorage Key: app_wallets  { uid: { uid, balance, currency, updatedAt } }
     localStorage Key: app_transactions  [ ...txObjects ]

     Schema Wallet:
       { uid, balance, currency: 'EUR', updatedAt }

     Schema Transaktion:
       { txId, uid, type, amount, balance, description,
         status, createdAt, relatedUid }
       type:   'deposit'|'withdrawal'|'escrow_hold'|
               'escrow_release'|'refund'|'transfer'|
               'remainder_due'
       status: 'completed'|'pending'|'failed'

     MIGRATION ZU STRIPE/FIRESTORE:
       - Wallets   → Firestore Collection wallets/{uid}
       - Transaktionen → Firestore Collection transactions/
         oder Stripe Payment Intents + Webhook-Log
       - escrow_hold/release → Stripe Connect Transfers
         oder separate Escrow-Collection
  ══════════════════════════════════════════════════════ */

  var _WALLET_KEY = 'app_wallets';
  var _TX_KEY     = 'app_transactions';

  function _loadWallets() {
    try {
      var raw = localStorage.getItem(_WALLET_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  function _saveWallets(data) {
    try { localStorage.setItem(_WALLET_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function _loadTxs() {
    try {
      var raw = localStorage.getItem(_TX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function _saveTxs(data) {
    try { localStorage.setItem(_TX_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function _txId() {
    return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
  }

  function _isoNow() {
    return new Date().toISOString();
  }

  /* _timestampNow — builds a dual-timestamp object for TX writes.
     Returns { utc, localIso, actorTimezone } where:
       utc          — ISO 8601 UTC string (createdAt — SSOT, unchanged, used for sort/filter)
       localIso     — ISO-like local string without Z (createdAtLocal — for display)
       actorTimezone — IANA TZ string of the actor (actorTimezone — for audit trail)
     actorUid: the uid of the user performing the action. May be null → falls back to UTC. */
  function _timestampNow(actorUid) {
    var utc = new Date().toISOString();
    var tz  = 'UTC';
    var localIso = utc.slice(0, 19); /* fallback: UTC without Z */
    try {
      if (actorUid && typeof TimezoneService !== 'undefined') {
        tz = TimezoneService.getUserTimezone(actorUid) || 'UTC';
      }
      if (tz && tz !== 'UTC') {
        /* Format current time in actor's timezone as "YYYY-MM-DDTHH:MM:SS" */
        var d = new Date();
        var parts = d.toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T');
        localIso = parts.slice(0, 19);
      }
    } catch(e) { /* keep UTC fallback */ }
    return { utc: utc, localIso: localIso, actorTimezone: tz };
  }

  /* Wallet laden oder initialisieren */
  function getWallet(uid, callback) {
    try {
      var wallets = _loadWallets();
      if (!wallets[uid]) {
        wallets[uid] = { uid: uid, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
        _saveWallets(wallets);
      }
      _cb(callback, null, wallets[uid]);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* Alle Wallets — fuer Admin-Uebersichten */
  function getAllWallets(callback) {
    try {
      _cb(callback, null, _loadWallets());
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* Einzahlung */
  function deposit(uid, amount, description, callback) {
    try {
      var amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        _cb(callback, new Error('Ungültiger Betrag.'), null);
        return;
      }
      var wallets  = _loadWallets();
      if (!wallets[uid]) {
        wallets[uid] = { uid: uid, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var wallet   = wallets[uid];
      wallet.balance  = Math.round((wallet.balance + amt) * 100) / 100;
      wallet.updatedAt = _isoNow();
      _saveWallets(wallets);

      var _ts1 = _timestampNow(uid);
      var tx = {
        txId:           _txId(),
        uid:            uid,
        type:           'deposit',
        amount:         amt,
        balance:        wallet.balance,
        description:    description || '',
        status:         'completed',
        createdAt:      _ts1.utc,
        createdAtLocal: _ts1.localIso,
        actorTimezone:  _ts1.actorTimezone,
        relatedUid:     null
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);

      _cb(callback, null, { wallet: wallet, transaction: tx });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* Auszahlung */
  function withdraw(uid, amount, description, callback) {
    try {
      var amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        _cb(callback, new Error('Ungültiger Betrag.'), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[uid]) {
        wallets[uid] = { uid: uid, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var wallet = wallets[uid];
      if (wallet.balance < amt) {
        _cb(callback, new Error('Nicht genug Guthaben.'), null);
        return;
      }
      wallet.balance   = Math.round((wallet.balance - amt) * 100) / 100;
      wallet.updatedAt = _isoNow();
      _saveWallets(wallets);

      var _tsW = _timestampNow(uid);
      var tx = {
        txId:           _txId(),
        uid:            uid,
        type:           'withdrawal',
        amount:         -amt,
        balance:        wallet.balance,
        description:    description || '',
        status:         'completed',
        createdAt:      _tsW.utc,
        createdAtLocal: _tsW.localIso,
        actorTimezone:  _tsW.actorTimezone,
        relatedUid:     null
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);

      _cb(callback, null, { wallet: wallet, transaction: tx });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* Transaktionshistorie für einen User */
  function getTransactions(uid, callback) {
    try {
      var all = _loadTxs();
      var result = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].uid === uid) result.push(all[i]);
      }
      _cb(callback, null, result);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /*
   * PHASE 2 — WALLET-TRANSFERS: NOCH NICHT IMPLEMENTIERT
   * Signaturen bereits definiert fuer spaetere Migration:
   *
   * transferPayment(fromUid, toUid, amount, description, cb)
   * setPaymentMethod(teacherUid, method, cb)
   * getPaymentMethod(teacherUid, cb)
   */

  /* ══════════════════════════════════════════════════════
     ESCROW & DEPOSIT
     localStorage Key: app_escrow  [ ...escrowObjects ]

     Schema Escrow:
       { escrowId, slotId, studentId, teacherId,
         depositAmount, depositType, depositPercent,
         fullAmount, negotiatedAmount,
         paymentMode, requiresDeposit,
         depositStatus, fullPaymentStatus,
         depositPaidAt, fullPaidAt,
         studentConfirmedAt, releasedAt, createdAt }

     depositStatus:
       'unpaid' -> 'held' -> 'released'
                          -> 'refund_requested' -> 'refunded'
                                               -> 'forfeited'

     fullPaymentStatus:
       'unpaid' -> 'paid' -> 'verified'
                          -> 'remainder_pending'  (confirmed but student had insufficient funds for remainder)

     Profil-Felder (Teacher):
       requiresDeposit   bool    Standard: true
       depositMode       string  'fixed'|'percent'   Standard: 'fixed'
       depositFixed      number  Standard: 50
       depositPercent    number  Standard: 20
       paymentMode       string  'instant'|'cash_on_site'  Standard: 'instant'

     MIGRATION ZU FIRESTORE:
       - Escrow   -> Collection escrow/{escrowId}
       - Profil   -> denormalisiert in teacher_profiles/{uid}
  ══════════════════════════════════════════════════════ */

  var _ESCROW_KEY = 'app_escrow';

  function _loadEscrows() {
    try {
      var raw = localStorage.getItem(_ESCROW_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function _saveEscrows(data) {
    try { localStorage.setItem(_ESCROW_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function _escrowId() {
    return 'esc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /**
   * _buildTxMeta — builds rich metadata for an escrow transaction.
   * Reads the slot to get date/time/bookedAt.
   * opts.cancellationTier — optional tier string for cancel transactions
   * opts.cancelledAt      — optional ISO timestamp of cancellation
   */
  function _buildTxMeta(escrow, opts) {
    opts = opts || {};
    var slot = null;
    try {
      var slots = Store.Slots.all();
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].slotId === escrow.slotId) { slot = slots[i]; break; }
      }
    } catch(e) {}
    return {
      escrowId:          escrow.escrowId,
      slotId:            escrow.slotId,
      slotDate:          escrow.slotDate  || (slot ? slot.date : null),
      slotTime: (function() {
          var _rawT = escrow.slotTime || (slot ? slot.time : null);
          if (!_rawT || typeof TimezoneService === 'undefined' || !slot) return _rawT;
          var _tTZ = TimezoneService.getUserTimezone(slot.teacherId);
          return _tTZ ? TimezoneService.utcToLocal(_rawT, slot.date || '', _tTZ).localTime : _rawT;
        })(),      teacherId:         escrow.teacherId,
      studentId:         escrow.studentId,
      fullAmount:        escrow.fullAmount    || 0,
      depositAmount:     escrow.depositAmount || 0,
      depositType:       escrow.depositType   || null,
      depositPercent:    escrow.depositPercent != null ? escrow.depositPercent : null,
      paymentMode:       escrow.paymentMode   || 'instant',
      requiresDeposit:   escrow.requiresDeposit !== false,
      cancellationTier:  opts.cancellationTier || null,
      cancelledAt:       opts.cancelledAt || null,
      bookedAt:          escrow.createdAt || null
    };
  }

  /* Deposit-Betrag aus Teacher-Profil berechnen */
  function _calcDeposit(profile, fullAmount) {
    var mode = profile.depositMode    || 'fixed';
    var fixed = parseFloat(profile.depositFixed)   || 50;
    var pct   = parseFloat(profile.depositPercent) || 20;
    var full  = parseFloat(fullAmount) || 0;
    if (mode === 'percent') {
      return {
        depositAmount:  Math.round((full * pct / 100) * 100) / 100,
        depositType:    'percent',
        depositPercent: pct
      };
    }
    return {
      depositAmount:  fixed,
      depositType:    'fixed',
      depositPercent: null
    };
  }

  /**
   * calcDepositInfo — public wrapper around _calcDeposit.
   * Returns { depositAmount, depositType, depositPercent, requiresDeposit, paymentMode }
   */
  function calcDepositInfo(teacherId, fullAmount, callback) {
    try {
      var profile = ProfileStore.getOrDefault(teacherId);
      var calc    = _calcDeposit(profile, fullAmount);
      _cb(callback, null, {
        depositAmount:   calc.depositAmount,
        depositType:     calc.depositType,
        depositPercent:  calc.depositPercent,
        requiresDeposit: (profile.requiresDeposit !== false),
        paymentMode:     profile.paymentMode || 'instant'
      });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* ── Lesen ───────────────────────────────────────────── */

  function getEscrow(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { found = all[i]; break; }
      }
      _cb(callback, null, found);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* Tags escrow with cancellation tier — called before settlement so transactions carry the tier */
  function _tagEscrowTier(escrowId, tier, callback) {
    try {
      var all = _loadEscrows();
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) {
          all[i]._cancellationTier = tier;
          break;
        }
      }
      _saveEscrows(all);
      _cb(callback, null, true);
    } catch(e) { _cb(callback, e, null); }
  }

  function getEscrowBySlot(slotId, callback) {
    try {
      var all = _loadEscrows();
      var found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].slotId === slotId) { found = all[i]; break; }
      }
      _cb(callback, null, found);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function getEscrowsByStudent(studentId, callback) {
    try {
      var all    = _loadEscrows();
      var result = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].studentId === studentId) result.push(all[i]);
      }
      _cb(callback, null, result);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function getEscrowsByTeacher(teacherId, callback) {
    try {
      var all    = _loadEscrows();
      var result = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].teacherId === teacherId) result.push(all[i]);
      }
      _cb(callback, null, result);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* ── Erstellen ───────────────────────────────────────── */

  /*
   * createEscrow — beim Buchen aufgerufen.
   * Liest Teacher-Profil, berechnet Deposit, legt Escrow-Objekt an.
   * Zieht noch KEIN Geld ab — nur payDeposit() tut das.
   */
  function createEscrow(slotId, studentId, teacherId, callback) {
    try {
      var profile    = ProfileStore.getOrDefault(teacherId);
      /* priceOverride auf der Selection hat Priorität über Profil-Standardpreis */
      var _selForEscrow = Store.Selections.all().filter(function(s) {
        return s.studentId === studentId && s.teacherId === teacherId;
      })[0];
      var fullAmount = (_selForEscrow &&
                        _selForEscrow.priceOverride !== undefined &&
                        _selForEscrow.priceOverride !== null &&
                        _selForEscrow.priceOverride !== '')
        ? parseFloat(_selForEscrow.priceOverride) || 0
        : parseFloat(profile.pricePerHalfHour) || 0;
      var calc       = _calcDeposit(profile, fullAmount);
      /* Read slot for date/time — store directly so escrow is self-contained */
      var slotObj = Store.Slots.all().filter(function(s) { return s.slotId === slotId; })[0] || {};
      var escrow = {
        escrowId:           _escrowId(),
        slotId:             slotId,
        slotDate:           slotObj.date  || null,
        slotTime:           slotObj.time  || null,
        studentId:          studentId,
        teacherId:          teacherId,
        depositAmount:      calc.depositAmount,
        depositType:        calc.depositType,
        depositPercent:     calc.depositPercent,
        fullAmount:         fullAmount,
        negotiatedAmount:   null,
        paymentMode:        profile.paymentMode    || 'instant',
        requiresDeposit:    (profile.requiresDeposit !== false),
        depositStatus:      'unpaid',
        fullPaymentStatus:  'unpaid',
        depositPaidAt:      null,
        fullPaidAt:         null,
        studentConfirmedAt: null,
        releasedAt:         null,
        createdAt:          _isoNow()
      };
      var all = _loadEscrows();
      all.unshift(escrow);
      _saveEscrows(all);
      _cb(callback, null, escrow);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* ── Aktionen Student ────────────────────────────────── */

  /* payDeposit: unpaid -> held. Zieht depositAmount aus Student-Wallet. */
  /* payDepositSilent — same as payDeposit but writes NO escrow_hold TX.
     Used in batch bookings where the caller writes one block-level TX. */
  function payDepositSilent(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'unpaid') {
        _cb(callback, new Error('Deposit bereits bezahlt: ' + escrow.depositStatus), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var wallet = wallets[escrow.studentId];
      if (wallet.balance < escrow.depositAmount) {
        _cb(callback, new Error('Nicht genug Guthaben fuer Deposit (' + escrow.depositAmount + ' benoetigt).'), null);
        return;
      }
      wallet.balance   = Math.round((wallet.balance - escrow.depositAmount) * 100) / 100;
      wallet.updatedAt = _isoNow();
      _saveWallets(wallets);
      escrow.depositStatus = 'held';
      escrow.depositPaidAt = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, transaction: null });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function payDeposit(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'unpaid') {
        _cb(callback, new Error('Deposit bereits bezahlt oder ungültiger Status: ' + escrow.depositStatus), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var wallet = wallets[escrow.studentId];
      if (wallet.balance < escrow.depositAmount) {
        _cb(callback, new Error('Nicht genug Guthaben fuer Deposit (' + escrow.depositAmount + ' benoetigt).'), null);
        return;
      }
      wallet.balance   = Math.round((wallet.balance - escrow.depositAmount) * 100) / 100;
      wallet.updatedAt = _isoNow();
      _saveWallets(wallets);
      var meta = _buildTxMeta(escrow);
      var slotLabel = meta.slotDate ? (meta.slotDate + ' ' + (meta.slotTime || '')) : escrow.slotId;
      var _tsPD = _timestampNow(escrow.studentId);
      var tx = {
        txId:           _txId(),
        uid:            escrow.studentId,
        type:           'escrow_hold',
        amount:         -escrow.depositAmount,
        balance:        wallet.balance,
        description:    'Deposit für Stunde am ' + slotLabel,
        status:         'completed',
        createdAt:      _tsPD.utc,
        createdAtLocal: _tsPD.localIso,
        actorTimezone:  _tsPD.actorTimezone,
        relatedUid:     escrow.teacherId,
        meta:           meta
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      escrow.depositStatus = 'held';
      escrow.depositPaidAt = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, transaction: tx });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* requestDepositRefund: held -> refund_requested. Teacher entscheidet. */
  function requestDepositRefund(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'held') {
        _cb(callback, new Error('Rueckerstattung nur moeglich wenn Status "held" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }
      escrow.depositStatus = 'refund_requested';
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, escrow);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /*
   * confirmLesson: Schüler bestätigt Stunde.
   * held -> released + fullPaymentStatus -> verified.
   * Schreibt Deposit ans Teacher-Wallet.
   */
  /**
   * confirmLessonSilent — releases escrow deposit to teacher wallet
   * WITHOUT writing any TX. Used by confirmBlock which writes one
   * aggregate TX for the whole block afterwards.
   */
  function confirmLessonSilent(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'held') {
        _cb(callback, new Error('Stunde kann nur bestaetigt werden wenn Status \"held\" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }

      var depositAmt   = parseFloat(escrow.depositAmount) || 0;
      var fullAmt      = parseFloat(escrow.fullAmount)    || 0;
      var remainderAmt = Math.max(0, Math.round((fullAmt - depositAmt) * 100) / 100);

      var wallets = _loadWallets();
      if (!wallets[escrow.teacherId]) {
        wallets[escrow.teacherId] = { uid: escrow.teacherId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }

      var studentBalance = wallets[escrow.studentId].balance;
      var canPay         = remainderAmt <= 0 || studentBalance >= remainderAmt;
      var now            = _isoNow();
      var _tsCLS         = _timestampNow(escrow.studentId);

      if (canPay) {
        /* ── Normal path: student has sufficient funds ── */
        if (remainderAmt > 0) {
          wallets[escrow.studentId].balance   = Math.round((studentBalance - remainderAmt) * 100) / 100;
          wallets[escrow.studentId].updatedAt = now;
        }
        wallets[escrow.teacherId].balance   = Math.round((wallets[escrow.teacherId].balance + fullAmt) * 100) / 100;
        wallets[escrow.teacherId].updatedAt = now;
        _saveWallets(wallets);

        escrow.studentConfirmedAt = now;
        escrow.depositStatus      = 'released';
        escrow.fullPaymentStatus  = 'verified';
        escrow.fullPaidAt         = now;
        escrow.releasedAt         = now;
      } else {
        /* ── Insufficient funds path ── */
        /* Teacher receives deposit only (already held in escrow) */
        wallets[escrow.teacherId].balance   = Math.round((wallets[escrow.teacherId].balance + depositAmt) * 100) / 100;
        wallets[escrow.teacherId].updatedAt = now;
        /* Student balance unchanged — no overdraft */
        _saveWallets(wallets);

        escrow.studentConfirmedAt  = now;
        escrow.depositStatus       = 'released';
        escrow.fullPaymentStatus   = 'remainder_pending';
        escrow.remainderAmount     = remainderAmt;
        escrow.remainderDueAt      = now;
        escrow.releasedAt          = now;
        /* fullPaidAt stays null until remainder is settled */
      }
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, canPay: canPay, remainderAmt: remainderAmt });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeBlockLessonConfirmed — writes ONE escrow_release TX for the teacher
   * and ONE lesson_confirmed TX for the student covering an entire block.
   */
  function writeBlockLessonConfirmed(slots, escrows, callback) {
    try {
      if (!slots || !slots.length) { _cb(callback, null, null); return; }
      var first     = slots[0];
      var last      = slots[slots.length - 1];
      var studentId = first.studentId;
      var teacherId = first.teacherId;
      var totalDep  = 0;
      var totalFull = 0;
      var escrowIds = [];

      (escrows || []).forEach(function(e) {
        if (e) { escrowIds.push(e.escrowId); totalDep += parseFloat(e.depositAmount) || 0; }
      });
      slots.forEach(function(s) { totalFull += parseFloat(s.price) || 0; });
      totalDep  = Math.round(totalDep  * 100) / 100;
      totalFull = Math.round(totalFull * 100) / 100;

      /* Remainder = full price minus deposits already deducted at booking time.
         Wallet updates were already applied per-slot in confirmLessonSilent.
         This function only writes the aggregate TX records.
         We read escrows to detect if any had insufficient funds (remainder_pending). */
      var totalRemainder = Math.max(0, Math.round((totalFull - totalDep) * 100) / 100);

      /* Check if any escrow ended up in remainder_pending state */
      var allEscrows = _loadEscrows();
      var anyRemainder = false;
      var totalOutstanding = 0;
      escrowIds.forEach(function(eid) {
        for (var i = 0; i < allEscrows.length; i++) {
          if (allEscrows[i].escrowId === eid) {
            if (allEscrows[i].fullPaymentStatus === 'remainder_pending') {
              anyRemainder = true;
              totalOutstanding += parseFloat(allEscrows[i].remainderAmount) || 0;
            }
            break;
          }
        }
      });
      totalOutstanding = Math.round(totalOutstanding * 100) / 100;

      var endTime   = slotEndTime(last.time);
      var dateLabel = (first.slotDate || first.date || '') + ' ' +
                      (first.slotTime || first.time || '') + '\u2013' + endTime;
      var _tsBLC    = _timestampNow(studentId);
      var now       = _tsBLC.utc;

      /* Read current balances (already updated by confirmLessonSilent) */
      var wallets = _loadWallets();
      var tBal    = wallets[teacherId]  ? wallets[teacherId].balance  : 0;
      var sBal    = wallets[studentId]  ? wallets[studentId].balance  : 0;

      var meta = {
        slotIds:        slots.map(function(s) { return s.slotId; }),
        escrowIds:      escrowIds,
        slotDate:       first.slotDate || first.date || null,
        slotTimeStart:  first.slotTime || first.time || null,
        slotTimeEnd:    endTime,
        slotCount:      slots.length,
        teacherId:      teacherId,
        studentId:      studentId,
        depositAmount:  totalDep,
        fullAmount:     totalFull
      };

      var txs = _loadTxs();

      if (!anyRemainder) {
        /* ── Normal path: all escrows fully paid ── */
        var txTch = {
          txId:           _txId(),
          uid:            teacherId,
          type:           'escrow_release',
          amount:         totalFull,
          balance:        tBal,
          description:    'Zahlung freigegeben \u2014 ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBLC.utc,
          createdAtLocal: _tsBLC.localIso,
          actorTimezone:  _tsBLC.actorTimezone,
          relatedUid:     studentId,
          meta:           meta
        };
        var txStu = {
          txId:           _txId(),
          uid:            studentId,
          type:           'lesson_confirmed',
          amount:         totalRemainder > 0 ? -totalRemainder : 0,
          balance:        sBal,
          description:    'Stunde best\u00e4tigt \u2014 ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBLC.utc,
          createdAtLocal: _tsBLC.localIso,
          actorTimezone:  _tsBLC.actorTimezone,
          relatedUid:     teacherId,
          meta:           meta
        };
        txs.unshift(txTch);
        txs.unshift(txStu);

      } else {
        /* ── Partial path: some/all escrows had insufficient funds ──
           Teacher received deposit(s) only via confirmLessonSilent.
           Teacher TX reflects what was actually credited (= totalFull - totalOutstanding).
           Student gets a lesson_confirmed + remainder_due (pending) TX. */
        var actualPaid = Math.max(0, Math.round((totalFull - totalOutstanding) * 100) / 100);

        var txTchPartial = {
          txId:           _txId(),
          uid:            teacherId,
          type:           'escrow_release',
          amount:         actualPaid,
          balance:        tBal,
          description:    'Teilzahlung freigegeben (Restbetrag ausstehend) \u2014 ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBLC.utc,
          createdAtLocal: _tsBLC.localIso,
          actorTimezone:  _tsBLC.actorTimezone,
          relatedUid:     studentId,
          meta:           meta
        };
        txs.unshift(txTchPartial);

        var txStuConf = {
          txId:           _txId(),
          uid:            studentId,
          type:           'lesson_confirmed',
          amount:         0,
          balance:        sBal,
          description:    'Stunde best\u00e4tigt \u2014 ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBLC.utc,
          createdAtLocal: _tsBLC.localIso,
          actorTimezone:  _tsBLC.actorTimezone,
          relatedUid:     teacherId,
          meta:           meta
        };
        txs.unshift(txStuConf);

        var debtMeta = Object.assign({}, meta, { remainderAmount: totalOutstanding, escrowIds: escrowIds });
        var txStuDebt = {
          txId:           _txId(),
          uid:            studentId,
          type:           'remainder_due',
          amount:         -totalOutstanding,
          balance:        sBal,
          description:    'Restbetrag ausstehend \u2014 ' + slots.length + ' Slots am ' + dateLabel + ' (Guthaben unzureichend)',
          status:         'pending',
          createdAt:      _tsBLC.utc,
          createdAtLocal: _tsBLC.localIso,
          actorTimezone:  _tsBLC.actorTimezone,
          relatedUid:     teacherId,
          meta:           debtMeta
        };
        txs.unshift(txStuDebt);
      }

      _saveTxs(txs);
      _cb(callback, null, { anyRemainder: anyRemainder, totalOutstanding: totalOutstanding });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeBlockCancellationRecord — writes ONE set of cancellation TXs for
   * an entire block instead of N individual ones.
   *
   * For full_refund / teacher_cancel:
   *   1 × refund (student+)  +  1 × cancellation (student)
   *   1 × escrow_release (teacher, if teacher_cancel)
   *
   * For forfeit:
   *   1 × escrow_release to teacher  +  1 × cancellation (student)
   *
   * For no_escrow / cash_on_site:
   *   1 × cancellation (student)
   */
  function writeBlockCancellationRecord(slots, escrows, policy, actorRole, callback) {
    try {
      if (!slots || !slots.length) { _cb(callback, null, null); return; }

      var first      = slots[0];
      var last       = slots[slots.length - 1];
      var studentId  = first.studentId;
      var teacherId  = first.teacherId;
      var endTime    = slotEndTime(last.time);
      var _actorId   = (actorRole === 'teacher') ? teacherId : studentId;
      var _tsBCR     = _timestampNow(_actorId);
      var now        = _tsBCR.utc;
      var dateLabel  = (first.slotDate || first.date || '') + ' ' +
                       (first.slotTime || first.time || '') + '–' + endTime;

      var totalRefund  = 0;
      var totalForfeit = 0;
      var totalDep     = 0;
      var escrowIds    = [];

      (escrows || []).forEach(function(e) {
        if (!e) return;
        escrowIds.push(e.escrowId);
        totalDep     += e.depositAmount || 0;
        if (policy && policy.tier === 'full_refund') totalRefund  += e.depositAmount || 0;
        else if (policy && policy.tier === 'forfeit') totalForfeit += e.depositAmount || 0;
        else if (policy && policy.tier === 'teacher_cancel') totalRefund += e.depositAmount || 0;
      });
      totalRefund  = Math.round(totalRefund  * 100) / 100;
      totalForfeit = Math.round(totalForfeit * 100) / 100;
      totalDep     = Math.round(totalDep     * 100) / 100;

      var wallets = _loadWallets();
      var sBal    = wallets[studentId] ? wallets[studentId].balance : 0;
      var tBal    = wallets[teacherId] ? wallets[teacherId].balance : 0;

      var blockMeta = {
        slotIds:          slots.map(function(s) { return s.slotId; }),
        escrowIds:        escrowIds,
        slotDate:         first.slotDate || first.date || null,
        slotTimeStart:    first.slotTime || first.time || null,
        slotTimeEnd:      endTime,
        slotCount:        slots.length,
        teacherId:        teacherId,
        studentId:        studentId,
        fullAmount:       slots.reduce(function(a, s) { return a + (parseFloat(s.price) || 0); }, 0),
        depositAmount:    totalDep,
        cancellationTier: policy ? policy.tier : 'no_escrow',
        cancelledAt:      now,
        paymentMode:      policy ? policy.paymentMode : 'instant',
        noEscrowReason:   policy ? policy.noEscrowReason : null
      };

      var txs = _loadTxs();

      /* Refund TX for student (full_refund / teacher_cancel) */
      if (totalRefund > 0) {
        txs.unshift({
          txId:           _txId(),
          uid:            studentId,
          type:           'refund',
          amount:         totalRefund,
          balance:        sBal,
          description:    'Rückerstattung — ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBCR.utc,
          createdAtLocal: _tsBCR.localIso,
          actorTimezone:  _tsBCR.actorTimezone,
          relatedUid:     teacherId,
          meta:           blockMeta
        });
      }

      /* escrow_release TX for teacher (forfeit or teacher_cancel) */
      if (totalForfeit > 0 || (policy && policy.tier === 'teacher_cancel' && totalRefund > 0)) {
        var tAmount = totalForfeit > 0 ? totalForfeit : 0;
        if (tAmount > 0) {
          txs.unshift({
            txId:           _txId(),
            uid:            teacherId,
            type:           'escrow_release',
            amount:         tAmount,
            balance:        tBal,
            description:    'Deposit einbehalten — ' + slots.length + ' Slots am ' + dateLabel,
            status:         'completed',
            createdAt:      _tsBCR.utc,
            createdAtLocal: _tsBCR.localIso,
            actorTimezone:  _tsBCR.actorTimezone,
            relatedUid:     studentId,
            meta:           blockMeta
          });
        }
      }

      /* teacher_cancel: escrow was refunded to student, write teacher-cancel TX for teacher */
      if (policy && policy.tier === 'teacher_cancel') {
        txs.unshift({
          txId:           _txId(),
          uid:            teacherId,
          type:           'teacher_cancel',
          amount:         0,
          balance:        tBal,
          description:    'Storniert durch Lehrer — ' + slots.length + ' Slots am ' + dateLabel,
          status:         'completed',
          createdAt:      _tsBCR.utc,
          createdAtLocal: _tsBCR.localIso,
          actorTimezone:  _tsBCR.actorTimezone,
          relatedUid:     studentId,
          meta:           blockMeta
        });
      }

      /* Cancellation TX for student (always) */
      txs.unshift({
        txId:           _txId(),
        uid:            studentId,
        type:           'cancellation',
        amount:         0,
        balance:        sBal,
        description:    'Stornierung — ' + slots.length + ' Slots am ' + dateLabel,
        status:         'completed',
        createdAt:      _tsBCR.utc,
        createdAtLocal: _tsBCR.localIso,
        actorTimezone:  _tsBCR.actorTimezone,
        relatedUid:     teacherId,
        meta:           blockMeta
      });

      _saveTxs(txs);
      _cb(callback, null, { totalRefund: totalRefund, totalForfeit: totalForfeit });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  function confirmLesson(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'held') {
        _cb(callback, new Error('Stunde kann nur bestaetigt werden wenn Deposit \"held\" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }

      var depositAmt   = parseFloat(escrow.depositAmount) || 0;
      var fullAmt      = parseFloat(escrow.fullAmount)    || 0;
      var remainderAmt = Math.max(0, Math.round((fullAmt - depositAmt) * 100) / 100);

      var wallets = _loadWallets();
      if (!wallets[escrow.teacherId]) {
        wallets[escrow.teacherId] = { uid: escrow.teacherId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }

      var tw             = wallets[escrow.teacherId];
      var sw             = wallets[escrow.studentId];
      var studentBalance = sw.balance;
      var canPay         = remainderAmt <= 0 || studentBalance >= remainderAmt;
      var meta2          = _buildTxMeta(escrow);
      var slotLabel2     = meta2.slotDate ? (meta2.slotDate + ' ' + (meta2.slotTime || '')) : escrow.slotId;
      var now2           = _isoNow();
      var txs            = _loadTxs();

      if (canPay) {
        /* ── Normal path: student has sufficient funds ── */
        if (remainderAmt > 0) {
          sw.balance   = Math.round((studentBalance - remainderAmt) * 100) / 100;
          sw.updatedAt = now2;
        }
        tw.balance   = Math.round((tw.balance + fullAmt) * 100) / 100;
        tw.updatedAt = now2;
        _saveWallets(wallets);

        var txTch = {
          txId:        _txId(),
          uid:         escrow.teacherId,
          type:        'escrow_release',
          amount:      fullAmt,
          balance:     tw.balance,
          description: 'Zahlung freigegeben \u2014 Stunde am ' + slotLabel2,
          status:      'completed',
          createdAt:   now2,
          relatedUid:  escrow.studentId,
          meta:        meta2
        };
        txs.unshift(txTch);

        var txStu = {
          txId:        _txId(),
          uid:         escrow.studentId,
          type:        'lesson_confirmed',
          amount:      remainderAmt > 0 ? -remainderAmt : 0,
          balance:     sw.balance,
          description: 'Stunde best\u00e4tigt \u2014 am ' + slotLabel2,
          status:      'completed',
          createdAt:   now2,
          relatedUid:  escrow.teacherId,
          meta:        meta2
        };
        txs.unshift(txStu);

        escrow.depositStatus     = 'released';
        escrow.fullPaymentStatus = 'verified';
        escrow.fullPaidAt        = now2;
        escrow.releasedAt        = now2;

      } else {
        /* ── Insufficient funds path ── */
        /* Teacher receives deposit only */
        tw.balance   = Math.round((tw.balance + depositAmt) * 100) / 100;
        tw.updatedAt = now2;
        /* Student balance unchanged — no overdraft */
        _saveWallets(wallets);

        /* Teacher: partial release (deposit only) */
        var txTchPartial = {
          txId:        _txId(),
          uid:         escrow.teacherId,
          type:        'escrow_release',
          amount:      depositAmt,
          balance:     tw.balance,
          description: 'Deposit freigegeben (Restbetrag ausstehend) \u2014 Stunde am ' + slotLabel2,
          status:      'completed',
          createdAt:   now2,
          relatedUid:  escrow.studentId,
          meta:        meta2
        };
        txs.unshift(txTchPartial);

        /* Student: lesson confirmed + remainder_due recorded as pending */
        var txStuConf = {
          txId:        _txId(),
          uid:         escrow.studentId,
          type:        'lesson_confirmed',
          amount:      0,
          balance:     sw.balance,
          description: 'Stunde best\u00e4tigt \u2014 am ' + slotLabel2,
          status:      'completed',
          createdAt:   now2,
          relatedUid:  escrow.teacherId,
          meta:        meta2
        };
        txs.unshift(txStuConf);

        var txStuDebt = {
          txId:        _txId(),
          uid:         escrow.studentId,
          type:        'remainder_due',
          amount:      -remainderAmt,
          balance:     sw.balance,
          description: 'Restbetrag ausstehend \u2014 Stunde am ' + slotLabel2 + ' (Guthaben unzureichend)',
          status:      'pending',
          createdAt:   now2,
          relatedUid:  escrow.teacherId,
          meta:        Object.assign({}, meta2, { remainderAmount: remainderAmt, escrowId: escrow.escrowId })
        };
        txs.unshift(txStuDebt);

        escrow.depositStatus      = 'released';
        escrow.fullPaymentStatus  = 'remainder_pending';
        escrow.remainderAmount    = remainderAmt;
        escrow.remainderDueAt     = now2;
        escrow.releasedAt         = now2;
        /* fullPaidAt stays null until remainder settled */
      }

      /* txs already built above */
      _saveTxs(txs);

      escrow.studentConfirmedAt = now2;
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, canPay: canPay });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* ── Aktionen Teacher ────────────────────────────────── */

  /* releaseDeposit: refund_requested -> refunded. Deposit zurueck an Student. */
  function releaseDeposit(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'refund_requested') {
        _cb(callback, new Error('Freigabe nur moeglich bei Status "refund_requested" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var sw = wallets[escrow.studentId];
      sw.balance   = Math.round((sw.balance + escrow.depositAmount) * 100) / 100;
      sw.updatedAt = _isoNow();
      _saveWallets(wallets);
      var meta3      = _buildTxMeta(escrow, { cancellationTier: escrow._cancellationTier, cancelledAt: _isoNow() });
      var slotLabel3 = meta3.slotDate ? (meta3.slotDate + ' ' + (meta3.slotTime || '')) : escrow.slotId;
      var _tsRD      = _timestampNow(escrow.teacherId);
      var tx = {
        txId:           _txId(),
        uid:            escrow.studentId,
        type:           'refund',
        amount:         escrow.depositAmount,
        balance:        sw.balance,
        description:    'Rückerstattung — Stornierung Stunde am ' + slotLabel3,
        status:         'completed',
        createdAt:      _tsRD.utc,
        createdAtLocal: _tsRD.localIso,
        actorTimezone:  _tsRD.actorTimezone,
        relatedUid:     escrow.teacherId,
        meta:           meta3
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      escrow.depositStatus = 'refunded';
      escrow.releasedAt    = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, transaction: tx });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* forfeitDeposit: refund_requested -> forfeited. Deposit geht an Teacher (Trollschutz). */
  function forfeitDeposit(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'refund_requested') {
        _cb(callback, new Error('Einbehalten nur moeglich bei Status "refund_requested" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.teacherId]) {
        wallets[escrow.teacherId] = { uid: escrow.teacherId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var tw2 = wallets[escrow.teacherId];
      tw2.balance   = Math.round((tw2.balance + escrow.depositAmount) * 100) / 100;
      tw2.updatedAt = _isoNow();
      _saveWallets(wallets);
      var meta4      = _buildTxMeta(escrow, { cancellationTier: escrow._cancellationTier, cancelledAt: _isoNow() });
      var slotLabel4 = meta4.slotDate ? (meta4.slotDate + ' ' + (meta4.slotTime || '')) : escrow.slotId;
      var _tsFD      = _timestampNow(escrow.teacherId);
      var tx = {
        txId:           _txId(),
        uid:            escrow.teacherId,
        type:           'escrow_release',
        amount:         escrow.depositAmount,
        balance:        tw2.balance,
        description:    'Deposit einbehalten — Stornierung Stunde am ' + slotLabel4,
        status:         'completed',
        createdAt:      _tsFD.utc,
        createdAtLocal: _tsFD.localIso,
        actorTimezone:  _tsFD.actorTimezone,
        relatedUid:     escrow.studentId,
        meta:           meta4
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      escrow.depositStatus = 'forfeited';
      escrow.releasedAt    = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, { escrow: escrow, transaction: tx });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* releaseDepositSilent — refunds deposit to student WITHOUT writing a TX.
     Used by cancelBlockWithPolicy which writes one aggregate TX. */
  function releaseDepositSilent(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'refund_requested') {
        _cb(callback, new Error('Silent-Release nur bei refund_requested (aktuell: ' + escrow.depositStatus + ')'), null); return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.studentId]) {
        wallets[escrow.studentId] = { uid: escrow.studentId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      wallets[escrow.studentId].balance   = Math.round((wallets[escrow.studentId].balance + escrow.depositAmount) * 100) / 100;
      wallets[escrow.studentId].updatedAt = _isoNow();
      _saveWallets(wallets);
      escrow.depositStatus = 'refunded';
      escrow.releasedAt    = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, escrow);
    } catch(e) { _cb(callback, e, null); }
  }

  /* forfeitDepositSilent — forfeits deposit to teacher WITHOUT writing a TX. */
  function forfeitDepositSilent(escrowId, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'refund_requested') {
        _cb(callback, new Error('Silent-Forfeit nur bei refund_requested (aktuell: ' + escrow.depositStatus + ')'), null); return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.teacherId]) {
        wallets[escrow.teacherId] = { uid: escrow.teacherId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      wallets[escrow.teacherId].balance   = Math.round((wallets[escrow.teacherId].balance + escrow.depositAmount) * 100) / 100;
      wallets[escrow.teacherId].updatedAt = _isoNow();
      _saveWallets(wallets);
      escrow.depositStatus = 'forfeited';
      escrow.releasedAt    = _isoNow();
      all[idx] = escrow;
      _saveEscrows(all);
      _cb(callback, null, escrow);
    } catch(e) { _cb(callback, e, null); }
  }

  /* getAllEscrows — alle Escrows (nur Admin). */
  function getAllEscrows(callback) {
    try {
      _cb(callback, null, _loadEscrows());
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeBlockBookingRecord — writes ONE 'booking' TX covering an entire block
   * (multiple consecutive slots for the same student/teacher/day).
   * slots: array of slot objects already booked
   * escrows: array of corresponding escrow objects (same order)
   * initiatorRole: 'student' | 'teacher'
   */
  function writeBlockBookingRecord(slots, escrows, initiatorRole, callback) {
    try {
      if (!slots || !slots.length) { _cb(callback, null, null); return; }
      var first      = slots[0];
      var last       = slots[slots.length - 1];
      var studentId  = first.studentId;
      var teacherId  = first.teacherId;
      var _initiatorId = (initiatorRole === 'teacher') ? teacherId : studentId;
      var _tsBBR     = _timestampNow(_initiatorId);
      var now        = _tsBBR.utc;
      var totalFull  = 0;
      var totalDep   = 0;
      var slotIds    = [];
      var escrowIds  = [];

      slots.forEach(function(s) { slotIds.push(s.slotId); totalFull += parseFloat(s.price) || 0; });
      (escrows || []).forEach(function(e) {
        if (e) { escrowIds.push(e.escrowId); totalDep += e.depositAmount || 0; }
      });
      totalFull = Math.round(totalFull * 100) / 100;
      totalDep  = Math.round(totalDep  * 100) / 100;

      var firstEsc = escrows && escrows[0] ? escrows[0] : null;
      var endTime  = slotEndTime(last.time);

      var meta = {
        slotIds:         slotIds,
        escrowIds:       escrowIds,
        slotDate:        first.slotDate || first.date || null,
        slotTimeStart:   first.slotTime || first.time || null,
        slotTimeEnd:     endTime,
        slotCount:       slots.length,
        teacherId:       teacherId,
        studentId:       studentId,
        fullAmount:      totalFull,
        depositAmount:   totalDep,
        depositType:     firstEsc ? (firstEsc.depositType   || null) : null,
        depositPercent:  firstEsc ? (firstEsc.depositPercent != null ? firstEsc.depositPercent : null) : null,
        paymentMode:     firstEsc ? (firstEsc.paymentMode   || 'instant') : 'instant',
        requiresDeposit: firstEsc ? (firstEsc.requiresDeposit !== false) : false,
        bookedAt:        first.bookedAt || now,
        initiatorRole:   initiatorRole || 'student'
      };

      var wallets   = _loadWallets();
      var dateLabel = (meta.slotDate || '') + ' ' + (meta.slotTimeStart || '') + '–' + endTime;
      var modeLabel = meta.paymentMode === 'cash_on_site' ? 'Bar vor Ort' : 'Online';

      var txStu = {
        txId:           _txId(),
        uid:            studentId,
        type:           'booking',
        amount:         0,
        balance:        wallets[studentId] ? wallets[studentId].balance : 0,
        description:    'Buchung — ' + slots.length + ' Slots am ' + dateLabel + ' (' + modeLabel + ')',
        status:         'completed',
        createdAt:      _tsBBR.utc,
        createdAtLocal: _tsBBR.localIso,
        actorTimezone:  _tsBBR.actorTimezone,
        relatedUid:     teacherId,
        meta:           meta
      };
      var txTch = {
        txId:           _txId(),
        uid:            teacherId,
        type:           'booking',
        amount:         0,
        balance:        wallets[teacherId] ? wallets[teacherId].balance : 0,
        description:    'Neue Buchung — ' + slots.length + ' Slots am ' + dateLabel,
        status:         'completed',
        createdAt:      _tsBBR.utc,
        createdAtLocal: _tsBBR.localIso,
        actorTimezone:  _tsBBR.actorTimezone,
        relatedUid:     studentId,
        meta:           meta
      };

      var txs = _loadTxs();
      txs.unshift(txTch);
      txs.unshift(txStu);
      _saveTxs(txs);
      _cb(callback, null, { studentTx: txStu, teacherTx: txTch });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeBlockEscrowHold — writes ONE 'escrow_hold' TX covering a block's total deposit.
   * Replaces the N individual escrow_hold TXs written by payDeposit.
   */
  function writeBlockEscrowHold(slots, escrows, callback) {
    try {
      if (!slots || !slots.length) { _cb(callback, null, null); return; }
      var first     = slots[0];
      var last      = slots[slots.length - 1];
      var studentId = first.studentId;
      var teacherId = first.teacherId;
      var totalDep  = 0;
      var slotIds   = [];
      var escrowIds = [];

      slots.forEach(function(s) { slotIds.push(s.slotId); });
      (escrows || []).forEach(function(e) {
        if (e) { escrowIds.push(e.escrowId); totalDep += e.depositAmount || 0; }
      });
      totalDep = Math.round(totalDep * 100) / 100;

      var firstEsc = escrows && escrows[0] ? escrows[0] : null;
      var _tsBEH   = _timestampNow(studentId);
      var now      = _tsBEH.utc;
      var endTime  = slotEndTime(last.time);
      var dateLabel = (first.slotDate || first.date || '') + ' ' +
                      (first.slotTime || first.time || '') + '–' + endTime;
      var wallets  = _loadWallets();
      var bal      = wallets[studentId] ? wallets[studentId].balance : 0;

      var meta = {
        slotIds:        slotIds,
        escrowIds:      escrowIds,
        slotDate:       first.slotDate || first.date || null,
        slotTimeStart:  first.slotTime || first.time || null,
        slotTimeEnd:    endTime,
        slotCount:      slots.length,
        teacherId:      teacherId,
        studentId:      studentId,
        depositAmount:  totalDep,
        depositType:    firstEsc ? (firstEsc.depositType   || null) : null,
        depositPercent: firstEsc ? (firstEsc.depositPercent != null ? firstEsc.depositPercent : null) : null,
        paymentMode:    firstEsc ? (firstEsc.paymentMode   || 'instant') : 'instant'
      };

      var tx = {
        txId:           _txId(),
        uid:            studentId,
        type:           'escrow_hold',
        amount:         -totalDep,
        balance:        bal,
        description:    'Deposit — ' + slots.length + ' Slots am ' + dateLabel,
        status:         'completed',
        createdAt:      _tsBEH.utc,
        createdAtLocal: _tsBEH.localIso,
        actorTimezone:  _tsBEH.actorTimezone,
        relatedUid:     teacherId,
        meta:           meta
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      _cb(callback, null, tx);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeBookingRecord — writes a 'booking' TX for BOTH student and teacher.
   * Called from bookSlotWithEscrow for ALL payment modes including cash_on_site.
   * escrow may be null if no escrow was created.
   */
  function writeBookingRecord(slotId, studentId, teacherId, escrow, callback) {
    try {
      var slotObj  = Store.Slots.all().filter(function(s) { return s.slotId === slotId; })[0] || {};
      var _tsBR    = _timestampNow(studentId);
      var now      = _tsBR.utc;
      var meta = {
        slotId:          slotId,
        slotDate:        escrow ? (escrow.slotDate  || slotObj.date  || null) : (slotObj.date  || null),
        slotTime:        escrow ? (escrow.slotTime  || slotObj.time  || null) : (slotObj.time  || null),
        teacherId:       teacherId,
        studentId:       studentId,
        fullAmount:      escrow ? (escrow.fullAmount    || 0) : (parseFloat(slotObj.price) || 0),
        depositAmount:   escrow ? (escrow.depositAmount || 0) : 0,
        depositType:     escrow ? (escrow.depositType   || null) : null,
        depositPercent:  escrow ? (escrow.depositPercent != null ? escrow.depositPercent : null) : null,
        paymentMode:     escrow ? (escrow.paymentMode   || 'instant') : 'cash_on_site',
        requiresDeposit: escrow ? (escrow.requiresDeposit !== false) : false,
        bookedAt:        slotObj.bookedAt || now,
        escrowId:        escrow ? (escrow.escrowId || null) : null
      };
      var slotLabel = (meta.slotDate || '') + (meta.slotTime ? ' ' + meta.slotTime : '');
      var wallets   = _loadWallets();
      var txs       = _loadTxs();

      /* Student TX */
      var txStu = {
        txId:           _txId(),
        uid:            studentId,
        type:           'booking',
        amount:         0,
        balance:        wallets[studentId] ? wallets[studentId].balance : 0,
        description:    'Buchung — Stunde am ' + slotLabel + ' (' + (meta.paymentMode === 'cash_on_site' ? 'Bar vor Ort' : 'Online') + ')',
        status:         'completed',
        createdAt:      _tsBR.utc,
        createdAtLocal: _tsBR.localIso,
        actorTimezone:  _tsBR.actorTimezone,
        relatedUid:     teacherId,
        meta:           meta
      };
      /* Teacher TX */
      var txTch = {
        txId:           _txId(),
        uid:            teacherId,
        type:           'booking',
        amount:         0,
        balance:        wallets[teacherId] ? wallets[teacherId].balance : 0,
        description:    'Neue Buchung — Schüler am ' + slotLabel,
        status:         'completed',
        createdAt:      _tsBR.utc,
        createdAtLocal: _tsBR.localIso,
        actorTimezone:  _tsBR.actorTimezone,
        relatedUid:     studentId,
        meta:           meta
      };
      txs.unshift(txTch);
      txs.unshift(txStu);
      _saveTxs(txs);
      _cb(callback, null, { studentTx: txStu, teacherTx: txTch });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeMoveRecord — writes a 'move' TX recording a slot reschedule.
   * oldSlot: the cancelled slot object (has date, time, teacherId, studentId, price)
   * newSlot: the newly booked slot object
   * initiatorId: uid of whoever initiated the move
   * initiatorRole: 'student' | 'teacher'
   */
  function writeMoveRecord(oldSlot, newSlot, initiatorId, initiatorRole, callback, moveOpts) {
    try {
      var _tsMR     = _timestampNow(initiatorId);
      var now       = _tsMR.utc;
      var studentId = oldSlot.studentId || newSlot.studentId;
      var teacherId = oldSlot.teacherId || newSlot.teacherId;
      var price     = parseFloat(oldSlot.price) || parseFloat(newSlot.price) || 0;
      var reason      = (moveOpts && moveOpts.reason)      || '';
      var reasonLabel = (moveOpts && moveOpts.reasonLabel) || '';
      var note        = (moveOpts && moveOpts.note)        || '';
      var meta = {
        slotIdOld:     oldSlot.slotId,
        slotIdNew:     newSlot.slotId,
        oldDate:       oldSlot.date,
        oldTime:       oldSlot.time,
        newDate:       newSlot.date,
        newTime:       newSlot.time,
        teacherId:     teacherId,
        studentId:     studentId,
        price:         price,
        initiatorRole: initiatorRole,
        reason:        reason,
        reasonLabel:   reasonLabel,
        note:          note,
        movedAt:       now
      };
      /* Mark new slot with move metadata including reason */
      Store.Slots.markMoved(newSlot.slotId, oldSlot.date, oldSlot.time);

      /* Persist move to audit log */
      var moveEntry = {
        moveId:       'mv_' + _txId(),
        slotId:       newSlot.slotId,
        oldSlotId:    oldSlot.slotId,
        teacherId:    teacherId,
        studentId:    studentId,
        movedBy:      initiatorId,
        movedByRole:  initiatorRole,
        oldDate:      oldSlot.date,
        oldTime:      oldSlot.time,
        newDate:      newSlot.date,
        newTime:      newSlot.time,
        reason:       reason,
        reasonLabel:  reasonLabel,
        note:         note,
        createdAt:    _tsMR.utc,
        createdAtLocal: _tsMR.localIso,
        actorTimezone:  _tsMR.actorTimezone
      };
      Store.MoveLog.add(moveEntry);

      var wallets = _loadWallets();
      var txs     = _loadTxs();
      var oldLabel = (oldSlot.date || '') + ' ' + (oldSlot.time || '');
      var newLabel = (newSlot.date || '') + ' ' + (newSlot.time || '');

      /* One TX for the initiator; mirror TX for counterpart */
      var txInit = {
        txId:           _txId(),
        uid:            initiatorId,
        type:           'move',
        amount:         0,
        balance:        wallets[initiatorId] ? wallets[initiatorId].balance : 0,
        description:    'Verschiebung ' + oldLabel + ' \u2192 ' + newLabel,
        status:         'completed',
        createdAt:      _tsMR.utc,
        createdAtLocal: _tsMR.localIso,
        actorTimezone:  _tsMR.actorTimezone,
        relatedUid:     initiatorRole === 'student' ? teacherId : studentId,
        meta:           meta
      };
      var counterpartId = (initiatorId === studentId) ? teacherId : studentId;
      var txCounter = {
        txId:           _txId(),
        uid:            counterpartId,
        type:           'move',
        amount:         0,
        balance:        wallets[counterpartId] ? wallets[counterpartId].balance : 0,
        description:    'Buchung verschoben ' + oldLabel + ' \u2192 ' + newLabel,
        status:         'completed',
        createdAt:      _tsMR.utc,
        createdAtLocal: _tsMR.localIso,
        actorTimezone:  _tsMR.actorTimezone,
        relatedUid:     initiatorId,
        meta:           meta
      };
      txs.unshift(txCounter);
      txs.unshift(txInit);
      _saveTxs(txs);
      _cb(callback, null, { initiatorTx: txInit, counterpartTx: txCounter, moveEntry: moveEntry });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * getAllTransactions — admin function: returns ALL transactions with filtering.
   * opts: {
   *   uid        — filter by wallet owner uid
   *   role       — 'student'|'teacher' (filters by uid's role)
   *   types      — array of tx types e.g. ['booking','cancellation']
   *   dateFrom   — ISO string, filter tx.createdAt >= dateFrom
   *   dateTo     — ISO string, filter tx.createdAt <= dateTo
   *   slotDateFrom — filter tx.meta.slotDate >= slotDateFrom
   *   slotDateTo   — filter tx.meta.slotDate <= slotDateTo
   *   teacherId  — filter tx.meta.teacherId
   *   studentId  — filter tx.meta.studentId
   *   counterpartId — filter tx.relatedUid
   *   nameQuery  — free-text search matched against displayNames (resolved externally)
   * }
   */
  function getAllTransactions(opts, callback) {
    try {
      opts = opts || {};
      var all = _loadTxs();
      var result = all.filter(function(tx) {
        if (opts.uid && tx.uid !== opts.uid) return false;
        if (opts.types && opts.types.length && opts.types.indexOf(tx.type) === -1) return false;
        if (opts.dateFrom && tx.createdAt < opts.dateFrom) return false;
        if (opts.dateTo   && tx.createdAt > opts.dateTo)   return false;
        if (opts.teacherId  && tx.meta && tx.meta.teacherId  !== opts.teacherId)  return false;
        if (opts.studentId  && tx.meta && tx.meta.studentId  !== opts.studentId)  return false;
        if (opts.counterpartId && tx.relatedUid !== opts.counterpartId) return false;
        if (opts.slotDateFrom && tx.meta && tx.meta.slotDate && tx.meta.slotDate < opts.slotDateFrom) return false;
        if (opts.slotDateTo   && tx.meta && tx.meta.slotDate && tx.meta.slotDate > opts.slotDateTo)   return false;
        return true;
      });
      _cb(callback, null, result);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * getBookingHistory — returns all booking-related TXs for a user.
   * Types included: booking, move, cancellation, escrow_hold, refund, escrow_release,
   *                 teacher_cancel, lesson_confirmed
   * opts: { dateFrom, dateTo, counterpartId }
   */
  function getBookingHistory(uid, opts, callback) {
    var BOOKING_TYPES = ['booking','move','cancellation','escrow_hold','refund',
                         'escrow_release','teacher_cancel','lesson_confirmed'];
    getAllTransactions({ uid: uid, types: BOOKING_TYPES }, function(err, txs) {
      if (err) return _cb(callback, err, null);
      opts = opts || {};
      var result = txs.filter(function(tx) {
        if (opts.dateFrom && tx.createdAt < opts.dateFrom) return false;
        if (opts.dateTo   && tx.createdAt > opts.dateTo)   return false;
        if (opts.counterpartId && tx.relatedUid !== opts.counterpartId) return false;
        return true;
      });
      _cb(callback, null, result);
    });
  }

  /**
   * writeTeacherCancelRecord — audit TX for the teacher when they cancel a booking.
   * Complements the student refund TX already written by releaseDeposit.
   */
  function writeTeacherCancelRecord(slotId, studentId, teacherId, policy, callback) {
    try {
      var slotObj   = Store.Slots.all().filter(function(s) { return s.slotId === slotId; })[0] || {};
      var _tsTCR    = _timestampNow(teacherId);
      var now       = _tsTCR.utc;
      var slotLabel = (slotObj.date || '') + (slotObj.time ? ' ' + slotObj.time : '');
      var wallets   = _loadWallets();
      var tx = {
        txId:           _txId(),
        uid:            teacherId,
        type:           'teacher_cancel',
        amount:         0,
        balance:        wallets[teacherId] ? wallets[teacherId].balance : 0,
        description:    'Stunde storniert (durch Lehrer) — am ' + slotLabel,
        status:         'completed',
        createdAt:      _tsTCR.utc,
        createdAtLocal: _tsTCR.localIso,
        actorTimezone:  _tsTCR.actorTimezone,
        relatedUid:     studentId,
        meta: {
          slotId:          slotId,
          slotDate:        slotObj.date  || null,
          slotTime:        slotObj.time  || null,
          teacherId:       teacherId,
          studentId:       studentId,
          depositRefunded: policy ? (policy.refundAmount || 0) : 0,
          cancellationTier: 'teacher_cancel',
          cancelledAt:     now
        }
      };
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      _cb(callback, null, tx);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /**
   * writeCancellationRecord — writes a zero-amount TX recording a cancellation
   * even when no deposit was held (cash_on_site, deposit_unpaid, no_escrow).
   * Ensures every cancellation is auditable.
   */
  function writeCancellationRecord(slotId, studentId, teacherId, policy, callback) {
    try {
      var slotObj   = Store.Slots.all().filter(function(s) { return s.slotId === slotId; })[0] || {};
      var slotLabel = (slotObj.date || '') + (slotObj.time ? ' ' + slotObj.time : '');
      var _tsCR     = _timestampNow(studentId);
      var tx = {
        txId:           _txId(),
        uid:            studentId,
        type:           'cancellation',
        amount:         0,
        balance:        null,
        description:    'Stornierung — Stunde am ' + (slotLabel || slotId),
        status:         'completed',
        createdAt:      _tsCR.utc,
        createdAtLocal: _tsCR.localIso,
        actorTimezone:  _tsCR.actorTimezone,
        relatedUid:     teacherId,
        meta: {
          slotId:           slotId,
          slotDate:         slotObj.date  || null,
          slotTime:         slotObj.time  || null,
          teacherId:        teacherId,
          studentId:        studentId,
          fullAmount:       policy ? (policy.depositAmount || 0) : 0,
          depositAmount:    0,
          depositType:      null,
          depositPercent:   null,
          paymentMode:      policy ? (policy.paymentMode || 'instant') : 'instant',
          requiresDeposit:  false,
          cancellationTier: policy ? (policy.tier || 'no_escrow') : 'no_escrow',
          noEscrowReason:   policy ? (policy.noEscrowReason || null) : null,
          cancelledAt:      _tsCR.utc,
          bookedAt:         null
        }
      };
      /* Read current wallet balance for the record */
      var wallets = _loadWallets();
      if (wallets[studentId]) tx.balance = wallets[studentId].balance;
      var txs = _loadTxs();
      txs.unshift(tx);
      _saveTxs(txs);
      _cb(callback, null, tx);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /*
   * adminReleaseEscrow — Admin gibt hinterlegten Deposit frei an Teacher.
   * held → released. Schreibt Deposit ans Teacher-Wallet.
   * Erstellt je eine Transaktion für Teacher (escrow_release) und
   * eine für den Admin-Log (transfer).
   */
  function adminReleaseEscrow(escrowId, adminUid, callback) {
    try {
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      var escrow = all[idx];
      if (escrow.depositStatus !== 'held') {
        _cb(callback, new Error('Freigabe nur möglich wenn Status "held" (aktuell: ' + escrow.depositStatus + ').'), null);
        return;
      }
      var wallets = _loadWallets();
      if (!wallets[escrow.teacherId]) {
        wallets[escrow.teacherId] = { uid: escrow.teacherId, balance: 0, currency: 'EUR', updatedAt: _isoNow() };
      }
      var tw = wallets[escrow.teacherId];
      tw.balance   = Math.round((tw.balance + escrow.depositAmount) * 100) / 100;
      tw.updatedAt = _isoNow();
      _saveWallets(wallets);

      var txs = _loadTxs();
      var _tsARE = _timestampNow(adminUid || escrow.teacherId);
      var now    = _tsARE.utc;

      /* Teacher bekommt Gutschrift */
      txs.unshift({
        txId:           _txId(),
        uid:            escrow.teacherId,
        type:           'escrow_release',
        amount:         escrow.depositAmount,
        balance:        tw.balance,
        description:    'Zahlung freigegeben durch Admin',
        status:         'completed',
        createdAt:      _tsARE.utc,
        createdAtLocal: _tsARE.localIso,
        actorTimezone:  _tsARE.actorTimezone,
        relatedUid:     escrow.studentId,
        adminUid:       adminUid || null
      });

      /* Admin-Log: Transfer vermerkt */
      if (adminUid) {
        txs.unshift({
          txId:           _txId(),
          uid:            adminUid,
          type:           'transfer',
          amount:         escrow.depositAmount,
          balance:        0,
          description:    'Escrow freigegeben: ' + escrow.teacherId + ' \u2190 ' + escrow.studentId,
          status:         'completed',
          createdAt:      _tsARE.utc,
          createdAtLocal: _tsARE.localIso,
          actorTimezone:  _tsARE.actorTimezone,
          relatedUid:     escrow.teacherId
        });
      }
      _saveTxs(txs);

      escrow.depositStatus = 'released';
      escrow.releasedAt    = now;
      escrow.adminReleasedBy = adminUid || null;
      all[idx] = escrow;
      _saveEscrows(all);

      _cb(callback, null, { escrow: escrow });
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* updateNegotiatedAmount — abweichender Preis nach Verhandlung. */
  function updateNegotiatedAmount(escrowId, amount, callback) {
    try {
      var amt = parseFloat(amount);
      if (isNaN(amt) || amt < 0) {
        _cb(callback, new Error('Ungültiger Betrag: ' + amount), null);
        return;
      }
      var all = _loadEscrows();
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].escrowId === escrowId) { idx = i; break; }
      }
      if (idx === -1) { _cb(callback, new Error('Escrow nicht gefunden: ' + escrowId), null); return; }
      all[idx].negotiatedAmount = amt;
      _saveEscrows(all);
      _cb(callback, null, all[idx]);
    } catch(e) {
      _cb(callback, e, null);
    }
  }

  /* ══════════════════════════════════════════════════════
     ÖFFENTLICHE SCHNITTSTELLE
  ══════════════════════════════════════════════════════ */

  return {
    /* Users */
    getUser:                getUser,
    getAllUsers:             getAllUsers,
    getUsersByRole:         getUsersByRole,
    createUser:             createUser,
    updateUser:             updateUser,
    deleteUser:             deleteUser,
    isUsernameAvailable:    isUsernameAvailable,
    generateUsername:       generateUsername,
    getUserByEmailOrUsername: getUserByEmailOrUsername,

    /* Profiles */
    getProfile:             getProfile,
    getProfileOrDefault:    getProfileOrDefault,
    saveProfile:            saveProfile,
    getDisplayName:         getDisplayName,
    getProfilePhoto:        getProfilePhoto,

    /* GuestSettings */
    getGuestCurrency:       getGuestCurrency,
    setGuestCurrency:       setGuestCurrency,

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
    applySlotTimeout:       applySlotTimeout,
    removeSlotTimeout:      removeSlotTimeout,
    bookSlot:               bookSlot,
    cancelSlotBooking:      cancelSlotBooking,
    deleteSlot:             deleteSlot,
    releaseSlot:            releaseSlot,
    confirmSlot:            confirmSlot,

    /* Recurring */
    getRecurringByTeacher:      getRecurringByTeacher,
    recurringExists:            recurringExists,
    recurringExistsByDay:       recurringExistsByDay,
    createRecurring:            createRecurring,
    deleteRecurringByDayTime:   deleteRecurringByDayTime,
    materialiseWeek:            materialiseWeek,
    migrateTimesToUtc:          migrateTimesToUtc,

    /* Selections */
    getSelectionsByStudent: getSelectionsByStudent,
    getSelectionsByTeacher: getSelectionsByTeacher,
    createSelection:        createSelection,
    deleteSelection:        deleteSelection,
    updateSelection:        updateSelection,
    getFavoritesByStudent:  getFavoritesByStudent,
    addFavorite:            addFavorite,
    removeFavorite:         removeFavorite,
    isFavorite:             isFavorite,

    /* Stats */
    getAdminStats:          getAdminStats,
    getUserStats:           getUserStats,

    /* Time helpers */
    slotEndTime:            slotEndTime,
    slotTimesInRange:       slotTimesInRange,

    /* Wallet */
    getWallet:              getWallet,
    getAllWallets:           getAllWallets,
    calcDepositInfo:        calcDepositInfo,
    deposit:                deposit,
    withdraw:               withdraw,
    getTransactions:        getTransactions,
    getAllTransactions:      getAllTransactions,
    getBookingHistory:      getBookingHistory,
    writeBookingRecord:     writeBookingRecord,
    writeBlockBookingRecord: writeBlockBookingRecord,
    writeBlockEscrowHold:   writeBlockEscrowHold,
    writeMoveRecord:        writeMoveRecord,
    writeTeacherCancelRecord: writeTeacherCancelRecord,
    cancelSlotBookingAs:    cancelSlotBookingAs,

    /* Escrow */
    getEscrow:                  getEscrow,
    getEscrowBySlot:            getEscrowBySlot,
    _tagEscrowTier:             _tagEscrowTier,
    getEscrowsByStudent:        getEscrowsByStudent,
    getEscrowsByTeacher:        getEscrowsByTeacher,
    getAllEscrows:               getAllEscrows,
    writeCancellationRecord:    writeCancellationRecord,
    createEscrow:               createEscrow,
    payDeposit:                 payDeposit,
    payDepositSilent:           payDepositSilent,
    requestDepositRefund:       requestDepositRefund,
    confirmLesson:              confirmLesson,
    confirmLessonSilent:        confirmLessonSilent,
    writeBlockLessonConfirmed:  writeBlockLessonConfirmed,
    writeBlockCancellationRecord: writeBlockCancellationRecord,
    releaseDeposit:             releaseDeposit,
    releaseDepositSilent:       releaseDepositSilent,
    forfeitDeposit:             forfeitDeposit,
    forfeitDepositSilent:       forfeitDepositSilent,
    adminReleaseEscrow:         adminReleaseEscrow,
    updateNegotiatedAmount:     updateNegotiatedAmount
  };

}());
