const state = {
  ambientPlaying: false,
  speechSupported: "speechSynthesis" in window,
  currentTrackTitle: "No guidance playing",
  audioContext: null,
  masterGain: null,
  oscillatorNodes: [],
  gainNodes: [],
  modulationTimer: null,
};

const ambientHeading = document.getElementById("ambient-heading");
const ambientStatus = document.getElementById("ambient-status");
const currentTrack = document.getElementById("current-track");
const ambientToggle = document.getElementById("ambient-toggle");
const guidanceStop = document.getElementById("guidance-stop");
const guidanceButtons = document.querySelectorAll(".guidance-trigger");

function setAmbientUi(playing, statusText) {
  state.ambientPlaying = playing;
  ambientHeading.textContent = playing ? "Hydra calm flow is live" : "Hydra calm flow is paused";
  ambientStatus.textContent = statusText;
  ambientToggle.textContent = playing ? "Pause background flow" : "Play background flow";
}

function createAmbientLayer() {
  if (state.oscillatorNodes.length > 0) {
    return;
  }

  const audioContext = state.audioContext;
  const masterGain = state.masterGain;
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 1.2);

  [220, 329.63, 392].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = [0.05, 0.03, 0.02][index] || 0.02;

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start();

    state.oscillatorNodes.push(oscillator);
    state.gainNodes.push(gainNode);
  });

  state.modulationTimer = window.setInterval(() => {
    const now = audioContext.currentTime;
    state.gainNodes.forEach((gainNode, index) => {
      const target = 0.01 + Math.random() * 0.04 + index * 0.004;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.linearRampToValueAtTime(target, now + 2.8);
    });
  }, 2600);
}

async function toggleAmbient() {
  if (state.ambientPlaying) {
    stopAmbient();
    return;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    setAmbientUi(false, "Ambient audio is not supported in this browser.");
    return;
  }

  state.audioContext = state.audioContext || new AudioContextCtor();
  state.masterGain = state.masterGain || state.audioContext.createGain();

  if (!state.masterGainConnected) {
    state.masterGain.connect(state.audioContext.destination);
    state.masterGainConnected = true;
  }

  await state.audioContext.resume();
  createAmbientLayer();
  setAmbientUi(true, "Ambient flow is active. Use pause when you want silence.");
}

function stopAmbient() {
  if (state.audioContext && state.masterGain) {
    const now = state.audioContext.currentTime;
    state.masterGain.gain.cancelScheduledValues(now);
    state.masterGain.gain.setValueAtTime(state.masterGain.gain.value || 0.05, now);
    state.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  }

  window.setTimeout(() => {
    state.oscillatorNodes.forEach((oscillator) => oscillator.stop());
    state.oscillatorNodes = [];
    state.gainNodes = [];
  }, 900);

  if (state.modulationTimer) {
    window.clearInterval(state.modulationTimer);
    state.modulationTimer = null;
  }

  setAmbientUi(false, "Ambient audio is paused. Restart it anytime for a calm reset.");
}

function playGuidance(title, cue) {
  state.currentTrackTitle = title;
  currentTrack.textContent = title;

  if (!state.speechSupported) {
    ambientStatus.textContent = "Speech guidance is not available in this browser.";
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cue);
  utterance.rate = 0.92;
  utterance.pitch = 1.02;
  utterance.volume = 0.9;
  utterance.onstart = () => {
    ambientStatus.textContent = `${title} is guiding you now.`;
  };
  utterance.onend = () => {
    ambientStatus.textContent = "Guidance finished. Choose another cue or keep the ambient flow running.";
  };
  window.speechSynthesis.speak(utterance);
}

function stopGuidance() {
  state.currentTrackTitle = "No guidance playing";
  currentTrack.textContent = state.currentTrackTitle;
  if (state.speechSupported) {
    window.speechSynthesis.cancel();
  }
  ambientStatus.textContent = "Guidance stopped. The background audio can continue on its own.";
}

ambientToggle.addEventListener("click", () => {
  void toggleAmbient();
});

guidanceStop.addEventListener("click", stopGuidance);

guidanceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playGuidance(button.dataset.title || "Guidance", button.dataset.cue || "");
  });
});

window.addEventListener("beforeunload", () => {
  stopAmbient();
  if (state.speechSupported) {
    window.speechSynthesis.cancel();
  }
});
