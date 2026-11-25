import type { GrammarNote, TopicId } from './types'

export const NOTES: GrammarNote[] = [
  {
    topic: 'present-irregular',
    summary: 'Most "irregular" presents follow a handful of patterns. Learn the pattern, not each verb.',
    rules: [
      'Yo with -g-: hacer → hago, poner → pongo, salir → salgo, tener → tengo, venir → vengo, decir → digo, traer → traigo, caer → caigo, oír → oigo.',
      'Stem changes only in stressed syllables (yo, tú, él, ellos — never nosotros): e→ie (querer → quiero), o→ue (poder → puedo), e→i (pedir → pido). jugar is u→ue.',
      '-cer / -cir after a vowel: yo → -zco (conocer → conozco, traducir → traduzco, ofrecer → ofrezco).',
      'Fully irregular: ser (soy, eres, es, somos, son), ir (voy, vas, va, vamos, van), estar (estoy, estás), saber (sé), dar (doy), ver (veo), haber (hay).',
      'The present also expresses fixed plans: "Mañana vamos a la playa."',
    ],
    pitfalls: [
      'Dutch has no stem changes, so you will want to say *podemos → puedemos: nosotros keeps the original vowel.',
      'saber vs conocer: Dutch "kennen" = conocer (people, places), "weten" = saber (facts). "Ik ken hem" = Lo conozco.',
      'llevar vs traer: Dutch "brengen" covers both. traer = towards the speaker, llevar = away from here.',
    ],
    examples: [
      { es: 'Salgo de la chamba a las seis y llego a casa como a las siete.', en: 'I leave work at six and get home around seven.' },
      { es: '¿Qué hacen ustedes el fin? — Nada, nos quedamos en casa.', en: 'What are you all doing this weekend? — Nothing, we’re staying home.' },
      { es: 'No conozco a nadie aquí, pero sé dónde está el metro.', en: 'I don’t know anyone here, but I know where the metro is.' },
    ],
    spain: ['vosotros forms: hacéis, tenéis, podéis, queréis, sois, vais.'],
  },
  {
    topic: 'ser-estar',
    summary: 'ser = what something IS (identity, characteristics, time, events). estar = where / how something is RIGHT NOW (location, states, results).',
    rules: [
      'ser: identity, profession (es ingeniera), origin (es de Monterrey), material (es de madera), clock time (son las tres), where and when an EVENT happens (la fiesta es en mi casa).',
      'estar: location of people and things (está en Puebla), temporary states (está cansado), results (la tienda está cerrada), estar + gerund (está lloviendo).',
      'Same adjective, different meaning: ser listo (smart) / estar listo (ready); ser rico (wealthy) / estar rico (tasty); ser aburrido (boring) / estar aburrido (bored); ser malo (bad) / estar malo (ill).',
      'Passive of an action → ser + participle (fue construida); resulting state → estar + participle (está construida).',
    ],
    pitfalls: [
      'Dutch "zijn" is one verb: ask "identity/characteristic or state/location?" every time.',
      'Events are the trap: "Het feest is bij Ana" = La fiesta ES en casa de Ana (not está).',
      'Professions take no article: "Ze is lerares" = Es maestra (not *es una maestra, unless you add an adjective).',
    ],
    examples: [
      { es: 'Mi depa está en la Roma, pero la fiesta es en casa de Ana.', en: 'My flat is in Roma, but the party is at Ana’s.' },
      { es: 'Este mole está riquísimo. ¿Quién lo hizo?', en: 'This mole is delicious. Who made it?' },
      { es: 'Ya son las once y todavía no estoy listo.', en: 'It’s already eleven and I’m still not ready.' },
    ],
    spain: ['Spain says "enfadado" where Mexico says "enojado".'],
  },
  {
    topic: 'preterite',
    summary: 'The preterite tells what HAPPENED: completed actions with a beginning and an end. Mexico uses it far more than Spain (also for things that happened today).',
    rules: [
      'Regular: -ar → é, aste, ó, amos, aron; -er/-ir → í, iste, ió, imos, ieron.',
      'Strong stems (no accents!): tener → tuve, estar → estuve, poder → pude, poner → puse, saber → supe, hacer → hice / hizo, querer → quise, venir → vine, decir → dije, traer → traje.',
      'j-stems take -eron: dijeron, trajeron, condujeron (never *dijieron).',
      'ser and ir share forms: fui, fuiste, fue, fuimos, fueron.',
      'Spelling in yo: -car → -qué (busqué), -gar → -gué (llegué), -zar → -cé (empecé). leer/creer/oír: leyó, leyeron.',
      '-ir stem-changers change in él/ellos: pedir → pidió, dormir → durmió.',
    ],
    pitfalls: [
      'Dutch uses the perfect for finished past actions ("ik heb gisteren gewerkt"). Spanish uses the preterite: Ayer trabajé.',
      'Irregular preterites have no written accent: hice, puso, vino (not *hicé, *pusó).',
    ],
    examples: [
      { es: 'Ayer fui al súper y se me olvidaron las tortillas.', en: 'Yesterday I went to the supermarket and forgot the tortillas.' },
      { es: '¿Qué dijiste? No te oí.', en: 'What did you say? I didn’t hear you.' },
      { es: 'El sábado tuve que trabajar, pero el domingo descansé.', en: 'On Saturday I had to work, but on Sunday I rested.' },
    ],
    spain: ['vosotros: fuisteis, tuvisteis, hicisteis.'],
  },
  {
    topic: 'pret-imp',
    summary: 'Preterite = the events (what happened, the story moving forward). Imperfect = the background (what was going on, what things were like, what used to happen).',
    rules: [
      'Imperfect: descriptions (la casa era grande), age and time (tenía diez años, eran las tres), habits (siempre íbamos), actions in progress (mientras cocinaba), mental/physical states as background (estaba cansado).',
      'Preterite: completed events (llegué), sequences (me levanté, me bañé y salí), sudden events (de repente sonó), bounded periods (viví tres años en Utrecht, estuve enferma todo el día).',
      'Interruption pattern: imperfect for the ongoing action + preterite for the interruption: Estaba durmiendo cuando sonó el teléfono.',
      'Meaning changes: conocí (met) / conocía (knew); supe (found out) / sabía (knew); quise (tried) / no quise (refused) / quería (wanted); pude (managed) / podía (was able).',
      'Signal words (not absolute rules): ayer, anoche, de repente, una vez → preterite; siempre, cada día, de niño, antes, mientras → imperfect.',
    ],
    pitfalls: [
      'Dutch "was" and "had" hide the choice: "Ik was moe" = estaba cansado (background) but "Ik was drie dagen ziek" = estuve enfermo tres días (closed period).',
      'Dutch "ik ging altijd…" = imperfect (iba), but "ik ben gegaan" is usually preterite (fui).',
      'A long time does not make it imperfect: "Viví diez años en Rotterdam" is preterite because the period is closed.',
    ],
    examples: [
      { es: 'Cuando era niño, mi abuela nos contaba historias todas las noches.', en: 'When I was a child, my grandma told us stories every night.' },
      { es: 'Estaba viendo la tele cuando de repente se fue la luz.', en: 'I was watching TV when suddenly the power went out.' },
      { es: 'No sabía que tenías novio. ¿Cuándo lo conociste?', en: 'I didn’t know you had a boyfriend. When did you meet him?' },
      { es: 'Ayer estuve en casa todo el día porque llovía muchísimo.', en: 'Yesterday I was at home all day because it was pouring.' },
    ],
  },
  {
    topic: 'perf-pret',
    summary: 'Mexico prefers the preterite for anything finished — even today. The present perfect is for life experience and situations that continue up to now.',
    rules: [
      'Preterite (MX default): finished actions, also today or just now: Hoy me levanté a las seis. ¿Ya comiste? ¿Qué pasó?',
      'Present perfect (haber + participle): experience with no date (¿Alguna vez has comido chapulines?), "never / so far" (Nunca he estado en Chile), situations continuing to now (Últimamente he dormido mal).',
      '"Not yet": todavía no he terminado — or the very Mexican present: todavía no termino.',
      'A specific past time (ayer, en 2019, hace dos días) always takes the preterite, in every country.',
      'Irregular participles: hecho, dicho, visto, escrito, puesto, vuelto, roto, abierto, muerto.',
    ],
    pitfalls: [
      'Dutch and Spain both say "ik heb… / he…" for today; in Mexico that sounds Spanish (from Spain). Default to the preterite.',
      'haber + participle never splits: "No lo he visto" (not *he no visto).',
    ],
    examples: [
      { es: '¿Ya desayunaste? — Sí, desayuné hace rato.', en: 'Have you had breakfast? — Yes, a while ago.' },
      { es: 'Nunca he ido a Oaxaca, pero dicen que está padrísimo.', en: 'I’ve never been to Oaxaca, but they say it’s great.' },
      { es: 'Últimamente he tenido mucha chamba.', en: 'I’ve had a lot of work lately.' },
    ],
    spain: ['Spain: "Hoy me he levantado tarde", "¿Has comido ya?", "¿Qué ha pasado?" — recognise these on Spanish series.'],
  },
  {
    topic: 'pluperfect',
    summary: 'había + participle = the past before the past ("had done").',
    rules: [
      'Form: había, habías, había, habíamos, habían + participle (había salido).',
      'Use it for an action completed before another past moment: Cuando llegué, el tren ya había salido.',
      'Typical with ya (already), nunca (never before), todavía no (not yet) in past stories.',
      'Reported speech: "He terminado" → Dijo que había terminado.',
      'In relaxed speech, Mexicans often use the preterite when the order is obvious (Le devolví el libro que me prestó).',
    ],
    pitfalls: [
      'Dutch "was" + participle with movement verbs (ik was al vertrokken) is still había: ya me había ido. Spanish only uses haber.',
      'Keep pronouns before había: ya nos habíamos ido (not *habíamos nos ido).',
    ],
    examples: [
      { es: 'Cuando por fin llegamos, la película ya había empezado.', en: 'When we finally arrived, the film had already started.' },
      { es: 'Nunca había visto tanta gente en el Zócalo.', en: 'I had never seen so many people in the Zócalo.' },
      { es: 'Me dijo que había perdido el celular.', en: 'He told me he had lost his phone.' },
    ],
  },
  {
    topic: 'fut-cond',
    summary: 'Future = will / probably now. Conditional = would / probably then. In speech Mexicans prefer ir a + infinitive for plans.',
    rules: [
      'Endings on the whole infinitive: future -é, -ás, -á, -emos, -án; conditional -ía, -ías, -ía, -íamos, -ían.',
      'Irregular stems (same for both): tendr-, pondr-, saldr-, vendr-, podr-, sabr-, habr-, querr-, har-, dir-, cabr-.',
      'Future of probability (guess about now): ¿Dónde estará Juan? — Estará en el tráfico.',
      'Conditional: hypotheses (Yo que tú, no lo haría), politeness (¿Podrías…? Me gustaría…), future in the past (Dijo que vendría), guesses about the past (Serían las diez).',
      'Mexican speech: "ha de ser" = must be / probably (Ha de estar cansado).',
    ],
    pitfalls: [
      'Never use the future or conditional after "si" (if) or "cuando" for future time: si puedes / cuando llegues.',
      'Dutch "zou" covers both conditional and reported future; both are the Spanish conditional: Ze zei dat ze zou bellen = Dijo que llamaría.',
    ],
    examples: [
      { es: 'No contesta. Estará manejando.', en: 'He’s not answering. He’s probably driving.' },
      { es: '¿Me podrías pasar el archivo? Me gustaría revisarlo hoy.', en: 'Could you send me the file? I’d like to check it today.' },
      { es: 'Mañana va a llover, así que saldremos más tarde.', en: 'It’s going to rain tomorrow, so we’ll leave later.' },
    ],
  },
  {
    topic: 'obj-pronouns',
    summary: 'Direct: lo, la, los, las. Indirect: le, les. They go BEFORE a conjugated verb, or attach to an infinitive, gerund or affirmative command.',
    rules: [
      'me, te, nos are both direct and indirect. Third person: direct lo/la/los/las, indirect le/les.',
      'Position: before the conjugated verb (Lo veo); attached to infinitive / gerund (Voy a verlo, Estoy viéndolo — or Lo voy a ver, Lo estoy viendo); attached to affirmative commands (Cómpralo) but before negative ones (No lo compres).',
      'gustar-type verbs (gustar, encantar, interesar, preocupar, molestar, doler) use indirect pronouns: Me gusta, Le preocupa.',
      'Doubling is normal: A mi mamá le encanta. A Laura no la conozco.',
      'Add an accent when attaching makes the stress move: cómpralo, ayúdame, preparándolo.',
    ],
    pitfalls: [
      'Dutch puts the object after the verb ("ik zie hem"): Spanish puts it before: Lo veo.',
      'Mexico uses lo for male people (Lo vi). Spain often says "le vi" (leísmo) — recognise it, don’t copy it.',
      'Dutch reflexive "zich interesseren" ≠ Spanish: No le interesa la política (no "se").',
    ],
    examples: [
      { es: '¿Viste a Carlos? — Sí, lo vi ayer en la oficina.', en: 'Did you see Carlos? — Yes, I saw him yesterday at the office.' },
      { es: 'A mis papás les encanta el pozole.', en: 'My parents love pozole.' },
      { es: 'Háblame cuando llegues, pero no me hables antes de las ocho.', en: 'Call me when you arrive, but don’t call me before eight.' },
    ],
    spain: ['Spain: os (direct and indirect for vosotros): "Os veo mañana". Leísmo: "Le vi ayer".'],
  },
  {
    topic: 'double-pronouns',
    summary: 'Indirect before direct: me lo, te la, nos los. le/les + lo/la → se lo / se la.',
    rules: [
      'Order: indirect (me, te, nos, le/les) + direct (lo, la, los, las): Te lo digo.',
      'le / les become se before lo, la, los, las: Le di el libro → Se lo di. Never *le lo.',
      'Same position rules as single pronouns: before the conjugated verb or attached (Te lo voy a explicar / Voy a explicártelo; Dámelo / No me lo des).',
      'Add "a él / a ella / a ustedes" to clarify se: Se lo di a ella.',
      'Mexican speech often marks the plural "les" on lo: "Ya se los dije" (= I already told you all) — common in MX, informal.',
    ],
    pitfalls: [
      'Dutch order is the other way round ("ik geef het hem"); Spanish: se lo doy.',
      'Accents when attaching two pronouns: dímelo, explicártelo, dándoselo.',
    ],
    examples: [
      { es: '¿Me prestas tu pluma? — Sí, ahorita te la presto.', en: 'Can I borrow your pen? — Sure, one sec.' },
      { es: '¿Le diste el regalo a tu mamá? — Sí, se lo di ayer.', en: 'Did you give the present to your mum? — Yes, I gave it to her yesterday.' },
      { es: 'No te lo voy a explicar otra vez.', en: 'I’m not going to explain it to you again.' },
    ],
  },
  {
    topic: 'subj-present',
    summary: 'Subjunctive = not a fact you state: wishes, influence, emotion, doubt, purpose, future time after cuando. Usually after "que" with a NEW subject.',
    rules: [
      'Form: take yo present, drop -o, swap vowel: hablo → hable, como → coma, tengo → tenga, hago → haga. Irregular: sea, esté, vaya, sepa, haya, dé.',
      'Triggers (WEIRDO): Wishes (quiero que, espero que, ojalá), Emotion (me alegra que, me molesta que), Impersonal (es importante que, es necesario que), Recommendations (te recomiendo que, dile que), Doubt/denial (no creo que, dudo que), Ojalá.',
      'Always subjunctive: para que, antes de que, sin que, a menos que, con tal de que.',
      'cuando / en cuanto / hasta que + FUTURE idea → subjunctive (Cuando llegues, avísame); + habit → indicative (Cuando llego, me baño).',
      'Unknown or non-existent antecedent: Busco a alguien que hable alemán. No hay nadie que sepa.',
      'Same subject → infinitive, no "que": Quiero ir (not *quiero que vaya yo).',
    ],
    pitfalls: [
      'Dutch/English use an infinitive ("ik wil dat je komt" / "I want you to come"): Spanish needs que + subjunctive: Quiero que vengas.',
      'Never the future after cuando: *Cuando llegarás → Cuando llegues.',
      'creo que (belief) → indicative; no creo que (doubt) → subjunctive.',
    ],
    examples: [
      { es: 'Ojalá que no llueva el sábado.', en: 'Hopefully it won’t rain on Saturday.' },
      { es: 'Cuando termines la tarea, vamos por unos tacos.', en: 'When you finish your homework, we’ll go for tacos.' },
      { es: 'Te lo explico para que no te preocupes.', en: 'I’ll explain it so you don’t worry.' },
    ],
  },
  {
    topic: 'subj-imperfect',
    summary: 'The past of the subjunctive: same triggers, but the main verb is in the past, or the situation is hypothetical.',
    rules: [
      'Form: ellos preterite, drop -ron, add -ra: tuvieron → tuviera, dijeron → dijera, fueron → fuera. nosotros gets an accent: tuviéramos.',
      '-se forms (tuviese) mean the same; Mexico uses -ra almost always.',
      'Sequence: past trigger → imperfect subjunctive: Quería que vinieras. Me pidió que lo llamara.',
      'como si + imperfect subjunctive: Habla como si lo supiera todo.',
      'ojalá + imperfect subjunctive = unlikely / impossible wish: Ojalá tuviera más tiempo.',
      'Politeness: quisiera = I would like.',
    ],
    pitfalls: [
      'Dutch "ik wilde dat je bleef" uses a past indicative; Spanish needs the subjunctive: quería que te quedaras.',
      'Reported commands: "Hij zei dat ik moest komen" = Me dijo que viniera (not *que venir).',
    ],
    examples: [
      { es: 'Mi mamá quería que estudiara Medicina.', en: 'My mum wanted me to study medicine.' },
      { es: 'Ojalá pudiera ir contigo a Mérida.', en: 'I wish I could go with you to Mérida.' },
      { es: 'Me pidió que no le dijera a nadie.', en: 'She asked me not to tell anyone.' },
    ],
  },
  {
    topic: 'si-clauses',
    summary: 'Three types: real (si + present), hypothetical (si + imperfect subjunctive → conditional), unreal past (si + pluperfect subjunctive → habría / hubiera + participle).',
    rules: [
      'Type 1, possible: Si tengo tiempo, te ayudo / te voy a ayudar / te ayudaré. Si ves a Marta, salúdala.',
      'Type 2, hypothetical now: Si tuviera dinero, viajaría más.',
      'Type 3, unreal past: Si lo hubiera sabido, te habría llamado. In Mexican speech: …te hubiera llamado.',
      'Mixed: Si hubiera aceptado ese trabajo, ahora viviría en Canadá.',
      'Never the future or conditional right after "si" in a condition.',
    ],
    pitfalls: [
      'Dutch "als" = si (condition) or cuando (whenever / when). If it is a condition, use si.',
      'Dutch "als ik jou was" → Si yo fuera tú / Yo que tú / Yo en tu lugar.',
    ],
    examples: [
      { es: 'Si llueve, nos quedamos en casa y vemos una peli.', en: 'If it rains, we’ll stay in and watch a movie.' },
      { es: 'Si tuviera más lana, me compraría una casa en la playa.', en: 'If I had more money, I’d buy a house on the beach.' },
      { es: 'Si me hubieras avisado, habría ido por ti.', en: 'If you had told me, I would have picked you up.' },
    ],
  },
  {
    topic: 'por-para',
    summary: 'para looks forward to a goal (purpose, destination, recipient, deadline). por looks back at a cause or describes the route / exchange / means.',
    rules: [
      'para: purpose (para aprender), destination (salgo para Monterrey), recipient (es para ti), deadline (para el lunes), opinion (para mí), comparison (para ser extranjero…), employer (trabajo para…).',
      'por: cause (gracias por, por la lluvia), through / around (por el parque), exchange / price (por 200 pesos), means (por teléfono), duration (por dos semanas), agent in passive (escrito por), on behalf of (lo hice por ti), part of day (por la tarde).',
      'Mexico: ir por = go and get (Voy por tortillas); estar por + infinitive = to be about to.',
    ],
    pitfalls: [
      'Dutch "voor" can be either: "bedankt voor" = gracias POR; "dit is voor jou" = PARA ti.',
      'Dutch "om … te" = para + infinitive.',
    ],
    examples: [
      { es: 'Gracias por venir. Este pastel es para ti.', en: 'Thanks for coming. This cake is for you.' },
      { es: 'Voy por las tortillas, ahorita regreso.', en: 'I’m going to get the tortillas, back in a sec.' },
      { es: 'Estudio español para platicar con mis amigos de Guadalajara.', en: 'I study Spanish to chat with my friends from Guadalajara.' },
    ],
    spain: ['Spain: "voy a por el pan" (a por = to fetch); "estoy a punto de salir".'],
  },
  {
    topic: 'connectors',
    summary: 'Connectors make you sound fluent. Learn a few for each job: contrast, cause, consequence, adding, reformulating, and spoken fillers.',
    rules: [
      'Contrast: pero, sin embargo (between sentences), aunque (+ indicative = although; + subjunctive = even if), a pesar de (que), en cambio, mientras que.',
      'Correction after a negative: no X sino Y; no es que + subjunctive, sino que + indicative.',
      'Cause: porque (after the main clause), como (at the start), ya que, puesto que, debido a.',
      'Consequence: así que, por eso, por lo tanto, entonces.',
      'Adding / ordering: además, de hecho, por un lado… por otro, primero… luego… al final.',
      'Spoken MX fillers: o sea, este…, pues, la verdad es que, la neta (informal), ¿no?, ¿sabes?, fíjate que.',
    ],
    pitfalls: [
      'Dutch "maar" after a negative correction is sino, not pero: No es caro, sino barato.',
      '"Want" / "because" at the start of a sentence → como, not porque.',
      'Dutch "toch" (anyway) → de todos modos / aun así / igual (MX).',
    ],
    examples: [
      { es: 'La verdad es que no me late mucho la idea, pero bueno, vamos.', en: 'Honestly I’m not keen on the idea, but OK, let’s go.' },
      { es: 'Como no había leche, compré jugo.', en: 'Since there was no milk, I bought juice.' },
      { es: 'No es que no quiera, sino que no puedo.', en: 'It’s not that I don’t want to; I can’t.' },
    ],
    spain: ['Spain: "vale" (OK), "tío/tía" as filler, "pues nada".'],
  },
  {
    topic: 'relatives',
    summary: 'que is the default. lo que = what (the thing that). After a preposition: el/la que, quien. cuyo = whose.',
    rules: [
      'que for people and things, never omitted: El libro que leo (English drops "that"; Spanish can’t).',
      'lo que = what / the thing that: No entiendo lo que dices. Lo que más me gusta es…',
      'Preposition + article + que (or quien for people): la empresa para la que trabajo, la mujer con quien hablé.',
      'lo que / lo cual refers back to a whole clause: Llegó tarde, lo que molestó a todos.',
      'cuyo/cuya/cuyos/cuyas agrees with the thing owned: la autora cuya novela…',
      'donde for places: la ciudad donde nací (= en la que).',
    ],
    pitfalls: [
      'Dutch "wat" as relative ("alles wat") = lo que: todo lo que.',
      'No preposition stranding: "the man I spoke with" = el hombre con el que hablé.',
      'Dutch "waarover / waarmee" → de la que / con el que.',
    ],
    examples: [
      { es: 'La chava que vive al lado es de Mérida.', en: 'The girl who lives next door is from Mérida.' },
      { es: 'Lo que más extraño de México es la comida.', en: 'What I miss most about Mexico is the food.' },
      { es: 'Esa es la razón por la que no vine.', en: 'That’s the reason why I didn’t come.' },
    ],
  },
  {
    topic: 'se-passive',
    summary: '"se" does a lot: Dutch "men" (impersonal), passive (se venden casas), and the Mexican favourite, the accidental se (se me olvidó).',
    rules: [
      'Impersonal se + singular: Aquí se habla español. ¿Cómo se dice…? No se puede fumar.',
      'Passive se: the verb agrees with the thing: Se vende casa / Se venden casas.',
      'Accidental se: se + me/te/le/nos/les + verb agreeing with the thing: Se me olvidaron las llaves. Se nos acabó la gasolina.',
      'ser + participle (agreeing) + por = formal passive with an agent: La ley fue aprobada por el Senado.',
      'se + a + people → singular verb: Se anunciará a los ganadores.',
    ],
    pitfalls: [
      'Dutch "men" → se (or uno): Hier spreekt men Spaans = Aquí se habla español.',
      'Accidental se agrees with the object, not with you: Se me cayeron (los lentes), not *se me caí.',
      'Dutch "worden"-passive is used much less in Spanish speech; prefer se or an active sentence.',
    ],
    examples: [
      { es: 'Se me olvidó por completo tu cumpleaños, ¡perdón!', en: 'I completely forgot your birthday, sorry!' },
      { es: 'En esta tiendita se venden tortillas recién hechas.', en: 'This little shop sells freshly made tortillas.' },
      { es: 'Se nos ponchó una llanta en plena carretera.', en: 'We got a flat tyre in the middle of the highway.' },
    ],
  },
  {
    topic: 'reported',
    summary: 'After a past reporting verb (dijo, preguntó, pidió), shift tenses one step back and adapt pronouns, time and place words.',
    rules: [
      'present → imperfect (estoy → estaba); preterite / perfect → pluperfect (compré, he comprado → había comprado); future → conditional (vendré → vendría); voy a → iba a.',
      'Commands → que + subjunctive: present trigger (dice que vengas), past trigger (dijo que vinieras).',
      'Yes/no questions → si: Me preguntó si tenía hambre. Wh-questions keep the question word with its accent: Me preguntó dónde vivía.',
      'Adapt: mi → su, aquí → allí, hoy → ese día, mañana → al día siguiente, ayer → el día anterior.',
      'If the reporting verb is present (dice que…), keep the original tenses.',
    ],
    pitfalls: [
      'Dutch "zei dat ik moest…" → que + subjunctive, never an infinitive: Me dijo que llegara temprano.',
      'Dutch "of" (whether) = si, not o.',
    ],
    examples: [
      { es: 'Me dijo que estaba cansado y que se iba a dormir.', en: 'He told me he was tired and was going to bed.' },
      { es: 'Mi jefa me pidió que le mandara el informe.', en: 'My boss asked me to send her the report.' },
      { es: 'Le pregunté a qué hora salía el camión.', en: 'I asked him what time the bus left.' },
    ],
  },
  {
    topic: 'word-order',
    summary: 'Spanish word order is flexible but has no Dutch verb-second or verb-final rule. Negation doubles up.',
    rules: [
      'No V2: "Mañana mi hermano va a México" is fine (Dutch: "Morgen gaat mijn broer…").',
      'No verb at the end in subordinate clauses: No sé si viene (Dutch: of hij komt).',
      'Questions: question word + verb (+ subject): ¿Qué quiere tu papá? ¿Dónde compraste eso?',
      'Double negation: no + verb + nada / nadie / nunca / ningún. If the negative word comes first, drop no: Nunca como nada. Nadie vino.',
      'tampoco (neither), ni… ni…, ya no (no longer), todavía no (not yet), ni siquiera (not even).',
      'Personal "a" before people as direct object: Vi a mi mamá. No conozco a nadie.',
      'Descriptive adjectives usually follow the noun: un carro rojo.',
    ],
    pitfalls: [
      'Dutch single negation ("ik zie niemand") → Spanish double: No veo a nadie.',
      '"Ik ook niet" = Yo tampoco (not *yo también no).',
      'por qué (why, two words, accent) vs porque (because).',
    ],
    examples: [
      { es: 'Ayer en la noche no vi a nadie en la oficina.', en: 'Last night I didn’t see anyone at the office.' },
      { es: 'A mí no me gusta el cilantro. — A mí tampoco.', en: 'I don’t like coriander. — Me neither.' },
      { es: 'No sé si mi hermano va a venir.', en: 'I don’t know if my brother is coming.' },
    ],
  },
]

export const NOTE_BY_TOPIC = Object.fromEntries(NOTES.map((n) => [n.topic, n])) as Record<TopicId, GrammarNote>
