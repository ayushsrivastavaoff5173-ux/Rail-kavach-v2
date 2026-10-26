// src/hooks/useAudioAlert.ts
'use client';

export const useAudioAlert = () => {
  const playAnnouncement = (message: string, hindiMessage?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel(); // Purani speech cancel karein

    const voices = window.speechSynthesis.getVoices();
    
    // English Utterance
    const enUtterance = new SpeechSynthesisUtterance(message);
    enUtterance.lang = 'en-IN';
    enUtterance.rate = 1.0;
    
    // Optional Hindi Utterance
    let hiUtterance: SpeechSynthesisUtterance | null = null;
    if (hindiMessage) {
      hiUtterance = new SpeechSynthesisUtterance(hindiMessage);
      hiUtterance.lang = 'hi-IN';
      hiUtterance.rate = 1.0;
    }

    // Voice assignment agar available ho
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hiUtterance && hindiVoice) {
      hiUtterance.voice = hindiVoice;
    }

    window.speechSynthesis.speak(enUtterance);
    if (hiUtterance) {
      window.speechSynthesis.speak(hiUtterance);
    }
  };

  return { playAnnouncement };
};