import { Stack } from 'expo-router';

export default function DealParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[dealId]" options={{ headerShown: false }} />
    </Stack>
  );
}
