"use client";

/**
 * Sends the user to sign-in and back to where they were. Deliberately a full page load
 * rather than router.push: it runs when the session has died mid-action (API 401), and
 * a hard navigation drops any client state cached under the old session.
 */
export function redirectToSignIn(returnTo = window.location.pathname + window.location.search): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation (see above)
  window.location.assign(`/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
}
