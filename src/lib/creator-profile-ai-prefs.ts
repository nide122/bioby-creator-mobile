import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_PROMPT_DISMISSED_KEY = 'bioby-profile-ai-prompt-dismissed-v1';

export async function isProfileAiPromptDismissed(): Promise<boolean> {
  const value = await AsyncStorage.getItem(AI_PROMPT_DISMISSED_KEY);
  return value === '1';
}

export async function dismissProfileAiPrompt(): Promise<void> {
  await AsyncStorage.setItem(AI_PROMPT_DISMISSED_KEY, '1');
}
