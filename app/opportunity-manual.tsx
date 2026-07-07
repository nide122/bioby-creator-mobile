import { Redirect, type Href } from 'expo-router';

/** Legacy path kept for deep links; form lives at /inbox/manual. */
export default function OpportunityManualRedirect() {
  return <Redirect href={'/inbox/manual' as Href} />;
}
