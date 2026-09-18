// Small set of server-side (non-model-generated) user-facing error strings,
// translated so they match the app's language even though they never touch
// the AI model. Keep in sync with the `language` values sent from
// src/store/locale.ts (LANGUAGE_ENGLISH_NAME) and the relevant keys in
// src/i18n/locales/*.ts on the client.

type MessageKey =
  | 'noIngredients'
  | 'noMeals'
  | 'noQuestion'
  | 'noImage'
  | 'trouble'
  | 'keepGoing'
  | 'notEnoughIngredients';

const MESSAGES: Record<string, Record<MessageKey, string>> = {
  English: {
    noIngredients: 'Add at least one ingredient first.',
    noMeals: 'The assistant could not plan any meals. Try again.',
    noQuestion: 'No question provided.',
    noImage: 'No image provided.',
    trouble: 'The assistant is having trouble right now.',
    keepGoing: "Keep going — you're on track.",
    notEnoughIngredients:
      "I couldn't identify enough ingredients. Try taking a photo with the fridge more open and the food visible.",
  },
  German: {
    noIngredients: 'Füge zuerst mindestens eine Zutat hinzu.',
    noMeals: 'Der Assistent konnte keine Gerichte planen. Versuch es erneut.',
    noQuestion: 'Keine Frage angegeben.',
    noImage: 'Kein Bild angegeben.',
    trouble: 'Der Assistent hat gerade Probleme.',
    keepGoing: 'Mach weiter so — du bist auf einem guten Weg.',
    notEnoughIngredients:
      'Ich konnte nicht genug Zutaten erkennen. Mach ein Foto mit weiter geöffnetem Kühlschrank, sodass die Lebensmittel sichtbar sind.',
  },
  Albanian: {
    noIngredients: 'Shto të paktën një përbërës së pari.',
    noMeals: 'Asistenti nuk mundi të planifikojë asnjë gjellë. Provo përsëri.',
    noQuestion: 'Nuk u dha asnjë pyetje.',
    noImage: 'Nuk u dha asnjë imazh.',
    trouble: 'Asistenti ka probleme tani.',
    keepGoing: 'Vazhdo kështu — je në rrugën e duhur.',
    notEnoughIngredients:
      'Nuk munda të identifikoj mjaftueshëm përbërës. Provo një foto me frigoriferin më të hapur dhe ushqimin të dukshëm.',
  },
  Macedonian: {
    noIngredients: 'Прво додај барем една состојка.',
    noMeals: 'Асистентот не можеше да испланира ниту едно јадење. Обиди се повторно.',
    noQuestion: 'Не е дадено прашање.',
    noImage: 'Не е дадена слика.',
    trouble: 'Асистентот има проблеми во моментов.',
    keepGoing: 'Продолжи вака — си на вистинскиот пат.',
    notEnoughIngredients:
      'Не успеав да препознаам доволно состојки. Обиди се со слика со поотворен фрижидер и видлива храна.',
  },
  Serbian: {
    noIngredients: 'Prvo dodaj bar jedan sastojak.',
    noMeals: 'Asistent nije mogao da isplanira nijedno jelo. Pokušaj ponovo.',
    noQuestion: 'Nije uneto pitanje.',
    noImage: 'Nije data slika.',
    trouble: 'Asistent trenutno ima problema.',
    keepGoing: 'Nastavi tako — na dobrom si putu.',
    notEnoughIngredients:
      'Nisam uspeo da prepoznam dovoljno sastojaka. Pokušaj sa fotografijom gde je frižider više otvoren, a hrana vidljiva.',
  },
};

export function localize(key: MessageKey, language: string | undefined): string {
  const dict = MESSAGES[language ?? 'English'] ?? MESSAGES.English;
  return dict[key] ?? MESSAGES.English[key];
}
