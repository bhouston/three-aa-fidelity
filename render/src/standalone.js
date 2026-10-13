import registry from '../../registry.json';

const noopReporter = {
  phaseStart: (name) => name,
  phaseEnd: () => {},
  environment: () => {},
  frameBegin: () => undefined,
  frameEnd: () => {},
  convergence: async () => {},
  ready: () => {},
};

/** Interactive page: pick a scene and renderer from the registry and watch it animate in real time. */
export async function mountStandalone(createSession) {
  const query = new URLSearchParams(location.search);
  const sceneId = query.get('scene') ?? registry.scenes[0].id;
  const rendererId = query.get('renderer') ?? registry.renderers.find((r) => !r.reference)?.id;
  const controls = document.createElement('div');
  controls.id = 'standalone';
  const select = (name, items, selected) => {
    const element = document.createElement('select');
    element.name = name;
    for (const item of items) element.add(new Option(item.name, item.id, false, item.id === selected));
    element.addEventListener('change', () => {
      query.set(name, element.value);
      location.search = query.toString();
    });
    return element;
  };
  controls.append(select('scene', registry.scenes, sceneId), select('renderer', registry.renderers, rendererId));
  const host = document.createElement('div');
  document.body.append(host, controls);
  const scene = registry.scenes.find((s) => s.id === sceneId);
  const renderer = registry.renderers.find((r) => r.id === rendererId);
  const params = {
    ...scene?.params,
    ...scene?.dynamic?.params,
    ...renderer?.params,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const session = await createSession(params, noopReporter, host, true);
  let previous = performance.now();
  const tick = async (time) => {
    session.draw(Math.min(0.1, (time - previous) / 1000));
    previous = time;
    await session.complete();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
