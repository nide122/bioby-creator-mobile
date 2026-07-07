import { Redirect } from 'expo-router';

/** Legacy route — public landing is `/home` (OAuth compliance homepage). */
export default function WelcomeScreen() {
  return <Redirect href="/home" />;
}
