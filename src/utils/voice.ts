export function microphoneProblem(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed" || code === "NotAllowedError") {
    return "Microphone access is blocked. In Chrome, open the controls beside the address bar → Site settings → Microphone → Allow, then reload. In Windows Settings → Privacy & security → Microphone, enable microphone access and desktop app access. If using an embedded preview, open the published app in its own tab; the preview may block microphone access.";
  }
  if (code === "audio-capture" || code === "NotFoundError") return "No working microphone was found. Connect a microphone and select it in Chrome Settings → Privacy and security → Site settings → Microphone.";
  if (code === "network") return "The browser speech recognition service could not connect. Check your connection and try again. You can still type your answer.";
  if (code === "no-speech") return "No speech was detected. Check your microphone and try speaking again.";
  return "Voice recording stopped. Your transcript is still editable. Try again or continue typing.";
}

export function microphoneContextProblem(): string {
  if (!window.isSecureContext) return "Microphone access needs HTTPS or localhost. Open the secure published app and try again.";
  const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
  if (policy?.allowsFeature && !policy.allowsFeature("microphone")) return "This embedded preview blocks microphone access. Open the published app in a separate browser tab and allow its microphone permission.";
  return "";
}
