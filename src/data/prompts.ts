import type { SpeakingPrompt, TopicId, WritingPrompt } from './types'
import { dayNumber } from '../lib/dates'

const w = (topic: TopicId, text: string, target: string): WritingPrompt => ({ topic, text, target })
const sp = (topic: TopicId, text: string, targets: string[]): SpeakingPrompt => ({ topic, text, targets })

export const WRITING_PROMPTS: WritingPrompt[] = [
  w('present-irregular', 'Describe un día normal entre semana: a qué hora sales de casa, qué haces, qué traes en la mochila y a quién ves.', 'Present irregulars: salgo, hago, traigo, pongo, vengo'),
  w('present-irregular', 'Cuenta cómo es tu rutina del fin de semana y qué prefieres hacer cuando tienes tiempo libre.', 'Stem-changing verbs: prefiero, puedo, duermo, juego, quiero'),
  w('present-irregular', 'Escribe un mensaje a un amigo mexicano que viene a visitarte: qué sabes de tu ciudad, qué lugares conoces y qué propones hacer.', 'saber vs conocer + yo forms (sé, conozco, propongo)'),
  w('ser-estar', 'Describe tu casa o departamento: dónde está, cómo es y cómo está hoy.', 'ser vs estar'),
  w('ser-estar', 'Describe a una persona importante para ti: cómo es, de dónde es, a qué se dedica y cómo está últimamente.', 'ser (traits, origin, job) vs estar (states)'),
  w('ser-estar', 'Invita a alguien a un evento: dónde es, a qué hora es y cómo vas con los preparativos.', 'ser for events, estar for location and states'),
  w('preterite', 'Cuenta qué hiciste el fin de semana pasado, paso por paso.', 'Preterite, regular and irregular (fui, hice, tuve, puse)'),
  w('preterite', 'Cuenta un viaje corto que hiciste: cómo llegaste, qué viste, qué comiste y cuándo regresaste.', 'A sequence of events in the preterite'),
  w('preterite', 'Escribe sobre el día más estresante del último mes: qué pasó, qué dijiste, qué pudiste y qué no pudiste hacer.', 'Irregular preterites: dije, pude, tuve, estuve'),
  w('pret-imp', 'Cuenta un recuerdo de tu infancia: cómo era el lugar, qué hacías normalmente y qué pasó un día especial.', 'Imperfect for background and habits + preterite for events'),
  w('pret-imp', 'Cuenta una anécdota de un viaje en la que algo salió mal: dónde estabas, qué tiempo hacía y qué pasó de repente.', 'Interrupted actions: estaba… cuando…'),
  w('pret-imp', 'Describe cómo conociste a un buen amigo o a tu pareja: qué hacías en esa época y cómo fue el primer encuentro.', 'conocí vs conocía, sabía vs supe'),
  w('perf-pret', 'Escribe un mensaje a un amigo mexicano contándole qué hiciste hoy y qué no has hecho todavía.', 'MX: preterite for today; todavía no he…'),
  w('perf-pret', 'Escribe sobre tus experiencias de viaje: lugares en los que has estado y uno al que nunca has ido.', 'Present perfect for experiences + preterite with dates'),
  w('perf-pret', 'Cuenta cómo te ha ido últimamente con el español y qué hiciste esta semana para mejorar.', 'últimamente he… vs esta semana hice…'),
  w('pluperfect', 'Cuenta una vez que llegaste tarde a algo: qué ya había pasado cuando llegaste.', 'Pluperfect: ya había empezado…'),
  w('pluperfect', 'Escribe sobre algo que hiciste por primera vez: qué nunca habías hecho antes y cómo te sentiste.', 'nunca había + participle'),
  w('pluperfect', 'Cuenta una situación en la que te diste cuenta de que alguien se había equivocado.', 'darse cuenta de que + pluperfect'),
  w('fut-cond', 'Escribe tus planes para el próximo año: qué harás, adónde irás y qué tendrás que cambiar.', 'Future: haré, iré, tendré, podré'),
  w('fut-cond', '¿Qué harías si pudieras vivir un año en México? Describe tu vida ideal allí.', 'Conditional: viviría, trabajaría, podría'),
  w('fut-cond', 'Escribe un correo cortés a un hotel pidiendo información y haciendo dos peticiones.', 'Polite conditional: me gustaría, ¿podría…?'),
  w('obj-pronouns', 'Cuenta qué hiciste con las cosas que compraste la semana pasada: dónde las pusiste y a quién se las enseñaste.', 'lo / la / los / las + le / les'),
  w('obj-pronouns', 'Explica a un amigo cómo preparar tu platillo favorito con imperativos y pronombres (córtalo, ponlo, no lo dejes…).', 'Pronouns with commands'),
  w('obj-pronouns', 'Escribe sobre lo que les gusta y lo que les molesta a las personas de tu familia.', 'gustar-type verbs: les encanta, le molesta'),
  w('double-pronouns', 'Cuenta quién te regaló algo especial y a quién se lo enseñaste o prestaste después.', 'me lo, se lo, te la…'),
  w('double-pronouns', 'Escribe un diálogo corto en una tienda: pides cosas y el vendedor te las da.', '¿Me lo puede…? Se lo doy…'),
  w('double-pronouns', 'Explica cómo le explicas algo difícil a un compañero de trabajo, paso a paso.', 'se lo explico, te lo mando, voy a enviártelo'),
  w('subj-present', 'Escribe consejos a alguien que se va a vivir a México: es importante que…, te recomiendo que…', 'Subjunctive after recommendations and impersonal expressions'),
  w('subj-present', 'Escribe tus deseos para el próximo mes: espero que…, ojalá que…, quiero que…', 'Wishes + subjunctive'),
  w('subj-present', 'Describe qué vas a hacer cuando termines tu proyecto actual y qué buscas en tu próximo trabajo.', 'cuando + subjunctive; busco algo que + subjunctive'),
  w('subj-imperfect', 'Cuenta qué querían tus papás que hicieras cuando eras adolescente y qué hacías tú en realidad.', 'Quería que + imperfect subjunctive'),
  w('subj-imperfect', 'Escribe sobre tres cosas que te gustaría cambiar de tu vida: ojalá tuviera…, ojalá pudiera…', 'ojalá + imperfect subjunctive'),
  w('subj-imperfect', 'Cuenta una vez en que alguien te pidió un favor raro: qué te pidió que hicieras.', 'Me pidió que + imperfect subjunctive'),
  w('si-clauses', '¿Qué harías si ganaras la lotería mañana? Explica tres decisiones.', 'Type 2: si + imperfect subjunctive → conditional'),
  w('si-clauses', 'Escribe sobre una decisión del pasado: qué habría pasado si hubieras elegido otra cosa.', 'Type 3: si hubiera…, habría…'),
  w('si-clauses', 'Escribe las reglas para un fin de semana en casa con amigos: si llueve…, si alguien llega tarde…', 'Type 1: si + present'),
  w('por-para', 'Describe tu último viaje: por dónde pasaste, para qué fuiste y cuánto pagaste por el hotel.', 'por vs para'),
  w('por-para', 'Explica por qué y para qué estudias español.', 'por (cause) vs para (purpose)'),
  w('por-para', 'Escribe una nota de agradecimiento a alguien: gracias por…, esto es para…', 'gracias por; para + recipient'),
  w('connectors', 'Da tu opinión sobre trabajar desde casa: ventajas, desventajas y una conclusión.', 'por un lado…, sin embargo, además, por lo tanto'),
  w('connectors', 'Cuenta una anécdota usando conectores de narración: al principio, de repente, total que, al final.', 'Narrative connectors + fillers (o sea, la verdad es que)'),
  w('connectors', 'Compara dos ciudades que conoces usando en cambio, mientras que y aunque.', 'Contrast connectors'),
  w('relatives', 'Describe tu barrio: el lugar donde…, la persona que…, lo que más me gusta…', 'que, donde, lo que'),
  w('relatives', 'Habla de una serie o película: de qué trata, el personaje que…, la escena en la que…', 'en la que, con quien, cuyo'),
  w('relatives', 'Describe tu trabajo ideal: una empresa en la que…, compañeros con los que…, un jefe que…', 'Preposition + relative'),
  w('se-passive', 'Explica cómo se prepara un platillo típico de tu país (se pone, se corta, se sirve…).', 'Impersonal / passive se'),
  w('se-passive', 'Cuenta un día en que todo salió mal: se me olvidó…, se me cayó…, se nos acabó…', 'Accidental se'),
  w('se-passive', 'Escribe una noticia corta e inventada en estilo periodístico: fue inaugurado…, se anunció…', 'ser + participle passive, passive se'),
  w('reported', 'Cuenta una conversación reciente: qué te dijo la otra persona, qué te preguntó y qué te pidió.', 'dijo que…, me preguntó si…, me pidió que…'),
  w('reported', 'Resume una noticia que leíste esta semana: qué dijo el gobierno y qué prometió.', 'Backshift: dijo que había…, prometió que…'),
  w('reported', 'Cuenta lo que te dijeron en tu última cita médica o reunión de trabajo.', 'Reported commands: me dijo que + subjunctive'),
  w('word-order', 'Escribe sobre cosas que nunca haces y cosas que ya no haces.', 'Double negation: nunca… nada, ya no, tampoco'),
  w('word-order', 'Escribe cinco preguntas para conocer a alguien nuevo y respóndelas.', 'Question word order'),
  w('word-order', 'Cuenta qué hiciste ayer empezando cada frase con una expresión de tiempo (Ayer…, Después…, En la noche…).', 'No verb-second rule: time + subject + verb'),
]

export const SPEAKING_PROMPTS: SpeakingPrompt[] = [
  sp('present-irregular', 'Describe tu rutina de la mañana, desde que te despiertas hasta que llegas al trabajo.', ['salgo, pongo, hago', 'me despierto, me visto', 'primero / luego / después']),
  sp('present-irregular', 'Preséntate a un grupo nuevo: a qué te dedicas, qué sabes hacer bien y qué conoces de México.', ['sé vs conozco', 'yo forms with -g-', 'me dedico a…']),
  sp('ser-estar', 'Describe a tu mejor amigo: cómo es, de dónde es y cómo está en este momento de su vida.', ['ser for traits', 'estar for states', 'está + gerund']),
  sp('ser-estar', 'Describe el lugar donde estás ahora mismo y cómo te sientes.', ['estar for location', 'hay', 'es / está + adjective']),
  sp('preterite', 'Cuenta qué hiciste ayer, de la mañana a la noche.', ['fui, hice, tuve', 'primero, después, al final']),
  sp('preterite', 'Cuenta tu último viaje en orden cronológico.', ['llegué, vi, comí', 'irregular preterites']),
  sp('pret-imp', 'Cuenta cómo era tu vida a los diez años y un día que recuerdas especialmente.', ['era, tenía, vivía', 'un día… de repente…', 'conocí / supe']),
  sp('pret-imp', 'Cuenta una situación incómoda: dónde estabas, qué pasaba y qué pasó de repente.', ['estaba + gerund', 'cuando + preterite', 'total que…']),
  sp('perf-pret', 'Cuéntale a tu amigo mexicano qué has hecho últimamente y qué hiciste hoy.', ['últimamente he…', 'hoy + preterite (MX)', 'todavía no he…']),
  sp('perf-pret', 'Habla de tus experiencias: lugares donde has estado, comidas que has probado y algo que nunca has hecho.', ['he estado, he probado', 'nunca he…', 'alguna vez']),
  sp('pluperfect', 'Cuenta una vez que llegaste a algún lugar y algo ya había pasado.', ['ya había…', 'cuando llegué', 'me di cuenta de que']),
  sp('pluperfect', 'Habla de tu primera vez en otro país: qué nunca habías visto o hecho antes.', ['nunca había…', 'por primera vez']),
  sp('fut-cond', 'Habla de tus planes para los próximos cinco años.', ['haré, tendré, podré', 'voy a + infinitive']),
  sp('fut-cond', '¿Qué harías con un año sabático?', ['viajaría, aprendería', 'me gustaría', 'si pudiera…']),
  sp('obj-pronouns', 'Explica una receta paso a paso, dando instrucciones.', ['córtalo, ponla, no lo dejes', 'pronoun placement']),
  sp('obj-pronouns', 'Habla de la gente de tu vida: a quién llamas, a quién ves seguido y qué les gusta.', ['lo / la vs le / les', 'les encanta']),
  sp('double-pronouns', 'Cuenta los regalos que diste y recibiste el año pasado.', ['me lo regaló', 'se lo di']),
  sp('double-pronouns', 'Imagina que le pides varias cosas prestadas a un vecino.', ['¿Me lo prestas?', 'te lo devuelvo mañana']),
  sp('subj-present', 'Da consejos a alguien que empieza a aprender neerlandés.', ['te recomiendo que', 'es importante que', 'para que']),
  sp('subj-present', 'Habla de lo que esperas del próximo año.', ['espero que', 'ojalá', 'cuando + subjunctive']),
  sp('subj-imperfect', 'Cuenta qué te pedían tus papás o tus maestros cuando eras niño.', ['me pedían que', 'querían que']),
  sp('subj-imperfect', 'Habla de tres deseos que probablemente nunca se van a cumplir.', ['ojalá pudiera', 'como si']),
  sp('si-clauses', '¿Qué harías si fueras presidente de tu país por un día?', ['si fuera…, haría…', 'type 2']),
  sp('si-clauses', 'Habla de una decisión que tomaste y qué habría pasado si hubieras decidido otra cosa.', ['si hubiera…', 'habría…']),
  sp('por-para', 'Explica por qué estudias español y para qué lo vas a usar.', ['por (reason)', 'para (purpose)']),
  sp('por-para', 'Describe tu ruta al trabajo o a la universidad.', ['pasar por', 'salir para', 'por la mañana']),
  sp('connectors', 'Da tu opinión sobre las redes sociales.', ['por un lado / por otro', 'sin embargo', 'o sea, la verdad es que']),
  sp('connectors', 'Cuenta una historia usando conectores de narración.', ['al principio, de repente', 'total que, al final']),
  sp('relatives', 'Describe tu serie favorita y a sus personajes.', ['que, quien', 'lo que más me gusta', 'en la que']),
  sp('relatives', 'Describe la ciudad donde creciste.', ['donde', 'la gente con la que']),
  sp('se-passive', 'Explica cómo se celebra una fiesta típica de tu país.', ['se celebra, se come', 'impersonal se']),
  sp('se-passive', 'Cuenta las cosas que se te han olvidado o roto este mes.', ['se me olvidó', 'se me cayó']),
  sp('reported', 'Cuenta lo que te dijo alguien hoy o ayer.', ['me dijo que', 'me preguntó si']),
  sp('reported', 'Resume una noticia que escuchaste esta semana.', ['dijo que había…', 'anunció que…']),
  sp('word-order', 'Habla de tus malos hábitos: lo que nunca haces y lo que ya no haces.', ['nunca… nada', 'ya no', 'tampoco']),
  sp('word-order', 'Hazle una entrevista imaginaria a alguien famoso: cinco preguntas y sus respuestas.', ['question word order', 'por qué / porque']),
]

/** Today's prompt for a topic (rotates by date, stable within a day). */
export function writingPromptFor(topic: TopicId, date: string): WritingPrompt {
  const list = WRITING_PROMPTS.filter((p) => p.topic === topic)
  return list[dayNumber(date) % list.length]
}

export function speakingPromptFor(topic: TopicId, date: string): SpeakingPrompt {
  const list = SPEAKING_PROMPTS.filter((p) => p.topic === topic)
  return list[dayNumber(date) % list.length]
}
