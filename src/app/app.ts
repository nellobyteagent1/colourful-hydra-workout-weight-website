import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, Inject, PLATFORM_ID } from '@angular/core';

type GuidanceTrack = {
  title: string;
  cue: string;
  duration: string;
};

type InfoCard = {
  title: string;
  detail: string;
  accent: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly stats = [
    { value: '4', label: 'movement pillars' },
    { value: '12 min', label: 'minimum daily reset' },
    { value: '3', label: 'weight-loss habits to stack' }
  ];

  protected readonly workoutCards: InfoCard[] = [
    {
      title: 'Strength Rhythm',
      detail: 'Alternate lower body power, upper body push, and core control through 30-minute circuits built for sustainable progression.',
      accent: 'coral'
    },
    {
      title: 'Mobility Recovery',
      detail: 'Start and finish with shoulder, hip, and ankle flows so each workout improves range of motion instead of just burning effort.',
      accent: 'aqua'
    },
    {
      title: 'Cardio Balance',
      detail: 'Blend one higher-intensity interval block with two low-impact conditioning sessions to support stamina without draining recovery.',
      accent: 'gold'
    }
  ];

  protected readonly nutritionCards: InfoCard[] = [
    {
      title: 'Protein First Plates',
      detail: 'Build meals around lean protein, fiber-rich vegetables, and slow carbohydrates so hunger stays quieter through the afternoon.',
      accent: 'sky'
    },
    {
      title: 'Hydration Anchors',
      detail: 'Use a morning glass, a pre-workout bottle, and an evening refill as fixed cues for better hydration and appetite awareness.',
      accent: 'aqua'
    },
    {
      title: 'Repeatable Deficit',
      detail: 'Aim for small calorie reductions you can repeat for weeks rather than dramatic cuts that compromise training consistency.',
      accent: 'coral'
    }
  ];

  protected readonly guidanceTracks: GuidanceTrack[] = [
    {
      title: 'Warm-Up Coaching',
      cue: 'Roll your shoulders back, breathe in for four, and let your first five minutes feel smooth rather than rushed.',
      duration: '0:22'
    },
    {
      title: 'Mid-Workout Focus',
      cue: 'Keep your ribs stacked, exhale through the effort, and choose clean reps over chasing fatigue.',
      duration: '0:18'
    },
    {
      title: 'Evening Reset',
      cue: 'Slow the pace, lengthen your breath, and close the day with a walk or gentle stretch to downshift stress.',
      duration: '0:20'
    }
  ];

  protected readonly flowSteps = [
    'Wake up with water, daylight, and five slow breaths before caffeine.',
    'Train with one clear focus: strength, cardio, or mobility.',
    'Anchor meals to protein and produce before adding extras.',
    'Use the audio reset in the evening to avoid stress-driven snacking.'
  ];

  protected readonly testimonials = [
    'Hydra turns healthy choices into a visual routine that feels light instead of strict.',
    'The built-in audio cues make it easier to keep momentum without constantly checking a plan.',
    'Everything on one page means I can reset my day in under two minutes.'
  ];

  protected ambientPlaying = false;
  protected speechSupported = false;
  protected currentTrackTitle = 'No guidance playing';
  protected ambientStatus = 'Tap play to start calm background audio.';

  private audioContext?: AudioContext;
  private masterGain?: GainNode;
  private masterConnected = false;
  private oscillatorNodes: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private modulationTimer?: number;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    destroyRef: DestroyRef
  ) {
    this.speechSupported = isPlatformBrowser(platformId) && 'speechSynthesis' in window;
    destroyRef.onDestroy(() => {
      this.stopAmbient();
      if (this.speechSupported) {
        window.speechSynthesis.cancel();
      }
    });
  }

  protected toggleAmbient(): void {
    if (this.ambientPlaying) {
      this.stopAmbient();
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const audioContext = this.audioContext ?? new AudioContext();
    const masterGain = this.masterGain ?? audioContext.createGain();
    this.audioContext = audioContext;
    this.masterGain = masterGain;

    if (!this.masterGain) {
      return;
    }

    if (!this.masterConnected) {
      this.masterGain.connect(audioContext.destination);
      this.masterConnected = true;
    }

    void audioContext.resume().then(() => {
      this.createAmbientLayer(audioContext, masterGain);
      this.ambientPlaying = true;
      this.ambientStatus = 'Ambient flow is active. Use pause when you want silence.';
    });
  }

  protected playGuidance(track: GuidanceTrack): void {
    this.currentTrackTitle = track.title;

    if (!this.speechSupported) {
      this.ambientStatus = `Speech guidance is not available in this browser.`;
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(track.cue);
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.volume = 0.9;
    utterance.onstart = () => {
      this.ambientStatus = `${track.title} is guiding you now.`;
    };
    utterance.onend = () => {
      this.ambientStatus = 'Guidance finished. Choose another cue or keep the ambient flow running.';
    };
    window.speechSynthesis.speak(utterance);
  }

  protected stopGuidance(): void {
    this.currentTrackTitle = 'No guidance playing';
    if (this.speechSupported) {
      window.speechSynthesis.cancel();
    }
    this.ambientStatus = 'Guidance stopped. The background audio can continue on its own.';
  }

  private createAmbientLayer(audioContext: AudioContext, masterGain: GainNode): void {
    if (this.oscillatorNodes.length > 0) {
      return;
    }

    masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 1.2);

    const frequencies = [220, 329.63, 392];
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = [0.05, 0.03, 0.02][index] ?? 0.02;

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      oscillator.start();

      this.oscillatorNodes.push(oscillator);
      this.gainNodes.push(gainNode);
    });

    this.modulationTimer = window.setInterval(() => {
      const now = audioContext.currentTime;
      this.gainNodes.forEach((gainNode, index) => {
        const target = 0.01 + Math.random() * 0.04 + index * 0.004;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.linearRampToValueAtTime(target, now + 2.8);
      });
    }, 2600);
  }

  private stopAmbient(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.audioContext && this.masterGain) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value || 0.05, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    }

    window.setTimeout(() => {
      this.oscillatorNodes.forEach((oscillator) => oscillator.stop());
      this.oscillatorNodes = [];
      this.gainNodes = [];
    }, 900);

    if (this.modulationTimer) {
      window.clearInterval(this.modulationTimer);
      this.modulationTimer = undefined;
    }

    this.ambientPlaying = false;
    this.ambientStatus = 'Ambient audio is paused. Restart it anytime for a calm reset.';
  }
}
