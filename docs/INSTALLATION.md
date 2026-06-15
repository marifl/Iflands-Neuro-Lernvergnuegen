# Installationsanleitung (Schritt für Schritt)

Diese Anleitung richtet sich an **Einsteiger ohne Vorkenntnisse**. Am Ende läuft die
App in deinem Browser. Du brauchst dafür drei Dinge, die wir nacheinander einrichten:

1. **Das Projekt** (die Dateien dieser App)
2. **Node.js** (die Laufzeitumgebung)
3. **pnpm** (das Werkzeug, das die App startet)

> [!NOTE]
> Plane ca. **15 Minuten** beim ersten Mal ein. Du musst nichts dauerhaft „installieren",
> was deinen Rechner verändert — alles bleibt in einem Ordner.

Wähle dein Betriebssystem:
[macOS](#macos) · [Windows](#windows) · [Linux](#linux) · danach [App starten](#app-starten-alle-systeme) · [Probleme?](#hilfe-bei-problemen)

---

## Schritt 1: Projekt herunterladen (alle Systeme)

**Einfachster Weg (ohne Zusatzsoftware):**

1. Öffne die Projektseite: <https://github.com/marifl/Iflands-Neuro-Lernvergnuegen>
2. Klicke oben rechts auf den grünen Button **`< > Code`** → **`Download ZIP`**.
3. **Entpacke** die heruntergeladene ZIP-Datei (Doppelklick auf macOS; Rechtsklick →
   „Alle extrahieren" auf Windows).
4. Du erhältst einen Ordner namens **`Iflands-Neuro-Lernvergnuegen-main`**. Merke dir,
   wo er liegt (z. B. im Ordner „Downloads"). Diesen Ordner brauchen wir gleich.

---

## macOS

### Node.js installieren

1. Öffne <https://nodejs.org> und lade die Version mit der Bezeichnung **„LTS"** herunter
   (großer grüner Button).
2. Öffne die heruntergeladene `.pkg`-Datei und klicke dich durch den Installer
   (Fortfahren → Installieren → Passwort eingeben).
3. **Fertig.** Node.js ist jetzt installiert.

### Terminal öffnen

- Drücke `Cmd` + `Leertaste`, tippe **`Terminal`**, Enter.

Weiter bei [App starten](#app-starten-alle-systeme).

---

## Windows

### Node.js installieren

1. Öffne <https://nodejs.org> und lade die Version mit der Bezeichnung **„LTS"** herunter.
2. Öffne die heruntergeladene `.msi`-Datei und klicke dich durch den Installer
   (Next → Häkchen bei „I accept" → Next → Install → Finish).
3. **Fertig.**

### Terminal öffnen

- Drücke die `Windows`-Taste, tippe **`PowerShell`**, Enter.
- (Alternativ: Öffne den entpackten Projektordner im Explorer, halte `Shift` gedrückt,
  Rechtsklick in den Ordner → **„PowerShell-Fenster hier öffnen"** bzw. „Im Terminal öffnen".)

Weiter bei [App starten](#app-starten-alle-systeme).

---

## Linux

### Node.js installieren

Die Paketquellen vieler Distributionen liefern eine zu alte Node-Version. Am
zuverlässigsten ist **nvm** (installiert Node ohne Admin-Rechte):

```bash
# 1) nvm installieren
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 2) Terminal neu öffnen (oder folgende Zeile ausführen)
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
# 3) aktuelle LTS-Version von Node installieren
nvm install --lts
```

### Terminal öffnen

- Meist `Strg` + `Alt` + `T`, oder im Dateimanager Rechtsklick → „Im Terminal öffnen".

Weiter bei [App starten](#app-starten-alle-systeme).

---

## App starten (alle Systeme)

> [!IMPORTANT]
> Alle folgenden Befehle werden im **Terminal** eingegeben und jeweils mit `Enter`
> bestätigt. Tippe sie ab oder kopiere sie hinein.

### 1. pnpm aktivieren (einmalig)

Node.js bringt ein Hilfswerkzeug namens „Corepack" mit, das pnpm bereitstellt:

```bash
corepack enable pnpm
```

> Falls das eine Fehlermeldung gibt, nutze stattdessen: `npm install -g pnpm`

### 2. In den App-Ordner wechseln

Du musst dem Terminal sagen, wo das Projekt liegt. Tippe `cd ` (mit Leerzeichen),
**ziehe dann den entpackten Projektordner ins Terminal-Fenster** (dann steht der Pfad
automatisch da) und ergänze `/apps/brain-app`. Beispiel:

```bash
# macOS / Linux (Pfad anpassen)
cd ~/Downloads/Iflands-Neuro-Lernvergnuegen-main/apps/brain-app
```

```powershell
# Windows (Pfad anpassen)
cd $HOME\Downloads\Iflands-Neuro-Lernvergnuegen-main\apps\brain-app
```

### 3. Installieren und starten

```bash
pnpm install      # lädt die Bausteine herunter — beim ersten Mal ~3-5 Min.
pnpm dev          # startet die App
```

### 4. App im Browser öffnen

Wenn im Terminal `Local: http://localhost:5173/` erscheint, öffne diese Adresse in
deinem Browser (Chrome, Edge, Firefox oder Safari). **Die App läuft.** 🎉

> [!NOTE]
> Das Terminal-Fenster muss geöffnet bleiben, solange du die App nutzt. Zum **Beenden**:
> im Terminal `Strg` + `C` drücken (auch auf dem Mac `Ctrl`+`C`). Zum **erneuten Starten**
> einfach wieder `pnpm dev` im App-Ordner ausführen.

---

## Hilfe bei Problemen

| Meldung / Problem | Lösung |
|-------------------|--------|
| `command not found: node` bzw. `node` „nicht erkannt" | Node.js wurde nicht (korrekt) installiert oder das Terminal war schon offen. Terminal **neu öffnen** und Node-Installation wiederholen. |
| `command not found: pnpm` | `corepack enable pnpm` ausführen (siehe oben). Sonst `npm install -g pnpm`. |
| `corepack: command not found` | Deine Node-Version ist zu alt. Neueste **LTS** von <https://nodejs.org> installieren. |
| Port-Fehler / `5173 is in use` | Es läuft schon eine Instanz. Anderes Terminal schließen, oder die im Terminal angezeigte Alternativ-Adresse öffnen. |
| `pnpm install` bricht mit Build-Fehlern ab | Build-Werkzeuge fehlen: **macOS** `xcode-select --install`; **Ubuntu/Debian** `sudo apt install build-essential`; **Windows** Node-Installer erneut starten und „Tools for Native Modules" mitinstallieren. |
| Seite bleibt weiß / lädt ewig | Kurz warten (die 3D-Meshes laden beim ersten Mal), Seite neu laden. Moderner Browser nötig (WebGL2). |

> Node-Version prüfen: `node --version` muss `v20` oder höher zeigen.
> pnpm-Version prüfen: `pnpm --version` muss `9` oder höher zeigen.

Wenn es weiterhin klemmt: ein [Issue auf GitHub](https://github.com/marifl/Iflands-Neuro-Lernvergnuegen/issues)
öffnen und die genaue Fehlermeldung aus dem Terminal mitkopieren.
