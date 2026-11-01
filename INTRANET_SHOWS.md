# Show-Infos aus thfradio.space („Intranet“) auf thfradio.de

**Stand:** 28.10.2026 · Branch `data_connection-to-intranet` in **beiden** Repos:

- `thfradio` (diese Website)
- `THF_Space` (thfradio.space)

## Idee

thfradio.space ist die **einzige Quelle** für Show-Infos. Hosts pflegen dort unter
*My Show Info* Texte, Links und Bilder, und die Bookers legen dort Shows an.
thfradio.de **liest nur** und schreibt nichts zurück. So kann nichts auseinanderlaufen
und es gibt keine Konflikte zwischen zwei Systemen.

```
Host speichert auf thfradio.space
   │  1. Show-Zeile in der DB (Prisma "Show")
   │  2. POST https://thfradio.de/api/revalidate { model: "show" }   ← sofort neu bauen
   ▼
thfradio.de  ── GET /api/public/shows?lang=de|en ──▶ thfradio.space
             ── GET /api/public/shows/<slug>?lang=de|en
             (Cache 5 min, Tag "shows"; altes Backend bleibt Fallback)
```

## Was in den Branches schon drin ist

### THF_Space (`data_connection-to-intranet`)

| Datei | Was |
|---|---|
| `prisma/schema.prisma` + Migration `20261028160000_show_website_fields` | Neue Felder an `Show`: `websiteSlug` (URL, eindeutig), `showOnWebsite` (an/aus, Standard **aus**), `descriptionDe`, `shortDescriptionDe` |
| `lib/website-shows.ts` | Wandelt eine Show in das Format um, das thfradio.de schon anzeigt. Außerdem `notifyWebsiteShowChanged()` (Webhook an die Website) |
| `app/api/public/shows/route.ts` | `GET /api/public/shows?lang=de\|en`: alle Shows mit `showOnWebsite = true` |
| `app/api/public/shows/[slug]/route.ts` | `GET /api/public/shows/<slug>?lang=de\|en`: eine Show (404, wenn nicht freigeschaltet) |
| `app/api/admin/shows/[showId]/website/route.ts` | `PATCH { showOnWebsite, websiteSlug }`: Show für die Website an- oder ausschalten und Slug setzen (nur Admins) |
| `app/protected/my-show-info/*`, `app/api/my-show-info/route.ts` | Hosts können optional eine **deutsche Version** von Kurz- und Langbeschreibung eintragen. Speichern löst den Webhook aus |
| `app/api/my-show-info/images/route.ts` | Ein Bild-Upload löst ebenfalls den Webhook aus |
| `scripts/import-website-shows.ts` | Einmal-Import der Texte aus dem alten Backend (siehe Schritt 3) |

Die Schnittstelle nutzt **dieselben API-Keys wie der Sendeplan** (`/api/public/timetable`).
Der Key, den thfradio.de schon als `CALENDAR_2_KEY` hat, funktioniert also auch hier.

### thfradio (`data_connection-to-intranet`)

| Datei | Was |
|---|---|
| `src/app/_lib/shows.ts` | Mit `SHOWS_SOURCE=intranet` kommen die Shows von thfradio.space. Solange das alte Backend läuft, geht nichts verloren: Die Liste zeigt zusätzlich jede alte Show, die es in thfradio.space (noch) nicht gibt. Fehlt in thfradio.space ein Bild oder Text, wird der alte genommen. Was der Host geschrieben hat, gewinnt immer. Ist thfradio.space nicht erreichbar, kommt alles aus dem alten Backend |
| `src/app/api/revalidate/route.ts` | `model: "show"` leert den Show-Cache (Tag `shows`) und baut `/de|en/shows` und alle Show-Seiten neu. Vorher wurden falsche Pfade ohne Sprache neu gebaut |
| `src/app/[locale]/shows/[slug]/page.tsx` | Kommt mit vollen Bild-URLs klar. Eine unbekannte Show zeigt die 404-Seite statt eines Fehlers |
| `env.sample` | Neue Variablen dokumentiert |

### Welche Felder woher kommen

| thfradio.de | thfradio.space (`Show`) |
|---|---|
| `slug` | `websiteSlug`, sonst der Titel als Slug (`Café Ölbaum` → `cafe-oelbaum`) |
| `title` | `title` |
| `teaserSentence` | DE: `shortDescriptionDe`, sonst `shortDescription`. EN: `shortDescription` |
| `description` (Markdown) | DE: `descriptionDe`, sonst `description`. EN: `description` |
| `image` (quadratisch) | `squareImageUrl` → neuestes Foto (SourceImage) → `coverImageUrl` |
| `imageFullWidth` | `headerImageUrl` → neuestes Foto |
| `day` / `startTime` / `endTime` | `day` (klein geschrieben) / `time` / `endTime` |
| `frequency` | `recurrence`: every-week → weekly, every-2-weeks → bi-weekly, every-4-weeks → monthly, every-8-weeks → bi-monthly, `irregularSlot` → occasionally |
| `activeShow` | hat einen festen Slot (`day` und `time` gesetzt) |
| `instagram` | erster Eintrag aus `instagramHandles` als Link |
| `soundcloud`, `website` | gleichnamig |
| `mail` | **wird absichtlich nicht ausgegeben** (`Show.email` ist privat) |

**Sprachen:** Die Haupttexte gelten als Englisch, weil das Intranet englisch ist. Die
deutschen Felder sind optional. Fehlt die deutsche Version, zeigt die deutsche Seite den Haupttext.

## Schritte zum Live-Schalten

1. **THF_Space-Branch mergen und deployen.** Die Migration läuft mit `prisma migrate deploy`.
   Sie fügt nur Spalten hinzu, alle Shows stehen danach auf „nicht auf der Website“.
2. **Env in THF_Space setzen:**
   - `WEBSITE_REVALIDATE_URL=https://thfradio.de/api/revalidate`
   - `WEBSITE_REVALIDATE_TOKEN=<gleicher Wert wie REVALIDATE_TOKEN auf thfradio.de>`
3. **Texte importieren.** Auf einem Rechner mit DB-Zugang ausführen. Erst den Probelauf, der nichts schreibt:
   ```
   OLD_WEBSITE_API=<NEXT_PUBLIC_BACKEND_URL von thfradio.de> npx tsx scripts/import-website-shows.ts
   ```
   Das Skript ordnet die alten Shows über den Titel zu. Es füllt nur **leere** Felder,
   übernimmt den alten Slug (damit alte Links weiter gehen) und schaltet gefundene Shows an.
   Die Ausgabe ansehen und danach mit `--apply` wirklich schreiben.
4. **Listen aus dem Import abarbeiten:**
   - *keine Show mit diesem Titel*: in thfradio.space anlegen oder umbenennen, dann das Skript nochmal laufen lassen
   - *mehrere Shows mit diesem Titel*: den Slug von Hand setzen (`PATCH /api/admin/shows/<id>/website`)
   - *noch kein Bild*: Host oder Admin lädt das Bild auf *My Show Info* hoch (siehe „Offen“)
5. **Website-Branch deployen** und in der `.env` auf dem Server setzen:
   ```
   SHOWS_SOURCE=intranet
   INTRANET_API_URL=https://www.thfradio.space
   INTRANET_API_KEY=            # leer = CALENDAR_2_KEY wird benutzt
   REVALIDATE_TOKEN=<wie oben>
   ```
6. **Testen:** `/de/shows`, `/en/shows` und ein paar Show-Seiten aufrufen. Dann in
   thfradio.space einen Text ändern, die Seite sollte sich nach Sekunden aktualisieren.
7. **Zurück zum alten Stand,** falls etwas klemmt: `SHOWS_SOURCE=backend` setzen und neu starten.
   Dafür ist kein neuer Code nötig.

## Noch offen

- **Admin-Oberfläche:** Show auf der Website an/aus und Slug setzen geht bisher nur per API
  (`PATCH /api/admin/shows/<id>/website`). Ein Schalter in der Show-Verwaltung fehlt noch.
- **Neue Shows:** Wenn ein Admin eine Show-Einreichung genehmigt, ist sie noch **nicht**
  automatisch auf der Website. Zu entscheiden ist, ob die Genehmigung `showOnWebsite` direkt
  einschaltet (`app/api/admin/show-submissions/approve*`).
- **Andere Stellen, die Shows ändern,** schicken noch keinen Webhook: Bookers (Termine
  verschieben), Admin, und die App über `app/api/app/show-info`. Die Website ist dort nach
  spätestens 5 Minuten trotzdem aktuell. Die App-Route speichert die deutschen Texte noch nicht.
- **Alte Bilder:** Das Import-Skript in thfradio.space kopiert die alten Bilder (`/uploads/...`)
  auf den Hetzner-Speicher, wenn eine Show dort noch kein Bild hat. Bis dahin zeigt die
  Website das alte Bild weiter an.
- **Tags / DJs:** Das alte Backend hatte `tags` und `djs`, thfradio.space hat `genres`.
  Die Show-Seiten nutzen beides im Moment nicht, beim Umbau der Filter aber beachten.

## Altes Backend abschalten: was es außer Shows noch macht

Das alte Backend (NestJS/AdminJS, `NEXT_PUBLIC_BACKEND_URL`) liefert der Website noch:

| Was | Wo im Code |
|---|---|
| News (Liste und Artikel) | `src/app/_lib/news.ts` |
| Seitentexte: Startseite, About, Info, beliebige Seiten | `src/app/_lib/pages.ts` |
| Tags fürs Archiv | `src/app/_lib/tags.ts` |
| **Chat** (Socket.io und Verlauf) | `src/app/_modules/chat/Chat.tsx` |
| **Alle hochgeladenen Bilder** (`/uploads/...`, auch für News, Galerie, Banner, Karussell) | `next.config.mjs` (Rewrite), `CMS_URL` in vielen Komponenten |
| Stream-Status (optional, mit Fallback) | `src/app/api/stream-status/route.ts` |

Nach dieser Umstellung kann das alte Backend also **nur für Shows** wegfallen.
Ganz abschalten geht erst, wenn für jede Zeile der Tabelle ein neuer Ort gefunden ist,
zum Beispiel News und Seiten auch in thfradio.space, der Chat als eigener Dienst und die
Bilder auf dem Hetzner-Speicher. Das müsst ihr im Team besprechen.
