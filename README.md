# schonzeiten-wild-de

Maschinenlesbare **Jagd- und Schonzeiten für Wild** in Deutschland (Bund + 16 Bundesländer), Österreich (9 Bundesländer) und der Schweiz (26 Kantone) – als pures JSON, direkt über die raw-URL abgreifbar.

> ⚠️ **Ohne Gewähr.** Schonzeiten sind Rechtsdaten (Landes-/Kantonsverordnungen) und ändern sich. Rechtsverbindlich ist allein die jeweils gültige Verordnung. Jede Datei nennt `source`, `validFrom` und `confidence`. Vor verbindlicher Nutzung gegen die Originalquelle prüfen – besonders Einträge mit `confidence: "low"` oder `note: "unbestätigt"`.

> **Sprache:** JSON-**Keys** sind durchgängig englisch (der API-Vertrag, gegen den Apps programmieren). **Werte** bleiben in ihrer natürlichen Sprache – Artnamen, Regionsnamen, Quellen und Notizen auf Deutsch, wissenschaftliche Namen auf Latein.

## Was ist „openSeason" (Jagdzeit) vs. Schonzeit?

Gespeichert wird die **Jagdzeit** (`openSeason` = Zeitraum, in dem die Jagd erlaubt ist). Die **Schonzeit** ist das Komplement dazu (= der Rest des Jahres). Ist eine Art ganzjährig geschützt, steht `protectedAllYear: true` und `openSeason` ist leer.

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
  "region": { "code": "DE-BY", "country": "DE", "name": "Bayern" },
  "validFrom": "2026-04-01",
  "source": { "title": "§ 19 AVBayJG …", "url": "https://…", "retrieved": "2026-06-16" },
  "confidence": "high",
  "remarks": "…",
  "species": [
    {
      "id": "rehwild-bock",
      "name": "Rehwild",
      "category": "Bock",
      "scientificName": "Capreolus capreolus",
      "openSeason": [{ "from": "04-16", "to": "10-15" }],
      "protectedAllYear": false,
      "note": ""
    }
  ]
}
```

- **Datumsformat** `MM-TT`, jährlich wiederkehrend. `to` kann kleiner als `from` sein → der Zeitraum läuft über den Jahreswechsel (z. B. `08-01` → `01-31`).
- **`category`** unterscheidet Geschlecht/Alter (Rotwild: Hirsch, Alttier, Schmaltier, Wildkalb …). Leer = keine Differenzierung.
- **`confidence`**: `high` | `medium` | `low`.
- **Schweiz:** `region.system` = `patent` | `revier` | `verbot` (Genf: Jagdverbot seit 1974).

### Vererbung von Bundeswerten (`inheritsFrom`)

Viele Bundesländer regeln in ihrer Verordnung nur **Abweichungen** von der Bundesjagdzeitenverordnung – für alle übrigen Arten gilt das Bundesrecht fort. Solche Landesdateien tragen `"inheritsFrom": "DE"` und enthalten nur die abweichend geregelten Arten. Länder, die das Bundesrecht vollständig verdrängen (z. B. NRW, Rheinland-Pfalz), haben kein `inheritsFrom` und sind vollständig.

Auflösung (per Art, d. h. per `name`):

1. Führt die Landesdatei eine Art auf, gelten **nur** ihre Einträge dieser Art – sie ersetzen alle Bundeseinträge mit diesem `name` (alle Klassen).
2. Arten, die die Landesdatei nicht aufführt, werden aus der Datei der Region `inheritsFrom` übernommen.

```js
function resolveSpecies(region, parent) {
  if (!region.inheritsFrom) return region.species;
  const ownNames = new Set(region.species.map(s => s.name));
  return [...region.species, ...parent.species.filter(s => !ownNames.has(s.name))];
}
```

`inheritsFrom` steht auch im `manifest.json` je Datei, damit Apps wissen, welche Elterndatei sie mitladen müssen. Vererbt wird nur eine Ebene (die Elternregion erbt selbst nicht).

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
→ `200`: `version`/`generated` geändert → über die `sha256`-Werte im Manifest erkennt die App, **welche** Region­dateien sich geändert haben, und lädt nur diese nach.

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
  "generated": "2026-06-16T…Z",
  "schemaVersion": "1.1.0",
  "regionCount": 52,
  "files": [
    { "path": "data/de/be.json", "region": "DE-BE", "inheritsFrom": "DE", "validFrom": "2025-09-06", "confidence": "high", "sha256": "…" }
  ]
}
```

## Daten pflegen / beitragen

`data/**/*.json` ist die Quelle der Wahrheit und wird von Hand gepflegt. Nach Änderungen werden `manifest.json`, `all.json` und `species.json` neu erzeugt:

```bash
node scripts/build-manifest.mjs
```

Der Build prüft dabei jede Datei (`scripts/lint-data.mjs`) und bricht ohne zu schreiben ab, wenn etwas nicht stimmt: ungültige Daten (MM-TT, kein `02-29` – „Ende Februar“ ist `02-28`), Einträge mit Jagdzeit **und** `protectedAllYear`, Einträge ohne beides, `id` passend zu `name`/`category`, doppelte IDs, `validFrom` nach `source.retrieved` sowie ungültige `inheritsFrom`-Verweise. Die Regeln selbst sind getestet: `node --test scripts/lint-data.test.mjs`.

Eine GitHub Action (`.github/workflows/build.yml`) macht das bei jedem Push auf `main`, der `data/**` betrifft, automatisch und committet die generierten Dateien zurück. Datenänderungen also einfach committen – das Manifest bleibt von selbst korrekt.

## Lizenz

Daten: **CC0 1.0** (gemeinfrei). Code: **MIT**. Siehe [LICENSE](LICENSE).
