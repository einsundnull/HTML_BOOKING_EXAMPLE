/* ═══════════════════════════════════════════════════════════════════════════
   TimezoneService — UTC-based timezone conversion
   Option B: slot.time is always stored as UTC "HH:MM"
   Display layer converts UTC ↔ user-local using IANA timezone strings.

   Loaded on ALL pages — add after app-config.js in every HTML file.

   Firebase note: timezone strings ("Europe/Berlin") are always field VALUES
   never document IDs or map keys. Use toStorageKey() if a key is ever needed.
═══════════════════════════════════════════════════════════════════════════ */

var TimezoneService = (function() {

  /* ── Internal: get UTC offset in minutes for an IANA TZ on a given date ─ */
  function _getOffsetMinutes(ianaTimezone, dateStr) {
    /* Uses Date + toLocaleString trick — no external library needed */
    var base = (dateStr || '2026-01-01') + 'T12:00:00';
    try {
      var d   = new Date(base);
      var utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
      var loc = new Date(d.toLocaleString('en-US', { timeZone: ianaTimezone }));
      return (loc - utc) / 60000; /* minutes, positive = east of UTC */
    } catch (e) {
      return 0; /* fallback: treat as UTC */
    }
  }

  /* ── Internal: parse "HH:MM" → total minutes since midnight ─────────── */
  function _toMinutes(timeStr) {
    var parts = (timeStr || '00:00').split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  /* ── Internal: total minutes → "HH:MM" ──────────────────────────────── */
  function _fromMinutes(totalMin) {
    /* Clamp to 0–1439 */
    totalMin = ((totalMin % 1440) + 1440) % 1440;
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ── getUserTimezone ─────────────────────────────────────────────────── */
  /* Returns IANA timezone string for a uid.
     Falls back to browser timezone if profile has no timezone set.
     uid may be null — returns browser TZ. */
  function getUserTimezone(uid) {
    if (uid && typeof ProfileStore !== 'undefined') {
      var profile = ProfileStore.get(uid);
      if (profile && profile.timezone) return profile.timezone;
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  }

  /* ── localToUtc ──────────────────────────────────────────────────────── */
  /* Convert a local "HH:MM" in ianaTimezone to UTC "HH:MM".
     dateStr is needed for DST-correct offset.
     Returns { utcTime: "HH:MM", dateOffset: -1|0|+1 }
     dateOffset = day shift in UTC relative to local date. */
  function localToUtc(timeStr, dateStr, ianaTimezone) {
    var tz      = ianaTimezone || getUserTimezone(null);
    var offset  = _getOffsetMinutes(tz, dateStr); /* local = UTC + offset */
    var localMin = _toMinutes(timeStr);
    var utcMin   = localMin - offset;
    var dateOffset = 0;
    if (utcMin < 0)    { utcMin += 1440; dateOffset = -1; }
    if (utcMin >= 1440){ utcMin -= 1440; dateOffset = +1; }
    return { utcTime: _fromMinutes(utcMin), dateOffset: dateOffset };
  }

  /* ── utcToLocal ──────────────────────────────────────────────────────── */
  /* Convert a UTC "HH:MM" to local display time in ianaTimezone.
     Returns { localTime: "HH:MM", dateOffset: -1|0|+1, offsetLabel: "UTC+2" } */
  function utcToLocal(utcTimeStr, dateStr, ianaTimezone) {
    var tz      = ianaTimezone || getUserTimezone(null);
    var offset  = _getOffsetMinutes(tz, dateStr);
    var utcMin  = _toMinutes(utcTimeStr);
    var locMin  = utcMin + offset;
    var dateOffset = 0;
    if (locMin < 0)    { locMin += 1440; dateOffset = -1; }
    if (locMin >= 1440){ locMin -= 1440; dateOffset = +1; }
    return {
      localTime:   _fromMinutes(locMin),
      dateOffset:  dateOffset,
      offsetLabel: formatOffset(tz, dateStr)
    };
  }

  /* ── formatOffset ────────────────────────────────────────────────────── */
  /* Returns "UTC+2", "UTC-5:30", "UTC+0" */
  function formatOffset(ianaTimezone, dateStr) {
    var offset = _getOffsetMinutes(ianaTimezone || 'UTC', dateStr);
    if (offset === 0) return 'UTC+0';
    var sign  = offset > 0 ? '+' : '-';
    var abs   = Math.abs(offset);
    var hours = Math.floor(abs / 60);
    var mins  = abs % 60;
    return 'UTC' + sign + hours + (mins ? ':' + (mins < 10 ? '0' : '') + mins : '');
  }

  /* ── displayTime ─────────────────────────────────────────────────────── */
  /* All-in-one: given a UTC "HH:MM", viewer's uid, and the slot date,
     returns { text: "09:00", offsetLabel: "UTC+2", dateOffset: 0, changed: bool }
     If viewerUid is null, uses browser TZ.
     If no conversion needed (same TZ), changed = false. */
  function displayTime(utcTimeStr, dateStr, viewerUid) {
    var tz     = getUserTimezone(viewerUid);
    var result = utcToLocal(utcTimeStr, dateStr, tz);
    return {
      text:        result.localTime,
      offsetLabel: result.offsetLabel,
      dateOffset:  result.dateOffset,
      changed:     result.localTime !== utcTimeStr,
      timezone:    tz
    };
  }

  /* ── toStorageKey ────────────────────────────────────────────────────── */
  /* Firebase-safe key from IANA timezone string. Lossless roundtrip.
     Encoding:
       native _  → __   (escape first, before / replacement)
       /         → _    (single underscore)
       +         → p
       -         → m    (only used in offset labels, not in IANA strings)
       :         → c    (only used in offset labels, not in IANA strings)
     Examples:
       "Europe/Berlin"            → "Europe_Berlin"
       "America/New_York"         → "America_New__York"
       "America/Argentina/Buenos_Aires" → "America_Argentina_Buenos__Aires"
     Not needed currently (timezone stored as value, not as key).
     Included for future Firestore use. */
  function toStorageKey(ianaTimezone) {
    return (ianaTimezone || 'UTC')
      .replace(/_/g,  '__')  /* 1. escape native underscores */
      .replace(/\//g, '_')   /* 2. slash → single underscore */
      .replace(/\+/g, 'p')
      .replace(/-/g,  'm')
      .replace(/:/g,  'c');
  }

  /* ── fromStorageKey ──────────────────────────────────────────────────── */
  /* Exact inverse of toStorageKey(). */
  function fromStorageKey(key) {
    return (key || 'UTC')
      .replace(/p(\d)/g, '+$1')              /* p5   → +5  */
      .replace(/(^|[^A-Za-z])m(\d)/g, '$1-$2') /* m5 → -5  */
      .replace(/c(\d)/g, ':$1')              /* c30  → :30 */
      .replace(/(?<!_)_(?!_)/g, '/')         /* single _ → / */
      .replace(/__/g, '_');                  /* double __ → native _ */
  }

  /* ── IANA timezone list — curated ~60 most common ───────────────────── */
  /* Used for profile timezone picker dropdown */
  var TIMEZONES = [
    /* UTC */
    ['UTC',                    'UTC+0  — UTC'],
    /* Europe */
    ['Europe/London',          'UTC+0  — London'],
    ['Europe/Berlin',          'UTC+1  — Berlin, Wien, Zürich'],
    ['Europe/Paris',           'UTC+1  — Paris'],
    ['Europe/Rome',            'UTC+1  — Rom, Mailand'],
    ['Europe/Madrid',          'UTC+1  — Madrid'],
    ['Europe/Warsaw',          'UTC+1  — Warschau'],
    ['Europe/Prague',          'UTC+1  — Prag, Budapest'],
    ['Europe/Stockholm',       'UTC+1  — Stockholm'],
    ['Europe/Helsinki',        'UTC+2  — Helsinki, Tallinn'],
    ['Europe/Kyiv',            'UTC+2  — Kiew'],
    ['Europe/Bucharest',       'UTC+2  — Bukarest'],
    ['Europe/Athens',          'UTC+2  — Athen'],
    ['Europe/Moscow',          'UTC+3  — Moskau'],
    ['Europe/Istanbul',        'UTC+3  — Istanbul'],
    /* Americas */
    ['America/New_York',       'UTC-5  — New York, Toronto'],
    ['America/Chicago',        'UTC-6  — Chicago, Dallas'],
    ['America/Denver',         'UTC-7  — Denver, Phoenix'],
    ['America/Los_Angeles',    'UTC-8  — Los Angeles, Vancouver'],
    ['America/Anchorage',      'UTC-9  — Anchorage'],
    ['Pacific/Honolulu',       'UTC-10 — Honolulu'],
    ['America/Sao_Paulo',      'UTC-3  — São Paulo'],
    ['America/Argentina/Buenos_Aires', 'UTC-3  — Buenos Aires'],
    ['America/Bogota',         'UTC-5  — Bogotá'],
    ['America/Mexico_City',    'UTC-6  — Mexico City'],
    /* Asia */
    ['Asia/Dubai',             'UTC+4  — Dubai'],
    ['Asia/Karachi',           'UTC+5  — Karachi'],
    ['Asia/Kolkata',           'UTC+5:30 — Mumbai, Delhi'],
    ['Asia/Dhaka',             'UTC+6  — Dhaka'],
    ['Asia/Bangkok',           'UTC+7  — Bangkok, Jakarta'],
    ['Asia/Singapore',         'UTC+8  — Singapur, KL'],
    ['Asia/Shanghai',          'UTC+8  — Shanghai, Peking'],
    ['Asia/Tokyo',             'UTC+9  — Tokio'],
    ['Asia/Seoul',             'UTC+9  — Seoul'],
    ['Asia/Tbilisi',           'UTC+4  — Tiflis'],
    ['Asia/Almaty',            'UTC+5  — Almaty'],
    ['Asia/Tashkent',          'UTC+5  — Taschkent'],
    ['Asia/Yerevan',           'UTC+4  — Eriwan'],
    ['Asia/Baku',              'UTC+4  — Baku'],
    /* Africa */
    ['Africa/Cairo',           'UTC+2  — Kairo'],
    ['Africa/Johannesburg',    'UTC+2  — Johannesburg'],
    ['Africa/Lagos',           'UTC+1  — Lagos'],
    ['Africa/Nairobi',         'UTC+3  — Nairobi'],
    /* Pacific / Australia */
    ['Australia/Sydney',       'UTC+10 — Sydney, Melbourne'],
    ['Australia/Perth',        'UTC+8  — Perth'],
    ['Pacific/Auckland',       'UTC+12 — Auckland'],
  ];

  return {
    getUserTimezone:   getUserTimezone,
    getOffsetMinutes:  _getOffsetMinutes,   /* exposed for grid ordering */
    localToUtc:        localToUtc,
    utcToLocal:        utcToLocal,
    formatOffset:      formatOffset,
    displayTime:       displayTime,
    toStorageKey:      toStorageKey,
    fromStorageKey:    fromStorageKey,
    TIMEZONES:         TIMEZONES
  };

})();
