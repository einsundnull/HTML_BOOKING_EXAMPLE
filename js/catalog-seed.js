/**
 * catalog-seed.js — Mockup-Seed-Daten
 *
 * Befüllt localStorage mit realistischen Teacher-Profilen
 * für den Skiing-Catalog, sofern noch keine Teacher-Daten vorhanden sind.
 *
 * Wird nur im Mockup verwendet (LocalStorageAdapter).
 * Bei Migration auf Firestore: diese Datei aus den HTML-Dateien entfernen
 * und Daten direkt in Firestore importieren.
 *
 * Alle Felder entsprechen exakt dem Schema aus ProfileStore.getDefault():
 *   - Array-Codes (nicht Klartext): languages: ['de','en'] nicht ['Deutsch','Englisch']
 *   - Zahlen als Strings: pricePerHalfHour: '60' (wie vom Formular gespeichert)
 *   - Terrain als Codes: ['green','blue','red','black']
 *
 * Regeln: var only, function(){}, no arrow functions,
 *         no template literals, no ?. or ??
 */

var CatalogSeed = (function() {

  var _SEEDED_KEY = 'app_catalog_seeded_v1';

  var _TEACHERS = [
    {
      uid:  'teacher_anna',
      name: 'Anna Bergmann',
      role: 'teacher',
      email: 'anna@example.com'
    },
    {
      uid:  'teacher_markus',
      name: 'Markus Huber',
      role: 'teacher',
      email: 'markus@example.com'
    },
    {
      uid:  'teacher_sofia',
      name: 'Sofia Reiter',
      role: 'teacher',
      email: 'sofia@example.com'
    },
    {
      uid:  'teacher_luca',
      name: 'Luca Manzoni',
      role: 'teacher',
      email: 'luca@example.com'
    },
    {
      uid:  'teacher_petra',
      name: 'Petra Schneider',
      role: 'teacher',
      email: 'petra@example.com'
    },
    {
      uid:  'teacher_thomas',
      name: 'Thomas Keller',
      role: 'teacher',
      email: 'thomas@example.com'
    }
  ];

  var _PROFILES = [
    {
      uid:              'teacher_anna',
      name:             'Anna Bergmann',
      age:              '34',
      gender:           'female',
      location:         'Zermatt',
      bio:              'Ich unterrichte seit 10 Jahren Ski in Zermatt und liebe es, Anfänger sicher auf die Piste zu bringen. Mein Unterrichtsstil ist geduldig und aufbauend.',
      photo:            '',
      pricePerHalfHour: '55',
      experienceYears:  '10',
      languages:        ['de', 'en', 'fr'],
      lessonTypes:      ['private', 'group'],
      audience:         ['kids', 'adults'],
      ageFrom:          '5',
      ageTo:            '60',
      levels:           ['beginner', 'intermediate'],
      maxGroupSize:     '6',
      terrain:          ['green', 'blue'],
      certifications:   [{ org: 'DSV / DSLV (Deutschland)', level: 'Level 2', year: '2015' }],
      specializations:  ['kids', 'anxiety'],
      email:            'anna@example.com',
      emailVisible:     true,
      phone:            '',
      phoneVisible:     false,
      instagram:        '@anna.ski',
      website:          '',
      updatedAt:        '2025-01-10T10:00:00.000Z'
    },
    {
      uid:              'teacher_markus',
      name:             'Markus Huber',
      age:              '41',
      gender:           'male',
      location:         'St. Anton',
      bio:              'Profi-Rennfahrer und zertifizierter Trainer. Ich arbeite mit Fortgeschrittenen und Experten, die ihre Technik perfektionieren wollen.',
      photo:            '',
      pricePerHalfHour: '85',
      experienceYears:  '18',
      languages:        ['de', 'en'],
      lessonTypes:      ['private'],
      audience:         ['adults', 'teens'],
      ageFrom:          '14',
      ageTo:            '65',
      levels:           ['advanced', 'expert'],
      maxGroupSize:     '2',
      terrain:          ['red', 'black'],
      certifications:   [
        { org: 'ISIA (International)', level: 'Level 4 / Master', year: '2010' },
        { org: 'DSV / DSLV (Deutschland)', level: 'Level 3', year: '2008' }
      ],
      specializations:  ['racing', 'freeride'],
      email:            'markus@example.com',
      emailVisible:     false,
      phone:            '+43 664 1234567',
      phoneVisible:     true,
      instagram:        '',
      website:          'www.markus-ski.at',
      updatedAt:        '2025-01-12T14:00:00.000Z'
    },
    {
      uid:              'teacher_sofia',
      name:             'Sofia Reiter',
      age:              '29',
      gender:           'female',
      location:         'Innsbruck',
      bio:              'Snowboard und Freestyle sind meine Leidenschaft. Ich bringe dir die Grundlagen des Park-Fahrens bei oder helfe dir, deinen Style zu entwickeln.',
      photo:            '',
      pricePerHalfHour: '60',
      experienceYears:  '7',
      languages:        ['de', 'en', 'it'],
      lessonTypes:      ['private', 'group'],
      audience:         ['teens', 'adults'],
      ageFrom:          '12',
      ageTo:            '40',
      levels:           ['beginner', 'intermediate', 'advanced'],
      maxGroupSize:     '4',
      terrain:          ['blue', 'red', 'black'],
      certifications:   [{ org: 'ISIA (International)', level: 'Level 2', year: '2019' }],
      specializations:  ['freestyle', 'snowboard'],
      email:            'sofia@example.com',
      emailVisible:     true,
      phone:            '',
      phoneVisible:     false,
      instagram:        '@sofia.rides',
      website:          '',
      updatedAt:        '2025-01-08T09:30:00.000Z'
    },
    {
      uid:              'teacher_luca',
      name:             'Luca Manzoni',
      age:              '38',
      gender:           'male',
      location:         'Cortina d\'Ampezzo',
      bio:              'Italiano di montagna con 15 anni di esperienza. Unterrichte auf Deutsch, Englisch und Italienisch. Familienunterricht ist mein Spezialgebiet.',
      photo:            '',
      pricePerHalfHour: '70',
      experienceYears:  '15',
      languages:        ['de', 'en', 'it'],
      lessonTypes:      ['private', 'group', 'private_group'],
      audience:         ['kids', 'adults', 'seniors'],
      ageFrom:          '4',
      ageTo:            '75',
      levels:           ['beginner', 'intermediate'],
      maxGroupSize:     '8',
      terrain:          ['green', 'blue', 'red'],
      certifications:   [{ org: 'ISIA (International)', level: 'Level 3', year: '2012' }],
      specializations:  ['kids', 'adaptive'],
      email:            'luca@example.com',
      emailVisible:     true,
      phone:            '+39 346 9876543',
      phoneVisible:     true,
      instagram:        '',
      website:          '',
      updatedAt:        '2025-01-15T11:00:00.000Z'
    },
    {
      uid:              'teacher_petra',
      name:             'Petra Schneider',
      age:              '52',
      gender:           'female',
      location:         'Kitzbühel',
      bio:              'Mit über 25 Jahren Erfahrung bin ich spezialisiert auf Senioren und Wiedereinsteiger. Sicherheit und Freude am Skifahren stehen bei mir an erster Stelle.',
      photo:            '',
      pricePerHalfHour: '65',
      experienceYears:  '25',
      languages:        ['de', 'en'],
      lessonTypes:      ['private', 'group'],
      audience:         ['adults', 'seniors'],
      ageFrom:          '40',
      ageTo:            '80',
      levels:           ['beginner', 'intermediate'],
      maxGroupSize:     '5',
      terrain:          ['green', 'blue'],
      certifications:   [
        { org: 'DSV / DSLV (Deutschland)', level: 'Level 3', year: '2000' },
        { org: 'ISIA (International)', level: 'Level 2', year: '1998' }
      ],
      specializations:  ['anxiety', 'firstaid'],
      email:            'petra@example.com',
      emailVisible:     false,
      phone:            '',
      phoneVisible:     false,
      instagram:        '',
      website:          '',
      updatedAt:        '2025-01-05T08:00:00.000Z'
    },
    {
      uid:              'teacher_thomas',
      name:             'Thomas Keller',
      age:              '31',
      gender:           'male',
      location:         'Verbier',
      bio:              'Freeride-Guide und Lawinenkurs-Ausbilder. Ich führe dich sicher abseits der Pisten und zeige dir die schönsten Off-Piste-Abfahrten der Alpen.',
      photo:            '',
      pricePerHalfHour: '95',
      experienceYears:  '9',
      languages:        ['de', 'en', 'fr'],
      lessonTypes:      ['private', 'private_group'],
      audience:         ['adults'],
      ageFrom:          '18',
      ageTo:            '55',
      levels:           ['advanced', 'expert'],
      maxGroupSize:     '3',
      terrain:          ['red', 'black'],
      certifications:   [
        { org: 'ISIA (International)', level: 'Level 3', year: '2018' },
        { org: 'BASI (UK)', level: 'Level 2', year: '2016' }
      ],
      specializations:  ['freeride', 'avalanche'],
      email:            'thomas@example.com',
      emailVisible:     true,
      phone:            '+41 79 5551234',
      phoneVisible:     true,
      instagram:        '@thomas.freeride',
      website:          'www.verbier-freeride.ch',
      updatedAt:        '2025-01-18T16:00:00.000Z'
    }
  ];

  /* ── Seed ausführen ────────────────────────────────────── */
  function run() {
    try {
      /* Nur seeden wenn KEINE echten Teacher in der DB sind.
         Damit werden echte Profile niemals überschrieben. */
      var existingTeachers = Store.Users.byRole('teacher');
      if (existingTeachers && existingTeachers.length > 0) {
        console.log('[CatalogSeed] Echte Teacher gefunden (' + existingTeachers.length + ') — Seed übersprungen.');
        return;
      }

      /* Bereits geseeded? (Fallback-Guard) */
      var seeded = localStorage.getItem(_SEEDED_KEY);
      if (seeded) {
        console.log('[CatalogSeed] Bereits geseeded — übersprungen.');
        return;
      }

      /* User anlegen (überspringen wenn UID bereits existiert) */
      for (var i = 0; i < _TEACHERS.length; i++) {
        var teacher = _TEACHERS[i];
        try {
          Store.Users.create(teacher);
          console.log('[CatalogSeed] User erstellt: ' + teacher.uid);
        } catch (e) {
          /* UID existiert bereits — kein Fehler */
          console.log('[CatalogSeed] User existiert bereits: ' + teacher.uid);
        }
      }

      /* Profile speichern — NIEMALS existierende Profile überschreiben */
      var allProfiles = {};
      try {
        var raw = localStorage.getItem('app_profiles');
        allProfiles = raw ? JSON.parse(raw) : {};
      } catch (e) {
        allProfiles = {};
      }

      for (var j = 0; j < _PROFILES.length; j++) {
        var profile = _PROFILES[j];
        if (allProfiles[profile.uid]) {
          console.log('[CatalogSeed] Profil existiert bereits — übersprungen: ' + profile.uid);
          continue;
        }
        allProfiles[profile.uid] = profile;
        console.log('[CatalogSeed] Profil geschrieben: ' + profile.uid);
      }

      localStorage.setItem('app_profiles', JSON.stringify(allProfiles));

      /* Seed-Flag setzen */
      localStorage.setItem(_SEEDED_KEY, '1');
      console.log('[CatalogSeed] Seed abgeschlossen. ' + _TEACHERS.length + ' Teacher angelegt.');

    } catch (e) {
      console.error('[CatalogSeed] Fehler beim Seeden:', e);
    }
  }

  /* ── Seed zurücksetzen (Debug / Reset) ─────────────────── */
  function reset() {
    try {
      localStorage.removeItem(_SEEDED_KEY);
      for (var i = 0; i < _TEACHERS.length; i++) {
        try { Store.Users.delete(_TEACHERS[i].uid); } catch(e) {}
      }
      var raw = localStorage.getItem('app_profiles');
      var allProfiles = raw ? JSON.parse(raw) : {};
      for (var j = 0; j < _PROFILES.length; j++) {
        delete allProfiles[_PROFILES[j].uid];
      }
      localStorage.setItem('app_profiles', JSON.stringify(allProfiles));
      console.log('[CatalogSeed] Reset abgeschlossen.');
    } catch (e) {
      console.error('[CatalogSeed] Fehler beim Reset:', e);
    }
  }

  return {
    run:   run,
    reset: reset
  };

}());

window.CatalogSeed = CatalogSeed;
