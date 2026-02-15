import { QuizPack } from '../quiz-bank';

export const STERILE_TECHNIQUE_QUIZ: QuizPack = {
  id: 'sterile-technique',
  title: 'Sterile Technique Basics',
  description: 'Core sterile field rules, contamination risks, and quick judgement calls.',
  tags: ['aseptic', 'basics'],
  questions: [
    {
      id: 'st-1',
      prompt: 'Which area is considered non-sterile on a sterile gown?',
      choices: [
        { id: 'a', text: 'Front of gown from chest to table level' },
        { id: 'b', text: 'Back of gown' },
        { id: 'c', text: 'Sleeves from cuff to 2 inches above elbow' },
        { id: 'd', text: 'Gloves' },
      ],
      correctChoiceId: 'b',
      explanation: 'The back of the gown is not considered sterile because it is not in constant view/control.',
      tags: ['gowning'],
    },
    {
      id: 'st-2',
      prompt: 'A sterile item falls below table level. What is the correct action?',
      choices: [
        { id: 'a', text: 'Pick it up quickly and continue' },
        { id: 'b', text: 'Wipe it with sterile water and continue' },
        { id: 'c', text: 'Consider it contaminated and replace it' },
        { id: 'd', text: 'Only contaminated if it touches the floor' },
      ],
      correctChoiceId: 'c',
      explanation: 'Below table level is considered contaminated because it is out of the sterile field.',
      tags: ['sterile-field'],
    },
  ],
};
