import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DOCUMENTARY_TITLES } from './documentaryTitles';
import { getCurrentWeekId, normalizeTitle } from './utils';

type Puzzle = {
  id: string;
  title: string;
  images: string[];
  altTitles?: string[];
  year?: number;
};

type Attempt = {
  guess: string;
  correct: boolean;
};

type GameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'error';

const MAX_ATTEMPTS = 5;

const FALLBACK_PUZZLE: Puzzle = {
  id: 'demo',
  title: 'The Last Dance',
  year: 2020,
  images: [
    'https://via.placeholder.com/600x400/020617/ffffff?text=Frame+1',
    'https://via.placeholder.com/600x400/020617/ffffff?text=Frame+2',
    'https://via.placeholder.com/600x400/020617/ffffff?text=Frame+3',
    'https://via.placeholder.com/600x400/020617/ffffff?text=Frame+4',
    'https://via.placeholder.com/600x400/020617/ffffff?text=Frame+5',
  ],
  altTitles: ['Last Dance'],
};

function loadStoredState(weekId: string) {
  try {
    const raw = window.localStorage.getItem(`docuframe:${weekId}`);
    if (!raw) return null;
    return JSON.parse(raw) as {
      attempts: Attempt[];
      status: GameStatus;
    };
  } catch {
    return null;
  }
}

function saveState(weekId: string, attempts: Attempt[], status: GameStatus) {
  try {
    const payload = JSON.stringify({ attempts, status });
    window.localStorage.setItem(`docuframe:${weekId}`, payload);
  } catch {
    // ignore
  }
}

function buildShareText(
  weekLabel: string,
  status: GameStatus,
  attempts: Attempt[],
): string {
  const score =
    status === 'won' ? `${attempts.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;

  const rows = attempts
    .slice(0, MAX_ATTEMPTS)
    .map((a, index) => {
      const marker = a.correct ? '🎯' : a.guess === '—' ? '⏭️' : '❌';
      return `${index + 1}: ${marker}`;
    })
    .join('\n');

  const paddedRows =
    attempts.length < MAX_ATTEMPTS
      ? `${rows}${rows ? '\n' : ''}${Array.from(
          { length: MAX_ATTEMPTS - attempts.length },
          (_, i) => `${attempts.length + i + 1}: ⬜`,
        ).join('\n')}`
      : rows;

  return `DocuFrame — ${weekLabel}\nScore: ${score}\n\n${paddedRows}\n\nhttps://jajjer.github.io/documentaryGame/`;
}

function useWeeklyPuzzle() {
  const [{ id: weekId, label: weekLabel }] = useState(getCurrentWeekId);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredState(weekId);
    if (stored) {
      setAttempts(stored.attempts);
      setStatus(stored.status);
    }

    let cancelled = false;

    async function fetchPuzzle() {
      try {
        const ref = doc(db, 'weeklyPuzzles', weekId);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (!snap.exists()) {
          // Fallback demo puzzle so the UI still works before Firestore is configured.
          setPuzzle(FALLBACK_PUZZLE);
          if (!stored) {
            setStatus('playing');
          }
          return;
        }

        const data = snap.data() as {
          title: string;
          images: string[];
          altTitles?: string[];
          year?: number;
        };

        setPuzzle({
          id: weekId,
          title: data.title,
          images: data.images ?? [],
          altTitles: data.altTitles ?? [],
          year: data.year,
        });

        if (!stored) {
          setStatus('playing');
        }
      } catch (e) {
        if (cancelled) return;
        // If Firestore is not configured yet, still let the user play the demo puzzle.
        setPuzzle(FALLBACK_PUZZLE);
        if (!stored) {
          setStatus('playing');
        }
        setError('Could not load this week’s puzzle. Showing a demo puzzle instead.');
      }
    }

    void fetchPuzzle();

    return () => {
      cancelled = true;
    };
  }, [weekId]);

  useEffect(() => {
    if (puzzle && status !== 'loading') {
      saveState(weekId, attempts, status);
    }
  }, [weekId, puzzle, attempts, status]);

  const remaining = useMemo(
    () => Math.max(0, MAX_ATTEMPTS - attempts.length),
    [attempts.length],
  );

  return {
    weekId,
    weekLabel,
    puzzle,
    status,
    attempts,
    remaining,
    error,
    setStatus,
    setAttempts,
  };
}

function App() {
  const {
    weekId,
    weekLabel,
    puzzle,
    status,
    attempts,
    remaining,
    error,
    setStatus,
    setAttempts,
  } = useWeeklyPuzzle();
  const [guess, setGuess] = useState('');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const isComplete = status === 'won' || status === 'lost';

  const suggestionSource = useMemo(() => {
    const fromPuzzle = puzzle
      ? [puzzle.title, ...(puzzle.altTitles ?? [])].filter(Boolean)
      : [];
    const combined = [...fromPuzzle, ...DOCUMENTARY_TITLES];
    const seen = new Set<string>();
    return combined.filter((t) => {
      const n = normalizeTitle(t);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  }, [puzzle]);

  const suggestions = useMemo(() => {
    if (!guess.trim()) return [];
    const norm = normalizeTitle(guess);
    const used = new Set(attempts.map((a) => normalizeTitle(a.guess)));
    return suggestionSource
      .filter(
        (t) =>
          normalizeTitle(t).includes(norm) && !used.has(normalizeTitle(t)),
      )
      .slice(0, 8);
  }, [guess, suggestionSource, attempts]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  const visibleFrames = useMemo(() => {
    if (!puzzle) return [];
    const incorrectCount = attempts.filter((a) => !a.correct).length;
    const count = Math.min(1 + incorrectCount, MAX_ATTEMPTS);
    return puzzle.images.slice(0, count);
  }, [puzzle, attempts]);

  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);

  const currentFrameUrl = useMemo(() => {
    if (!puzzle || visibleFrames.length === 0) return null;
    const idx = Math.min(selectedFrameIndex, visibleFrames.length - 1);
    return puzzle.images[idx] ?? null;
  }, [puzzle, visibleFrames.length, selectedFrameIndex]);

  const prevVisibleCountRef = useRef(0);
  useEffect(() => {
    const n = visibleFrames.length;
    if (n > prevVisibleCountRef.current) {
      setSelectedFrameIndex(n - 1);
    }
    prevVisibleCountRef.current = n;
  }, [visibleFrames.length]);

  const submitGuess = (guessText: string) => {
    if (!puzzle || !guessText.trim() || status !== 'playing') return;

    const normalizedGuess = normalizeTitle(guessText);
    const candidates = [puzzle.title, ...(puzzle.altTitles ?? [])].map(
      (t) => normalizeTitle(t),
    );

    const correct = candidates.includes(normalizedGuess);
    const nextAttempts = [...attempts, { guess: guessText.trim(), correct }];

    setAttempts(nextAttempts);
    setGuess('');
    setShowSuggestions(false);

    if (correct) {
      setStatus('won');
      return;
    }

    if (nextAttempts.length >= MAX_ATTEMPTS) {
      setStatus('lost');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitGuess(guess);
  };

  const handleSkip = () => {
    if (!puzzle || status !== 'playing' || attempts.length >= MAX_ATTEMPTS) return;
    const nextAttempts = [...attempts, { guess: '—', correct: false }];
    setAttempts(nextAttempts);
    if (nextAttempts.length >= MAX_ATTEMPTS) {
      setStatus('lost');
    }
  };

  const handleReset = () => {
    try {
      window.localStorage.removeItem(`docuframe:${weekId}`);
    } catch {
      // ignore
    }
    setAttempts([]);
    setStatus('playing');
  };

  const handleShare = async () => {
    if (!puzzle) return;
    const text = buildShareText(weekLabel, status, attempts);

    try {
      if (navigator.clipboard && 'writeText' in navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareStatus('Copied result to clipboard');
      } else {
        setShareStatus('Copy not supported in this browser');
      }
    } catch {
      setShareStatus('Could not copy to clipboard');
    }

    window.setTimeout(() => {
      setShareStatus(null);
    }, 3000);
  };

  const statusText = (() => {
    if (!puzzle) return 'Loading this week’s documentary…';
    if (status === 'won') {
      return `Nice! You guessed it in ${attempts.length}/${MAX_ATTEMPTS}`;
    }
    if (status === 'lost') {
      return `Out of frames. You used all ${MAX_ATTEMPTS} attempts.`;
    }
    return `Guess the documentary in ${MAX_ATTEMPTS} frames.`;
  })();

  const statusClass = (() => {
    if (status === 'won') return 'status-text status-text-win';
    if (status === 'lost') return 'status-text status-text-lose';
    return 'status-text';
  })();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <div className="brand-mark-inner">DOCU</div>
          </div>
          <div>
            <div className="brand-text-title">DocuFrame</div>
            <div className="brand-text-subtitle">
              Weekly documentary guessing game
            </div>
          </div>
        </div>
        <div className="badge-week">{weekLabel}</div>
      </header>

      {!puzzle && (
        <div className="loading">
          <p>{statusText}</p>
          {error && <p className="error-strong">{error}</p>}
        </div>
      )}

      {puzzle && (
        <>
          {/* Large hero: current frame */}
          <section className="frame-hero-wrap">
            <div className="frame-hero">
              {currentFrameUrl ? (
                <img src={currentFrameUrl} alt={`Frame ${selectedFrameIndex + 1}`} />
              ) : (
                <span className="frame-hero-placeholder">No frame</span>
              )}
              <span className="frame-hero-label">
                Frame {Math.min(selectedFrameIndex, visibleFrames.length - 1) + 1} of {MAX_ATTEMPTS}
              </span>
            </div>
          </section>

          {/* Thumbnail strip */}
          <section className="frames-thumbs">
            {Array.from({ length: MAX_ATTEMPTS }, (_, index) => {
              const image = puzzle.images[index];
              const isVisible = index < visibleFrames.length;
              const isLocked = !isVisible;
              const isActive = isVisible && index === selectedFrameIndex;

              return (
                <button
                  key={index}
                  type="button"
                  className={`frame-thumb ${isLocked ? ' frame-thumb-locked' : ''} ${isActive ? ' frame-thumb-active' : ''}`}
                  onClick={() => isVisible && setSelectedFrameIndex(index)}
                  disabled={isLocked}
                >
                  <span className="frame-thumb-index">{index + 1}</span>
                  {isVisible && image && (
                    <img src={image} alt={`Frame ${index + 1}`} />
                  )}
                  {!image && !isVisible && <span>Locked</span>}
                </button>
              );
            })}
          </section>

          <section className="game-section">
            <div className="status-row">
              <div className={statusClass}>
                <span className="status-text-strong">{statusText}</span>
                {isComplete && puzzle && (
                  <div className="doc-title-reveal">
                    <span className="muted">It was</span>{' '}
                    <span className="doc-title-main">{puzzle.title}</span>
                    {typeof puzzle.year === 'number' && (
                      <span className="doc-title-year">({puzzle.year})</span>
                    )}
                    .
                  </div>
                )}
              </div>
              {!isComplete && (
                <div className="pill">
                  <span className="pill-strong">{remaining}</span>{' '}
                  <span className="pill-muted">
                    {remaining === 1 ? 'attempt left' : 'attempts left'}
                  </span>
                </div>
              )}
            </div>

            {!isComplete && (
              <>
                <form
                  className="input-row"
                  onSubmit={handleSubmit}
                  onKeyDown={(e) => {
                    if (!showSuggestions || suggestions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex((i) =>
                        i < suggestions.length - 1 ? i + 1 : 0,
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex((i) =>
                        i > 0 ? i - 1 : suggestions.length - 1,
                      );
                    } else if (e.key === 'Enter' && suggestions[highlightedIndex]) {
                      e.preventDefault();
                      submitGuess(suggestions[highlightedIndex]);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                >
                  <div className="guess-input-wrap">
                    <input
                      className="guess-input"
                      type="text"
                      autoComplete="off"
                      placeholder="Type or pick a documentary…"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 150)
                      }
                      disabled={status !== 'playing'}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="suggestions-dropdown"
                        role="listbox"
                      >
                        {suggestions.map((title, i) => (
                          <button
                            key={title}
                            type="button"
                            role="option"
                            aria-selected={i === highlightedIndex}
                            className={`suggestion-item ${i === highlightedIndex ? 'suggestion-item-active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              submitGuess(title);
                            }}
                            onMouseEnter={() => setHighlightedIndex(i)}
                          >
                            {title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="input-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={status !== 'playing' || !guess.trim()}
                    >
                      Guess
                    </button>
                    <button
                      type="button"
                      className="btn btn-skip"
                      onClick={handleSkip}
                      disabled={status !== 'playing' || attempts.length >= MAX_ATTEMPTS}
                    >
                      Skip
                    </button>
                  </div>
                </form>
                <p className="hint-text">
                  Title matching ignores case, punctuation, and leading “The/A/An”.
                </p>
              </>
            )}

            {attempts.length > 0 && (
              <div className="attempts-list">
                {attempts.map((a, index) => (
                  <div key={index} className="attempt-row">
                    <div className="attempt-guess">
                      {index + 1}. {a.guess === '—' ? 'Skipped' : a.guess}
                    </div>
                    <div
                      className={`attempt-result ${
                        a.correct
                          ? 'attempt-result-correct'
                          : 'attempt-result-wrong'
                      }`}
                    >
                      {a.correct ? 'Correct' : a.guess === '—' ? 'Skipped' : 'Wrong'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="footer">
            <div>
              <span className="muted">Built for documentary lovers.</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleShare}
                disabled={!isComplete}
              >
                Share result
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset this week
              </button>
              {shareStatus && <span className="share-status">{shareStatus}</span>}
            </div>
          </footer>

          {error && (
            <div className="error">
              <span className="error-strong">{error}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;

