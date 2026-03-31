/**
 * email.js — E-Mail Notification Service
 *
 * Objekte:
 *   EmailService — Zentraler E-Mail-Dienst (Mockup, Mailgun-ready)
 *
 * Architektur:
 *   Browser → /api/send-email (eigener Server) → Mailgun API
 *
 *   Der API-Key wird NIEMALS im Browser gespeichert.
 *   Alle Calls gehen über einen eigenen Backend-Endpunkt.
 *
 * TODO (Mailgun-Integration):
 *   1. Server-Endpunkt POST /api/send-email erstellen
 *   2. Mailgun API-Key + Domain in Server-Umgebungsvariablen setzen
 *   3. EmailService._API_ENDPOINT auf den echten Endpunkt setzen
 *   4. EmailService._MOCK_MODE auf false setzen
 *
 * Abhängigkeiten:
 *   app-service.js (AppService.getUserSync)
 *
 * Regeln:
 *   var only, function(){}, string concatenation, no arrow functions,
 *   no ?. or ??, no template literals, no inline styles
 */

/* ── i18n ─────────────────────────────────────────────────────── */
var EmailI18n = {
  de: {
    /* Subjects */
    subjectNewMessage:        'Neue Nachricht von {senderName}',
    subjectBookingCreated:    'Neue Buchung: {date} um {time}',
    subjectBookingCancelled:  'Buchung storniert: {date} um {time}',
    subjectBookingMoved:      'Buchung verschoben: {date} um {time}',
    subjectRequestReceived:   'Neue Schüleranfrage von {studentName}',
    subjectRequestAccepted:   '{teacherName} hat deine Anfrage angenommen',
    subjectRequestDeclined:   '{teacherName} hat deine Anfrage abgelehnt',
    subjectDisconnected:      '{studentName} hat die Verbindung getrennt',

    /* Body labels */
    labelDate:        'Datum',
    labelTime:        'Uhrzeit',
    labelTeacher:     'Lehrer/in',
    labelStudent:     'Schüler/in',
    labelFrom:        'Von',
    labelMessage:     'Nachricht',
    labelSlots:       'Betroffene Buchungen',
    labelNewDate:     'Neues Datum',
    labelNewTime:     'Neue Uhrzeit',
    labelOldDate:     'Altes Datum',
    labelOldTime:     'Alte Uhrzeit',

    /* Body text */
    bodyNewMessage:       '{senderName} hat dir eine Nachricht geschickt. Bitte melde dich in der App an, um sie zu lesen.',
    bodyBookingCreated:   '{actorName} hat eine Buchung vorgenommen.',
    bodyBookingCancelled: '{actorName} hat eine Buchung storniert.',
    bodyBookingMoved:     '{actorName} hat eine Buchung verschoben.',
    bodyRequestReceived:  '{studentName} möchte dein/e Schüler/in werden. Bitte melde dich in der App an, um die Anfrage zu beantworten.',
    bodyRequestAccepted:  '{teacherName} hat deine Anfrage angenommen. Du kannst jetzt Buchungen vornehmen.',
    bodyRequestDeclined:  '{teacherName} hat deine Anfrage leider abgelehnt.',
    bodyDisconnected:     '{studentName} hat die Verbindung getrennt.',
    bodyDisconnectedSlots:'Folgende Buchungen wurden dabei storniert:',
    bodyNoSlots:          'Keine offenen Buchungen betroffen.',
    bodyFooter:           'Diese E-Mail wurde automatisch vom Buchungssystem gesendet.'
  },
  t: function(key, vars) {
    var str = this.de[key] || key;
    if (vars) {
      for (var k in vars) {
        str = str.split('{' + k + '}').join(vars[k] || '');
      }
    }
    return str;
  }
};

/* ── EmailService ─────────────────────────────────────────────── */
var EmailService = (function() {

  /* ── Config ──────────────────────────────────────────────── */

  // TODO: Auf true setzen sobald der Server-Endpunkt bereit ist
  var _MOCK_MODE = true;

  // TODO: Auf echten Backend-Endpunkt zeigen (z.B. 'https://yourserver.com/api/send-email')
  var _API_ENDPOINT = '/api/send-email';

  var _LOG_KEY = 'app_email_log';
  var _MAX_LOG = 100;

  /* ── Events (alle definierten E-Mail-Typen) ──────────────── */
  var EVENTS = {
    NEW_MESSAGE:        'new_message',
    BOOKING_CREATED:    'booking_created',
    BOOKING_CANCELLED:  'booking_cancelled',
    BOOKING_MOVED:      'booking_moved',
    REQUEST_RECEIVED:   'request_received',
    REQUEST_ACCEPTED:   'request_accepted',
    REQUEST_DECLINED:   'request_declined',
    DISCONNECTED:       'disconnected'
  };

  /* ── Private helpers ─────────────────────────────────────── */

  /* _uuid() and _now() provided by store.js as window._uuid / window._now */

  function _loadLog() {
    try {
      var raw = localStorage.getItem(_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }

  function _saveLog(entries) {
    try {
      if (entries.length > _MAX_LOG) entries = entries.slice(entries.length - _MAX_LOG);
      localStorage.setItem(_LOG_KEY, JSON.stringify(entries));
    } catch(e) {}
  }

  function _logEntry(payload, status, error) {
    var log = _loadLog();
    log.push({
      id:        _uuid(),
      timestamp: _now(),
      to:        payload.to,
      subject:   payload.subject,
      event:     payload.event,
      status:    status,
      error:     error || null
    });
    _saveLog(log);
  }

  /* ── Build plain-text body ───────────────────────────────── */

  function _buildBody(event, data) {
    var lines = [];

    if (event === EVENTS.NEW_MESSAGE) {
      lines.push(EmailI18n.t('bodyNewMessage', { senderName: data.senderName }));
      lines.push('');
      lines.push(EmailI18n.t('labelFrom') + ': ' + (data.senderName || ''));
      if (data.preview) lines.push(EmailI18n.t('labelMessage') + ': ' + data.preview);
    }

    if (event === EVENTS.BOOKING_CREATED) {
      lines.push(EmailI18n.t('bodyBookingCreated', { actorName: data.actorName }));
      lines.push('');
      lines.push(EmailI18n.t('labelDate')    + ': ' + (data.date    || ''));
      lines.push(EmailI18n.t('labelTime')    + ': ' + (data.time    || '') + ' – ' + (data.endTime || ''));
      lines.push(EmailI18n.t('labelTeacher') + ': ' + (data.teacherName || ''));
      lines.push(EmailI18n.t('labelStudent') + ': ' + (data.studentName || ''));
    }

    if (event === EVENTS.BOOKING_CANCELLED) {
      lines.push(EmailI18n.t('bodyBookingCancelled', { actorName: data.actorName }));
      lines.push('');
      lines.push(EmailI18n.t('labelDate')    + ': ' + (data.date    || ''));
      lines.push(EmailI18n.t('labelTime')    + ': ' + (data.time    || '') + ' – ' + (data.endTime || ''));
      lines.push(EmailI18n.t('labelTeacher') + ': ' + (data.teacherName || ''));
      lines.push(EmailI18n.t('labelStudent') + ': ' + (data.studentName || ''));
    }

    if (event === EVENTS.BOOKING_MOVED) {
      lines.push(EmailI18n.t('bodyBookingMoved', { actorName: data.actorName }));
      lines.push('');
      lines.push(EmailI18n.t('labelOldDate') + ': ' + (data.oldDate || ''));
      lines.push(EmailI18n.t('labelOldTime') + ': ' + (data.oldTime || '') + ' – ' + (data.oldEndTime || ''));
      lines.push(EmailI18n.t('labelNewDate') + ': ' + (data.newDate || ''));
      lines.push(EmailI18n.t('labelNewTime') + ': ' + (data.newTime || '') + ' – ' + (data.newEndTime || ''));
      lines.push(EmailI18n.t('labelTeacher') + ': ' + (data.teacherName || ''));
      lines.push(EmailI18n.t('labelStudent') + ': ' + (data.studentName || ''));
    }

    if (event === EVENTS.REQUEST_RECEIVED) {
      lines.push(EmailI18n.t('bodyRequestReceived', { studentName: data.studentName }));
      lines.push('');
      lines.push(EmailI18n.t('labelStudent') + ': ' + (data.studentName || ''));
    }

    if (event === EVENTS.REQUEST_ACCEPTED) {
      lines.push(EmailI18n.t('bodyRequestAccepted', { teacherName: data.teacherName }));
      lines.push('');
      lines.push(EmailI18n.t('labelTeacher') + ': ' + (data.teacherName || ''));
    }

    if (event === EVENTS.REQUEST_DECLINED) {
      lines.push(EmailI18n.t('bodyRequestDeclined', { teacherName: data.teacherName }));
      lines.push('');
      lines.push(EmailI18n.t('labelTeacher') + ': ' + (data.teacherName || ''));
    }

    if (event === EVENTS.DISCONNECTED) {
      lines.push(EmailI18n.t('bodyDisconnected', { studentName: data.studentName }));
      lines.push('');
      if (data.cancelledSlots && data.cancelledSlots.length) {
        lines.push(EmailI18n.t('bodyDisconnectedSlots'));
        for (var i = 0; i < data.cancelledSlots.length; i++) {
          var s = data.cancelledSlots[i];
          lines.push('  · ' + (s.dateLabel || '') + '  ' + (s.time || '') + ' – ' + (s.endTime || ''));
        }
      } else {
        lines.push(EmailI18n.t('bodyNoSlots'));
      }
    }

    lines.push('');
    lines.push('──────────────────────────');
    lines.push(EmailI18n.t('bodyFooter'));

    return lines.join('\n');
  }

  /* ── Build subject ───────────────────────────────────────── */

  function _buildSubject(event, data) {
    if (event === EVENTS.NEW_MESSAGE)       return EmailI18n.t('subjectNewMessage',       { senderName:   data.senderName   || '' });
    if (event === EVENTS.BOOKING_CREATED)   return EmailI18n.t('subjectBookingCreated',   { date: data.date || '', time: data.time || '' });
    if (event === EVENTS.BOOKING_CANCELLED) return EmailI18n.t('subjectBookingCancelled', { date: data.date || '', time: data.time || '' });
    if (event === EVENTS.BOOKING_MOVED)     return EmailI18n.t('subjectBookingMoved',     { date: data.newDate || '', time: data.newTime || '' });
    if (event === EVENTS.REQUEST_RECEIVED)  return EmailI18n.t('subjectRequestReceived',  { studentName:  data.studentName  || '' });
    if (event === EVENTS.REQUEST_ACCEPTED)  return EmailI18n.t('subjectRequestAccepted',  { teacherName:  data.teacherName  || '' });
    if (event === EVENTS.REQUEST_DECLINED)  return EmailI18n.t('subjectRequestDeclined',  { teacherName:  data.teacherName  || '' });
    if (event === EVENTS.DISCONNECTED)      return EmailI18n.t('subjectDisconnected',      { studentName:  data.studentName  || '' });
    return 'Benachrichtigung vom Buchungssystem';
  }

  /* ── Core send ───────────────────────────────────────────── */

  function send(opts) {
    /*
     * opts = {
     *   toUid:   string   — UID des Empfängers (wird zu E-Mail aufgelöst via AppService)
     *   event:   string   — einer der EVENTS-Werte
     *   data:    object   — event-spezifische Daten (Namen, Daten, Zeiten etc.)
     * }
     */
    try {
      /* Resolve recipient via AppService — never access Store directly */
      var recipient = (typeof AppService !== 'undefined') ? AppService.getUserSync(opts.toUid) : null;
      if (!recipient) {
        _debugEmailLog('send: recipient not found for uid ' + opts.toUid);
        return;
      }
      if (!recipient.email) {
        /* In mock mode: log what WOULD have been sent even without an address */
        if (_MOCK_MODE) {
          var _subjectPreview = _buildSubject(opts.event, opts.data || {});
          _logEntry({ to: '[no email — ' + (recipient.name || opts.toUid) + ']', subject: _subjectPreview, event: opts.event }, 'skipped_no_email', null);
          _debugEmailLog('send: no email for user ' + opts.toUid + ' (' + ProfileStore.getDisplayName(opts.toUid) + ') — logged as skipped');
        } else {
          _debugEmailLog('send: no email for user ' + opts.toUid);
        }
        return;
      }

      var subject = _buildSubject(opts.event, opts.data || {});
      var body    = _buildBody(opts.event, opts.data || {});

      var payload = {
        to:      recipient.email,
        toName:  ProfileStore.getDisplayName(opts.toUid),
        subject: subject,
        text:    body,
        event:   opts.event,
        sentAt:  _now()
      };

      if (_MOCK_MODE) {
        _mockSend(payload);
      } else {
        _realSend(payload);
      }

    } catch(e) {
      _debugEmailLog('send error: ' + e.message);
    }
  }

  /* ── Mock send ───────────────────────────────────────────── */

  function _mockSend(payload) {
    console.log('[EmailService MOCK] To: ' + payload.to + ' | Subject: ' + payload.subject);
    console.log('[EmailService MOCK] Body:\n' + payload.text);
    _logEntry(payload, 'mock');
  }

  /* ── Real send (Mailgun via Backend) ─────────────────────── */

  function _realSend(payload) {
    /*
     * TODO: Mailgun-Integration
     *
     * Server-Endpunkt erwartet POST mit JSON:
     * {
     *   to:      'recipient@example.com',
     *   toName:  'Max Mustermann',
     *   subject: 'Betreff',
     *   text:    'Plain-text body'
     * }
     *
     * Server macht dann:
     *   POST https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages
     *   Authorization: Basic base64(api:{MAILGUN_API_KEY})
     *   from: 'Buchungssystem <noreply@{MAILGUN_DOMAIN}>'
     *   to, subject, text
     */
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', _API_ENDPOINT, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          _logEntry(payload, 'sent');
          _debugEmailLog('sent OK to ' + payload.to);
        } else {
          _logEntry(payload, 'error', 'HTTP ' + xhr.status);
          _debugEmailLog('send failed: HTTP ' + xhr.status + ' for ' + payload.to);
        }
      };
      xhr.onerror = function() {
        _logEntry(payload, 'error', 'network error');
        _debugEmailLog('send network error for ' + payload.to);
      };
      xhr.send(JSON.stringify(payload));
    } catch(e) {
      _logEntry(payload, 'error', e.message);
      _debugEmailLog('_realSend error: ' + e.message);
    }
  }

  /* ── Convenience methods ─────────────────────────────────── */

  function onNewMessage(toUid, senderName, previewText) {
    send({
      toUid: toUid,
      event: EVENTS.NEW_MESSAGE,
      data:  { senderName: senderName, preview: previewText }
    });
  }

  function onBookingCreated(toUid, data) {
    /*
     * data = { actorName, date, time, endTime, teacherName, studentName }
     */
    send({ toUid: toUid, event: EVENTS.BOOKING_CREATED, data: data });
  }

  function onBookingCancelled(toUid, data) {
    /*
     * data = { actorName, date, time, endTime, teacherName, studentName }
     */
    send({ toUid: toUid, event: EVENTS.BOOKING_CANCELLED, data: data });
  }

  function onBookingMoved(toUid, data) {
    /*
     * data = { actorName, oldDate, oldTime, oldEndTime, newDate, newTime, newEndTime, teacherName, studentName }
     */
    send({ toUid: toUid, event: EVENTS.BOOKING_MOVED, data: data });
  }

  function onRequestReceived(teacherUid, studentName) {
    send({
      toUid: teacherUid,
      event: EVENTS.REQUEST_RECEIVED,
      data:  { studentName: studentName }
    });
  }

  function onRequestAccepted(studentUid, teacherName) {
    send({
      toUid: studentUid,
      event: EVENTS.REQUEST_ACCEPTED,
      data:  { teacherName: teacherName }
    });
  }

  function onRequestDeclined(studentUid, teacherName) {
    send({
      toUid: studentUid,
      event: EVENTS.REQUEST_DECLINED,
      data:  { teacherName: teacherName }
    });
  }

  function onDisconnected(teacherUid, studentName, cancelledSlots) {
    send({
      toUid: teacherUid,
      event: EVENTS.DISCONNECTED,
      data:  { studentName: studentName, cancelledSlots: cancelledSlots || [] }
    });
  }

  /* ── Log access ──────────────────────────────────────────── */

  function getLog() {
    return _loadLog();
  }

  function clearLog() {
    localStorage.removeItem(_LOG_KEY);
  }

  /* ── Debug ───────────────────────────────────────────────── */

  function _debugEmailLog(msg) {
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[EmailService] ' + msg);
      }
    } catch(e) {}
  }

  /* ── Public API ──────────────────────────────────────────── */

  return {
    EVENTS:             EVENTS,
    send:               send,
    onNewMessage:       onNewMessage,
    onBookingCreated:   onBookingCreated,
    onBookingCancelled: onBookingCancelled,
    onBookingMoved:     onBookingMoved,
    onRequestReceived:  onRequestReceived,
    onRequestAccepted:  onRequestAccepted,
    onRequestDeclined:  onRequestDeclined,
    onDisconnected:     onDisconnected,
    getLog:             getLog,
    clearLog:           clearLog
  };

})();
