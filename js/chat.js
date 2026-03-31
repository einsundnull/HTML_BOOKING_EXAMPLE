/**
 * chat.js — Chat Panel
 *
 * Objekte:
 *   ChatI18n   — Übersetzungen (Namespace: chat, Deutsch Standard)
 *   ChatStore  — Nachrichten via localStorage (app_chat_messages)
 *   ChatPanel  — Haupt-Objekt: open/close/render/send/delete/edit
 *
 * Regeln:
 *   var only, function(){}, string concatenation, no arrow functions,
 *   no ?. or ??, no template literals, no inline styles
 *
 * Abhängigkeiten (müssen vorher geladen sein):
 *   store.js, auth.js, ui.js
 */

/* ── i18n ─────────────────────────────────────────────── */
var ChatI18n = {
  de: {
    title:             'Nachrichten',
    back:              'Zurück',
    inputPlaceholder:  'Nachricht eingeben...',
    send:              'Senden',
    attach:            'Datei anhängen',
    voice:             'Sprachnachricht',
    lastSeen:          'Zuletzt aktiv',
    today:             'Heute',
    yesterday:         'Gestern',
    edited:            'bearbeitet',
    statusSent:        'Gesendet',
    statusDelivered:   'Empfangen',
    statusRead:        'Gelesen',
    msgDelete:         'Löschen',
    msgEdit:           'Bearbeiten',
    deleteTitle:       'Nachricht löschen',
    deleteBody:        'Diese Nachricht wird unwiderruflich gelöscht.',
    deleteConfirm:     'Löschen',
    deleteCancel:      'Abbrechen',
    bookingProposal:   'Terminvorschlag',
    bookingAccept:     'Annehmen',
    bookingDecline:    'Ablehnen',
    bookingAccepted:   'Angenommen ✓',
    bookingDeclined:   'Abgelehnt',
    noMessages:        'Noch keine Nachrichten',
    noMessagesSub:     'Schreib die erste Nachricht.',
    noChats:           'Keine Gespräche',
    noChatsSub:        'Du hast noch keine Kontakte.',
    editMode:          'Nachricht bearbeiten',
    editCancel:        'Abbrechen',
    errorNoText:       'Bitte eine Nachricht eingeben.',
    errorSend:         'Nachricht konnte nicht gesendet werden.',
    ctxClose:          'Schließen',
    serviceStudentRequest:  'möchte dein Schüler werden.',
    serviceRequestSent:     'Deine Anfrage wurde gesendet. Warte auf Bestätigung.',
    serviceAccepted:        'Du hast {name} als Schüler angenommen.',
    serviceAcceptedStudent: '{name} hat deine Anfrage angenommen.',
    serviceDeclined:        'Du hast die Anfrage von {name} abgelehnt.',
    serviceDeclinedStudent: '{name} hat deine Anfrage abgelehnt.',
    bookingRequestLabel:    'Buchungsanfrage',
    bookingRequestText:     'möchte eine Stunde bei dir einplanen.',
    bookingRequestApprove:  'Genehmigen',
    bookingRequestDecline:  'Ablehnen',
    bookingRequestApproved: 'Buchung genehmigt.',
    bookingRequestDeclined: 'Buchung abgelehnt.',
    bookingRequestPending:  'Warte auf Genehmigung des Schülers...',
    serviceAcceptBtn:       'Annehmen',
    serviceDeclineBtn:      'Ablehnen',
    serviceRequestLabel:    'Schüleranfrage',
    inputLockedPending:     'Warte auf Antwort des Lehrers...',
    inputLockedDeclined:    'Anfrage wurde abgelehnt.',
    serviceDisconnectLabel: 'Verbindung getrennt',
    serviceDisconnected:    '{name} hat die Verbindung getrennt.',
    serviceDisconnectedSlots: 'Folgende Buchungen wurden storniert:',
    serviceDisconnectedNone: 'Keine offenen Buchungen betroffen.',
    serviceDisconnectedTeacher: 'Du hast {name} entfernt.',
    serviceDisconnectedTeacherSlots: 'Folgende Buchungen wurden storniert:',

    /* Booking Notification */
    bookingNotifLabel:          'Neue Buchung',
    bookingNotifByStudent:      '{student} hat bei {teacher} gebucht',
    bookingNotifByTeacher:      '{teacher} hat für {student} gebucht',
    bookingNotifSlots:          'Slots',
    bookingNotifTotal:          'Gesamt',
    bookingNotifDetailsBtn:     'Details',
    bookingNotifWalletBtn:      'Im Wallet anzeigen',
    bookingNotifOverlayTitle:   'Buchungsdetails',
    bookingNotifClose:          'Schließen',
    bookingNotifTeacher:        'Lehrer',
    bookingNotifStudent:        'Schüler',
    bookingNotifPrice:          'Preis / Slot',
    bookingNotifBlockTotal:     'Gesamt',
    bookingNotifPreview:        '📅 Neue Buchung',

    /* Booking Notification overlay actions */
    bookingNotifContactBtn:     'kontaktieren',
    bookingNotifDetailBtn:      'Vollständige Details',

    /* TX Inquiry */
    txInquiryLabel:             'Zahlungsanfrage',
    txInquirySlot:              'Stunde',
    txInquiryAmount:            'Betrag',
    txInquiryDeposit:           'Deposit',
    txInquiryTier:              'Bedingung',
    txInquiryFrom:              'Nachricht von',
    txInquirySentBy:            'Gesendet von',
    txInquiryTypeBooking:       'Buchung',
    txInquiryTypeEscrowHold:    'Treuhand — Reserviert',
    txInquiryTypeRefund:        'Rückerstattung',
    txInquiryTypeCancellation:  'Stornierung',
    txInquiryTypeEscrowRelease: 'Treuhand — Freigegeben',
    txInquiryTypeLessonConfirmed: 'Stunde bestätigt',
    txInquiryTypeMove:          'Verschiebung',
    txInquiryTypeTeacherCancel: 'Lehrer-Stornierung',

    /* Move Notification */
    moveNotifLabel:         'Termin verschoben',
    moveNotifByStudent:     '{student} hat den Termin verschoben',
    moveNotifByTeacher:     '{teacher} hat den Termin verschoben',
    moveNotifFrom:          'Von',
    moveNotifTo:            'Nach',
    moveNotifReason:        'Grund',
    moveNotifNote:          'Hinweis',
    moveNotifPreview:       '\ud83d\udcc6 Termin verschoben'
  },
  t: function(key) {
    return this.de[key] || key;
  }
};

/* ── ChatStore ────────────────────────────────────────── */
var ChatStore = (function() {

  var KEY = 'app_chat_messages';

  function _load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || []) : [];
    } catch(e) {
      _debugLog('ChatStore._load error: ' + e.message);
      return [];
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch(e) {
      _debugLog('ChatStore._save error: ' + e.message);
    }
  }

  /* _uuid() and _now() provided by store.js as window._uuid / window._now */

  function _conversationKey(uidA, uidB) {
    var arr = [uidA, uidB].sort();
    return arr[0] + '_' + arr[1];
  }

  function getConversation(uidA, uidB) {
    var key  = _conversationKey(uidA, uidB);
    var all  = _load();
    var msgs = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].conversationKey === key) msgs.push(all[i]);
    }
    msgs.sort(function(a, b) { return a.createdAt.localeCompare(b.createdAt); });
    return msgs;
  }

  function getLastMessage(uidA, uidB) {
    var msgs = getConversation(uidA, uidB);
    return msgs.length ? msgs[msgs.length - 1] : null;
  }

  function countUnread(currentUid, partnerUid) {
    var msgs = getConversation(currentUid, partnerUid);
    var n = 0;
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m.senderId !== currentUid && m.readStatus !== 'read') n++;
    }
    return n;
  }

  function totalUnread(currentUid) {
    var all = _load();
    var seen = {};
    var n = 0;
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      if (m.senderId !== currentUid && m.readStatus !== 'read') {
        if (!seen[m.conversationKey]) seen[m.conversationKey] = 0;
        seen[m.conversationKey]++;
        n++;
      }
    }
    return n;
  }

  function send(senderId, receiverId, text, type) {
    type = type || 'text';
    var all = _load();
    var msg = {
      msgId:           _uuid(),
      conversationKey: _conversationKey(senderId, receiverId),
      senderId:        senderId,
      receiverId:      receiverId,
      text:            text,
      type:            type,
      readStatus:      'sent',
      edited:          false,
      deleted:         false,
      createdAt:       _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function sendBookingProposal(senderId, receiverId, bookingData) {
    var all = _load();
    var msg = {
      msgId:           _uuid(),
      conversationKey: _conversationKey(senderId, receiverId),
      senderId:        senderId,
      receiverId:      receiverId,
      text:            '',
      type:            'booking_proposal',
      bookingData:     bookingData,
      bookingStatus:   'pending',
      readStatus:      'sent',
      edited:          false,
      deleted:         false,
      createdAt:       _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function markAsRead(currentUid, partnerUid) {
    var key = _conversationKey(currentUid, partnerUid);
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].conversationKey === key && all[i].senderId === partnerUid) {
        all[i].readStatus = 'read';
      }
    }
    _save(all);
  }

  function markAsDelivered(currentUid, partnerUid) {
    var key = _conversationKey(currentUid, partnerUid);
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].conversationKey === key && all[i].senderId === currentUid && all[i].readStatus === 'sent') {
        all[i].readStatus = 'delivered';
      }
    }
    _save(all);
  }

  function deleteMsg(msgId) {
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].msgId === msgId) {
        all[i].deleted   = true;
        all[i].text      = '';
        all[i].deletedAt = _now();
        break;
      }
    }
    _save(all);
  }

  function editMsg(msgId, newText) {
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].msgId === msgId) {
        all[i].text   = newText;
        all[i].edited = true;
        break;
      }
    }
    _save(all);
  }

  function respondBooking(msgId, response) {
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].msgId === msgId) {
        all[i].bookingStatus = response;
        break;
      }
    }
    _save(all);
  }

  /**
   * sendTxInquiry — sends a tx_inquiry service message containing
   * transaction details plus a personal message from the sender.
   * Appears as a structured card in the recipient's chat.
   */
  function sendTxInquiry(senderUid, recipientUid, tx, personalMessage) {
    var all = _load();
    var key = _conversationKey(senderUid, recipientUid);
    var m   = tx.meta || {};

    /* Determine teacher/student from the TX meta */
    var teacherId  = m.teacherId  || (senderUid !== recipientUid ? recipientUid : null);
    var studentId  = m.studentId  || senderUid;

    var msg = {
      msgId:            _uuid(),
      conversationKey:  key,
      senderId:         senderUid,
      receiverId:       recipientUid,
      text:             personalMessage || '',
      type:             'tx_inquiry',
      isService:        true,
      serviceEvent:     'tx_inquiry',
      teacherId:        teacherId,
      studentId:        studentId,
      txSnapshot: {
        txId:            tx.txId,
        type:            tx.type,
        amount:          tx.amount,
        createdAt:       tx.createdAt,
        description:     tx.description,
        slotId:          m.slotId           || null,
        slotIds:         m.slotIds          || null,
        slotDate:        m.slotDate         || null,
        slotTimeStart:   m.slotTimeStart    || m.slotTime || null,
        slotTimeEnd:     m.slotTimeEnd      || null,
        slotCount:       m.slotCount        || 1,
        fullAmount:      m.fullAmount       || 0,
        depositAmount:   m.depositAmount    || 0,
        depositType:     m.depositType      || null,
        depositPercent:  m.depositPercent   || null,
        paymentMode:     m.paymentMode      || null,
        cancellationTier: m.cancellationTier || null,
        escrowId:        m.escrowId         || null,
        teacherId:       m.teacherId        || null,
        studentId:       m.studentId        || null
      },
      readStatus:       'sent',
      edited:           false,
      deleted:          false,
      createdAt:        _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function seedDemoMessages(currentUid, partnerUid) {
    var existing = getConversation(currentUid, partnerUid);
    if (existing.length > 0) return;

    var d = new Date();
    d.setDate(d.getDate() - 1);
    var yesterday = d.toISOString().replace(/T.*/, 'T10:12:00.000Z');
    var todayBase = new Date().toISOString().replace(/T.*/, 'T');

    var all = _load();
    var key = _conversationKey(currentUid, partnerUid);

    var demoMsgs = [
      {
        msgId: 'demo_1', conversationKey: key,
        senderId: partnerUid, receiverId: currentUid,
        text: 'Hallo! Hast du am Dienstag Zeit für eine Stunde?',
        type: 'text', readStatus: 'read', edited: false, deleted: false,
        createdAt: yesterday
      },
      {
        msgId: 'demo_2', conversationKey: key,
        senderId: currentUid, receiverId: partnerUid,
        text: 'Ja, das passt mir gut!',
        type: 'text', readStatus: 'delivered', edited: false, deleted: false,
        createdAt: todayBase + '09:05:00.000Z'
      },
      {
        msgId: 'demo_3', conversationKey: key,
        senderId: partnerUid, receiverId: currentUid,
        text: '', type: 'booking_proposal',
        bookingData: {
          date: 'Dienstag, 11. März 2026',
          timeStart: '14:00',
          timeEnd:   '14:30',
          with:      ''
        },
        bookingStatus: 'pending',
        readStatus: 'read', edited: false, deleted: false,
        createdAt: todayBase + '09:08:00.000Z'
      },
      {
        msgId: 'demo_4', conversationKey: key,
        senderId: currentUid, receiverId: partnerUid,
        text: 'Super, bis dann!',
        type: 'text', readStatus: 'sent', edited: true, deleted: false,
        createdAt: todayBase + '09:22:00.000Z'
      }
    ];

    for (var i = 0; i < demoMsgs.length; i++) {
      all.push(demoMsgs[i]);
    }
    _save(all);
  }


  function sendServiceMessage(teacherId, studentId, serviceEvent) {
    var all = _load();
    var key = _conversationKey(teacherId, studentId);
    var msg = {
      msgId:           _uuid(),
      conversationKey: key,
      senderId:        'SYSTEM',
      receiverId:      teacherId,
      text:            '',
      type:            'service',
      isService:       true,
      serviceEvent:    serviceEvent,
      requestStatus:   'pending',
      teacherId:       teacherId,
      studentId:       studentId,
      readStatus:      'sent',
      edited:          false,
      deleted:         false,
      createdAt:       _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function sendBookingRequest(teacherId, studentId, slotData) {
    /* slotData: { slotId, date, dateLabel, time, endTime } */
    var all = _load();
    var key = _conversationKey(teacherId, studentId);
    var msg = {
      msgId:           _uuid(),
      conversationKey: key,
      senderId:        'SYSTEM',
      receiverId:      studentId,
      text:            '',
      type:            'service',
      isService:       true,
      serviceEvent:    'booking_request',
      requestStatus:   'pending',
      teacherId:       teacherId,
      studentId:       studentId,
      slotData:        slotData || {},
      readStatus:      'sent',
      edited:          false,
      deleted:         false,
      createdAt:       _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function respondBookingRequest(msgId, response, teacherId, studentId) {
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].msgId === msgId) {
        all[i].requestStatus = response;
        all[i].readStatus    = 'read';
        break;
      }
    }
    _save(all);
  }

  function respondServiceRequest(msgId, response, teacherId, studentId) {
    var all = _load();
    for (var i = 0; i < all.length; i++) {
      if (all[i].msgId === msgId) {
        all[i].requestStatus = response;
        all[i].readStatus    = 'read';
        break;
      }
    }
    _save(all);
  }

  function getRequestStatus(teacherId, studentId) {
    var msgs = getConversation(teacherId, studentId);
    for (var i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].type === 'service' && msgs[i].serviceEvent === 'student_request') {
        return msgs[i].requestStatus || 'pending';
      }
    }
    return null;
  }

  function hasConversation(uidA, uidB) {
    var msgs = getConversation(uidA, uidB);
    return msgs.length > 0;
  }

  function sendBookingNotification(senderId, receiverId, bookingSnapshot) {
    /* bookingSnapshot: { actorId, actorRole, teacherId, teacherName, studentId,
       studentName, currency, pricePerSlot, totalSlots, totalAmount, blocks[] } */
    var all = _load();
    var msg = {
      msgId:            _uuid(),
      conversationKey:  _conversationKey(senderId, receiverId),
      senderId:         senderId,
      receiverId:       receiverId,
      text:             '',
      type:             'booking_notification',
      isService:        true,
      serviceEvent:     'booking_notification',
      teacherId:        bookingSnapshot.teacherId  || null,
      studentId:        bookingSnapshot.studentId  || null,
      bookingSnapshot:  bookingSnapshot,
      readStatus:       'sent',
      edited:           false,
      deleted:          false,
      createdAt:        _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function sendMoveNotification(senderId, receiverId, moveSnapshot) {
    /* moveSnapshot: { actorId, actorRole, actorName,
       teacherId, teacherName, studentId, studentName,
       oldDate, oldTime, oldEndTime, newDate, newTime, newEndTime,
       reason, reasonLabel, note } */
    var all = _load();
    var msg = {
      msgId:            _uuid(),
      conversationKey:  _conversationKey(senderId, receiverId),
      senderId:         senderId,
      receiverId:       receiverId,
      text:             '',
      type:             'booking_moved',
      isService:        true,
      serviceEvent:     'booking_moved',
      teacherId:        moveSnapshot.teacherId  || null,
      studentId:        moveSnapshot.studentId  || null,
      moveSnapshot:     moveSnapshot,
      readStatus:       'sent',
      edited:           false,
      deleted:          false,
      createdAt:        _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  function sendDisconnectMessage(teacherId, studentId, cancelledSlots) {
    var all = _load();
    var key = _conversationKey(teacherId, studentId);
    var msg = {
      msgId:           _uuid(),
      conversationKey: key,
      senderId:        'SYSTEM',
      receiverId:      teacherId,
      text:            '',
      type:            'service',
      isService:       true,
      serviceEvent:    'student_disconnected',
      teacherId:       teacherId,
      studentId:       studentId,
      cancelledSlots:  cancelledSlots || [],
      readStatus:      'sent',
      edited:          false,
      deleted:         false,
      createdAt:       _now()
    };
    all.push(msg);
    _save(all);
    return msg;
  }

  return {
    getConversation:       getConversation,
    getLastMessage:        getLastMessage,
    countUnread:           countUnread,
    totalUnread:           totalUnread,
    send:                  send,
    sendBookingProposal:   sendBookingProposal,
    sendServiceMessage:    sendServiceMessage,
    sendTxInquiry:         sendTxInquiry,
    respondServiceRequest: respondServiceRequest,
    sendBookingRequest:    sendBookingRequest,
    sendCancellationNotification: function(senderUid, receiverUid, snap) {
      /* snap: { teacherId, teacherName, studentId, studentName, date, time, endTime, actorRole } */
      var all  = _load();
      var key  = _conversationKey(senderUid, receiverUid);
      var msg  = {
        msgId:           _uuid(),
        conversationKey: key,
        senderId:        'SYSTEM',
        receiverId:      receiverUid,
        text:            '',
        type:            'service',
        isService:       true,
        serviceEvent:    'booking_cancelled',
        teacherId:       snap.teacherId  || '',
        studentId:       snap.studentId  || '',
        teacherName:     snap.teacherName || '',
        studentName:     snap.studentName || '',
        date:            snap.date        || '',
        time:            snap.time        || '',
        endTime:         snap.endTime     || '',
        actorRole:       snap.actorRole   || '',
        readStatus:      'sent',
        edited: false, deleted: false,
        createdAt: _now()
      };
      all.push(msg);
      _save(all);
      return msg;
    },
    respondBookingRequest: respondBookingRequest,
    sendBookingNotification: sendBookingNotification,
    sendMoveNotification:    sendMoveNotification,
    getRequestStatus:      getRequestStatus,
    hasConversation:       hasConversation,
    sendDisconnectMessage: sendDisconnectMessage,
    markAsRead:            markAsRead,
    markAsDelivered:       markAsDelivered,
    deleteMsg:             deleteMsg,
    editMsg:               editMsg,
    respondBooking:        respondBooking,
    seedDemoMessages:      seedDemoMessages
  };
})();

/* ── Debug helper ─────────────────────────────────────── */
function _debugLog(msg) {
  try {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ChatPanel] ' + msg);
    }
  } catch(e) {}
}

/* ── ChatPanel ────────────────────────────────────────── */
/* ── Chat time helper: UTC → viewer local for service message times ── */
function _tChatTime(utcTimeStr, dateStr) {
  if (!utcTimeStr || typeof TimezoneService === 'undefined') return utcTimeStr || '';
  if (typeof Auth === 'undefined' || !Auth.current()) return utcTimeStr;
  var tz = TimezoneService.getUserTimezone(Auth.current().uid);
  return TimezoneService.utcToLocal(utcTimeStr, dateStr || '', tz).localTime;
}

var ChatPanel = (function() {

  var _currentUser    = null;
  var _storageListenerBound = false;
  var _activePartner  = null;
  var _editingMsgId   = null;
  var _overlay        = null;
  var _panel          = null;
  var _viewList       = null;
  var _viewChat       = null;
  var _contextMenu    = null;
  var _longPressTimer = null;
  var _isOpen         = false;

  /* ── Init ─────────────────────────────────────────── */
  function init(opts) {
    try {
      /* opts.uid allows overriding Auth.current() for pages like profile-view
         where ?uid= is the viewed profile, not the logged-in user */
      if (opts && opts.uid) {
        _currentUser = AppService.getUserSync(opts.uid);
      } else {
        _currentUser = Auth.current();
      }
      if (!_currentUser) return;

      _injectCSS();
      _buildDOM();
      _bindFAB();
      _updateFABBadge();

      /* Cross-tab: refresh badge when another tab writes to app_chat_messages */
      if (!_storageListenerBound) {
        _storageListenerBound = true;
        window.addEventListener('storage', function(e) {
          if (e.key === 'app_chat_messages') {
            _updateFABBadge();
            /* If chat panel is open, also re-render the conversation list */
            if (_panelOpen && _currentUser) {
              _renderConversationList();
            }
          }
        });
      }
    } catch(e) {
      _debugLog('init error: ' + e.message);
    }
  }

  function _injectCSS() {
    if (document.getElementById('chat-css')) return;
    var link  = document.createElement('link');
    link.id   = 'chat-css';
    link.rel  = 'stylesheet';
    link.href = './css/chat.css';
    document.head.appendChild(link);
  }

  /* ── Build DOM ────────────────────────────────────── */
  function _buildDOM() {
    _overlay = document.createElement('div');
    _overlay.className = 'chat-overlay';
    _overlay.id        = 'chat-overlay';
    _overlay.addEventListener('click', function() { close(); });

    _panel = document.createElement('div');
    _panel.className = 'chat-panel';
    _panel.id        = 'chat-panel';

    _viewList = document.createElement('div');
    _viewList.className = 'chat-view';
    _viewList.id        = 'chat-view-list';
    _viewList.innerHTML = _buildListHeaderHTML();

    var listBody = document.createElement('div');
    listBody.className = 'chat-list';
    listBody.id        = 'chat-list-body';
    _viewList.appendChild(listBody);

    _viewChat = document.createElement('div');
    _viewChat.className = 'chat-view chat-view-hidden';
    _viewChat.id        = 'chat-view-chat';
    _viewChat.innerHTML = _buildChatHeaderHTML() + _buildInputAreaHTML();

    var messagesDiv = document.createElement('div');
    messagesDiv.className = 'chat-messages';
    messagesDiv.id        = 'chat-messages-body';

    var editIndicator = document.createElement('div');
    editIndicator.className = 'chat-edit-indicator';
    editIndicator.id        = 'chat-edit-indicator';
    editIndicator.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 16 16" fill="none">' +
        '<path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span id="chat-edit-indicator-text">' + ChatI18n.t('editMode') + '</span>' +
      '<button class="chat-edit-cancel" id="chat-edit-cancel-btn" aria-label="' + ChatI18n.t('editCancel') + '">' +
        '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '</button>';

    var inputArea = _viewChat.querySelector('.chat-input-area');
    _viewChat.insertBefore(messagesDiv, inputArea);

    var inputWrap = _viewChat.querySelector('.chat-input-wrap');
    inputWrap.insertBefore(editIndicator, inputWrap.firstChild);

    _panel.appendChild(_viewList);
    _panel.appendChild(_viewChat);

    document.body.appendChild(_overlay);
    document.body.appendChild(_panel);

    _bindListHeader();
    _bindChatHeader();
    _bindInputArea();
  }

  function _buildListHeaderHTML() {
    return '<div class="chat-header" id="chat-list-header">' +
      '<span class="chat-header-title">' + ChatI18n.t('title') + '</span>' +
      '<button class="chat-header-close" id="chat-header-close" aria-label="' + ChatI18n.t('ctxClose') + '">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '</button>' +
    '</div>';
  }

  function _buildChatHeaderHTML() {
    return '<div class="chat-header" id="chat-conv-header">' +
      '<button class="chat-header-back" id="chat-back-btn" aria-label="' + ChatI18n.t('back') + '">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<div class="chat-header-avatar" id="chat-partner-avatar"></div>' +
      '<div class="chat-header-info">' +
        '<div class="chat-header-name" id="chat-partner-name"></div>' +
        '<div class="chat-header-status" id="chat-partner-status"></div>' +
      '</div>' +
      '<button class="chat-header-close" id="chat-conv-close-btn" aria-label="' + ChatI18n.t('ctxClose') + '">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '</button>' +
    '</div>';
  }

  function _buildInputAreaHTML() {
    return '<div class="chat-input-area">' +
      '<div class="chat-input-actions">' +
        '<button class="chat-input-btn" id="chat-btn-attach" title="' + ChatI18n.t('attach') + '" aria-label="' + ChatI18n.t('attach') + '">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 8.5l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535l-5.5 5.5a1 1 0 01-1.414-1.414l5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<button class="chat-input-btn" id="chat-btn-voice" title="' + ChatI18n.t('voice') + '" aria-label="' + ChatI18n.t('voice') + '">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 8a6 6 0 0012 0M8 14v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
        '<textarea class="chat-textarea" id="chat-textarea" rows="1" placeholder="' + ChatI18n.t('inputPlaceholder') + '" aria-label="' + ChatI18n.t('inputPlaceholder') + '"></textarea>' +
      '</div>' +
      '<button class="chat-send-btn" id="chat-send-btn" aria-label="' + ChatI18n.t('send') + '">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l3 6-3 6 12-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
    '</div>';
  }

  /* ── Bind List Header ─────────────────────────────── */
  function _bindListHeader() {
    var closeBtn = document.getElementById('chat-header-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { close(); });
  }

  /* ── Bind Chat Header ─────────────────────────────── */
  function _bindChatHeader() {
    var backBtn  = document.getElementById('chat-back-btn');
    var closeBtn = document.getElementById('chat-conv-close-btn');
    if (backBtn)  backBtn.addEventListener('click',  function() { _showListView(); });
    if (closeBtn) closeBtn.addEventListener('click', function() { close(); });
  }

  /* ── Bind Input Area ──────────────────────────────── */
  function _bindInputArea() {
    var textarea  = document.getElementById('chat-textarea');
    var sendBtn   = document.getElementById('chat-send-btn');
    var cancelBtn = document.getElementById('chat-edit-cancel-btn');
    var attachBtn = document.getElementById('chat-btn-attach');
    var voiceBtn  = document.getElementById('chat-btn-voice');

    if (textarea) {
      textarea.addEventListener('input', function() { _autoGrow(textarea); });
      textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _handleSend();
        }
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', function() { _handleSend(); });

    if (cancelBtn) cancelBtn.addEventListener('click', function() { _cancelEdit(); });

    if (attachBtn) {
      attachBtn.addEventListener('click', function() {
        Toast.info(ChatI18n.t('attach') + ' — ' + 'Funktion in Entwicklung');
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', function() {
        Toast.info(ChatI18n.t('voice') + ' — ' + 'Funktion in Entwicklung');
      });
    }
  }

  function _autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  /* ── FAB ──────────────────────────────────────────── */
  function _bindFAB() {
    var fab = document.getElementById('chat-fab');
    if (!fab) return;
    fab.addEventListener('click', function() {
      if (_isOpen) { close(); } else { open(); }
    });
  }

  function _updateFABBadge() {
    try {
      var fab = document.getElementById('chat-fab');
      if (!fab) return;

      var wrap = fab.parentNode;
      if (!wrap || !wrap.classList.contains('chat-fab-wrap')) {
        var newWrap = document.createElement('div');
        newWrap.className = 'chat-fab-wrap';
        fab.parentNode.insertBefore(newWrap, fab);
        newWrap.appendChild(fab);
        wrap = newWrap;
      }

      var badge = wrap.querySelector('.chat-fab-unread');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'chat-fab-unread';
        badge.id        = 'chat-fab-unread-badge';
        wrap.appendChild(badge);
      }

      var count = ChatStore.totalUnread(_currentUser.uid);
      badge.textContent = count > 9 ? '9+' : String(count);
      if (count > 0) {
        badge.classList.add('is-visible');
      } else {
        badge.classList.remove('is-visible');
      }
    } catch(e) {
      _debugLog('_updateFABBadge error: ' + e.message);
    }
  }

  /* ── Open / Close ─────────────────────────────────── */
  function open() {
    try {
      _isOpen = true;
      _overlay.classList.add('is-open');
      _panel.classList.add('is-open');
      document.body.classList.add('overlay-open');
      _showListView();
    } catch(e) {
      _debugLog('open error: ' + e.message);
    }
  }

  function close() {
    try {
      _isOpen = false;
      _overlay.classList.remove('is-open');
      _panel.classList.remove('is-open');
      document.body.classList.remove('overlay-open');
      _closeContextMenu();
      _cancelEdit();
      _updateFABBadge();
    } catch(e) {
      _debugLog('close error: ' + e.message);
    }
  }

  /* ── Views ────────────────────────────────────────── */
  function _showListView() {
    try {
      _activePartner = null;
      _viewList.classList.remove('chat-view-hidden');
      _viewChat.classList.add('chat-view-hidden');
      _renderPartnerList();
      _cancelEdit();
    } catch(e) {
      _debugLog('_showListView error: ' + e.message);
    }
  }

  function _showChatView(partner) {
    try {
      _activePartner = partner;
      _viewList.classList.add('chat-view-hidden');
      _viewChat.classList.remove('chat-view-hidden');

      var displayName = ProfileStore.getDisplayName(partner.uid);
      var photo       = ProfileStore.getPhoto(partner.uid);
      var initials    = _initials(displayName);
      var avatarEl    = document.getElementById('chat-partner-avatar');
      var nameEl      = document.getElementById('chat-partner-name');
      var statusEl    = document.getElementById('chat-partner-status');

      if (avatarEl) {
        if (photo) {
          avatarEl.className = 'chat-header-avatar chat-header-avatar-photo';
          avatarEl.textContent = '';
          avatarEl.innerHTML = '<img src="' + photo + '" alt="' + _escapeHTML(displayName) + '" />';
        } else {
          avatarEl.innerHTML   = '';
          avatarEl.textContent = initials;
          avatarEl.className   = 'chat-header-avatar role-' + partner.role;
        }
      }
      if (nameEl) nameEl.textContent = displayName;
      if (statusEl) statusEl.textContent = ChatI18n.t('lastSeen') + ': ' + _fakeLastSeen();

      ChatStore.markAsRead(_currentUser.uid, partner.uid);
      _updateFABBadge();
      _renderMessages();
      _updateInputLock(partner.uid);
      _scrollToBottomRaf();
    } catch(e) {
      _debugLog('_showChatView error: ' + e.message);
    }
  }

  function _updateInputLock(partnerUid) {
    var textarea  = document.getElementById('chat-textarea');
    var sendBtn   = document.getElementById('chat-send-btn');
    var attachBtn = document.getElementById('chat-btn-attach');
    var voiceBtn  = document.getElementById('chat-btn-voice');
    var inputArea = document.querySelector('.chat-input-area');

    if (!textarea) return;

    var status = _getRequestStatus(partnerUid);
    var locked = false;
    var placeholder = ChatI18n.t('inputPlaceholder');

    if (status === 'pending' && _currentUser.role === 'student') {
      locked = true;
      placeholder = ChatI18n.t('inputLockedPending');
    }
    if (status === 'declined') {
      locked = true;
      placeholder = ChatI18n.t('inputLockedDeclined');
    }

    textarea.disabled = locked;
    textarea.placeholder = placeholder;
    if (sendBtn)   sendBtn.disabled   = locked;
    if (attachBtn) attachBtn.disabled = locked;
    if (voiceBtn)  voiceBtn.disabled  = locked;

    if (inputArea) {
      if (locked) {
        inputArea.classList.add('chat-input-locked');
      } else {
        inputArea.classList.remove('chat-input-locked');
      }
    }
  }

  /* ── Render Partner List ──────────────────────────── */
  function _renderPartnerList() {
    try {
      var container = document.getElementById('chat-list-body');
      if (!container) return;
      container.innerHTML = '';

      var partners = _getPartners();

      if (!partners.length) {
        container.innerHTML =
          '<div class="chat-empty">' +
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<div class="chat-empty-title">' + ChatI18n.t('noChats') + '</div>' +
            '<div class="chat-empty-sub">' + ChatI18n.t('noChatsSub') + '</div>' +
          '</div>';
        return;
      }

      for (var i = 0; i < partners.length; i++) {
        container.appendChild(_buildListItem(partners[i]));
      }
    } catch(e) {
      _debugLog('_renderPartnerList error: ' + e.message);
    }
  }

  function _getPartners() {
    var role   = _currentUser.role;
    var all    = role === 'teacher'
      ? AppService.getUsersByRoleSync('student')
      : role === 'student'
        ? AppService.getUsersByRoleSync('teacher')
        : AppService.getUsersByRoleSync('teacher').concat(AppService.getUsersByRoleSync('student'));
    var result = [];

    for (var i = 0; i < all.length; i++) {
      var u = all[i];
      if (u.uid === _currentUser.uid) continue;
      if (u.role === 'admin') continue;

      if (role === 'teacher' && u.role === 'student') {
        if (ChatStore.hasConversation(_currentUser.uid, u.uid)) {
          result.push(u);
        }
      }

      if (role === 'student' && u.role === 'teacher') {
        if (ChatStore.hasConversation(_currentUser.uid, u.uid)) {
          result.push(u);
        }
      }
    }
    return result;
  }

  function _getRequestStatus(partnerUid) {
    if (_currentUser.role === 'teacher') {
      return ChatStore.getRequestStatus(_currentUser.uid, partnerUid);
    }
    return ChatStore.getRequestStatus(partnerUid, _currentUser.uid);
  }

  function _isInputLocked(partnerUid) {
    var status = _getRequestStatus(partnerUid);
    if (status === null) return false;
    return status === 'pending' || status === 'declined';
  }

  function _buildListItem(partner) {
    var item = document.createElement('div');
    item.className = 'chat-list-item';

    var lastMsg     = ChatStore.getLastMessage(_currentUser.uid, partner.uid);
    var unread      = ChatStore.countUnread(_currentUser.uid, partner.uid);
    var displayName = ProfileStore.getDisplayName(partner.uid);
    var photo       = ProfileStore.getPhoto(partner.uid);
    var initials    = _initials(displayName);
    var timeStr     = lastMsg ? _formatTime(new Date(lastMsg.createdAt)) : '';

    var preview = '';
    if (lastMsg) {
      if (lastMsg.type === 'booking_proposal') {
        preview = '📅 ' + ChatI18n.t('bookingProposal');
      } else if (lastMsg.type === 'booking_notification') {
        preview = ChatI18n.t('bookingNotifPreview');
      } else if (lastMsg.type === 'service') {
        preview = '🔔 ' + ChatI18n.t('serviceRequestLabel');
      } else {
        preview = _escapeHTML(lastMsg.text);
      }
    }

    var badgeHTML = '';
    if (unread > 0) {
      badgeHTML = '<span class="chat-list-badge">' + (unread > 9 ? '9+' : unread) + '</span>';
    }

    var avatarHTML = photo
      ? '<div class="chat-list-avatar chat-list-avatar-photo"><img src="' + photo + '" alt="' + _escapeHTML(displayName) + '" /></div>'
      : '<div class="chat-list-avatar role-' + partner.role + '">' + initials + '</div>';

    item.innerHTML =
      avatarHTML +
      '<div class="chat-list-body">' +
        '<div class="chat-list-name-row">' +
          '<span class="chat-list-name">' + _escapeHTML(displayName) + '</span>' +
          '<span class="chat-list-time">' + _escapeHTML(timeStr) + '</span>' +
        '</div>' +
        '<div class="chat-list-name-row">' +
          '<span class="chat-list-preview">' + preview + '</span>' +
          badgeHTML +
        '</div>' +
      '</div>';

    item.addEventListener('click', function() { _showChatView(partner); });
    return item;
  }

  /* ── Render Messages ──────────────────────────────── */
  function _renderMessages() {
    try {
      var container = document.getElementById('chat-messages-body');
      if (!container || !_activePartner) return;
      container.innerHTML = '';

      var msgs = ChatStore.getConversation(_currentUser.uid, _activePartner.uid);

      if (!msgs.length) {
        container.innerHTML =
          '<div class="chat-empty">' +
            '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<div class="chat-empty-title">' + ChatI18n.t('noMessages') + '</div>' +
            '<div class="chat-empty-sub">' + ChatI18n.t('noMessagesSub') + '</div>' +
          '</div>';
        return;
      }

      var lastDateStr = '';

      for (var i = 0; i < msgs.length; i++) {
        var msg     = msgs[i];
        var dateStr = _formatDateLabel(new Date(msg.createdAt));

        if (dateStr !== lastDateStr) {
          container.appendChild(_buildDateDivider(dateStr));
          lastDateStr = dateStr;
        }

        if (msg.type === 'service' || msg.type === 'tx_inquiry') {
          container.appendChild(_buildServiceMsg(msg));
        } else if (msg.type === 'booking_notification') {
          container.appendChild(_buildBookingNotifBubble(msg));
        } else if (msg.type === 'booking_moved') {
          container.appendChild(_buildMoveBubble(msg));
        } else if (msg.type === 'booking_proposal') {
          container.appendChild(_buildBookingBubble(msg));
        } else {
          container.appendChild(_buildTextBubble(msg));
        }
      }
    } catch(e) {
      _debugLog('_renderMessages error: ' + e.message);
    }
  }

  function _buildServiceMsg(msg) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg-service';
    wrap.setAttribute('data-msg-id', msg.msgId);

    var isTeacher   = _currentUser.role === 'teacher';
    var studentName = '';
    var teacherName = '';

    if (msg.studentId) {
      studentName = ProfileStore.getDisplayName(msg.studentId);
    }
    if (msg.teacherId) {
      teacherName = ProfileStore.getDisplayName(msg.teacherId);
    }

    var innerHTML = '';

    /* booking_notification is handled by _buildBookingNotifBubble — not reached here */

    if (msg.serviceEvent === 'student_request') {
      if (isTeacher) {
        var requestStatus = msg.requestStatus || 'pending';
        innerHTML =
          '<div class="chat-service-card">' +
            '<div class="chat-service-label">' +
              '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1a4 4 0 100 8A4 4 0 008 1zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              ChatI18n.t('serviceRequestLabel') +
            '</div>' +
            '<div class="chat-service-text">' +
              _escapeHTML(studentName) + ' ' + ChatI18n.t('serviceStudentRequest') +
            '</div>';

        if (requestStatus === 'pending') {
          innerHTML +=
            '<div class="chat-service-actions">' +
              '<button class="btn btn-secondary btn-sm chat-service-decline-btn" data-msg-id="' + msg.msgId + '">' + ChatI18n.t('serviceDeclineBtn') + '</button>' +
              '<button class="btn btn-primary btn-sm chat-service-accept-btn" data-msg-id="' + msg.msgId + '">' + ChatI18n.t('serviceAcceptBtn') + '</button>' +
            '</div>';
        } else if (requestStatus === 'accepted') {
          innerHTML +=
            '<div class="chat-service-status chat-service-status-accepted">' +
              ChatI18n.t('serviceAccepted').replace('{name}', _escapeHTML(studentName)) +
            '</div>';
        } else if (requestStatus === 'declined') {
          innerHTML +=
            '<div class="chat-service-status chat-service-status-declined">' +
              ChatI18n.t('serviceDeclined').replace('{name}', _escapeHTML(studentName)) +
            '</div>';
        }

        innerHTML += '</div>';

      } else {
        var reqStatus = msg.requestStatus || 'pending';
        var statusClass = '';
        var statusText  = '';
        if (reqStatus === 'pending') {
          statusText  = ChatI18n.t('serviceRequestSent');
          statusClass = 'chat-service-status-pending';
        } else if (reqStatus === 'accepted') {
          statusText  = ChatI18n.t('serviceAcceptedStudent').replace('{name}', _escapeHTML(teacherName));
          statusClass = 'chat-service-status-accepted';
        } else if (reqStatus === 'declined') {
          statusText  = ChatI18n.t('serviceDeclinedStudent').replace('{name}', _escapeHTML(teacherName));
          statusClass = 'chat-service-status-declined';
        }
        innerHTML =
          '<div class="chat-service-card">' +
            '<div class="chat-service-label">' +
              '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1a4 4 0 100 8A4 4 0 008 1zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              ChatI18n.t('serviceRequestLabel') +
            '</div>' +
            '<div class="chat-service-status ' + statusClass + '">' + statusText + '</div>' +
          '</div>';
      }
    }

    if (msg.serviceEvent === 'booking_request') {
      var bStatus = msg.requestStatus || 'pending';
      var bSlot   = msg.slotData || {};
      var slotDesc = (bSlot.dateLabel || bSlot.date || '') + (bSlot.time ? ', ' + bSlot.time + '\u2013' + (bSlot.endTime || '') : '');
      if (_currentUser.uid === msg.studentId) {
        /* Student sees approve/decline */
        innerHTML = '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> ' +
            ChatI18n.t('bookingRequestLabel') +
          '</div>' +
          '<div class="chat-service-text">' +
            '<strong>' + _escapeHTML(teacherName) + '</strong> ' + ChatI18n.t('bookingRequestText') +
          '</div>' +
          (slotDesc ? '<div class="chat-service-slot-desc">' + _escapeHTML(slotDesc) + '</div>' : '');
        if (bStatus === 'pending') {
          innerHTML +=
            '<div class="chat-service-actions">' +
              '<button class="btn btn-ghost btn-sm chat-booking-decline-btn" data-msg-id="' + msg.msgId + '" data-teacher-id="' + msg.teacherId + '" data-student-id="' + msg.studentId + '">' + ChatI18n.t('bookingRequestDecline') + '</button>' +
              '<button class="btn btn-primary btn-sm chat-booking-approve-btn" data-msg-id="' + msg.msgId + '" data-teacher-id="' + msg.teacherId + '" data-student-id="' + msg.studentId + '" data-slot-id="' + (bSlot.slotId || '') + '">' + ChatI18n.t('bookingRequestApprove') + '</button>' +
            '</div>';
        } else if (bStatus === 'accepted') {
          innerHTML += '<div class="chat-service-status chat-service-status-accepted">' + ChatI18n.t('bookingRequestApproved') + '</div>';
        } else {
          innerHTML += '<div class="chat-service-status chat-service-status-declined">' + ChatI18n.t('bookingRequestDeclined') + '</div>';
        }
        innerHTML += '</div>';
      } else {
        /* Teacher sees status */
        var bStatusText = bStatus === 'pending' ? ChatI18n.t('bookingRequestPending')
          : bStatus === 'accepted' ? ChatI18n.t('bookingRequestApproved')
          : ChatI18n.t('bookingRequestDeclined');
        var bStatusClass = bStatus === 'accepted' ? 'chat-service-status-accepted'
          : bStatus === 'declined' ? 'chat-service-status-declined' : 'chat-service-status-pending';
        innerHTML = '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> ' +
            ChatI18n.t('bookingRequestLabel') +
          '</div>' +
          (slotDesc ? '<div class="chat-service-slot-desc">' + _escapeHTML(slotDesc) + '</div>' : '') +
          '<div class="chat-service-status ' + bStatusClass + '">' + bStatusText + '</div>' +
        '</div>';
      }
    }

    if (msg.serviceEvent === 'student_disconnected') {
      var slots     = msg.cancelledSlots || [];
      var isTeacher = _currentUser.role === 'teacher';
      var nameStr   = isTeacher ? studentName : teacherName;
      var titleText = isTeacher
        ? ChatI18n.t('serviceDisconnected').replace('{name}', _escapeHTML(nameStr))
        : ChatI18n.t('serviceDisconnectedTeacher').replace('{name}', _escapeHTML(nameStr));

      var slotsHTML = '';
      if (slots.length) {
        var slotsLabel = isTeacher
          ? ChatI18n.t('serviceDisconnectedSlots')
          : ChatI18n.t('serviceDisconnectedTeacherSlots');
        slotsHTML = '<div class="chat-service-slots-label">' + slotsLabel + '</div>' +
                    '<ul class="chat-service-slots-list">';
        for (var si = 0; si < slots.length; si++) {
          var sl = slots[si];
          var _cst = _tChatTime(sl.time, sl.dateLabel);
          var _cet = AppService.slotEndTime(_cst);
          slotsHTML += '<li>' + _escapeHTML(sl.dateLabel) + ' &nbsp;' + _escapeHTML(_cst) + ' – ' + _escapeHTML(_cet) + '</li>';
        }
        slotsHTML += '</ul>';
      } else {
        slotsHTML = '<div class="chat-service-status chat-service-status-pending">' +
          ChatI18n.t('serviceDisconnectedNone') + '</div>';
      }

      innerHTML =
        '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 8H2M2 8l3-3M2 8l3 3M6 4V3a1 1 0 011-1h6a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ChatI18n.t('serviceDisconnectLabel') +
          '</div>' +
          '<div class="chat-service-text">' + titleText + '</div>' +
          slotsHTML +
        '</div>';
    }

    if (msg.serviceEvent === 'booking_cancelled') {
      var isT   = _currentUser && _currentUser.role === 'teacher';
      var actor = msg.actorRole === 'teacher' ? (msg.teacherName || teacherName) : (msg.studentName || studentName);
      var other = isT ? (msg.studentName || studentName) : (msg.teacherName || teacherName);
      var dateStr2 = msg.date ? new Date(msg.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit' }) : '';
      innerHTML =
        '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
            'Stunde storniert' +
          '</div>' +
          '<div class="chat-service-text">' +
            _escapeHTML(actor) + ' hat die Buchung storniert.' +
          '</div>' +
          '<div class="chat-service-slots-label">' + _escapeHTML(dateStr2) + ' &nbsp;' + _escapeHTML(_tChatTime(msg.time || '', dateStr2)) + ' – ' + _escapeHTML(AppService.slotEndTime(_tChatTime(msg.time || '', dateStr2))) + '</div>' +
        '</div>';
    }

    if (msg.serviceEvent === 'request_accepted_notify') {
      var tNameAcc = msg.teacherName || ProfileStore.getDisplayName(msg.teacherId);
      innerHTML =
        '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            'Anfrage angenommen' +
          '</div>' +
          '<div class="chat-service-status chat-service-status-accepted">' +
            _escapeHTML(tNameAcc) + ' hat deine Anfrage angenommen. Du kannst jetzt Stunden buchen.' +
          '</div>' +
        '</div>';
    }

    if (msg.serviceEvent === 'request_declined_notify') {
      var tNameDec = msg.teacherName || ProfileStore.getDisplayName(msg.teacherId);
      innerHTML =
        '<div class="chat-service-card">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
            'Anfrage abgelehnt' +
          '</div>' +
          '<div class="chat-service-status chat-service-status-declined">' +
            _escapeHTML(tNameDec) + ' hat deine Anfrage abgelehnt.' +
          '</div>' +
        '</div>';
    }

    if (msg.serviceEvent === 'tx_inquiry') {
      var snap       = msg.txSnapshot || {};
      var isOut      = msg.senderId === _currentUser.uid;
      var senderName = ProfileStore.getDisplayName(msg.senderId);

      /* TX type label */
      var txLabelMap = {
        booking: ChatI18n.t('txInquiryTypeBooking'),
        escrow_hold: ChatI18n.t('txInquiryTypeEscrowHold'),
        refund: ChatI18n.t('txInquiryTypeRefund'),
        cancellation: ChatI18n.t('txInquiryTypeCancellation'),
        escrow_release: ChatI18n.t('txInquiryTypeEscrowRelease'),
        lesson_confirmed: ChatI18n.t('txInquiryTypeLessonConfirmed'),
        move: ChatI18n.t('txInquiryTypeMove'),
        teacher_cancel: ChatI18n.t('txInquiryTypeTeacherCancel')
      };
      var txTypeStr = txLabelMap[snap.type] || (snap.type || '');

      /* Build detail lines — label: value */
      var detailLines = '';
      if (snap.slotDate) {
        var slotStr = snap.slotDate;
        if (snap.slotTimeStart) slotStr += ' ' + snap.slotTimeStart;
        if (snap.slotTimeEnd)   slotStr += '–' + snap.slotTimeEnd;
        if (snap.slotCount > 1) slotStr += ' (' + snap.slotCount + ' Slots)';
        detailLines += '<div class="chat-tx-detail-line"><span>' +
          ChatI18n.t('txInquirySlot') + ':</span><span>' + _escapeHTML(slotStr) + '</span></div>';
      }
      if (snap.fullAmount > 0) {
        detailLines += '<div class="chat-tx-detail-line"><span>' +
          ChatI18n.t('txInquiryAmount') + ':</span><span>€' +
          parseFloat(snap.fullAmount).toFixed(2).replace('.', ',') + '</span></div>';
      }
      if (snap.depositAmount > 0) {
        var depStr = '€' + parseFloat(snap.depositAmount).toFixed(2).replace('.', ',');
        if (snap.depositType === 'percent' && snap.depositPercent) {
          depStr += ' (' + snap.depositPercent + '%)';
        }
        detailLines += '<div class="chat-tx-detail-line"><span>' +
          ChatI18n.t('txInquiryDeposit') + ':</span><span>' + _escapeHTML(depStr) + '</span></div>';
      }
      if (snap.cancellationTier) {
        var tierLabels2 = {
          full_refund: 'Volle Rückerstattung', forfeit: 'Kein Deposit zurück',
          teacher_cancel: 'Lehrer storniert', partial: 'Teilrückerstattung'
        };
        detailLines += '<div class="chat-tx-detail-line"><span>' +
          ChatI18n.t('txInquiryTier') + ':</span><span>' +
          _escapeHTML(tierLabels2[snap.cancellationTier] || snap.cancellationTier) + '</span></div>';
      }
      if (snap.txId) {
        detailLines += '<div class="chat-tx-detail-line chat-tx-detail-id"><span>TX-ID:</span><span>' +
          _escapeHTML(snap.txId.slice(0, 18) + '…') + '</span></div>';
      }

      innerHTML =
        '<div class="chat-service-card chat-tx-inquiry-card' + (isOut ? ' is-out' : '') + '">' +
          '<div class="chat-service-label">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z"' +
              ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
            '</svg>' +
            ChatI18n.t('txInquiryLabel') +
          '</div>' +
          '<div class="chat-tx-inquiry-body">' +
            '<div class="chat-tx-inquiry-type">' + _escapeHTML(txTypeStr) + '</div>' +
            (detailLines ? '<div class="chat-tx-detail-lines">' + detailLines + '</div>' : '') +
            (msg.text ? '<div class="chat-tx-inquiry-message">' + _escapeHTML(msg.text) + '</div>' : '') +
            '<div class="chat-tx-inquiry-footer">' +
              '<span class="chat-tx-inquiry-sender">' +
                (isOut ? ChatI18n.t('txInquirySentBy') : ChatI18n.t('txInquiryFrom')) +
                ' <strong>' + _escapeHTML(senderName) + '</strong>' +
              '</span>' +
              '<button class="chat-tx-copy-btn" data-copy-txid="' + _escapeHTML(snap.txId || '') + '" title="TX-ID kopieren">' +
                '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
                  '<rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
                  '<path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
                '</svg>' +
                'TX kopieren' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    wrap.innerHTML = innerHTML;

    /* tx_inquiry: wire copy button */
    if (msg.type === 'tx_inquiry') {
      var copyBtn = wrap.querySelector('.chat-tx-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var snap2 = msg.txSnapshot || {};
          var lines = [
            'TX-Typ: ' + (snap2.type || ''),
            snap2.slotDate ? 'Stunde: ' + snap2.slotDate + (snap2.slotTimeStart ? ' ' + snap2.slotTimeStart : '') + (snap2.slotTimeEnd ? '–' + snap2.slotTimeEnd : '') : '',
            snap2.fullAmount    > 0 ? 'Betrag: €' + parseFloat(snap2.fullAmount).toFixed(2).replace('.', ',') : '',
            snap2.depositAmount > 0 ? 'Deposit: €' + parseFloat(snap2.depositAmount).toFixed(2).replace('.', ',') : '',
            snap2.cancellationTier ? 'Bedingung: ' + snap2.cancellationTier : '',
            snap2.txId ? 'TX-ID: ' + snap2.txId : '',
            msg.text ? 'Nachricht: ' + msg.text : ''
          ].filter(Boolean).join('\n');

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lines).then(function() {
              copyBtn.classList.add('copied');
              copyBtn.textContent = 'Kopiert ✓';
              setTimeout(function() {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML =
                  '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
                  '<rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
                  '<path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
                  '</svg>TX kopieren';
              }, 2000);
            });
          }
        });
      }
    }

    /* tx_inquiry card: click → load full TX and open detail sheet */
    if (msg.type === 'tx_inquiry' && msg.txSnapshot) {
      var inquiryCard = wrap.querySelector('.chat-tx-inquiry-card');
      if (inquiryCard) {
        inquiryCard.style.cursor = 'pointer';
        (function(snapshot, senderUid) {
          inquiryCard.addEventListener('click', function() {
            if (typeof WalletCore === 'undefined' || !_currentUser) return;
            /* Load the full TX from the current user's wallet by txId */
            AppService.getTransactions(_currentUser.uid, function(err, txs) {
              if (err || !txs) return;
              for (var i = 0; i < txs.length; i++) {
                if (txs[i].txId === snapshot.txId) {
                  WalletCore.showTxDetail(txs[i], _currentUser.uid);
                  return;
                }
              }
              /* TX not in current user's wallet — build a synthetic one from snapshot */
              var syntheticTx = {
                txId:        snapshot.txId,
                type:        snapshot.type,
                amount:      snapshot.amount,
                balance:     null,
                description: snapshot.description,
                status:      'completed',
                createdAt:   snapshot.createdAt,
                relatedUid:  senderUid,
                meta: {
                  slotId:          snapshot.slotId || null,
                  slotIds:         snapshot.slotIds || null,
                  slotDate:        snapshot.slotDate,
                  slotTimeStart:   snapshot.slotTimeStart,
                  slotTimeEnd:     snapshot.slotTimeEnd,
                  slotCount:       snapshot.slotCount,
                  fullAmount:      snapshot.fullAmount,
                  depositAmount:   snapshot.depositAmount,
                  depositType:     snapshot.depositType,
                  depositPercent:  snapshot.depositPercent,
                  paymentMode:     snapshot.paymentMode,
                  cancellationTier: snapshot.cancellationTier,
                  escrowId:        snapshot.escrowId,
                  teacherId:       snapshot.teacherId || null,
                  studentId:       snapshot.studentId || null
                }
              };
              WalletCore.showTxDetail(syntheticTx, _currentUser.uid);
            });
          });
        })(msg.txSnapshot, msg.senderId);
      }
    }

    var acceptBtn  = wrap.querySelector('.chat-service-accept-btn');
    var declineBtn = wrap.querySelector('.chat-service-decline-btn');

    if (acceptBtn) {
      (function(m) {
        acceptBtn.addEventListener('click', function() {
          _respondServiceRequest(m.msgId, 'accepted', m.teacherId, m.studentId);
        });
      })(msg);
    }
    if (declineBtn) {
      (function(m) {
        declineBtn.addEventListener('click', function() {
          _respondServiceRequest(m.msgId, 'declined', m.teacherId, m.studentId);
        });
      })(msg);
    }

    /* ── booking_request approve / decline ── */
    var approveBtn = wrap.querySelector('.chat-booking-approve-btn');
    var rejectBtn  = wrap.querySelector('.chat-booking-decline-btn');

    if (approveBtn) {
      (function(m) {
        approveBtn.addEventListener('click', function() {
          _respondBookingRequest(m.msgId, 'accepted', m.teacherId, m.studentId, m.slotData);
        });
      })(msg);
    }
    if (rejectBtn) {
      (function(m) {
        rejectBtn.addEventListener('click', function() {
          _respondBookingRequest(m.msgId, 'declined', m.teacherId, m.studentId, null);
        });
      })(msg);
    }

    return wrap;
  }

  /* ── Booking Notification Overlay ───────────────────────── */
  /* ── Booking Notification Overlay ───────────────────────── */
  function _showBookingNotifOverlay(snap, actorUid) {
    try {
      var existing = document.getElementById('chat-booking-notif-overlay');
      if (existing) existing.remove();

      var blocks      = snap.blocks || [];
      var totalSlots  = snap.totalSlots  || 0;
      var totalAmount = snap.totalAmount || 0;
      var tName       = snap.teacherName || (snap.teacherId ? ProfileStore.getDisplayName(snap.teacherId) : '\u2014');
      var sName       = snap.studentName || (snap.studentId ? ProfileStore.getDisplayName(snap.studentId) : '\u2014');

      function fmt(amtEUR) {
        if (typeof _fmtForUser === 'function') return _fmtForUser(amtEUR, actorUid);
        if (typeof fmtPrice    === 'function') return fmtPrice(amtEUR, 'EUR');
        return '\u20ac' + parseFloat(amtEUR || 0).toFixed(2).replace('.', ',');
      }

      /* \u2500 Root overlay backdrop */
      var overlay = document.createElement('div');
      overlay.id        = 'chat-booking-notif-overlay';
      overlay.className = 'cbn-overlay-backdrop';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', ChatI18n.t('bookingNotifOverlayTitle'));

      /* Panel */
      var panel = document.createElement('div');
      panel.className = 'cbn-overlay-panel';

      var handle = document.createElement('div');
      handle.className = 'cbn-overlay-handle';
      panel.appendChild(handle);

      /* Header */
      var header = document.createElement('div');
      header.className = 'cbn-overlay-header';

      var headerIcon = document.createElement('div');
      headerIcon.className = 'cbn-overlay-header-icon';
      headerIcon.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
          '<path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>';

      var headerTitle = document.createElement('span');
      headerTitle.className = 'cbn-overlay-header-title';
      headerTitle.textContent = ChatI18n.t('bookingNotifOverlayTitle');

      var closeBtn = document.createElement('button');
      closeBtn.className = 'cbn-overlay-close';
      closeBtn.setAttribute('aria-label', ChatI18n.t('bookingNotifClose'));
      closeBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>';

      header.appendChild(headerIcon);
      header.appendChild(headerTitle);
      header.appendChild(closeBtn);
      panel.appendChild(header);

      /* Body */
      var body = document.createElement('div');
      body.className = 'cbn-overlay-body';

      /* Parties */
      var parties = document.createElement('div');
      parties.className = 'cbn-overlay-parties';

      function _makeParty(labelText, valueText) {
        var row = document.createElement('div');
        row.className = 'cbn-overlay-party';
        var lbl = document.createElement('span');
        lbl.className = 'cbn-overlay-party-label';
        lbl.textContent = labelText;
        var val = document.createElement('span');
        val.className = 'cbn-overlay-party-name';
        val.textContent = valueText;
        row.appendChild(lbl);
        row.appendChild(val);
        return row;
      }

      parties.appendChild(_makeParty(ChatI18n.t('bookingNotifTeacher'), tName));
      parties.appendChild(_makeParty(ChatI18n.t('bookingNotifStudent'), sName));
      if (snap.pricePerSlot > 0) {
        parties.appendChild(_makeParty(ChatI18n.t('bookingNotifPrice'), fmt(snap.pricePerSlot)));
      }
      body.appendChild(parties);

      /* Per-block sections */
      for (var bi = 0; bi < blocks.length; bi++) {
        var bl = blocks[bi];
        var section = document.createElement('div');
        section.className = 'cbn-overlay-section';

        var secDate = document.createElement('div');
        secDate.className = 'cbn-overlay-section-date';
        secDate.textContent = bl.dateLabel || '';
        section.appendChild(secDate);

        var slotTimes = bl.slotTimes || [];
        if (slotTimes.length) {
          for (var si = 0; si < slotTimes.length; si++) {
            var st = slotTimes[si];
            var slotRow = document.createElement('div');
            slotRow.className = 'cbn-overlay-slot-row';

            var slotTime = document.createElement('span');
            slotTime.className = 'cbn-overlay-slot-time';
            slotTime.textContent = st.time || '';

            var slotDur = document.createElement('span');
            slotDur.className = 'cbn-overlay-slot-dur';
            slotDur.textContent = '30 min';

            slotRow.appendChild(slotTime);
            slotRow.appendChild(slotDur);

            if (snap.pricePerSlot > 0) {
              var slotAmt = document.createElement('span');
              slotAmt.className = 'cbn-overlay-slot-amt';
              slotAmt.textContent = fmt(snap.pricePerSlot);
              slotRow.appendChild(slotAmt);
            }
            section.appendChild(slotRow);
          }
        } else {
          var fbRow = document.createElement('div');
          fbRow.className = 'cbn-overlay-slot-row';

          var fbTime = document.createElement('span');
          fbTime.className = 'cbn-overlay-slot-time';
          fbTime.textContent = (bl.timeStart || '') + '\u2013' + (bl.timeEnd || '');

          var fbDur = document.createElement('span');
          fbDur.className = 'cbn-overlay-slot-dur';
          fbDur.textContent = (bl.slotCount || 0) + ' ' + ChatI18n.t('bookingNotifSlots');

          fbRow.appendChild(fbTime);
          fbRow.appendChild(fbDur);

          if (bl.amount > 0) {
            var fbAmt = document.createElement('span');
            fbAmt.className = 'cbn-overlay-slot-amt';
            fbAmt.textContent = fmt(bl.amount);
            fbRow.appendChild(fbAmt);
          }
          section.appendChild(fbRow);
        }
        body.appendChild(section);
      }

      /* Total */
      var totalEl = document.createElement('div');
      totalEl.className = 'cbn-overlay-total';
      var totalLbl = document.createElement('span');
      totalLbl.textContent = totalSlots + ' ' + ChatI18n.t('bookingNotifSlots');
      var totalAmtEl = document.createElement('span');
      totalAmtEl.className = 'cbn-overlay-total-amt';
      totalAmtEl.textContent = fmt(totalAmount);
      totalEl.appendChild(totalLbl);
      totalEl.appendChild(totalAmtEl);
      body.appendChild(totalEl);

      panel.appendChild(body);

      /* Footer */
      var footerEl = document.createElement('div');
      footerEl.className = 'cbn-overlay-footer';

      /* ── Contact (TX inquiry) button ── */
      var contactBtn = document.createElement('button');
      contactBtn.className = 'btn btn-secondary cbn-contact-btn';
      contactBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H4l-3 3V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
        '</svg>';
      var otherUid  = (snap.actorRole === 'student') ? snap.teacherId : snap.studentId;
      var otherName = (snap.actorRole === 'student')
        ? (snap.teacherName || ProfileStore.getDisplayName(snap.teacherId || ''))
        : (snap.studentName || ProfileStore.getDisplayName(snap.studentId || ''));
      contactBtn.appendChild(document.createTextNode(otherName + ' ' + ChatI18n.t('bookingNotifContactBtn')));

      /* ── Full details button ── */
      var detailBtn = document.createElement('button');
      detailBtn.className = 'btn btn-secondary cbn-detail-btn';
      detailBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/>' +
          '<path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>';
      detailBtn.appendChild(document.createTextNode(ChatI18n.t('bookingNotifDetailBtn')));

      /* ── Wallet button ── */
      var walletBtn = document.createElement('button');
      walletBtn.className = 'btn btn-primary cbn-wallet-btn';
      walletBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>' +
          '<path d="M1 7h14M5 1l-2 3M11 1l2 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '<circle cx="12" cy="10.5" r="1" fill="currentColor"/>' +
        '</svg>';
      walletBtn.appendChild(document.createTextNode(ChatI18n.t('bookingNotifWalletBtn')));

      footerEl.appendChild(contactBtn);
      footerEl.appendChild(detailBtn);
      footerEl.appendChild(walletBtn);
      panel.appendChild(footerEl);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      /* Close logic */
      function closeOverlay() {
        overlay.classList.remove('is-open');
        setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
      }

      closeBtn.addEventListener('click', closeOverlay);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) closeOverlay(); });
      document.addEventListener('keydown', function escKey(e) {
        if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escKey); }
      });

      /* ── Shared TX lookup by slotId ─────────────────────── */
      function _findTxBySlot(cb) {
        var firstSlotId = (snap.blocks && snap.blocks[0] && snap.blocks[0].slotIds && snap.blocks[0].slotIds[0]) || null;
        if (!firstSlotId || !actorUid || typeof AppService === 'undefined') { cb(null); return; }
        AppService.getTransactions(actorUid, function(err, txs) {
          if (err || !txs) { cb(null); return; }
          var found = null;
          for (var ti = 0; ti < txs.length; ti++) {
            var m = txs[ti].meta || {};
            /* Single slotId (escrow, move TXs) */
            if (m.slotId === firstSlotId || m.slotIdNew === firstSlotId || m.slotIdOld === firstSlotId) {
              found = txs[ti]; break;
            }
            /* Array slotIds (booking block TXs) */
            if (m.slotIds && typeof m.slotIds.indexOf === 'function' && m.slotIds.indexOf(firstSlotId) !== -1) {
              found = txs[ti]; break;
            }
          }
          cb(found);
        });
      }

      /* Contact button */
      contactBtn.addEventListener('click', function() {
        closeOverlay();
        if (typeof WalletCore === 'undefined' || !WalletCore.showTxInquiry) return;
        _findTxBySlot(function(tx) {
          if (!tx) {
            /* Fallback: open chat directly without TX context */
            if (typeof ChatPanel !== 'undefined' && ChatPanel.openWith) {
              ChatPanel.openWith(otherUid);
            }
            return;
          }
          WalletCore.showTxInquiry(tx, actorUid, otherUid, otherName);
        });
      });

      /* Full details button */
      detailBtn.addEventListener('click', function() {
        closeOverlay();
        if (typeof WalletCore === 'undefined' || !WalletCore.showTxDetail) return;
        _findTxBySlot(function(tx) {
          if (!tx) {
            if (typeof Toast !== 'undefined') Toast.error('Transaktion nicht gefunden.');
            return;
          }
          WalletCore.showTxDetail(tx, actorUid);
        });
      });

      /* Wallet button */
      walletBtn.addEventListener('click', function() {
        closeOverlay();
        close();
        var firstSlotId = (snap.blocks && snap.blocks[0] && snap.blocks[0].slotIds && snap.blocks[0].slotIds[0]) || null;
        if (typeof WalletPanel !== 'undefined' && typeof WalletPanel.scrollToTx === 'function') {
          var nb = document.getElementById('nav-wallet');
          if (nb) nb.click();
          if (firstSlotId) {
            setTimeout(function() { WalletPanel.scrollToTx(null, firstSlotId, actorUid); }, 350);
          }
        } else {
          var uid = actorUid || (typeof Auth !== 'undefined' && Auth.current() ? Auth.current().uid : '');
          var href = './wallet.html?uid=' + encodeURIComponent(uid);
          if (firstSlotId) href += '&highlightSlot=' + encodeURIComponent(firstSlotId);
          window.location.href = href;
        }
      });

      requestAnimationFrame(function() { overlay.classList.add('is-open'); });
    } catch(e) {
      _debugLog('_showBookingNotifOverlay error: ' + e.message);
      if (typeof Toast !== 'undefined') Toast.error('Overlay-Fehler: ' + (e.message || e));
    }
  }

  function _respondBookingRequest(msgId, response, teacherId, studentId, slotData) {
    try {
      ChatStore.respondBookingRequest(msgId, response, teacherId, studentId);
      if (response === 'accepted' && slotData && slotData.slotId) {
        /* Execute the actual booking */
        AppService.bookSlotWithEscrowSilent(slotData.slotId, studentId, slotData.teacherId || '', function(err) {
          if (err) {
            Toast.error('Buchung fehlgeschlagen: ' + (err.message || err));
          } else {
            Toast.success(ChatI18n.t('bookingRequestApproved'));
            /* Email notifications */
            if (typeof EmailService !== 'undefined') {
              var tName = ProfileStore.getDisplayName(teacherId);
              var sName = ProfileStore.getDisplayName(studentId);
              EmailService.onBookingCreated(studentId, {
                actorName: tName, date: slotData.dateLabel || slotData.date || '',
                time: slotData.time || '', endTime: slotData.endTime || '',
                teacherName: tName, studentName: sName
              });
              EmailService.onBookingCreated(teacherId, {
                actorName: sName, date: slotData.dateLabel || slotData.date || '',
                time: slotData.time || '', endTime: slotData.endTime || '',
                teacherName: tName, studentName: sName
              });
            }
          }
          _renderMessages();
        }, 'teacher');
      } else if (response === 'declined') {
        Toast.info(ChatI18n.t('bookingRequestDeclined'));
        _renderMessages();
      }
    } catch(e) {
      _debugLog('_respondBookingRequest error: ' + e.message);
    }
  }

  function _respondServiceRequest(msgId, response, teacherId, studentId) {
    try {
      ChatStore.respondServiceRequest(msgId, response, teacherId, studentId);
      if (response === 'accepted') {
        /* Create selection only now — after teacher approval */
        AppService.createSelection(studentId, teacherId, function(e) {
          if (e) _debugLog('createSelection error: ' + e.message);
        });
      }
      if (response === 'declined') {
        AppService.deleteSelection(studentId, teacherId, function(e) {
          if (e) _debugLog('deleteSelection error: ' + e.message);
        });
      }
      _renderMessages();
      if (_activePartner) _updateInputLock(_activePartner.uid);
      var sName   = ProfileStore.getDisplayName(studentId);
      var tName   = ProfileStore.getDisplayName(_currentUser.uid);
      if (response === 'accepted') {
        Toast.success(ChatI18n.t('serviceAccepted').replace('{name}', sName));
        EmailService.onRequestAccepted(studentId, tName);
        /* Fix 3: notify student via chat when teacher accepts */
        (function() {
          var all = _load();
          var key = _conversationKey(teacherId, studentId);
          var notifyMsg = {
            msgId: (typeof _uuid !== 'undefined' ? _uuid() : Math.random().toString(36).slice(2)),
            conversationKey: key,
            senderId: 'SYSTEM',
            receiverId: studentId,
            text: '',
            type: 'service',
            isService: true,
            serviceEvent: 'request_accepted_notify',
            teacherId: teacherId,
            studentId: studentId,
            teacherName: tName,
            readStatus: 'sent',
            edited: false, deleted: false,
            createdAt: (typeof _now !== 'undefined' ? _now() : new Date().toISOString())
          };
          all.push(notifyMsg);
          _save(all);
        }());
      }
      if (response === 'declined') {
        Toast.info(ChatI18n.t('serviceDeclined').replace('{name}', sName));
        EmailService.onRequestDeclined(studentId, tName);
        /* Fix 3: notify student via chat when teacher declines */
        (function() {
          var all = _load();
          var key = _conversationKey(teacherId, studentId);
          var notifyMsg = {
            msgId: (typeof _uuid !== 'undefined' ? _uuid() : Math.random().toString(36).slice(2)),
            conversationKey: key,
            senderId: 'SYSTEM',
            receiverId: studentId,
            text: '',
            type: 'service',
            isService: true,
            serviceEvent: 'request_declined_notify',
            teacherId: teacherId,
            studentId: studentId,
            teacherName: tName,
            readStatus: 'sent',
            edited: false, deleted: false,
            createdAt: (typeof _now !== 'undefined' ? _now() : new Date().toISOString())
          };
          all.push(notifyMsg);
          _save(all);
        }());
      }
    } catch(e) {
      _debugLog('_respondServiceRequest error: ' + e.message);
    }
  }

  function _buildDateDivider(label) {
    var el = document.createElement('div');
    el.className = 'chat-date-divider';
    el.innerHTML =
      '<div class="chat-date-divider-line"></div>' +
      '<span class="chat-date-divider-label">' + _escapeHTML(label) + '</span>' +
      '<div class="chat-date-divider-line"></div>';
    return el;
  }

  /* ── Booking Notification Bubble ─────────────────────────
     Renders booking_notification messages as a standard chat
     bubble — same look as the original plain-text booking
     messages, with structured content + clickable Details.  */
  function _buildBookingNotifBubble(msg) {
    var snap      = msg.bookingSnapshot || {};
    var blocks    = snap.blocks || [];
    var actorRole = snap.actorRole || 'student';
    var tName     = snap.teacherName || ProfileStore.getDisplayName(snap.teacherId || '');
    var sName     = snap.studentName || ProfileStore.getDisplayName(snap.studentId || '');
    var actorUid  = _currentUser ? _currentUser.uid : null;

    function fmtA(amt) {
      if (typeof _fmtForUser === 'function') return _fmtForUser(amt || 0, actorUid);
      if (typeof fmtPrice    === 'function') return fmtPrice(amt || 0, 'EUR');
      return '\u20ac' + parseFloat(amt || 0).toFixed(2).replace('.', ',');
    }

    var isOut = msg.senderId === _currentUser.uid;
    var wrap  = document.createElement('div');
    wrap.className = 'chat-msg ' + (isOut ? 'chat-msg-out' : 'chat-msg-in');
    wrap.setAttribute('data-msg-id', msg.msgId);

    /* Avatar for incoming messages */
    var avatarHTML = '';
    if (!isOut && _activePartner) {
      var pPhoto   = ProfileStore.getPhoto(_activePartner.uid);
      var pDisplay = ProfileStore.getDisplayName(_activePartner.uid);
      if (pPhoto) {
        avatarHTML = '<div class="chat-bubble-avatar chat-bubble-avatar-photo"><img src="' + pPhoto + '" alt="' + _escapeHTML(pDisplay) + '" /></div>';
      } else {
        avatarHTML = '<div class="chat-bubble-avatar role-' + _activePartner.role + '">' + _initials(pDisplay) + '</div>';
      }
    }

    /* Build bubble text lines */
    var lines = [];

    /* Who line */
    var whoLine = actorRole === 'student'
      ? ChatI18n.t('bookingNotifByStudent').replace('{student}', sName).replace('{teacher}', tName)
      : ChatI18n.t('bookingNotifByTeacher').replace('{teacher}', tName).replace('{student}', sName);
    lines.push('\uD83D\uDCC5 ' + whoLine);

    /* One line per block */
    for (var bi = 0; bi < blocks.length; bi++) {
      var bl = blocks[bi];
      var blockLine = (bl.dateLabel || '') + ', ' +
        (bl.timeStart || '') + '\u2013' + (bl.timeEnd || '') +
        ' \u00b7 ' + bl.slotCount + ' ' + ChatI18n.t('bookingNotifSlots') +
        ' \u00b7 ' + fmtA(bl.amount);
      lines.push(blockLine);
    }

    /* Total line if more than 1 block */
    if (blocks.length > 1) {
      lines.push(ChatI18n.t('bookingNotifTotal') + ': ' + snap.totalSlots + ' ' + ChatI18n.t('bookingNotifSlots') + '  ' + fmtA(snap.totalAmount));
    }

    var textContent = lines.join('\n');
    var statusHTML  = isOut ? _buildStatusHTML(msg.readStatus) : '';
    var metaTime    = _formatTime(new Date(msg.createdAt));

    /* Bubble content: text lines + Details link */
    var bubbleInner = document.createElement('div');
    bubbleInner.className = 'chat-bubble ' + (isOut ? 'chat-bubble-out' : 'chat-bubble-in') + ' chat-booking-notif-bubble';

    var textEl = document.createElement('div');
    textEl.className = 'chat-booking-notif-bubble-text';
    textEl.textContent = textContent;
    bubbleInner.appendChild(textEl);

    /* Details link */
    var detailsLink = document.createElement('button');
    detailsLink.className = 'chat-booking-notif-bubble-link';
    detailsLink.textContent = ChatI18n.t('bookingNotifDetailsBtn') + ' \u203a';
    bubbleInner.appendChild(detailsLink);

    var bubbleMeta = document.createElement('div');
    bubbleMeta.className = 'chat-bubble-meta';
    bubbleMeta.innerHTML =
      '<span class="chat-bubble-time">' + metaTime + '</span>' + statusHTML;

    var bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'chat-bubble-wrap';
    bubbleWrap.appendChild(bubbleInner);
    bubbleWrap.appendChild(bubbleMeta);

    wrap.innerHTML = avatarHTML;
    wrap.appendChild(bubbleWrap);

    /* Wire Details button */
    (function(snapshot, uid) {
      detailsLink.addEventListener('click', function(e) {
        e.stopPropagation();
        _showBookingNotifOverlay(snapshot, uid);
      });
    })(snap, actorUid);

    return wrap;
  }

  function _buildMoveBubble(msg) {
    var snap       = msg.moveSnapshot || {};
    var actorRole  = snap.actorRole || 'student';
    var tName      = snap.teacherName || ProfileStore.getDisplayName(snap.teacherId || '');
    var sName      = snap.studentName || ProfileStore.getDisplayName(snap.studentId || '');
    var actorUid   = _currentUser ? _currentUser.uid : null;

    var isOut  = msg.senderId === (actorUid || '');
    var wrap   = document.createElement('div');
    wrap.className = 'chat-msg ' + (isOut ? 'chat-msg-out' : 'chat-msg-in');
    wrap.setAttribute('data-msg-id', msg.msgId);

    /* Avatar for incoming */
    var avatarHTML = '';
    if (!isOut && _activePartner) {
      var pPhoto   = ProfileStore.getPhoto(_activePartner.uid);
      var pDisplay = ProfileStore.getDisplayName(_activePartner.uid);
      if (pPhoto) {
        avatarHTML = '<div class="chat-bubble-avatar chat-bubble-avatar-photo"><img src="' + pPhoto + '" alt="' + _escapeHTML(pDisplay) + '" /></div>';
      } else {
        avatarHTML = '<div class="chat-bubble-avatar role-' + _activePartner.role + '">' + _initials(pDisplay) + '</div>';
      }
    }

    /* Who line */
    var whoLine = actorRole === 'student'
      ? ChatI18n.t('moveNotifByStudent').replace('{student}', sName)
      : ChatI18n.t('moveNotifByTeacher').replace('{teacher}', tName);

    /* Format date+time labels */
    function _fmtMoveDate(dateStr, timeStr, endStr) {
      if (!dateStr) return timeStr || '';
      var d = new Date(dateStr + 'T00:00:00');
      var dl = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
      return dl + ' ' + (timeStr || '') + (endStr ? '\u2013' + endStr : '');
    }

    var fromLine = ChatI18n.t('moveNotifFrom') + ': ' + _fmtMoveDate(snap.oldDate, snap.oldTime, snap.oldEndTime);
    var toLine   = ChatI18n.t('moveNotifTo')   + ': ' + _fmtMoveDate(snap.newDate, snap.newTime, snap.newEndTime);

    var lines = ['\uD83D\uDCC6 ' + whoLine, fromLine, toLine];

    if (snap.reasonLabel) {
      lines.push(ChatI18n.t('moveNotifReason') + ': ' + snap.reasonLabel);
    }
    if (snap.note) {
      lines.push('\u201e' + snap.note + '\u201c');
    }

    var textContent = lines.join('\n');
    var metaTime    = _formatTime(new Date(msg.createdAt));
    var statusHTML  = isOut ? _buildStatusHTML(msg.readStatus) : '';

    var bubbleInner = document.createElement('div');
    bubbleInner.className = 'chat-bubble ' + (isOut ? 'chat-bubble-out' : 'chat-bubble-in') + ' chat-move-notif-bubble';

    var textEl = document.createElement('div');
    textEl.className  = 'chat-booking-notif-bubble-text';
    textEl.textContent = textContent;
    bubbleInner.appendChild(textEl);

    var metaEl = document.createElement('div');
    metaEl.className = 'chat-bubble-meta';
    metaEl.innerHTML = metaTime + statusHTML;
    bubbleInner.appendChild(metaEl);

    if (avatarHTML) {
      wrap.innerHTML = avatarHTML;
      wrap.appendChild(bubbleInner);
    } else {
      wrap.appendChild(bubbleInner);
    }
    return wrap;
  }


  function _buildTextBubble(msg) {
    var isOut    = msg.senderId === _currentUser.uid;
    var wrap     = document.createElement('div');
    wrap.className = 'chat-msg ' + (isOut ? 'chat-msg-out' : 'chat-msg-in');
    wrap.setAttribute('data-msg-id', msg.msgId);

    var avatarHTML = '';
    if (!isOut) {
      var _partnerPhoto    = ProfileStore.getPhoto(_activePartner.uid);
      var _partnerDisplay  = ProfileStore.getDisplayName(_activePartner.uid);
      if (_partnerPhoto) {
        avatarHTML = '<div class="chat-bubble-avatar chat-bubble-avatar-photo"><img src="' + _partnerPhoto + '" alt="' + _escapeHTML(_partnerDisplay) + '" /></div>';
      } else {
        avatarHTML = '<div class="chat-bubble-avatar role-' + _activePartner.role + '">' + _initials(_partnerDisplay) + '</div>';
      }
    }

    var editedHTML = msg.edited ? '<span class="chat-edited-tag">(' + ChatI18n.t('edited') + ')</span>' : '';
    var statusHTML = isOut ? _buildStatusHTML(msg.readStatus) : '';

    var displayText;
    var metaTime;
    if (msg.deleted) {
      displayText = '<em class="msg-deleted">Nachricht gelöscht</em>';
      var deletedDate = msg.deletedAt ? new Date(msg.deletedAt) : new Date(msg.createdAt);
      metaTime = _formatTime(deletedDate);
    } else {
      displayText = _escapeHTML(msg.text) + editedHTML;
      metaTime    = _formatTime(new Date(msg.createdAt));
    }

    var bubbleHTML =
      '<div class="chat-bubble-wrap">' +
        '<div class="chat-bubble ' + (isOut ? 'chat-bubble-out' : 'chat-bubble-in') + (msg.deleted ? ' chat-bubble-deleted' : '') + '">' +
          displayText +
        '</div>' +
        '<div class="chat-bubble-meta">' +
          '<span class="chat-bubble-time">' + metaTime + '</span>' +
          (msg.deleted ? '' : statusHTML) +
        '</div>' +
      '</div>';
    wrap.innerHTML = avatarHTML + bubbleHTML;

    if (isOut && !msg.deleted) {
      var bubble = wrap.querySelector('.chat-bubble');
      if (bubble) {
        _bindBubbleContextMenu(bubble, msg);
      }
    }

    return wrap;
  }

  function _buildBookingBubble(msg) {
    var isOut   = msg.senderId === _currentUser.uid;
    var wrap    = document.createElement('div');
    wrap.className = 'chat-msg ' + (isOut ? 'chat-msg-out' : 'chat-msg-in');
    wrap.setAttribute('data-msg-id', msg.msgId);

    var avatarHTML = '';
    if (!isOut) {
      var _bPartnerPhoto   = ProfileStore.getPhoto(_activePartner.uid);
      var _bPartnerDisplay = ProfileStore.getDisplayName(_activePartner.uid);
      if (_bPartnerPhoto) {
        avatarHTML = '<div class="chat-bubble-avatar chat-bubble-avatar-photo"><img src="' + _bPartnerPhoto + '" alt="' + _escapeHTML(_bPartnerDisplay) + '" /></div>';
      } else {
        avatarHTML = '<div class="chat-bubble-avatar role-' + _activePartner.role + '">' + _initials(_bPartnerDisplay) + '</div>';
      }
    }

    var bd = msg.bookingData || {};
    var withName = bd.with || ProfileStore.getDisplayName(_activePartner.uid);

    var actionsHTML = '';
    if (msg.bookingStatus === 'pending' && !isOut) {
      actionsHTML =
        '<div class="chat-booking-actions">' +
          '<button class="btn btn-secondary btn-sm chat-booking-decline-btn" data-msg-id="' + msg.msgId + '">' + ChatI18n.t('bookingDecline') + '</button>' +
          '<button class="btn btn-primary btn-sm chat-booking-accept-btn" data-msg-id="' + msg.msgId + '">' + ChatI18n.t('bookingAccept') + '</button>' +
        '</div>';
    } else if (msg.bookingStatus === 'accepted') {
      actionsHTML =
        '<div class="chat-booking-status chat-booking-status-accepted">' +
          ChatI18n.t('bookingAccepted') +
        '</div>';
    } else if (msg.bookingStatus === 'declined') {
      actionsHTML =
        '<div class="chat-booking-status chat-booking-status-declined">' +
          ChatI18n.t('bookingDeclined') +
        '</div>';
    } else if (msg.bookingStatus === 'pending' && isOut) {
      actionsHTML =
        '<div class="chat-booking-status">Ausstehend…</div>';
    }

    var statusHTML = isOut ? _buildStatusHTML(msg.readStatus) : '';

    var bubbleHTML =
      '<div class="chat-bubble-wrap">' +
        '<div class="chat-booking-bubble">' +
          '<div class="chat-booking-header">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
            ChatI18n.t('bookingProposal') +
          '</div>' +
          '<div class="chat-booking-body">' +
            '<div class="chat-booking-date">' + _escapeHTML(bd.date || '') + '</div>' +
            '<div class="chat-booking-time">' + _escapeHTML((bd.timeStart || '') + ' – ' + (bd.timeEnd || '') + ' Uhr') + '</div>' +
            '<div class="chat-booking-with">mit ' + _escapeHTML(withName) + '</div>' +
          '</div>' +
          actionsHTML +
        '</div>' +
        '<div class="chat-bubble-meta">' +
          '<span class="chat-bubble-time">' + _formatTime(new Date(msg.createdAt)) + '</span>' +
          statusHTML +
        '</div>' +
      '</div>';

    wrap.innerHTML = avatarHTML + bubbleHTML;

    var acceptBtn  = wrap.querySelector('.chat-booking-accept-btn');
    var declineBtn = wrap.querySelector('.chat-booking-decline-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function() {
        _respondBooking(msg.msgId, 'accepted');
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener('click', function() {
        _respondBooking(msg.msgId, 'declined');
      });
    }

    return wrap;
  }

  function _buildStatusHTML(status) {
    if (status === 'sent') {
      return '<span class="chat-read-status" title="' + ChatI18n.t('statusSent') + '">' +
        '<svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke="var(--neutral-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>';
    }
    if (status === 'delivered') {
      return '<span class="chat-read-status" title="' + ChatI18n.t('statusDelivered') + '">' +
        '<svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5l4 4L13 1" stroke="var(--neutral-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5l4 4L18 1" stroke="var(--neutral-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>';
    }
    if (status === 'read') {
      return '<span class="chat-read-status" title="' + ChatI18n.t('statusRead') + '">' +
        '<svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5l4 4L13 1" stroke="var(--color-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5l4 4L18 1" stroke="var(--color-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>';
    }
    return '';
  }

  /* ── Context Menu ─────────────────────────────────── */
  function _bindBubbleContextMenu(bubble, msg) {
    var pressTimer = null;

    bubble.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      pressTimer = setTimeout(function() {
        _showContextMenu(e.clientX, e.clientY, msg);
      }, 500);
    });

    bubble.addEventListener('mouseup',   function() { clearTimeout(pressTimer); });
    bubble.addEventListener('mouseleave',function() { clearTimeout(pressTimer); });

    bubble.addEventListener('touchstart', function(e) {
      var touch = e.touches[0];
      pressTimer = setTimeout(function() {
        _showContextMenu(touch.clientX, touch.clientY, msg);
      }, 500);
    }, { passive: true });

    bubble.addEventListener('touchend',  function() { clearTimeout(pressTimer); });
    bubble.addEventListener('touchmove', function() { clearTimeout(pressTimer); });

    bubble.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      _showContextMenu(e.clientX, e.clientY, msg);
    });
  }

  function _showContextMenu(x, y, msg) {
    try {
      _closeContextMenu();

      _contextMenu = document.createElement('div');
      _contextMenu.className = 'chat-context-menu';
      _contextMenu.id        = 'chat-context-menu';

      var editBtn = document.createElement('button');
      editBtn.className = 'chat-ctx-btn';
      editBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        ChatI18n.t('msgEdit');
      editBtn.addEventListener('click', function() {
        _closeContextMenu();
        _startEdit(msg);
      });

      var divider = document.createElement('div');
      divider.className = 'chat-ctx-divider';

      var delBtn = document.createElement('button');
      delBtn.className = 'chat-ctx-btn chat-ctx-btn-danger';
      delBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        ChatI18n.t('msgDelete');
      delBtn.addEventListener('click', function() {
        _closeContextMenu();
        _confirmDelete(msg.msgId);
      });

      _contextMenu.appendChild(editBtn);
      _contextMenu.appendChild(divider);
      _contextMenu.appendChild(delBtn);

      document.body.appendChild(_contextMenu);

      var menuW = 160;
      var menuH = 90;
      var left  = Math.min(x, window.innerWidth  - menuW - 8);
      var top   = Math.min(y, window.innerHeight - menuH - 8);

      _contextMenu.style.left = left + 'px';
      _contextMenu.style.top  = top  + 'px';

      setTimeout(function() {
        document.addEventListener('click', _closeContextMenu);
        document.addEventListener('keydown', _ctxKeydown);
      }, 10);
    } catch(e) {
      _debugLog('_showContextMenu error: ' + e.message);
    }
  }

  function _ctxKeydown(e) {
    if (e.key === 'Escape') _closeContextMenu();
  }

  function _closeContextMenu() {
    if (_contextMenu) {
      _contextMenu.remove();
      _contextMenu = null;
      document.removeEventListener('click', _closeContextMenu);
      document.removeEventListener('keydown', _ctxKeydown);
    }
  }

  /* ── Delete ───────────────────────────────────────── */
  function _confirmDelete(msgId) {
    try {
      var modal = Modal.show({
        title:      ChatI18n.t('deleteTitle'),
        bodyHTML:   '<p>' + ChatI18n.t('deleteBody') + '</p>',
        footerHTML:
          '<button class="btn btn-secondary" id="chat-del-cancel">' + ChatI18n.t('deleteCancel') + '</button>' +
          '<button class="btn btn-danger"    id="chat-del-confirm">' + ChatI18n.t('deleteConfirm') + '</button>'
      });

      setTimeout(function() {
        var confirmBtn = document.getElementById('chat-del-confirm');
        var cancelBtn  = document.getElementById('chat-del-cancel');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function() {
            ChatStore.deleteMsg(msgId);
            modal.close();
            _renderMessages();
            _renderPartnerList();
            Toast.success('Nachricht gelöscht');
          });
        }
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function() {
            modal.close();
          });
        }
      }, 50);
    } catch(e) {
      _debugLog('_confirmDelete error: ' + e.message);
    }
  }

  /* ── Edit ─────────────────────────────────────────── */
  function _startEdit(msg) {
    try {
      _editingMsgId = msg.msgId;
      var textarea   = document.getElementById('chat-textarea');
      var indicator  = document.getElementById('chat-edit-indicator');

      if (textarea)  textarea.value = msg.text;
      if (textarea)  _autoGrow(textarea);
      if (textarea)  textarea.focus();
      if (indicator) indicator.classList.add('is-visible');
    } catch(e) {
      _debugLog('_startEdit error: ' + e.message);
    }
  }

  function _cancelEdit() {
    _editingMsgId = null;
    var textarea   = document.getElementById('chat-textarea');
    var indicator  = document.getElementById('chat-edit-indicator');
    if (textarea)  { textarea.value = ''; textarea.style.height = ''; }
    if (indicator) indicator.classList.remove('is-visible');
  }

  /* ── Send ─────────────────────────────────────────── */
  function _handleSend() {
    try {
      var textarea = document.getElementById('chat-textarea');
      if (!textarea) { _debugLog('_handleSend: textarea not found'); return; }
      var text = textarea.value.trim();
      if (!text) return;
      if (!_activePartner) { _debugLog('_handleSend: no active partner'); return; }

      if (_editingMsgId) {
        ChatStore.editMsg(_editingMsgId, text);
        _cancelEdit();
        _renderMessages();
        _scrollToBottomRaf();
        return;
      }

      var msg = ChatStore.send(_currentUser.uid, _activePartner.uid, text, 'text');
      EmailService.onNewMessage(
        _activePartner.uid,
        ProfileStore.getDisplayName(_currentUser.uid),
        text.length > 80 ? text.slice(0, 80) + '…' : text
      );
      textarea.value = '';
      textarea.style.height = 'auto';

      var container = document.getElementById('chat-messages-body');
      if (!container) { _debugLog('_handleSend: messages container not found'); return; }

      var emptyEl = container.querySelector('.chat-empty');
      if (emptyEl) container.innerHTML = '';

      var today = new Date();
      var lastDivider = container.querySelector('.chat-date-divider:last-of-type');
      var needsDivider = true;
      if (lastDivider) {
        var lastLabel = lastDivider.querySelector('.chat-date-divider-label');
        if (lastLabel && lastLabel.textContent === _formatDateLabel(today)) needsDivider = false;
      }
      if (needsDivider && !lastDivider) {
        container.appendChild(_buildDateDivider(_formatDateLabel(today)));
      }

      container.appendChild(_buildTextBubble(msg));
      _scrollToBottomRaf();
    } catch(e) {
      _debugLog('_handleSend error: ' + e.message);
      Toast.error(ChatI18n.t('errorSend'));
    }
  }

  /* ── Booking Response ─────────────────────────────── */
  function _respondBooking(msgId, response) {
    try {
      ChatStore.respondBooking(msgId, response);
      _renderMessages();
      if (response === 'accepted') Toast.success(ChatI18n.t('bookingAccepted'));
      if (response === 'declined') Toast.info(ChatI18n.t('bookingDeclined'));
    } catch(e) {
      _debugLog('_respondBooking error: ' + e.message);
    }
  }

  /* ── Helpers ──────────────────────────────────────── */
  function _scrollToBottom() {
    var container = document.getElementById('chat-messages-body');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function _scrollToBottomRaf() {
    requestAnimationFrame(function() {
      var container = document.getElementById('chat-messages-body');
      if (container) container.scrollTop = container.scrollHeight;
    });
  }

  function _initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function _escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatTime(date) {
    try {
      var h = String(date.getHours()).padStart(2, '0');
      var m = String(date.getMinutes()).padStart(2, '0');
      return h + ':' + m;
    } catch(e) { return ''; }
  }

  function _formatDateLabel(date) {
    try {
      var today = new Date();
      var todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      var dateStr = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');

      if (dateStr === todayStr) return ChatI18n.t('today');

      var yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      var yStr = yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');
      if (dateStr === yStr) return ChatI18n.t('yesterday');

      var days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      var months = ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
      return days[date.getDay()] + ', ' + date.getDate() + '. ' + months[date.getMonth()] + ' ' + date.getFullYear();
    } catch(e) { return ''; }
  }

  function _fakeLastSeen() {
    var times = ['09:14', '11:32', '14:55', '08:07', '16:40'];
    return times[Math.floor(Math.random() * times.length)] + ' Uhr';
  }

  /* ── openWith ─────────────────────────────────────── */
  /* Öffnet den Chat direkt mit einem bestimmten Partner */
  function openWith(partnerUid) {
    try {
      if (!_currentUser) return;
      var partner = AppService.getUserSync(partnerUid);
      if (!partner) return;
      _isOpen = true;
      _overlay.classList.add('is-open');
      _panel.classList.add('is-open');
      document.body.classList.add('overlay-open');
      _showChatView(partner);
    } catch(e) {
      _debugLog('openWith error: ' + e.message);
    }
  }

  return {
    init:               init,
    open:               open,
    openWith:           openWith,
    close:              close,
    showBookingDetails: _showBookingNotifOverlay
  };

})();

window.ChatPanel = ChatPanel;
window.ChatStore = ChatStore;
window.ChatI18n  = ChatI18n;
