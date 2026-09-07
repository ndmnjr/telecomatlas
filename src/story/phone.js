export function phoneViewModel(story) {
  const ringing = story.phone === 'ringing';
  const connected = story.phone === 'connected';
  const opening = story.phone === 'opening';
  const loading = story.phone === 'loading';
  const loaded = story.phone === 'loaded';
  return {
    title: ringing
      ? 'Incoming call'
      : connected
        ? 'Connected'
        : opening
          ? 'Opening website'
          : loading
            ? 'Loading'
            : loaded
              ? 'Page loaded'
              : 'Ready for a call',
    motion: story.reduced
      ? ringing
        ? 'static-ring'
        : 'static'
      : ringing
        ? 'vibrate'
        : loading
          ? 'loading'
          : 'static',
    ringing,
    opening,
    loading,
    loaded,
    visible: story.context === 'site',
  };
}
export function createPhoneInset(host, answer) {
  const inset = document.createElement('section');
  inset.className = 'story-phone';
  inset.setAttribute('aria-label', 'Enlarged handheld phone display');
  inset.innerHTML =
    '<span class="story-phone-caption">PHONE DISPLAY</span><span class="story-caller" aria-hidden="true">●</span><strong class="story-phone-title"></strong><span class="story-ring-indicator">))) Ringing</span><span class="story-loading-indicator">Loading…</span><button type="button" class="story-answer">Answer call</button>';
  host.append(inset);
  inset.querySelector('button').addEventListener('click', answer);
  return {
    render(story) {
      const model = phoneViewModel(story);
      inset.hidden = !model.visible;
      inset.dataset.motion = model.motion;
      inset.dataset.phone = story.phone;
      inset.querySelector('strong').textContent = model.title;
      inset.querySelector('.story-ring-indicator').hidden = !model.ringing;
      inset.querySelector('.story-loading-indicator').hidden = !model.loading;
      inset.querySelector('button').hidden = !model.ringing;
    },
  };
}
