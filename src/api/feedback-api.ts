import { apiRequest } from '@/src/api/api-client';

export type FeedbackType = 'PROBLEM' | 'SUGGESTION' | 'CONFUSING' | 'OTHER';

export type SubmitFeedbackInput = {
  feedbackType: FeedbackType;
  content: string;
  contactAllowed: boolean;
  sourcePage?: string;
  appVersion?: string;
  clientPlatform?: string;
  errorCode?: string;
};

export type FeedbackSubmitted = {
  id: string;
  feedbackType: FeedbackType;
  submittedAt: string;
};

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackSubmitted> {
  return apiRequest<FeedbackSubmitted>('/api/v1/feedback', {
    method: 'POST',
    body: input,
  });
}
