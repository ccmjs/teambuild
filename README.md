# Teambuild

Eine ccmjs-v28-Komponente zur gemeinsamen Teambildung: mit optionaler Anmeldung,
konfigurierbaren Teamregeln, responsiven Teamkarten und sicheren parallelen Änderungen.
Die Komponentenlogik und die Oberfläche liegen in `ccm.teambuild.mjs`; das Stylesheet
wird als `ccm.load`-Abhängigkeit geladen. Es ist kein Build erforderlich.

## Einbinden

```html
<script src="./libs/framework/ccm-28.0.0.min.js"></script>
<div id="teams"></div>
<script type="module">
  await ccm.start("./ccm.teambuild.mjs", {
    data: {
      key: "seminar",
      store: ["ccm.store", {
        name: "teambuild",
        url: "https://your-ccm-server.example",
        observe: { key: "seminar" }
      }]
    },
    user: ["ccm.instance", "./libs/user/ccm.user-1.0.0.min.mjs", {
      url: "https://your-ccm-server.example",
      realm: "ccm"
    }],
    maxMembers: 4,
    maxTeams: 6,
    teamNames: ["Ideenwerkstatt", "Perspektivwechsel", "Zukunftslabor"]
  }, document.querySelector("#teams"));
</script>
```

Der Server muss die unten beschriebene Schreiboption `ifMatch` unterstützen. Die
begleitende Erweiterung in `ccm-server/lib/data.mjs` muss dafür auf dem Server
bereitgestellt werden. Das unveränderte ccmjs v28 überträgt die Option bereits.
Es gibt keinen automatischen Rückfall auf ungeschütztes Überschreiben.

`index.html` zeigt eine interaktive Demo mit User-Komponente. Die Seite über einen
HTTP-Server öffnen. Anmeldung und Teamdaten nutzen den lokalen CCM-Server unter
`http://localhost:8080`. Die Teams werden im Datastore `teambuild` unter dem Schlüssel
`demo` gespeichert und bleiben beim Neuladen erhalten. WebSocket-Beobachtung ist
aktiviert: Beitritte, Austritte und Namensänderungen erscheinen automatisch in
allen geöffneten Demo-Instanzen. Ohne vorhandenen Datensatz beginnt die Demo mit
einem leeren Team; der erste Beitritt legt die Teambildung auf dem Server an.
Nach der Anmeldung sind Teambeitritt, Teamwechsel, Austritt und Umbenennen möglich.
`resources/configs.mjs` enthält außerdem die
Konfigurationen `realtime`, `manual` und `frozen` für den lokalen CCM-Server.
Bei Bedarf lassen sie sich mit `["ccm.load", "./resources/configs.mjs#realtime"]` laden.

Wenn `user` gesetzt ist, rendert die User-Komponente rechts oben in der Toolbar
ihren eigenen Login-Button sowie nach der Anmeldung das Profil und den
Logout-Button. Ihr Dialog bleibt auch beim Aktualisieren der Teams erhalten.
Ohne `user` wird kein Loginbereich angezeigt; die Teams bleiben nur einsehbar.

## Konfiguration

| Property | Default | Bedeutung |
| --- | --- | --- |
| `data.store` | `["ccm.store"]` | CCM-Datastore; standardmäßig flüchtiger Speicher |
| `data.key` | `"teambuild"` | Ein Datensatz pro Teambildung; auch zusammengesetzte CCM-Schlüssel möglich |
| `data.permissions` | siehe unten | Berechtigungen beim erstmaligen Erstellen; `null` erzeugt öffentliche Daten |
| `user` | nicht gesetzt | Optionale User-Komponente; Loginbereich rechts in der Toolbar |
| `maxMembers` | `0` | Maximale Personen pro Team; `0` = unbegrenzt |
| `maxTeams` | `0` | Maximale Teamzahl; `0` = unbegrenzt |
| `teamNames` | `[]` | Voreingestellte Namen in Teamreihenfolge |
| `editable` | `true` | Mitglieder dürfen den Namen ihres eigenen Teams ändern |
| `joinable` | `true` | Teams dürfen beigetreten werden |
| `leavable` | `true` | Das eigene Team darf verlassen werden |
| `teamOverrides` | `[]` | Regeln pro Team; Eintrag 0 gilt für Team 1 |
| `allowSwitch` | `true` | Direkter Teamwechsel; prüft Austritts- und Beitrittsrecht gemeinsam |
| `nameMaxLength` | `60` | Maximale Länge eines angepassten Teamnamens |
| `avatarSize` | `96` | Maximale Bildkante in Pixeln für die Kopie eines privat hochgeladenen Profilbilds |
| `labels` | deutsche Texte | Alle Beschriftungen, Hinweise und Fehlermeldungen |
| `icons` | SVGs | Button-Icons als vertrauenswürdiges SVG-Markup, Textsymbol oder leerer String |
| `theme` | `{}` | CSS-Variablen ohne Präfix `--tb-` |
| `css` | Stylesheet-Abhängigkeit | Austauschbare oder ergänzte Gestaltung über `ccm.load` |
| `refreshInterval` | `30000` | Zusätzlicher Abgleich in Millisekunden bei aktiviertem `observe`; `0` deaktiviert ihn |
| `retryLimit` | `12` | Maximale Schreibversuche bei konkurrierenden Änderungen |
| `onchange` | nicht gesetzt | Callback nach erfolgreichem eigenem Beitritt, Austritt oder Umbenennen |
| `onerror` | nicht gesetzt | Callback für Lade-, Speicher- und Beobachtungsfehler |

Die Standardwerte und alle verfügbaren Texte und Icons sind direkt in der
`config` der Komponentendatei dokumentiert. Teilweise Angaben für `labels`, `icons`
und `theme` sind möglich. Funktionen sind nur für die optionalen Callbacks nötig.

```js
{
  labels: { join: "Mitmachen", leave: "Austreten", refresh: "Neu laden" },
  icons: { join: "+", leave: "↗", refresh: "↻" },
  theme: { accent: "#6045a0", "accent-hover": "#49327f", radius: "14px" }
}
```

Weitere Theme-Variablen: `background`, `surface`, `text`, `muted`, `border`, `font`.
Platzhalter wie `{number}`, `{team}`, `{count}` und `{max}` in Texten werden ersetzt.
Teamnamen und Mitgliedsnamen werden immer als Text ausgegeben.

## Teamplätze und Regeln

Die Zählung beginnt bei Team 1. Hinter dem letzten belegten Team erscheint genau
ein zusätzlicher leerer Teamplatz, sofern `maxTeams` nicht erreicht ist. Ein
Beitritt aktiviert diesen Platz und macht den nächsten sichtbar. Leere Plätze
zwischen belegten Teams bleiben verfügbar; mehrere leere Plätze am Ende werden
zu einem sichtbaren Platz zusammengefasst. Ihre gespeicherten Namen bleiben erhalten.
Voreingestellte Namen erzeugen noch keine zusätzlichen Teamkarten.

Bei begrenzter Teamgröße zeigt die Mitgliederliste für jeden freien Platz einen
zusätzlichen Eintrag. Dessen Beschriftung ist über `labels.emptyMember` anpassbar.
Bei unbegrenzter Teamgröße (`maxMembers: 0`) werden keine freien Plätze ergänzt.
Diese Platzhalter zählen nicht als Personen und werden nicht gespeichert.

Eine Person kann gleichzeitig nur in einem Team sein. Ein Teamwechsel wird als
eine gemeinsame Änderung gespeichert. Er erfordert `leavable` für das bisherige
und `joinable` für das neue Team. Reduzierte Limits entfernen niemals bereits
zugeordnete Personen oder Teams; sie beschränken weitere Beitritte.

```js
{
  editable: false,
  joinable: false,
  leavable: false,
  teamOverrides: [
    { joinable: true, leavable: true }
  ]
}
```

Damit ist die Teambildung geschlossen, außer für Beitritt und Austritt beim ersten
Team. Dessen Name bleibt gesperrt. Jede explizite Teamregel hat Vorrang vor der
globalen Einstellung; ausgelassene Regeln werden geerbt.

Ohne `user` ist die Komponente ausschließlich eine Ansicht. Mit einer User-Komponente
muss die Person angemeldet sein, bevor Änderungen möglich sind. Alle Mitglieder
eines Teams können dessen Namen ändern, sofern `editable` gilt. Die Identität
besteht aus `realm:key`; gleiche Anzeigenamen führen nicht zu einer Verwechslung.
Authentifizierungstokens werden nicht in den Teambildungsdaten gespeichert.

Eine geänderte veröffentlichte App-Konfiguration gilt für neu geladene Instanzen.
Bereits geöffnete Instanzen laden die Konfiguration nicht automatisch neu.
Eine einbettende Anwendung kann Regeln auch direkt an der Instanz ändern und
anschließend `app.start()` aufrufen.

## Daten und Berechtigungen

Gespeichert wird ein vollständiger Datensatz:

```js
{
  key: "seminar",
  schema: 1,
  revision: 3,
  mutation: "eindeutige-id-der-letzten-aenderung",
  teams: [
    { name: "Ideenwerkstatt", members: [
      { id: "ccm:account_key", name: "Lea Sommer", picture: "https://example.org/lea.jpg" }
    ] }
  ],
  _: {
    owner: "ccm:teacher_key",
    access: { get: "all", set: "realm", del: "owner" }
  }
}
```

`name: null` verwendet den konfigurierten Namen beziehungsweise `Team {number}`.
Die Teamposition im Array ist die stabile Teamnummer minus eins. `revision` dient
der Nachvollziehbarkeit; die Konfliktprüfung vergleicht den gesamten Datensatz.
`mutation` ermöglicht es, einen gespeicherten Schreibversuch trotz verlorener
HTTP-Antwort wiederzuerkennen. Ein bloßer Seitenaufruf legt noch keinen Datensatz an.
Ein unbekanntes Datenformat wird nicht automatisch ersetzt.

Beim Beitritt oder Teamwechsel wird der Anzeigename aus `user.getState().user`
übernommen, ersatzweise der Account-Schlüssel. Eine dort vorhandene `picture`-URL
wird optional mitgespeichert und im Avatar angezeigt. Ohne Bild oder bei einem
Ladefehler erscheinen die Initialen. Die Angaben bleiben als Stand des Beitritts
gespeichert; bestehende Mitgliedseinträge werden nicht automatisch mit späteren
Profiländerungen synchronisiert. Unterstützt werden HTTP(S)-Bildadressen und
Rasterbilder als Data-URL.

Bei lokalen CCM-Konten mit aktiviertem `user.profilePicture` wird ein privat
hochgeladenes Bild über die Account- und Download-API geladen und beim Beitritt
als verkleinerte Data-URL in den Mitgliedseintrag kopiert. Diese Kopie ist für
alle leseberechtigten Personen der Teambildung sichtbar; die Originaldatei
behält ihre privaten Berechtigungen. Tokens und lokale Blob-URLs werden nicht
mitgespeichert. Ein fehlendes oder nicht erreichbares Bild verhindert den
Beitritt nicht; dann werden die Initialen verwendet.

Standardmäßig wird beim ersten Beitritt `data.permissions` mit
`{ access: { get: "all", set: "realm", del: "owner" } }` angewendet; der erste
Ersteller wird Eigentümer. Für eine vom Lehrenden verwaltete Teambildung sollte
der Lehrende vorher mit seinem angemeldeten Datastore einen leeren Datensatz anlegen:

```js
await teacherStore.set({
  key: "seminar", schema: 1, revision: 0, teams: [],
  _: { access: { get: "all", set: "realm", del: "owner" } }
}, undefined, { ifMatch: null });
```

Das Backend ergänzt die Eigentümeridentität. Bestehende Berechtigungen werden bei
Änderungen unverändert übernommen. Für einen begrenzten Teilnehmerkreis kann
`set` eine CCM-Gruppenreferenz statt `"realm"` verwenden.

`editable`, `joinable`, `leavable` und Teamlimits sind Bedienregeln der Komponente,
keine serverseitigen Feldberechtigungen. Schreibberechtigte Clients könnten über
die allgemeine Datastore-API andere Änderungen senden. Für einen verbindlichen
Abschluss muss der Eigentümer zusätzlich serverseitig die Schreibberechtigung
einschränken, beispielsweise auf `set: "owner"` oder durch einen CCM-Zeitplan.
Individuelle Teamregeln lassen sich mit den allgemeinen Datensatzberechtigungen
des Backends nicht als Sicherheitsgrenze erzwingen.

## Echtzeit und konfliktfreies Speichern

`observe: { key: "seminar" }` aktiviert die WebSocket-Beobachtung im Remote-Datastore.
Die Serveradresse bleibt eine HTTP(S)-URL: ccmjs schreibt über HTTP und nutzt den
WebSocket für Benachrichtigungen. Ohne `observe` werden Änderungen über den
Refresh-Button geladen. Bei einer vom Server bestätigten Live-Verbindung wird er
als Icon mit Tooltip und zugänglicher Beschriftung angezeigt. Ohne Realtime,
während des Verbindungsaufbaus oder bei Verbindungsproblemen trägt er zusätzlich
die sichtbare Beschriftung. Ein Klick lädt den aktuellen Stand und startet eine
unterbrochene oder nicht vollständig aufgebaute Live-Verbindung erneut. Sobald der
Server die Beobachtung bestätigt, werden verpasste Änderungen nachgeladen und
weitere Änderungen wieder automatisch übernommen.

Das mitgelieferte Framework meldet dafür den tatsächlichen Beobachtungszustand
über `getConnectionState()` und `onconnectionchange`. Bei einem anderen Framework
ohne diese Schnittstelle bleibt die Beschriftung vorsichtshalber sichtbar. Ist
`icons.refresh` leer, bleibt sie ebenfalls erhalten.

Fokuswechsel und die Rückkehr der Netzwerkverbindung lösen ebenfalls
einen Abgleich aus. Im Echtzeitmodus ergänzt `refreshInterval` die Benachrichtigungen,
damit nach einer Unterbrechung verpasste Änderungen nachgeladen werden.

Eine Benachrichtigung führt zu einem neuen Lesen des Datensatzes. Das ist nötig,
weil CCM-Benachrichtigungen beim Löschen auch den alten Datensatz enthalten können.
Leseantworten aus der Zeit vor einer eigenen Änderung werden verworfen. Der
Loginbereich und ein offener Namensentwurf bleiben bei Aktualisierungen erhalten.

Das sichere Speichern verwendet eine **atomare Vergleichsbedingung**:

```js
const before = await store.get("seminar");
const after = structuredClone(before);
// Hier die beabsichtigte Änderung auf after anwenden.
await store.set(after, undefined, { ifMatch: before });
```

Der Server prüft zuerst die aktuellen Lese- und Schreibrechte. Innerhalb seiner
Warteschlange vergleicht er `before` mit dem aktuellen Datensatz. Stimmen beide
überein, wird die Änderung gespeichert. Andernfalls wird **HTTP 409** zurückgegeben,
ohne Daten zu verändern oder Beobachter zu benachrichtigen. `ifMatch: null` bedeutet:
Nur erstellen, wenn noch kein Datensatz mit diesem Schlüssel existiert.

Zwei gleichzeitige Beitritte können daher nicht denselben alten Mitgliederstand
übereinander schreiben. Der zweite Client liest nach 409 neu, prüft Rechte und
freie Plätze erneut und wendet seinen Beitritt auf den neuen Stand an. Ist der
letzte Platz inzwischen vergeben, zeigt er eine entsprechende Meldung.
Konkurrierende Änderungen desselben Teamnamens werden ausdrücklich gemeldet;
der eigene Entwurf bleibt für eine bewusste erneute Entscheidung erhalten.

Vergleich und Speichern sind gemeinsam serialisiert. Die Garantie gilt für den
vom CCM-Backend unterstützten Betrieb mit **einem Serverprozess pro Datenbank**,
wobei alle Änderungen über diesen Server laufen. Mehrere Serverprozesse oder
direkte Datenbankzugriffe benötigen einen zusätzlichen datenbankseitigen Mechanismus.
Alle beteiligten Teambildungsclients müssen bedingte Schreibzugriffe verwenden.

Bei lokalem IndexedDB-Speicher werden Änderungen zwischen Tabs derselben Origin
mit der Web Locks API koordiniert. Ohne diese API werden lokale Schreibzugriffe
abgelehnt. Speicher ohne Namen wird innerhalb der Seite pro geteiltem Datastore
serialisiert; er dient nicht der Zusammenarbeit zwischen verschiedenen Geräten.
Andere lokale Schreiber müssen dieselbe Sperre verwenden. Remote-Zusammenarbeit
sollte immer den CCM-Server verwenden.

## Instanz-API

| Methode | Wirkung |
| --- | --- |
| `start()` | Ansicht aufbauen bzw. aktuellen Stand neu laden |
| `refresh()` | Datensatz erneut laden |
| `refresh({ reconnect: true })` | Zusätzlich eine unterbrochene oder hängende Live-Verbindung neu aufbauen |
| `getValue()` | Unabhängige Kopie des aktuellen Datensatzes |
| `getTeams()` | Sichtbare Teams einschließlich des freien Platzes und ihrer Regeln |
| `join(1)` | Team 1 beitreten bzw. dorthin wechseln |
| `leave()` | Das eigene Team verlassen |
| `rename(1, "Neuer Name")` | Das eigene Team umbenennen |
| `destroy()` | Eigene Timer und Listener entfernen und die Ansicht abbauen |

Änderungsmethoden sind asynchron, prüfen dieselben Regeln wie die Oberfläche und
weisen Fehler zurück. `onchange({ app, type, value })` erhält `join`, `leave` oder
`rename`; `onerror({ app, error })` erhält Fehler. Zurückgegebene Daten sind Kopien.
Ein extern übergebener, geteilter Datastore bleibt im Besitz der einbettenden Anwendung.
