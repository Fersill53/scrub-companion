import { QuizPack } from '../quiz-bank';

export const ORTHO_KNEE_QUIZ: QuizPack = {
  id: 'ortho-knee',
  title: 'Ortho Knee: Basics',
  description: 'Common concepts and instrument recognition for knee cases.',
  tags: ['ortho', 'knee'],
  questions: [
    {
      id: 'ok-1',
      prompt: 'Which instrument is primarily used to remove bone during joint work?',
      choices: [
        { id: 'a', text: 'Rongeur' },
        { id: 'b', text: 'Hemostat' },
        { id: 'c', text: 'Needle driver' },
        { id: 'd', text: 'Sponge stick' },
      ],
      correctChoiceId: 'a',
      explanation: 'Rongeurs are used to bite/remove bone or tough tissue.',
      tags: ['instruments'],
    },
    {
      id: 'ok-2',
      prompt: 'For many knee cases, patient positioning is most commonly:',
      choices: [
        { id: 'a', text: 'Prone' },
        { id: 'b', text: 'Supine' },
        { id: 'c', text: 'Lateral' },
        { id: 'd', text: 'Sitting' },
      ],
      correctChoiceId: 'b',
      explanation: 'Most knee cases are performed supine (confirm surgeon preference).',
      tags: ['positioning'],
    },
  ],
};
