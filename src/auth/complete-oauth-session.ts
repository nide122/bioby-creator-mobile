import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * On web, OAuth opens a popup that redirects back to this origin.
 * This must run before the app router mounts, or the popup renders the full app (e.g. /welcome).
 */
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}
