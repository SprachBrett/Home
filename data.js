// ============================================================
// data.js — Sprachdaten (Kurse, Units, Lektionen, Vokabeln)
// Jede Lektion besteht aus einer Vokabelliste [DE, Zielsprache, Lautschrift?]
// Aus diesen Listen generiert lessons.js automatisch Übungen.
// ============================================================

export const LANGUAGES = {
  en: {
    id: "en",
    name: "Englisch",
    flag: "🇬🇧",
    color: "#22d3ee",
    units: [
      {
        id: "en-u1",
        title: "Grundlagen",
        icon: "👋",
        lessons: [
          { id: "en-u1-l1", title: "Begrüßung", vocab: [
            ["hallo", "hello"], ["tschüss", "goodbye"], ["ja", "yes"], ["nein", "no"],
            ["bitte", "please"], ["danke", "thank you"], ["entschuldigung", "sorry"],
            ["guten Morgen", "good morning"], ["gute Nacht", "good night"], ["ich heiße", "my name is"]
          ]},
          { id: "en-u1-l2", title: "Zahlen", vocab: [
            ["eins", "one"], ["zwei", "two"], ["drei", "three"], ["vier", "four"], ["fünf", "five"],
            ["sechs", "six"], ["sieben", "seven"], ["acht", "eight"], ["neun", "nine"], ["zehn", "ten"]
          ]},
          { id: "en-u1-l3", title: "Farben", vocab: [
            ["rot", "red"], ["blau", "blue"], ["grün", "green"], ["gelb", "yellow"], ["schwarz", "black"],
            ["weiß", "white"], ["orange", "orange"], ["lila", "purple"], ["rosa", "pink"], ["grau", "grey"]
          ]}
        ]
      },
      {
        id: "en-u2",
        title: "Familie",
        icon: "👪",
        lessons: [
          { id: "en-u2-l1", title: "Familienmitglieder", vocab: [
            ["Mutter", "mother"], ["Vater", "father"], ["Schwester", "sister"], ["Bruder", "brother"],
            ["Kind", "child"], ["Familie", "family"], ["Großmutter", "grandmother"], ["Großvater", "grandfather"],
            ["Freund", "friend"], ["Sohn", "son"]
          ]},
          { id: "en-u2-l2", title: "Beziehungen", vocab: [
            ["Ehemann", "husband"], ["Ehefrau", "wife"], ["Tochter", "daughter"], ["Onkel", "uncle"],
            ["Tante", "aunt"], ["Cousin", "cousin"], ["Baby", "baby"], ["Nachbar", "neighbor"],
            ["Partner", "partner"], ["Verwandter", "relative"]
          ]}
        ]
      },
      {
        id: "en-u3",
        title: "Essen",
        icon: "🍽️",
        lessons: [
          { id: "en-u3-l1", title: "Grundnahrung", vocab: [
            ["Brot", "bread"], ["Wasser", "water"], ["Apfel", "apple"], ["Milch", "milk"], ["Käse", "cheese"],
            ["Fleisch", "meat"], ["Gemüse", "vegetable"], ["Obst", "fruit"], ["Frühstück", "breakfast"],
            ["Abendessen", "dinner"]
          ]},
          { id: "en-u3-l2", title: "Im Restaurant", vocab: [
            ["Speisekarte", "menu"], ["Rechnung", "bill"], ["Kellner", "waiter"], ["Trinkgeld", "tip"],
            ["Vorspeise", "starter"], ["Nachtisch", "dessert"], ["Suppe", "soup"], ["Salat", "salad"],
            ["Getränk", "drink"], ["Tisch", "table"]
          ]}
        ]
      },
      {
        id: "en-u4",
        title: "Reisen",
        icon: "✈️",
        lessons: [
          { id: "en-u4-l1", title: "Am Flughafen", vocab: [
            ["Flughafen", "airport"], ["Zug", "train"], ["Fahrkarte", "ticket"], ["Hotel", "hotel"],
            ["Karte", "map"], ["Gepäck", "luggage"], ["Reisepass", "passport"], ["Stadt", "city"],
            ["Straße", "street"], ["Bahnhof", "station"]
          ]},
          { id: "en-u4-l2", title: "Unterwegs", vocab: [
            ["links", "left"], ["rechts", "right"], ["geradeaus", "straight ahead"], ["Ausgang", "exit"],
            ["Eingang", "entrance"], ["Verspätung", "delay"], ["Abflug", "departure"], ["Ankunft", "arrival"],
            ["Taxi", "taxi"], ["Bus", "bus"]
          ]}
        ]
      }
    ]
  },

  fr: {
    id: "fr",
    name: "Französisch",
    flag: "🇫🇷",
    color: "#a78bfa",
    units: [
      {
        id: "fr-u1",
        title: "Grundlagen",
        icon: "👋",
        lessons: [
          { id: "fr-u1-l1", title: "Begrüßung", vocab: [
            ["hallo", "bonjour"], ["tschüss", "au revoir"], ["ja", "oui"], ["nein", "non"],
            ["bitte", "s'il vous plaît"], ["danke", "merci"], ["entschuldigung", "pardon"],
            ["guten Morgen", "bonjour"], ["gute Nacht", "bonne nuit"], ["ich heiße", "je m'appelle"]
          ]},
          { id: "fr-u1-l2", title: "Zahlen", vocab: [
            ["eins", "un"], ["zwei", "deux"], ["drei", "trois"], ["vier", "quatre"], ["fünf", "cinq"],
            ["sechs", "six"], ["sieben", "sept"], ["acht", "huit"], ["neun", "neuf"], ["zehn", "dix"]
          ]},
          { id: "fr-u1-l3", title: "Farben", vocab: [
            ["rot", "rouge"], ["blau", "bleu"], ["grün", "vert"], ["gelb", "jaune"], ["schwarz", "noir"],
            ["weiß", "blanc"], ["orange", "orange"], ["lila", "violet"], ["rosa", "rose"], ["grau", "gris"]
          ]}
        ]
      },
      {
        id: "fr-u2",
        title: "Familie",
        icon: "👪",
        lessons: [
          { id: "fr-u2-l1", title: "Familienmitglieder", vocab: [
            ["Mutter", "mère"], ["Vater", "père"], ["Schwester", "sœur"], ["Bruder", "frère"],
            ["Kind", "enfant"], ["Familie", "famille"], ["Großmutter", "grand-mère"], ["Großvater", "grand-père"],
            ["Freund", "ami"], ["Sohn", "fils"]
          ]},
          { id: "fr-u2-l2", title: "Beziehungen", vocab: [
            ["Ehemann", "mari"], ["Ehefrau", "femme"], ["Tochter", "fille"], ["Onkel", "oncle"],
            ["Tante", "tante"], ["Cousin", "cousin"], ["Baby", "bébé"], ["Nachbar", "voisin"],
            ["Partner", "partenaire"], ["Verwandter", "parent"]
          ]}
        ]
      },
      {
        id: "fr-u3",
        title: "Essen",
        icon: "🍽️",
        lessons: [
          { id: "fr-u3-l1", title: "Grundnahrung", vocab: [
            ["Brot", "pain"], ["Wasser", "eau"], ["Apfel", "pomme"], ["Milch", "lait"], ["Käse", "fromage"],
            ["Fleisch", "viande"], ["Gemüse", "légume"], ["Obst", "fruit"], ["Frühstück", "petit-déjeuner"],
            ["Abendessen", "dîner"]
          ]},
          { id: "fr-u3-l2", title: "Im Restaurant", vocab: [
            ["Speisekarte", "menu"], ["Rechnung", "addition"], ["Kellner", "serveur"], ["Trinkgeld", "pourboire"],
            ["Vorspeise", "entrée"], ["Nachtisch", "dessert"], ["Suppe", "soupe"], ["Salat", "salade"],
            ["Getränk", "boisson"], ["Tisch", "table"]
          ]}
        ]
      },
      {
        id: "fr-u4",
        title: "Reisen",
        icon: "✈️",
        lessons: [
          { id: "fr-u4-l1", title: "Am Flughafen", vocab: [
            ["Flughafen", "aéroport"], ["Zug", "train"], ["Fahrkarte", "billet"], ["Hotel", "hôtel"],
            ["Karte", "carte"], ["Gepäck", "bagages"], ["Reisepass", "passeport"], ["Stadt", "ville"],
            ["Straße", "rue"], ["Bahnhof", "gare"]
          ]},
          { id: "fr-u4-l2", title: "Unterwegs", vocab: [
            ["links", "gauche"], ["rechts", "droite"], ["geradeaus", "tout droit"], ["Ausgang", "sortie"],
            ["Eingang", "entrée"], ["Verspätung", "retard"], ["Abflug", "départ"], ["Ankunft", "arrivée"],
            ["Taxi", "taxi"], ["Bus", "bus"]
          ]}
        ]
      }
    ]
  },

  es: {
    id: "es",
    name: "Spanisch",
    flag: "🇪🇸",
    color: "#fb923c",
    units: [
      {
        id: "es-u1",
        title: "Grundlagen",
        icon: "👋",
        lessons: [
          { id: "es-u1-l1", title: "Begrüßung", vocab: [
            ["hallo", "hola"], ["tschüss", "adiós"], ["ja", "sí"], ["nein", "no"],
            ["bitte", "por favor"], ["danke", "gracias"], ["entschuldigung", "perdón"],
            ["guten Morgen", "buenos días"], ["gute Nacht", "buenas noches"], ["ich heiße", "me llamo"]
          ]},
          { id: "es-u1-l2", title: "Zahlen", vocab: [
            ["eins", "uno"], ["zwei", "dos"], ["drei", "tres"], ["vier", "cuatro"], ["fünf", "cinco"],
            ["sechs", "seis"], ["sieben", "siete"], ["acht", "ocho"], ["neun", "nueve"], ["zehn", "diez"]
          ]},
          { id: "es-u1-l3", title: "Farben", vocab: [
            ["rot", "rojo"], ["blau", "azul"], ["grün", "verde"], ["gelb", "amarillo"], ["schwarz", "negro"],
            ["weiß", "blanco"], ["orange", "naranja"], ["lila", "morado"], ["rosa", "rosa"], ["grau", "gris"]
          ]}
        ]
      },
      {
        id: "es-u2",
        title: "Familie",
        icon: "👪",
        lessons: [
          { id: "es-u2-l1", title: "Familienmitglieder", vocab: [
            ["Mutter", "madre"], ["Vater", "padre"], ["Schwester", "hermana"], ["Bruder", "hermano"],
            ["Kind", "niño"], ["Familie", "familia"], ["Großmutter", "abuela"], ["Großvater", "abuelo"],
            ["Freund", "amigo"], ["Sohn", "hijo"]
          ]},
          { id: "es-u2-l2", title: "Beziehungen", vocab: [
            ["Ehemann", "esposo"], ["Ehefrau", "esposa"], ["Tochter", "hija"], ["Onkel", "tío"],
            ["Tante", "tía"], ["Cousin", "primo"], ["Baby", "bebé"], ["Nachbar", "vecino"],
            ["Partner", "pareja"], ["Verwandter", "pariente"]
          ]}
        ]
      },
      {
        id: "es-u3",
        title: "Essen",
        icon: "🍽️",
        lessons: [
          { id: "es-u3-l1", title: "Grundnahrung", vocab: [
            ["Brot", "pan"], ["Wasser", "agua"], ["Apfel", "manzana"], ["Milch", "leche"], ["Käse", "queso"],
            ["Fleisch", "carne"], ["Gemüse", "verdura"], ["Obst", "fruta"], ["Frühstück", "desayuno"],
            ["Abendessen", "cena"]
          ]},
          { id: "es-u3-l2", title: "Im Restaurant", vocab: [
            ["Speisekarte", "menú"], ["Rechnung", "cuenta"], ["Kellner", "camarero"], ["Trinkgeld", "propina"],
            ["Vorspeise", "entrante"], ["Nachtisch", "postre"], ["Suppe", "sopa"], ["Salat", "ensalada"],
            ["Getränk", "bebida"], ["Tisch", "mesa"]
          ]}
        ]
      },
      {
        id: "es-u4",
        title: "Reisen",
        icon: "✈️",
        lessons: [
          { id: "es-u4-l1", title: "Am Flughafen", vocab: [
            ["Flughafen", "aeropuerto"], ["Zug", "tren"], ["Fahrkarte", "billete"], ["Hotel", "hotel"],
            ["Karte", "mapa"], ["Gepäck", "equipaje"], ["Reisepass", "pasaporte"], ["Stadt", "ciudad"],
            ["Straße", "calle"], ["Bahnhof", "estación"]
          ]},
          { id: "es-u4-l2", title: "Unterwegs", vocab: [
            ["links", "izquierda"], ["rechts", "derecha"], ["geradeaus", "todo recto"], ["Ausgang", "salida"],
            ["Eingang", "entrada"], ["Verspätung", "retraso"], ["Abflug", "salida"], ["Ankunft", "llegada"],
            ["Taxi", "taxi"], ["Bus", "autobús"]
          ]}
        ]
      }
    ]
  }
};

// Sprachcode → BCP-47 Tag für Speech-Synthesis (Aussprache)
export const SPEECH_LOCALE = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES"
};

// Hilfsfunktion: alle Lektionen einer Sprache als flache Liste (in Reihenfolge)
export function getFlatLessons(langId) {
  const lang = LANGUAGES[langId];
  if (!lang) return [];
  const flat = [];
  lang.units.forEach(unit => {
    unit.lessons.forEach(lesson => {
      flat.push({ ...lesson, unitId: unit.id, unitTitle: unit.title, unitIcon: unit.icon });
    });
  });
  return flat;
}

export function findLesson(langId, lessonId) {
  return getFlatLessons(langId).find(l => l.id === lessonId) || null;
}
