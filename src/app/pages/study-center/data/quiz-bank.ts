export type QuizChoice = { id: string; text: string };

export type QuizQuestion = {
    id: string;
    prompt: string;
    choices: QuizChoice[];
    correctChoiceId: string;
    explanation?: string;
    tags?: string[];
};

export type QuizPack = {
    id: string;
    title: string;
    description: string;
    tags: string[];
    questions: QuizQuestion[];
};

import { STERILE_TECHNIQUE_QUIZ } from './quizzes/sterile-technique.quiz';
import { ORTHO_KNEE_QUIZ } from './quizzes/ortho-knee.quiz'

export const QUIZ_BANK: QuizPack[] = [
    STERILE_TECHNIQUE_QUIZ,
    ORTHO_KNEE_QUIZ,
];