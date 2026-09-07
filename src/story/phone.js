export function phoneViewModel(story) {
  const ringing = story.phone === 'ringing';
  return {
    title: ringing
      ? 'Incoming call'
      : story.phone === 'connected'
        ? 'Connected'
        : 'Ready for a call',
    motion: story.reduced ? (ringing ? 'static-ring' : 'static') : ringing ? 'vibrate' : 'static',
    ringing,
    visible: story.context === 'site',
  };
}
export function createPhoneInset(host, answer) {
  const inset = document.createElement('section');
  inset.className = 'story-phone';
  inset.setAttribute('aria-label', 'Enlarged handheld phone display');
  inset.innerHTML =
    '<span class="story-phone-caption">PHONE DISPLAY</span><span class="story-caller" aria-hidden="true">●</span><strong class="story-phone-title"></strong><span class="story-ring-indicator">))) Ringing</span><button type="button" class="story-answer">Answer call</button>';
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
      inset.querySelector('button').hidden = !model.ringing;
    },
  };
}
