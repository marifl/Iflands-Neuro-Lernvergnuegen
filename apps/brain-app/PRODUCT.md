# brain-app Produktvertrag

Diese Datei ist kein zweiter Produktvertrag. Für Produktzweck, Zielgruppe und
Designprinzipien gilt die Repo-Wurzel:

1. [`../../PRODUCT.md`](../../PRODUCT.md) beschreibt Produktzweck, Nutzungsmodi
   und V2-Zielbild.
2. [`../../DESIGN.md`](../../DESIGN.md) beschreibt die visuelle
   Editorial-Schicht.
3. [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) beschreibt
   Runtime-State, Config-Priorität, Snapshots, Responsive-Shell und Authoring.

App-lokal ist nur relevant: `apps/brain-app` ist die Vite-/React-/R3F-
Implementierung dieses Vertrags. Reguläre Modi sind `learn`, `explore` und
`phineas`; `atlas` ist ein internes oder deep-linkbares Supplement für präzise
Atlas-Referenz und TARO-Carves.

Historische Produktideen mit separaten Präsentations-, Begleit-, Editor- oder
Admin-Flows sind nicht mehr der aktuelle Implementierungsvertrag. Neue Arbeit
startet deshalb immer bei der Architekturkarte und der Atlas-/Config-Pipeline,
nicht bei alten App-Shell-Begriffen.
