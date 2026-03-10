import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analytics } from './firebase';

export function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  if (analytics) {
    try {
      firebaseLogEvent(analytics, name, params);
    } catch {
      // ignore
    }
  }
}
