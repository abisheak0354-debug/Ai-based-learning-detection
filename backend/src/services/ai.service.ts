import axios from 'axios';
import { env } from '../config/env';
import { mlClient } from './mlClient.service';

export type AiMode = 'predict' | 'train';

interface ChatInput {
  message: string;
  mode: AiMode;
  context?: Record<string, unknown>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const localPrediction = (context: Record<string, unknown>) => {
  const subjects = Array.isArray(context.subjects) ? context.subjects as Array<Record<string, unknown>> : [];
  const weakest = subjects
    .slice()
    .sort((left, right) => Number(right.weakness ?? 0) - Number(left.weakness ?? 0))[0];
  const attendance = Number(context.attendance ?? 78);
  const midterm = Number(context.midterm ?? 64);
  const assessment = Number(context.assessment ?? 72);
  const engagement = Number(context.engagement ?? 64);
  const projectedScore = Math.max(0, Math.min(100, attendance * 0.2 + midterm * 0.35 + assessment * 0.25 + engagement * 0.2));

  return {
    projectedScore: Number(projectedScore.toFixed(1)),
    risk: projectedScore < 60 ? 'high' : projectedScore < 75 ? 'moderate' : 'low',
    weakestSubject: String(weakest?.subject ?? context.weakestSubject ?? 'the subject with the lowest accuracy'),
    weakness: Number(weakest?.weakness ?? 100 - projectedScore),
    recommendation: String(weakest?.recommendation ?? 'Upload subject-level assessment history for a targeted intervention plan.'),
  };
};

const answerLocally = (question: string, context: Record<string, unknown>, prediction: ReturnType<typeof localPrediction>) => {
  const subjects = Array.isArray(context.subjects) ? context.subjects as Array<Record<string, unknown>> : [];
  const strongest = subjects.slice().sort((left, right) => Number(right.accuracy ?? 0) - Number(left.accuracy ?? 0))[0];
  const normalized = question.toLowerCase();

  if (normalized.includes('strong') || normalized.includes('good') || normalized.includes('best')) {
    return strongest
      ? `${String(strongest.subject)} is the strongest subject at ${Number(strongest.accuracy ?? 0).toFixed(1)}% accuracy. Maintain it with spaced practice and use that study routine for weaker subjects.`
      : 'Upload a subject dataset and I will identify the strongest area.';
  }

  if (normalized.includes('accur') || normalized.includes('model') || normalized.includes('score')) {
    return `The local performance estimate is ${prediction.projectedScore}% with ${prediction.risk} risk. The first intervention subject is ${prediction.weakestSubject}, with a ${prediction.weakness.toFixed(1)}% weakness signal. Model confidence is based on the available subject attempts.`;
  }

  return `${prediction.weakestSubject} needs the most attention, with a ${prediction.weakness.toFixed(1)}% weakness signal. ${prediction.recommendation}`;
};

const askGemini = async (input: ChatInput, prediction: ReturnType<typeof localPrediction>) => {
  if (!env.GEMINI_API_KEY) {
    return answerLocally(input.message, input.context ?? {}, prediction);
  }

  const prompt = [
    'You are LearnPredict AI, an academic learning assistant.',
    'Give practical, concise guidance. Never claim certainty about a student outcome.',
    `Mode: ${input.mode}.`,
    `Student context: ${JSON.stringify(input.context ?? {})}.`,
    `Local model estimate: ${JSON.stringify(prediction)}.`,
    `User message: ${input.message}`,
    input.mode === 'train'
      ? 'Explain that the training request was sent to the learning-model service, distinguish training from inference, and suggest the next validation step.'
      : 'Answer the question and connect your explanation to the estimate when useful.',
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
  try {
    const { data } = await axios.post<GeminiResponse>(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    }, {
      params: { key: env.GEMINI_API_KEY },
      timeout: 15000,
    });

    return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
      || answerLocally(input.message, input.context ?? {}, prediction);
  } catch {
    return `${answerLocally(input.message, input.context ?? {}, prediction)} Gemini is temporarily unavailable, so this answer uses the local subject model.`;
  }
};

export const aiService = {
  async chat(input: ChatInput) {
    const prediction = localPrediction(input.context ?? {});
    let training: unknown = null;

    if (input.mode === 'train') {
      training = await mlClient.batchAnalyze([{ ...input.context, message: input.message }]);
    }

    return {
      message: await askGemini(input, prediction),
      mode: input.mode,
      prediction,
      training,
    };
  },
};
