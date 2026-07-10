import { Redirect } from 'expo-router';

/** Legacy route — public product intro is `/intro`; sign-in landing is `/home`. */
export default function WelcomeScreen() {
  return <Redirect href="/intro" />;
}
