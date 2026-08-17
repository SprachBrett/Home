// ============================================================
// firebase-config.js — Zugangsdaten für die echte Online-Rangliste
//
// SprachBrett läuft als rein statische Seite auf GitHub Pages und hat
// keinen eigenen Server. Um trotzdem eine ECHTE, geräteübergreifende
// Rangliste zu haben, wird Firebase (kostenloses Backend von Google)
// verwendet. Ohne ausgefüllte Werte hier läuft SprachBrett normal
// weiter, zeigt aber nur die lokale, simulierte Rangliste.
//
// EINRICHTUNG (einmalig, ca. 5 Minuten, kostenlos, keine Kreditkarte):
//  1. https://console.firebase.google.com öffnen -> "Projekt hinzufügen"
//  2. Im Projekt: Build -> Authentication -> "Los geht's"
//     -> Anmeldemethode "Anonym" aktivieren
//  3. Build -> Realtime Database -> "Datenbank erstellen"
//     -> Region wählen -> im "gesperrten Modus" starten
//  4. Im Tab "Regeln" der Realtime Database den Inhalt aus
//     firebase-rules.json (liegt neben dieser Datei) einfügen -> Veröffentlichen
//  5. Projekteinstellungen (Zahnrad oben links) -> "Ihre Apps"
//     -> Web-App hinzufügen (</>) -> Firebase liefert ein Objekt namens
//     "firebaseConfig" -> dessen Werte unten eintragen
//  6. FIREBASE_ENABLED auf true setzen und Datei hochladen -> fertig
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDLDKAlpWHzedsKNlyT2cHMQlpT9wmiLjw",
  authDomain: "sprachbrett.firebaseapp.com",
  databaseURL: "https://sprachbrett-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sprachbrett",
  storageBucket: "sprachbrett.firebasestorage.app",
  messagingSenderId: "674791447253",
  appId: "1:674791447253:web:2be5d480150e8a3df5e05c"
};

// Firebase ist eingerichtet — Online-Rangliste ist aktiv.
export const FIREBASE_ENABLED = true;
