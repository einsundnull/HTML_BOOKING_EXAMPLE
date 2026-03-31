/**
 * currency-provider-mock.js — MOCKUP Exchange Rate Provider
 * v=1
 *
 * Implements the CurrencyProvider interface with static rates.
 * Rates are approximate real-world values (March 2026).
 *
 * ══════════════════════════════════════════════════════════
 * PRODUCTION SWAP INSTRUCTIONS:
 *   Replace this file with currency-provider-live.js.
 *   The live provider calls the exchange rate API and caches
 *   results in localStorage with a TTL of 1 hour.
 *   Interface contract (must be identical):
 *
 *   CurrencyProvider.getRates(base, callback)
 *   → callback(err, ratesObject)
 *   → ratesObject: { EUR: x, USD: x, GBP: x, ... }
 *   → base: ISO 4217 currency code string
 * ══════════════════════════════════════════════════════════
 *
 * Regeln: var only, function(){}, no arrow, no template literals
 */

var CurrencyProvider = (function() {
  'use strict';

  /* ── Static rates relative to EUR (base = EUR = 1.0) ─── */
  /* Source: approximate market rates March 2026             */
  var _RATES_FROM_EUR = {
    EUR: 1.0,
    USD: 1.08,
    GBP: 0.855,
    CHF: 0.962,
    GEL: 2.965,   /* Georgian Lari */
    JPY: 161.2,
    TRY: 36.8,
    PLN: 4.275,
    CZK: 25.1,
    SEK: 11.4,
    RUB: 99.5,    /* Russian Ruble */
    AED: 3.967    /* UAE Dirham */
  };

  /**
   * getRates(base, callback)
   * Returns exchange rates where 1 unit of `base` = rate[currency]
   * callback: function(err, ratesObject)
   */
  function getRates(base, callback) {
    /* Simulate async (matches live provider signature) */
    setTimeout(function() {
      try {
        if (!_RATES_FROM_EUR[base]) {
          callback(new Error('Unknown currency: ' + base), null);
          return;
        }
        /* Convert EUR-based rates to base-relative rates */
        var baseRate = _RATES_FROM_EUR[base];
        var result = {};
        var currencies = Object.keys(_RATES_FROM_EUR);
        for (var i = 0; i < currencies.length; i++) {
          var code = currencies[i];
          result[code] = Math.round((_RATES_FROM_EUR[code] / baseRate) * 100000) / 100000;
        }
        callback(null, result);
      } catch(e) {
        callback(e, null);
      }
    }, 0);
  }

  return {
    getRates:   getRates,
    _isMock:    true,   /* flag so UI can show "Mockup-Kurse" notice */
    _ratesEUR:  _RATES_FROM_EUR  /* exposed for CurrencyService bootstrap */
  };

}());
