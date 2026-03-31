/**
 * currency-provider-live.js — PRODUCTION Exchange Rate Provider
 * v=1
 *
 * Implements the CurrencyProvider interface using a live API.
 * Replace currency-provider-mock.js with this file at go-live.
 *
 * ══════════════════════════════════════════════════════════
 * RECOMMENDED API: Open Exchange Rates (exchangeratesapi.io)
 *   Endpoint: https://api.exchangeratesapi.io/v1/latest
 *   Params:   ?access_key=YOUR_KEY&base=EUR&symbols=USD,GBP,...
 *
 * FREE ALTERNATIVE: open.er-api.com
 *   Endpoint: https://open.er-api.com/v6/latest/{base}
 *   No key required, 1500 req/month free
 *
 * GOOGLE FINANCE (via Apps Script):
 *   Deploy a Google Apps Script web app that calls
 *   =GOOGLEFINANCE("CURRENCY:EURUSD") and returns JSON.
 *   Use that URL as API_URL below.
 *
 * CACHE: Rates are cached in localStorage for TTL_MS (1 hour)
 *        to avoid exceeding API rate limits.
 * ══════════════════════════════════════════════════════════
 *
 * Regeln: var only, function(){}, no arrow, no template literals
 */

var CurrencyProvider = (function() {
  'use strict';

  /* ── Configuration ─────────────────────────────────── */
  var API_URL   = 'https://open.er-api.com/v6/latest/'; /* append base currency */
  var TTL_MS    = 60 * 60 * 1000; /* 1 hour cache */
  var CACHE_KEY = 'app_fx_cache';

  /* ── Supported currencies ───────────────────────────── */
  var SUPPORTED = ['EUR','USD','GBP','CHF','GEL','JPY','TRY','PLN','CZK','SEK','RUB','AED'];

  function _loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  function _saveCache(base, rates) {
    try {
      var cache = _loadCache();
      cache[base] = { rates: rates, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
  }

  function _getCached(base) {
    var cache = _loadCache();
    var entry = cache[base];
    if (!entry) return null;
    if ((Date.now() - entry.ts) > TTL_MS) return null;
    return entry.rates;
  }

  /**
   * getRates(base, callback)
   * callback: function(err, ratesObject)
   */
  function getRates(base, callback) {
    /* Check cache first */
    var cached = _getCached(base);
    if (cached) { callback(null, cached); return; }

    /* Fetch from API */
    var url = API_URL + encodeURIComponent(base);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 8000;
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        if (data.result === 'error' || !data.rates) {
          callback(new Error(data['error-type'] || 'API error'), null);
          return;
        }
        /* Filter to supported currencies only */
        var rates = {};
        for (var i = 0; i < SUPPORTED.length; i++) {
          var code = SUPPORTED[i];
          if (data.rates[code] !== undefined) rates[code] = data.rates[code];
        }
        _saveCache(base, rates);
        callback(null, rates);
      } catch(e) {
        callback(e, null);
      }
    };
    xhr.onerror   = function() { callback(new Error('Network error'), null); };
    xhr.ontimeout = function() { callback(new Error('Timeout'), null); };
    xhr.send();
  }

  return {
    getRates: getRates,
    _isMock:  false
  };

}());
