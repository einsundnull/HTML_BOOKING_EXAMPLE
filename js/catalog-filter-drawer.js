/**
 * catalog-filter-drawer.js
 *
 * Eigenständiges Objekt: CatalogFilterDrawer
 * Lädt das HTML-Template aus dialogs/catalog-filter-drawer.html,
 * injiziert es in #catalog-filter-drawer-root und stellt
 * das öffentliche API bereit.
 *
 * Öffentliches API:
 *   CatalogFilterDrawer.init(options)  — Initialisiert Drawer + Root
 *   CatalogFilterDrawer.open()         — Öffnet den Drawer
 *   CatalogFilterDrawer.close()        — Schließt den Drawer
 *   CatalogFilterDrawer.getFilters()   — Gibt aktuellen Filterzustand zurück
 *   CatalogFilterDrawer.setCount(n)    — Aktualisiert Live-Ergebniszahl im Footer
 *   CatalogFilterDrawer.reset()        — Setzt alle Filter zurück
 *
 * Callback:
 *   options.onChange(filters)  — Wird bei jeder Filteränderung aufgerufen
 *
 * i18n Namespace: skiing-catalog  (getriggert von skiing-catalog.html)
 *
 * Regeln: var only, function(){}, string concat, no arrow functions,
 *         no ?. or ??, no template literals, no inline styles
 *
 * Debug:  Alle Fehler aus dem Drawer werden über _showError() als
 *         angezeigtes Dialog-Fenster sichtbar gemacht (nicht nur console).
 */

var CatalogFilterDrawer = (function() {

  /* ── Zustand ──────────────────────────────────────────── */
  var _initialized = false;
  var _isOpen      = false;
  var _onChange    = null;
  var _i18n        = null;

  /* Filter-State */
  var _state = {
    discipline:      [],   /* string[] */
    level:           [],   /* string[] */
    lesson:          [],
    languages:       [],
    audience:        [],
    terrain:         [],
    specializations: [],
    priceMin:        0,
    priceMax:        300,
    expMin:          0,
    expMax:          40,
    location:        '',
    gender:          []
  };

  /* Defaults für Range-Reset */
  var PRICE_MIN_DEFAULT = 0;
  var PRICE_MAX_DEFAULT = 300; /* recalculated on open() via _recalcPriceMax() */
  var EXP_MIN_DEFAULT   = 0;
  var EXP_MAX_DEFAULT   = 40;

  /* ── Dynamic price ceiling ───────────────────────────────
     Called on every open(): reads all teacher prices,
     converts to the viewer's currency, rounds up to nearest 50.
     Falls back to 300 if no prices or rates unavailable.        */
  function _recalcPriceMax() {
    try {
      if (typeof AppService === 'undefined') return;
      var teachers = AppService.getUsersByRoleSync('teacher');
      if (!teachers || !teachers.length) return;

      var viewerUid = (typeof Auth !== 'undefined' && Auth.current())
        ? Auth.current().uid : null;
      var toCur = (typeof CurrencyService !== 'undefined')
        ? CurrencyService.getUserCurrency(viewerUid)
        : 'EUR';

      var maxInDisplay = 0;
      for (var i = 0; i < teachers.length; i++) {
        if (typeof ProfileStore === 'undefined') break;
        var p = ProfileStore.get(teachers[i].uid);
        if (!p || !p.pricePerHalfHour) continue;
        var raw     = parseFloat(p.pricePerHalfHour);
        var fromCur = p.priceCurrency || 'EUR';
        var converted = (typeof CurrencyService !== 'undefined')
          ? CurrencyService.convertSync(raw, fromCur, toCur)
          : raw;
        if (converted === null) converted = raw; /* rates not cached yet */
        if (converted > maxInDisplay) maxInDisplay = converted;
      }

      if (maxInDisplay > 0) {
        /* Round up to nearest 50 and add 20% headroom */
        var ceiling = Math.ceil((maxInDisplay * 1.2) / 50) * 50;
        PRICE_MAX_DEFAULT = Math.max(ceiling, 50); /* at least 50 */
      }

      _updatePriceRangeUI();
    } catch (err) {
      _showError('CatalogFilterDrawer._recalcPriceMax', err);
    }
  }

  /* ── Update price UI elements after max recalculation ─── */
  function _updatePriceRangeUI() {
    var minRange = document.getElementById('cfd-price-min-range');
    var maxRange = document.getElementById('cfd-price-max-range');
    var minInput = document.getElementById('cfd-price-min');
    var maxInput = document.getElementById('cfd-price-max');
    if (!minRange || !maxRange) return;

    /* Update range max attr */
    minRange.setAttribute('max', String(PRICE_MAX_DEFAULT));
    maxRange.setAttribute('max', String(PRICE_MAX_DEFAULT));
    if (minInput) minInput.setAttribute('max', String(PRICE_MAX_DEFAULT));
    if (maxInput) maxInput.setAttribute('max', String(PRICE_MAX_DEFAULT));

    /* If user hasn't touched the slider yet, snap max to new ceiling */
    if (_state.priceMax >= PRICE_MAX_DEFAULT - 50 || _state.priceMax === 300) {
      _state.priceMax     = PRICE_MAX_DEFAULT;
      maxRange.value      = String(PRICE_MAX_DEFAULT);
      if (maxInput) maxInput.value = String(PRICE_MAX_DEFAULT);
    }
    _updateRangeFill('cfd-price-fill', PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT,
      _state.priceMin, _state.priceMax);

    /* Update currency symbol in labels */
    _updatePriceCurrencyLabels();
  }

  /* ── Update Von/Bis currency label text ─────────────────── */
  function _updatePriceCurrencyLabels() {
    var viewerUid = (typeof Auth !== 'undefined' && Auth.current())
      ? Auth.current().uid : null;
    var toCur = (typeof CurrencyService !== 'undefined')
      ? CurrencyService.getUserCurrency(viewerUid)
      : 'EUR';
    var sym = (typeof CurrencyService !== 'undefined')
      ? CurrencyService.getSymbol(toCur)
      : toCur;

    var labelFrom = document.querySelector('label[for="cfd-price-min"]');
    var labelTo   = document.querySelector('label[for="cfd-price-max"]');
    if (labelFrom) labelFrom.textContent = 'Von (' + sym + ')';
    if (labelTo)   labelTo.textContent   = 'Bis (' + sym + ')';
  }

  /* ── Öffentliches API ─────────────────────────────────── */
  function init(options) {
    try {
      if (_initialized) return;
      options = options || {};
      _onChange = options.onChange || null;

      /* i18n laden wenn vorhanden */
      _loadI18n(function() {
        _loadTemplate(function() {
          _bindAll();
          _initialized = true;
        });
      });
    } catch (err) {
      _showError('CatalogFilterDrawer.init', err);
    }
  }

  function open() {
    try {
      /* Recalculate price ceiling in viewer's currency each time drawer opens */
      if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
        CurrencyService.onReady(function() { _recalcPriceMax(); });
      } else {
        _recalcPriceMax();
      }
      if (!_initialized) { _showError('CatalogFilterDrawer.open', new Error('Drawer nicht initialisiert.')); return; }
      var drawer  = document.getElementById('cfd-drawer');
      var overlay = document.getElementById('cfd-overlay');
      if (!drawer || !overlay) { _showError('CatalogFilterDrawer.open', new Error('DOM-Elemente nicht gefunden (#cfd-drawer / #cfd-overlay)')); return; }

      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overlay-open');
      _isOpen = true;

      /* Focus Management */
      var closeBtn = document.getElementById('cfd-close-btn');
      if (closeBtn) { setTimeout(function() { closeBtn.focus(); }, 50); }
    } catch (err) {
      _showError('CatalogFilterDrawer.open', err);
    }
  }

  function close() {
    try {
      var drawer  = document.getElementById('cfd-drawer');
      var overlay = document.getElementById('cfd-overlay');
      if (!drawer || !overlay) return;

      drawer.classList.remove('is-open');
      overlay.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('overlay-open');
      _isOpen = false;

      /* Fokus zurück auf Filter-Button */
      var filterBtn = document.getElementById('catalog-filter-btn');
      if (filterBtn) { setTimeout(function() { filterBtn.focus(); }, 50); }
    } catch (err) {
      _showError('CatalogFilterDrawer.close', err);
    }
  }

  function getFilters() {
    return {
      discipline:      _state.discipline.slice(),
      level:           _state.level.slice(),
      lesson:          _state.lesson.slice(),
      languages:       _state.languages.slice(),
      audience:        _state.audience.slice(),
      terrain:         _state.terrain.slice(),
      specializations: _state.specializations.slice(),
      priceMin:        _state.priceMin,
      priceMax:        _state.priceMax,
      expMin:          _state.expMin,
      expMax:          _state.expMax,
      location:        _state.location,
      gender:          _state.gender.slice()
    };
  }

  function setCount(n) {
    try {
      var label = document.getElementById('cfd-apply-label');
      if (!label) return;
      var t = _t('filterApply', '{n} Ergebnisse anzeigen');
      label.textContent = n > 0
        ? t.replace('{n}', String(n))
        : _t('filterApplyNone', 'Keine Ergebnisse');
    } catch (err) {
      _showError('CatalogFilterDrawer.setCount', err);
    }
  }

  function reset() {
    try {
      _resetState();
      _syncCheckboxesToState();
      _syncRangesToState();
      _syncLocationToState();
      _updateAllGroupBadges();
      _notifyChange();
    } catch (err) {
      _showError('CatalogFilterDrawer.reset', err);
    }
  }

  /* ── Template laden ───────────────────────────────────── */
  function _loadTemplate(callback) {
    var root = document.getElementById('catalog-filter-drawer-root');
    if (!root) {
      _showError('CatalogFilterDrawer._loadTemplate', new Error('Root-Element #catalog-filter-drawer-root nicht gefunden.'));
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', './dialogs/catalog-filter-drawer.html', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 0) {
        /* status 0 = file:// protocol */
        root.innerHTML = xhr.responseText;
        if (callback) callback();
      } else {
        _showError('CatalogFilterDrawer._loadTemplate',
          new Error('HTTP ' + xhr.status + ' beim Laden von catalog-filter-drawer.html'));
      }
    };
    xhr.onerror = function() {
      _showError('CatalogFilterDrawer._loadTemplate',
        new Error('Netzwerkfehler beim Laden von catalog-filter-drawer.html'));
    };
    xhr.send();
  }

  /* ── i18n laden ───────────────────────────────────────── */
  function _loadI18n(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', './locales/skiing-catalog.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          _i18n = JSON.parse(xhr.responseText);
        } catch (e) {
          /* Parsing-Fehler: weiter ohne i18n */
          _i18n = {};
        }
      }
      /* i18n ist optional — immer weitermachen */
      if (callback) callback();
    };
    xhr.onerror = function() {
      _i18n = {};
      if (callback) callback();
    };
    xhr.send();
  }

  function _t(key, fallback) {
    if (_i18n && _i18n[key]) return _i18n[key];
    return fallback || key;
  }

  /* ── Alle Event-Listener binden ───────────────────────── */
  function _bindAll() {
    try {
      _bindCloseAndOverlay();
      _bindKeyboard();
      _bindGroupTriggers();
      _bindCheckboxes();
      _bindRanges();
      _bindLocation();
      _bindResetBtn();
      _bindApplyBtn();
      _syncRangeFills();
    } catch (err) {
      _showError('CatalogFilterDrawer._bindAll', err);
    }
  }

  function _bindCloseAndOverlay() {
    var closeBtn = document.getElementById('cfd-close-btn');
    var overlay  = document.getElementById('cfd-overlay');
    if (closeBtn) closeBtn.addEventListener('click', function() { close(); });
    if (overlay)  overlay.addEventListener('click',  function() { close(); });
  }

  function _bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      if (!_isOpen) return;
      if (e.key === 'Escape') { close(); return; }

      /* Focus trap */
      if (e.key === 'Tab') {
        var drawer = document.getElementById('cfd-drawer');
        if (!drawer) return;
        var focusable = drawer.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        var els = [];
        for (var i = 0; i < focusable.length; i++) { els.push(focusable[i]); }
        if (!els.length) return;
        var first = els[0];
        var last  = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ── Accordion ────────────────────────────────────────── */
  function _bindGroupTriggers() {
    var body = document.getElementById('cfd-body');
    if (!body) return;
    body.addEventListener('click', function(e) {
      var trigger = _closest(e.target, '.cfd-group-trigger');
      if (!trigger) return;
      try {
        var group    = trigger.getAttribute('data-group');
        var panel    = document.getElementById('cfd-panel-' + group);
        var isOpen   = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        if (panel) {
          if (isOpen) { panel.setAttribute('hidden', ''); }
          else        { panel.removeAttribute('hidden'); }
        }
      } catch (err) {
        _showError('CatalogFilterDrawer (accordion)', err);
      }
    });
  }

  /* ── Checkboxen ───────────────────────────────────────── */
  var _CHECKBOX_GROUPS = ['discipline', 'level', 'lesson', 'languages', 'audience', 'terrain', 'specializations', 'gender'];

  function _bindCheckboxes() {
    var body = document.getElementById('cfd-body');
    if (!body) return;
    body.addEventListener('change', function(e) {
      var cb = e.target;
      if (cb.type !== 'checkbox' || !cb.classList.contains('cfd-checkbox')) return;
      try {
        var name = cb.getAttribute('name');
        var val  = cb.value;
        if (_CHECKBOX_GROUPS.indexOf(name) === -1) return;
        var arr = _state[name];
        if (cb.checked) {
          if (arr.indexOf(val) === -1) arr.push(val);
        } else {
          _state[name] = _removeFromArr(arr, val);
        }
        _updateGroupBadge(name);
        _notifyChange();
      } catch (err) {
        _showError('CatalogFilterDrawer (checkbox)', err);
      }
    });
  }

  function _syncCheckboxesToState() {
    for (var gi = 0; gi < _CHECKBOX_GROUPS.length; gi++) {
      var name = _CHECKBOX_GROUPS[gi];
      var panel = document.getElementById('cfd-panel-' + name);
      if (!panel) continue;
      var boxes = panel.querySelectorAll('.cfd-checkbox');
      for (var bi = 0; bi < boxes.length; bi++) {
        var cb  = boxes[bi];
        var arr = _state[name] || [];
        cb.checked = arr.indexOf(cb.value) !== -1;
      }
    }
  }

  /* ── Range Slider ─────────────────────────────────────── */
  function _bindRanges() {
    _bindRangeGroup('price',
      'cfd-price-min-range', 'cfd-price-max-range',
      'cfd-price-min', 'cfd-price-max',
      'cfd-price-fill',
      PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT,
      function(min, max) { _state.priceMin = min; _state.priceMax = max; }
    );
    _bindRangeGroup('experience',
      'cfd-exp-min-range', 'cfd-exp-max-range',
      'cfd-exp-min', 'cfd-exp-max',
      'cfd-exp-fill',
      EXP_MIN_DEFAULT, EXP_MAX_DEFAULT,
      function(min, max) { _state.expMin = min; _state.expMax = max; }
    );
  }

  function _bindRangeGroup(groupName, minRangeId, maxRangeId, minInputId, maxInputId, fillId, absMin, absMax, onUpdate) {
    var minRange = document.getElementById(minRangeId);
    var maxRange = document.getElementById(maxRangeId);
    var minInput = document.getElementById(minInputId);
    var maxInput = document.getElementById(maxInputId);

    if (!minRange || !maxRange) return;

    function sync() {
      try {
        var lo = parseInt(minRange.value, 10);
        var hi = parseInt(maxRange.value, 10);
        /* Prevent crossing */
        if (lo > hi) { lo = hi; minRange.value = String(lo); }
        if (hi < lo) { hi = lo; maxRange.value = String(hi); }
        if (minInput) minInput.value = String(lo);
        if (maxInput) maxInput.value = String(hi);
        _updateRangeFill(fillId, absMin, absMax, lo, hi);
        onUpdate(lo, hi);
        _updateGroupBadge(groupName);
        _notifyChange();
      } catch (err) {
        _showError('CatalogFilterDrawer (range-' + groupName + ')', err);
      }
    }

    minRange.addEventListener('input', function() {
      var lo = parseInt(minRange.value, 10);
      var hi = parseInt(maxRange.value, 10);
      if (lo > hi) { minRange.value = String(hi); }
      sync();
    });

    maxRange.addEventListener('input', function() {
      var lo = parseInt(minRange.value, 10);
      var hi = parseInt(maxRange.value, 10);
      if (hi < lo) { maxRange.value = String(lo); }
      sync();
    });

    /* Number inputs → range sync */
    if (minInput) {
      minInput.addEventListener('change', function() {
        try {
          var val = _clamp(parseInt(minInput.value, 10) || absMin, absMin, absMax);
          minInput.value   = String(val);
          minRange.value   = String(val);
          sync();
        } catch (err) { _showError('CatalogFilterDrawer (input-min-' + groupName + ')', err); }
      });
    }

    if (maxInput) {
      maxInput.addEventListener('change', function() {
        try {
          var val = _clamp(parseInt(maxInput.value, 10) || absMax, absMin, absMax);
          maxInput.value   = String(val);
          maxRange.value   = String(val);
          sync();
        } catch (err) { _showError('CatalogFilterDrawer (input-max-' + groupName + ')', err); }
      });
    }
  }

  function _syncRangesToState() {
    var refs = [
      { minId: 'cfd-price-min-range', maxId: 'cfd-price-max-range', minIn: 'cfd-price-min', maxIn: 'cfd-price-max', defMin: PRICE_MIN_DEFAULT, defMax: PRICE_MAX_DEFAULT, fillId: 'cfd-price-fill' },
      { minId: 'cfd-exp-min-range',   maxId: 'cfd-exp-max-range',   minIn: 'cfd-exp-min',   maxIn: 'cfd-exp-max',   defMin: EXP_MIN_DEFAULT,   defMax: EXP_MAX_DEFAULT,   fillId: 'cfd-exp-fill'   }
    ];
    for (var i = 0; i < refs.length; i++) {
      var r = refs[i];
      var minRange = document.getElementById(r.minId);
      var maxRange = document.getElementById(r.maxId);
      var minInput = document.getElementById(r.minIn);
      var maxInput = document.getElementById(r.maxIn);
      if (minRange) { minRange.value = String(r.defMin); }
      if (maxRange) { maxRange.value = String(r.defMax); }
      if (minInput) { minInput.value = String(r.defMin); }
      if (maxInput) { maxInput.value = String(r.defMax); }
      _updateRangeFill(r.fillId, r.defMin, r.defMax, r.defMin, r.defMax);
    }
    _state.priceMin = PRICE_MIN_DEFAULT;
    _state.priceMax = PRICE_MAX_DEFAULT;
    _state.expMin   = EXP_MIN_DEFAULT;
    _state.expMax   = EXP_MAX_DEFAULT;
  }

  function _syncRangeFills() {
    _updateRangeFill('cfd-price-fill', PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT, _state.priceMin, _state.priceMax);
    _updateRangeFill('cfd-exp-fill',   EXP_MIN_DEFAULT,   EXP_MAX_DEFAULT,   _state.expMin,   _state.expMax);
  }

  function _updateRangeFill(fillId, absMin, absMax, lo, hi) {
    var fill = document.getElementById(fillId);
    if (!fill) return;
    var range = absMax - absMin;
    if (range <= 0) return;
    var leftPct  = ((lo - absMin) / range) * 100;
    var rightPct = ((hi - absMin) / range) * 100;
    fill.style.left  = leftPct  + '%';
    fill.style.width = (rightPct - leftPct) + '%';
  }

  /* ── Location ─────────────────────────────────────────── */
  function _bindLocation() {
    var input = document.getElementById('cfd-location-input');
    if (!input) return;
    input.addEventListener('input', function() {
      try {
        _state.location = input.value.trim();
        _updateGroupBadge('location');
        _notifyChange();
      } catch (err) {
        _showError('CatalogFilterDrawer (location)', err);
      }
    });
  }

  function _syncLocationToState() {
    var input = document.getElementById('cfd-location-input');
    if (input) { input.value = ''; }
    _state.location = '';
  }

  /* ── Reset ────────────────────────────────────────────── */
  function _bindResetBtn() {
    var btn = document.getElementById('cfd-reset-btn');
    if (!btn) return;
    btn.addEventListener('click', function() { reset(); });
  }

  function _resetState() {
    _state.discipline      = [];
    _state.level           = [];
    _state.lesson          = [];
    _state.languages       = [];
    _state.audience        = [];
    _state.terrain         = [];
    _state.specializations = [];
    _state.priceMin        = PRICE_MIN_DEFAULT;
    _state.priceMax        = PRICE_MAX_DEFAULT;
    _state.expMin          = EXP_MIN_DEFAULT;
    _state.expMax          = EXP_MAX_DEFAULT;
    _state.location        = '';
    _state.gender          = [];
  }

  /* ── Apply ────────────────────────────────────────────── */
  function _bindApplyBtn() {
    var btn = document.getElementById('cfd-apply-btn');
    if (!btn) return;
    btn.addEventListener('click', function() { close(); });
  }

  /* ── Group Badges (active count) ──────────────────────── */
  var _RANGE_GROUPS = {
    price:      function() { return (_state.priceMin !== PRICE_MIN_DEFAULT || _state.priceMax !== PRICE_MAX_DEFAULT) ? 1 : 0; },
    experience: function() { return (_state.expMin !== EXP_MIN_DEFAULT || _state.expMax !== EXP_MAX_DEFAULT) ? 1 : 0; },
    location:   function() { return _state.location ? 1 : 0; }
  };

  function _updateGroupBadge(groupName) {
    var badge = document.getElementById('cfd-badge-' + groupName);
    if (!badge) return;
    var count = 0;
    if (_RANGE_GROUPS[groupName]) {
      count = _RANGE_GROUPS[groupName]();
    } else {
      var arr = _state[groupName];
      count = (arr && arr.length) ? arr.length : 0;
    }
    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('is-hidden');
    } else {
      badge.classList.add('is-hidden');
    }
  }

  function _updateAllGroupBadges() {
    var groups = ['discipline', 'level', 'lesson', 'languages', 'audience', 'terrain',
                  'specializations', 'price', 'experience', 'location', 'gender'];
    for (var i = 0; i < groups.length; i++) {
      _updateGroupBadge(groups[i]);
    }
  }

  /* ── Notify Consumer ──────────────────────────────────── */
  function _notifyChange() {
    if (_onChange) {
      try {
        _onChange(getFilters());
      } catch (err) {
        _showError('CatalogFilterDrawer._notifyChange (onChange-Callback)', err);
      }
    }
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function _removeFromArr(arr, val) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] !== val) result.push(arr[i]);
    }
    return result;
  }

  function _clamp(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

  /* ── Debug Error Dialog ───────────────────────────────── */
  function _showError(context, err) {
    /* Immer in console */
    if (typeof console !== 'undefined' && console.error) {
      console.error('[CatalogFilterDrawer] ' + context + ':', err);
    }

    /* Visueller Dialog — einmalig pro Fehler */
    try {
      var existing = document.getElementById('cfd-error-overlay');
      if (existing) {
        /* Fehler an bestehenden Dialog anhängen */
        var msg = existing.querySelector('.cfd-error-message');
        if (msg) {
          msg.textContent = msg.textContent + '\n\n[' + context + ']\n' + (err ? (err.message || String(err)) : 'Unbekannter Fehler');
        }
        return;
      }

      var overlay = document.createElement('div');
      overlay.className = 'cfd-error-overlay';
      overlay.id        = 'cfd-error-overlay';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'cfd-error-title');
      overlay.setAttribute('aria-describedby', 'cfd-error-message');

      var dialog = document.createElement('div');
      dialog.className = 'cfd-error-dialog';

      var header = document.createElement('div');
      header.className = 'cfd-error-header';

      var icon = document.createElement('span');
      icon.className = 'cfd-error-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 20 20" fill="none">' +
          '<circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>' +
          '<path d="M10 6v4M10 14h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
        '</svg>';

      var title = document.createElement('span');
      title.className = 'cfd-error-title';
      title.id        = 'cfd-error-title';
      title.textContent = 'Filter-Drawer Fehler';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'cfd-error-close';
      closeBtn.type      = 'button';
      closeBtn.setAttribute('aria-label', 'Fehlerdialog schließen');
      closeBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '</svg>';
      closeBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });

      var pre = document.createElement('pre');
      pre.className = 'cfd-error-message';
      pre.id        = 'cfd-error-message';
      pre.textContent = '[' + context + ']\n' + (err ? (err.message || String(err)) : 'Unbekannter Fehler');

      header.appendChild(icon);
      header.appendChild(title);
      header.appendChild(closeBtn);
      dialog.appendChild(header);
      dialog.appendChild(pre);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      /* ESC schließt Fehler-Dialog */
      overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });

      setTimeout(function() { closeBtn.focus(); }, 50);
    } catch (e2) {
      /* Fehler im Fehler-Handler — nur console */
      if (typeof console !== 'undefined' && console.error) {
        console.error('[CatalogFilterDrawer] Fehler im Error-Handler:', e2);
      }
    }
  }

  /* ── Öffentliches Interface ───────────────────────────── */
  function getPriceMax() { return PRICE_MAX_DEFAULT; }

  return {
    init:        init,
    open:        open,
    close:       close,
    getFilters:  getFilters,
    setCount:    setCount,
    reset:       reset,
    getPriceMax: getPriceMax
  };

}());
