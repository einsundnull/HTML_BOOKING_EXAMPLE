/**
 * currency-service.js — Currency Adapter Layer
 * v=1
 *
 * Central service for all currency operations.
 * Depends on: CurrencyProvider (mock OR live — load one before this file)
 *
 * Public API:
 *   CurrencyService.convert(amount, from, to, callback)
 *   CurrencyService.convertSync(amount, from, to)   ← uses cached rates
 *   CurrencyService.format(amount, currencyCode)
 *   CurrencyService.getSymbol(currencyCode)
 *   CurrencyService.getSupportedCurrencies()
 *   CurrencyService.warmUp(callback)                ← pre-load EUR rates
 *   CurrencyService.isMock()                        ← true in mockup mode
 *   CurrencyService.getRatesDisplay()               ← for UI rate table
 *
 * Regeln: var only, function(){}, no arrow, no template literals
 */

var CurrencyService = (function() {
  'use strict';

  /* ── System base currency (always EUR) ──────────────── */
  var BASE = 'EUR';

  /* ── Currency metadata ──────────────────────────────── */
  var CURRENCIES = [
    { code: 'EUR', symbol: '€',  name: 'Euro',             flag: '🇪🇺', decimals: 2 },
    { code: 'USD', symbol: '$',  name: 'US-Dollar',         flag: '🇺🇸', decimals: 2 },
    { code: 'GBP', symbol: '£',  name: 'Britisches Pfund',  flag: '🇬🇧', decimals: 2 },
    { code: 'CHF', symbol: 'Fr', name: 'Schweizer Franken', flag: '🇨🇭', decimals: 2 },
    { code: 'GEL', symbol: '₾',  name: 'Georgischer Lari',  flag: '🇬🇪', decimals: 2 },
    { code: 'JPY', symbol: '¥',  name: 'Japanischer Yen',   flag: '🇯🇵', decimals: 0 },
    { code: 'TRY', symbol: '₺',  name: 'Türkische Lira',    flag: '🇹🇷', decimals: 2 },
    { code: 'PLN', symbol: 'zł', name: 'Polnischer Zloty',  flag: '🇵🇱', decimals: 2 },
    { code: 'CZK', symbol: 'Kč', name: 'Tschechische Krone',flag: '🇨🇿', decimals: 2 },
    { code: 'SEK', symbol: 'kr', name: 'Schwedische Krone',  flag: '🇸🇪', decimals: 2 },
    { code: 'RUB', symbol: '₽',  name: 'Russischer Rubel',  flag: '🇷🇺', decimals: 2 },
    { code: 'AED', symbol: 'د.إ',name: 'Dirham (VAE)',       flag: '🇦🇪', decimals: 2 }
  ];

  /* ── In-memory rate cache {base: {rates, ts}} ────────── */
  var _rateCache = {};

  /* ── Metadata lookup ────────────────────────────────── */
  function _meta(code) {
    for (var i = 0; i < CURRENCIES.length; i++) {
      if (CURRENCIES[i].code === code) return CURRENCIES[i];
    }
    return { code: code, symbol: code, name: code, flag: '', decimals: 2 };
  }

  /* ── Public: getSymbol ──────────────────────────────── */
  function getSymbol(code) {
    return _meta(code).symbol;
  }

  /* ── Public: getSupportedCurrencies ─────────────────── */
  function getSupportedCurrencies() {
    return CURRENCIES.slice();
  }

  /* ── Public: isMock ─────────────────────────────────── */
  function isMock() {
    return typeof CurrencyProvider !== 'undefined' && !!CurrencyProvider._isMock;
  }

  /* ── Public: format ─────────────────────────────────── */
  function format(amount, currencyCode) {
    var code = currencyCode || BASE;
    var meta = _meta(code);
    var n    = parseFloat(amount) || 0;
    var dec  = meta.decimals;
    var formatted = n.toFixed(dec).replace('.', ',');
    /* Symbol placement: most currencies symbol before, some after */
    var after = ['SEK','CZK','PLN','RUB'];
    var isAfter = false;
    for (var ai = 0; ai < after.length; ai++) { if (after[ai] === code) { isAfter = true; break; } }
    return isAfter
      ? formatted + '\u00a0' + meta.symbol
      : meta.symbol + formatted;
  }

  /* ── Internal: get rates for base ───────────────────── */
  function _getRates(base, callback) {
    if (_rateCache[base]) {
      callback(null, _rateCache[base]);
      return;
    }
    CurrencyProvider.getRates(base, function(err, rates) {
      if (!err && rates) _rateCache[base] = rates;
      callback(err, rates);
    });
  }

  /* ── Public: convert (async) ────────────────────────── */
  function convert(amount, from, to, callback) {
    var n = parseFloat(amount) || 0;
    if (from === to) { callback(null, n); return; }

    /* Route via EUR base for cross-currency conversion */
    _getRates(BASE, function(err, rates) {
      if (err || !rates) { callback(err || new Error('No rates'), null); return; }
      var fromRate = rates[from];
      var toRate   = rates[to];
      if (!fromRate || !toRate) {
        callback(new Error('Unsupported currency: ' + from + ' or ' + to), null);
        return;
      }
      /* amount in FROM → EUR → TO */
      var inEur  = n / fromRate;
      var result = inEur * toRate;
      var meta   = _meta(to);
      var factor = Math.pow(10, meta.decimals);
      callback(null, Math.round(result * factor) / factor);
    });
  }

  /* ── Public: convertSync ────────────────────────────── */
  /* Uses cached rates only — returns null if not cached   */
  function convertSync(amount, from, to) {
    var n = parseFloat(amount) || 0;
    if (from === to) return n;
    var rates = _rateCache[BASE];
    if (!rates) return null; /* not cached yet */
    var fromRate = rates[from];
    var toRate   = rates[to];
    if (!fromRate || !toRate) return null;
    var inEur  = n / fromRate;
    var result = inEur * toRate;
    var meta   = _meta(to);
    var factor = Math.pow(10, meta.decimals);
    return Math.round(result * factor) / factor;
  }

  /* ── Public: warmUp ──────────────────────────────────── */
  /* Call on app init to pre-load EUR rates                 */
  function warmUp(callback) {
    _getRates(BASE, function(err, rates) {
      if (callback) callback(err, rates);
    });
  }

  /* ── Public: getRatesDisplay ─────────────────────────── */
  /* Returns array of {code, symbol, name, flag, rate} for UI */
  function getRatesDisplay(callback) {
    _getRates(BASE, function(err, rates) {
      if (err || !rates) { callback(err, null); return; }
      var result = [];
      for (var i = 0; i < CURRENCIES.length; i++) {
        var c = CURRENCIES[i];
        result.push({
          code:   c.code,
          symbol: c.symbol,
          name:   c.name,
          flag:   c.flag,
          rate:   rates[c.code] || 1
        });
      }
      callback(null, result);
    });
  }

  /* ── Public: formatWithConversion ────────────────────── */
  /* Converts amount from `from` to `to` then formats      */
  function formatWithConversion(amount, from, to, callback) {
    convert(amount, from, to, function(err, converted) {
      if (err) { callback(err, null); return; }
      callback(null, format(converted, to));
    });
  }

  /* ── Public: getUserCurrency ─────────────────────────── */
  /* Priority: 1) logged-in profile.displayCurrency
               2) GuestSettings via AppService (app_guest_settings)
               3) BASE (EUR)
     NOTE: AppService.getGuestCurrency is async — this sync helper
     reads GuestSettings via Store.GuestSettings directly because
     it is called in render paths that cannot be async.
     Store.GuestSettings is the single safe direct-Store access
     permitted here: it is a read-only, non-relational value. */
  function getUserCurrency(uid) {
    if (uid && typeof ProfileStore !== 'undefined') {
      var profile = ProfileStore.get(uid);
      if (profile && profile.displayCurrency) return profile.displayCurrency;
    }
    /* Fallback: guest setting — read via Store.GuestSettings (sync read permitted) */
    if (typeof Store !== 'undefined' && Store.GuestSettings) {
      return Store.GuestSettings.getCurrency();
    }
    return BASE;
  }

  /* ── Public: setGuestCurrency ────────────────────────── */
  /* Persists currency choice for the current visitor.
     Writes via AppService layer (adapter pattern).
     If user is logged in, also updates profile.displayCurrency. */
  function setGuestCurrency(code, uid) {
    /* Write via AppService — respects adapter pattern */
    if (typeof AppService !== 'undefined') {
      AppService.setGuestCurrency(code, function(err) {
        if (err) { console.warn('[CurrencyService] setGuestCurrency failed:', err); }
      });
    }
    /* If logged in, persist to profile too */
    if (uid && typeof AppService !== 'undefined' && typeof ProfileStore !== 'undefined') {
      var profile = ProfileStore.get(uid);
      if (profile) {
        profile.displayCurrency = code;
        AppService.saveProfile(uid, profile, function(err) {
          if (err) { console.warn('[CurrencyService] profile update failed:', err); }
        });
      }
    }
  }

  /* ── Public: getTeacherPriceCurrency ─────────────────── */
  function getTeacherPriceCurrency(uid) {
    if (typeof ProfileStore === 'undefined') return BASE;
    var profile = ProfileStore.get(uid);
    return (profile && profile.priceCurrency) ? profile.priceCurrency : BASE;
  }

  /* ── Public: priceToEUR ──────────────────────────────── */
  /* Converts teacher price (in their currency) to EUR     */
  function priceToEUR(amount, fromCurrency, callback) {
    convert(amount, fromCurrency, BASE, callback);
  }

  return {
    BASE:                   BASE,
    convert:                convert,
    convertSync:            convertSync,
    format:                 format,
    getSymbol:              getSymbol,
    getSupportedCurrencies: getSupportedCurrencies,
    isMock:                 isMock,
    warmUp:                 warmUp,
    getRatesDisplay:        getRatesDisplay,
    formatWithConversion:   formatWithConversion,
    getUserCurrency:        getUserCurrency,
    setGuestCurrency:       setGuestCurrency,
    getTeacherPriceCurrency:getTeacherPriceCurrency,
    priceToEUR:             priceToEUR
  };

}());

/* ── Global ready queue ──────────────────────────────── */
/* Any page can call CurrencyService.onReady(fn) to ensure
   the rate cache is warm before running fn().
   If already warm, fn() is called synchronously. */
(function() {
  var _ready    = false;
  var _queue    = [];

  function _flush() {
    _ready = true;
    for (var i = 0; i < _queue.length; i++) {
      try { _queue[i](); } catch(e) { console.warn('[CurrencyService.onReady] callback error', e); }
    }
    _queue = [];
  }

  CurrencyService.onReady = function(fn) {
    if (_ready) { fn(); return; }
    _queue.push(fn);
  };

  /* Warm up on 'load' (not DOMContentLoaded) so that all defer scripts
     (currency-provider-mock.js etc.) are guaranteed to have executed first.
     Scripts injected with defer=true run after DOMContentLoaded but before
     'load' — using DOMContentLoaded here misses that window entirely. */
  if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
      CurrencyService.warmUp(function(err) {
        if (err) console.warn('[CurrencyService] warmUp failed:', err);
        _flush();
      });
    });
  }
}());
