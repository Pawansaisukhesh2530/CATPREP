export type NavKey = 'dashboard' | 'reading' | 'rc' | 'mock' | 'analytics' | 'vocab'

export type Question = {
  id: number
  prompt: string
  options: string[]
  answer: number
  explanation: string
  type: 'Inference' | 'Tone' | 'Main Idea' | 'Vocabulary'
}

export const weeklyAccuracy = [
  { day: 'Mon', accuracy: 62, speed: 96 },
  { day: 'Tue', accuracy: 68, speed: 89 },
  { day: 'Wed', accuracy: 74, speed: 84 },
  { day: 'Thu', accuracy: 77, speed: 80 },
  { day: 'Fri', accuracy: 81, speed: 74 },
  { day: 'Sat', accuracy: 84, speed: 72 },
]

export const weakAreas = [
  { area: 'Inference', value: 38 },
  { area: 'Tone', value: 44 },
  { area: 'Critical Reasoning', value: 52 },
  { area: 'Vocabulary in Context', value: 58 },
]

export const accuracyByType = [
  { type: 'Inference', accuracy: 62 },
  { type: 'Tone', accuracy: 70 },
  { type: 'Main Idea', accuracy: 84 },
  { type: 'Vocabulary', accuracy: 73 },
]

export const rcTimeBreakdown = [
  { rc: 'RC-1', mins: 6.4 },
  { rc: 'RC-2', mins: 8.1 },
  { rc: 'RC-3', mins: 7.2 },
  { rc: 'RC-4', mins: 9.3 },
]

export const todaysTasks = [
  { id: 1, title: 'Read editorial on monetary policy', done: true },
  { id: 2, title: 'Practice 2 RC sets (Inference heavy)', done: false },
  { id: 3, title: 'Analyze incorrect answers from Mock 04', done: false },
  { id: 4, title: 'Revise 20 advanced vocabulary words', done: false },
]

export const readingArticle = {
  title: 'The Invisible Cost of Convenience',
  author: 'A. Mehra',
  minutes: 9,
  paragraphs: [
    'Modern urban life is structured around convenience. Taps summon transport, groceries arrive before hunger turns urgent, and algorithms propose choices before one has articulated a need. This architecture of ease appears benign, even emancipatory, because it seems to return time to the individual.',
    'Yet convenience is not neutral. It reorganizes attention. When tasks are continuously optimized, the mind can become less tolerant of cognitive friction. Activities that require slow inference, ambiguity, and sustained concentration begin to feel inefficient rather than meaningful.',
    'The paradox is striking: as environments become smarter, people may outsource not merely effort but judgment. Decision support systems, for all their utility, can encourage passive compliance when users mistake fluency for understanding. In such moments, convenience mutates into quiet dependency.',
    'The challenge, therefore, is not to reject convenience but to design rituals of deliberation within it. Societies that value independent reasoning must preserve spaces where delay is educational, where uncertainty is not a bug but a method, and where attention is treated as civic infrastructure.',
  ],
  difficultWords: {
    emancipatory: 'giving freedom from restrictions',
    inference: 'a conclusion reached from evidence',
    fluency: 'smooth ease in performing a task',
    deliberation: 'long and careful consideration',
  } as Record<string, string>,
}

export const rcPassage = {
  title: 'Passage: Knowledge and Certainty',
  body: `Certainty has always enjoyed prestige in intellectual life. Philosophers, scientists, and policy-makers are frequently rewarded not for articulating complexity, but for presenting confidence with rhetorical precision. Yet the contemporary world is characterized by systems whose behavior emerges from interaction effects, feedback loops, and threshold dynamics. In such environments, confident predictions can be less reliable than probabilistic judgments.

The desire for certainty is psychologically understandable: ambiguity is uncomfortable, and institutions require decisions on finite timelines. However, over-valuing certainty can produce brittle thinking. Analysts may dismiss disconfirming evidence, leaders may treat models as reality, and citizens may confuse decisiveness with competence. The resulting errors are not merely technical; they are ethical, because they allocate risk to populations that had little role in shaping those decisions.

A mature epistemic culture does not abandon conviction. Rather, it calibrates confidence to evidence and treats revision as a sign of rigor rather than weakness. This approach demands intellectual humility, transparent assumptions, and a willingness to distinguish what is known, what is uncertain, and what is unknowable within current constraints.`,
}

export const rcQuestions: Question[] = [
  {
    id: 1,
    prompt: 'The author is primarily concerned with:',
    options: [
      'defending scientific models as exact representations of reality',
      'arguing that certainty is always harmful in public policy',
      'showing that overconfidence in complex systems can lead to ethical and practical failures',
      'proving that ambiguity should replace all forms of decision-making',
    ],
    answer: 2,
    explanation:
      'The passage critiques over-valuing certainty in complex systems and explains both technical and ethical consequences, while advocating calibrated confidence.',
    type: 'Main Idea',
  },
  {
    id: 2,
    prompt: 'Which option best captures the tone of the passage?',
    options: ['Triumphant and celebratory', 'Measured and analytical', 'Sarcastic and dismissive', 'Alarmist and cynical'],
    answer: 1,
    explanation:
      'The writer presents a balanced critique with reasoned qualifications, which is best described as measured and analytical.',
    type: 'Tone',
  },
  {
    id: 3,
    prompt: 'It can be inferred that a “mature epistemic culture” would value:',
    options: [
      'unwavering confidence regardless of evidence',
      'speed of decision over transparency',
      'revisability and explicit assumptions',
      'public persuasion over intellectual humility',
    ],
    answer: 2,
    explanation:
      'The final paragraph explicitly highlights revision, transparent assumptions, and calibrated confidence.',
    type: 'Inference',
  },
]

export const navigatorItems = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  status: i < 5 ? 'done' : i === 5 ? 'active' : i % 3 === 0 ? 'review' : 'todo',
}))
