import { createSession } from './session.js';

const query = new URLSearchParams(location.search);

if (query.has('fidelityKitMode') || query.has('performanceKitRunId')) {
  const { mountRenderHost } = await import('fidelity-kit/browser/host');
  // The host exposes structured failure markers for the capture client.
  void mountRenderHost(createSession).catch(() => {});
} else {
  const { mountStandalone } = await import('./standalone.js');
  await mountStandalone(createSession);
}
