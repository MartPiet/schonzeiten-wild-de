# schonzeiten-wild-de

Maschinenlesbare **Jagd- und Schonzeiten für Wild** in Deutschland (Bund + 16 Bundesländer), Österreich (9 Bundesländer) und der Schweiz (26 Kantone) – als pures JSON, direkt über die raw-URL abgreifbar.

> ⚠️ **Ohne Gewähr.** Schonzeiten sind Rechtsdaten (Landes-/Kantonsverordnungen) und ändern sich. Rechtsverbindlich ist allein die jeweils gültige Verordnung. Jede Datei nennt `quelle`, `stand` und `confidence`. Vor verbindlicher Nutzung gegen die Originalquelle prüfen – besonders Einträge mit `confidence: "niedrig"` oder `note: "unbestätigt"`.

## Was ist „Jagdzeit" vs. „Schonzeit"?

Gespeichert wird die **Jagdzeit** (Zeitraum, in dem die Jagd erlaubt ist). Die **Schonzeit** ist das Komplement dazu (= der Rest des Jahres). Ist eine Art ganzjährig geschützt, steht `ganzjaehrigGeschont: true` und `jagdzeit` ist leer.

## Struktur

```
data/
  de/  bund.json           # Bundesjagdzeitenverordnung (bundesweite Grundregel)
       bw.json by.json …   # 16 Bundesländer
  at/  1.json … 9.json     # 9 Bundesländer (Code AT-1 … AT-9)
  ch/  zh.json be.json …   # 26 Kantone
manifest.json              # Version, Stand + SHA-256 je Datei  ← hierauf pollen Apps
all.json                   # alle Regionen aggregiert in einer Datei
species.json               # Stammliste aller Wildarten
schema/schonzeit.schema.json   # JSON-Schema (Draft-07) zur Validierung
```

## Datenformat (Beispiel `data/de/by.json`)

```json
{
  "region": { "code": "DE-BY", "land": "DE", "name": "Bayern" },
  "stand": "2026-04-01",
  "quelle": { "titel": "§ 19 AVBayJG …", "url": "https://…", "abgerufen": "2026-06-16" },
  "confidence": "hoch",
  "hinweis": "…",
  "arten": [
    {
      "id": "rehwild-bock",
      "art": "Rehwild",
      "klasse": "Bock",
      "wissenschaftlich": "Capreolus capreolus",
      "jagdzeit": [{ "von": "04-16", "bis": "10-15" }],
      "ganzjaehrigGeschont": false,
      "note": ""
    }
  ]
}
```

- **Datumsformat** `MM-TT`, jährlich wiederkehrend. `bis` kann kleiner als `von` sein → der Zeitraum läuft über den Jahreswechsel (z. B. `08-01` → `01-31`).
- **`klasse`** unterscheidet Geschlecht/Alter (Rotwild: Hirsch, Alttier, Schmaltier, Wildkalb …). Leer = keine Differenzierung.
- **Schweiz:** `region.system` = `patent` | `revier` | `verbot` (Genf: Jagdverbot seit 1974).

## So greifen Apps die Daten ab

Alles ist statisches JSON unter der raw-URL (CORS aktiv):

```
https://raw.githubusercontent.com/MartPiet/schonzeiten-wild-de/main/manifest.json
https://raw.githubusercontent.com/MartPiet/schonzeiten-wild-de/main/all.json
https://raw.githubusercontent.com/MartPiet/schonzeiten-wild-de/main/data/de/by.json
```

### Auf Änderungen prüfen (Polling)

Schonzeiten ändern sich selten (~1×/Jahr) – tägliches oder wöchentliches Prüfen reicht.

**a) Conditional Request auf `manifest.json` (empfohlen, fast kostenlos).** App merkt sich den `ETag` und sendet ihn beim nächsten Mal mit:

```http
GET /MartPiet/schonzeiten-wild-de/main/manifest.json
If-None-Match: "<letzter-etag>"
```

→ `304 Not Modified`: nichts geladen.
→ `200`: `version`/`generiert` geändert → über die `sha256`-Werte im Manifest erkennt die App, **welche** Region­dateien sich geändert haben, und lädt nur diese nach.

**b) GitHub Commits-API (zeigt, wann zuletzt geändert):**

```
GET https://api.github.com/repos/MartPiet/schonzeiten-wild-de/commits?path=data/de/by.json&per_page=1
```

Liefert SHA + Datum des letzten Commits an dieser Datei. (Limit: 60 Anfragen/h ohne Token, 5000/h mit Token.)

**c) Atom-Feed (ohne Token):** `https://github.com/MartPiet/schonzeiten-wild-de/commits/main.atom`

> Hinweis: Git/GitHub „pusht" nicht von selbst zu Apps – das Modell ist Polling (App fragt nach). Echtes Push bräuchte einen Webhook + eigenen Server dazwischen; für jährlich wechselnde Daten ist Polling mehr als ausreichend.

## `manifest.json`

```json
{
  "version": "2026.06.16",
  "generiert": "2026-06-16T…Z",
  "schemaVersion": "1.0.0",
  "anzahlRegionen": 52,
  "dateien": [
    { "pfad": "data/de/by.json", "region": "DE-BY", "stand": "2026-04-01", "confidence": "hoch", "sha256": "…" }
  ]
}
```

## Daten pflegen / beitragen

`data/**/*.json` ist die Quelle der Wahrheit und wird von Hand gepflegt. Nach Änderungen werden `manifest.json`, `all.json` und `species.json` neu erzeugt:

```bash
node scripts/build-manifest.mjs
```

Eine GitHub Action (`.github/workflows/build.yml`) macht das bei jedem Push auf `main`, der `data/**` betrifft, automatisch und committet die generierten Dateien zurück. Datenänderungen also einfach committen – das Manifest bleibt von selbst korrekt.

## Lizenz

Daten: **CC0 1.0** (gemeinfrei). Code: **MIT**. Siehe [LICENSE](LICENSE).
