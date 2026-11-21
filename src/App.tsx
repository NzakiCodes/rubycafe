import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BaristaWorkbench } from './components/BaristaWorkbench';
import { CommunityFeed } from './components/CommunityFeed';
import { ExtractionTimer } from './components/ExtractionTimer';
import { HistoryLog } from './components/HistoryLog';
import { ResilientImage } from './components/ResilientImage';
import { COFFEE_IMAGES, CURATED_RECIPES, formatSeconds } from './data/presets';
import type { BaristaRecipe, BrewExperiment, BrewHistoryEntry } from './types/coffee';

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function App() {
  const [activeRecipe, setActiveRecipe] = useState<BaristaRecipe>(CURATED_RECIPES[0]);
  const [experiments, setExperiments] = useState<BrewExperiment[]>([]);
  const [historyEntries, setHistoryEntries] = useState<BrewHistoryEntry[]>([]);
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [draftExperimentRecipe, setDraftExperimentRecipe] =
    useState<BaristaRecipe | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [expRes, histRes] = await Promise.all([
          fetch('/api/experiments'),
          fetch('/api/history'),
        ]);

        if (!cancelled && expRes.ok) {
          const expData = await expRes.json();
          if (Array.isArray(expData.experiments)) {
            setExperiments(expData.experiments);
          }
        }
        if (!cancelled && histRes.ok) {
          const histData = await histRes.json();
          if (Array.isArray(histData.history)) {
            setHistoryEntries(histData.history);
          }
        }
      } catch {
        // Keep current state if initial fetch fails
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendToTimer = (recipe: BaristaRecipe) => {
    setActiveRecipe(recipe);
    scrollToSection('timer');
  };

  const handleSaveFavorite = async (recipe: BaristaRecipe) => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipe.title,
          beanOrigin: recipe.recommendedBean.origin,
          roastLevel: recipe.roastProfile.level,
          milkAlternative: recipe.milkPairing.milkType,
          brewMethod: recipe.brewMethod.methodName,
          doseGrams: recipe.brewMethod.doseGrams,
          waterMl: recipe.brewMethod.waterMl,
          waterTempC: recipe.brewMethod.waterTempC,
          actualSeconds: recipe.brewMethod.totalTimeSeconds,
          targetSeconds: recipe.brewMethod.totalTimeSeconds,
          rating: 5,
          notes: recipe.recommendedBean.tastingNotes,
          isFavorite: true,
          recipe,
        }),
      });
      const data = await response.json();
      if (response.ok && data.entry) {
        setHistoryEntries((prev) => [data.entry, ...prev]);
        showToast('Saved recipe to your favorites log.');
      }
    } catch {
      showToast('Unable to save recipe right now.');
    }
  };

  const handleOpenShareFromRecipe = (recipe: BaristaRecipe) => {
    setDraftExperimentRecipe(recipe);
    setComposerOpen(true);
    scrollToSection('experiments');
  };

  const handlePublishExperiment = async (
    payload: Omit<BrewExperiment, 'id' | 'createdAt' | 'likes'>
  ) => {
    const response = await fetch('/api/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.experiment) {
      throw new Error(data.error || 'Could not publish experiment.');
    }
    setExperiments((prev) => [data.experiment, ...prev]);
    showToast('Experiment published to the community feed.');
  };

  const handleToggleLike = async (id: string, currentlyLiked: boolean) => {
    const delta = currentlyLiked ? -1 : 1;
    setExperiments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, likes: Math.max(0, item.likes + delta) } : item
      )
    );
    try {
      const res = await fetch(`/api/experiments/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (res.ok && data.experiment) {
        setExperiments((prev) =>
          prev.map((item) => (item.id === id ? data.experiment : item))
        );
      }
    } catch {
      // Keep optimistic value if network glitches
    }
  };

  const handleLoadExperimentToTimer = (exp: BrewExperiment) => {
    if (exp.recipeSnapshot) {
      setActiveRecipe(exp.recipeSnapshot);
    } else {
      const category =
        exp.category === 'Espresso'
          ? 'Espresso'
          : exp.category === 'Immersion'
            ? 'Immersion'
            : 'Pour-Over';

      const constructed: BaristaRecipe = {
        id: `exp-recipe-${exp.id}`,
        title: exp.title,
        baristaGreeting: `Community experiment by ${exp.author}.`,
        flavorTags: [exp.roastLevel, exp.category],
        recommendedBean: {
          origin: exp.beanOrigin,
          varietal: 'Single Origin',
          process: 'Craft Lot',
          tastingNotes: exp.tastingNotes,
          altitude: 'High Elevation',
          whyItFits: exp.tastingNotes,
        },
        roastProfile: {
          level: exp.roastLevel,
          developmentNotes: 'Dialed for balanced sweetness and clarity.',
          restingTip: 'Enjoy 7–18 days off-roast.',
        },
        milkPairing: {
          milkType: exp.milkAlternative,
          textureTip: 'Adjust milk texture to match cup body.',
          temperatureC: exp.milkAlternative.toLowerCase().includes('black') ? null : 58,
          pairingNote: exp.tastingNotes,
        },
        brewMethod: {
          category,
          methodName: exp.brewMethod,
          grindSize: 'Dialed to method',
          doseGrams: exp.doseGrams,
          waterMl: exp.waterMl,
          waterTempC: exp.waterTempC,
          ratio: `1:${(exp.waterMl / Math.max(1, exp.doseGrams)).toFixed(1)}`,
          totalTimeSeconds: exp.extractionSeconds,
          steps: [
            {
              label: 'Bloom / Pre-Infusion',
              startSec: 0,
              endSec: Math.min(45, Math.round(exp.extractionSeconds * 0.25)),
              waterTargetMl: Math.round(exp.waterMl * 0.2),
              instruction: 'Saturate the coffee bed evenly to initiate extraction.',
            },
            {
              label: 'Primary Extraction',
              startSec: Math.min(45, Math.round(exp.extractionSeconds * 0.25)),
              endSec: exp.extractionSeconds,
              waterTargetMl: exp.waterMl,
              instruction: exp.tastingNotes,
            },
          ],
        },
        experimentPrompt: exp.tastingNotes,
        visualMood: exp.milkAlternative.toLowerCase().includes('black') ? 'floral' : 'milk',
      };
      setActiveRecipe(constructed);
    }
    scrollToSection('timer');
  };

  const handleLogBrew = async (payload: {
    recipe: BaristaRecipe;
    actualSeconds: number;
    targetSeconds: number;
    doseGrams: number;
    waterMl: number;
    rating: number;
    notes: string;
    isFavorite: boolean;
    alsoShareToFeed: boolean;
  }) => {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.recipe.title,
        beanOrigin: payload.recipe.recommendedBean.origin,
        roastLevel: payload.recipe.roastProfile.level,
        milkAlternative: payload.recipe.milkPairing.milkType,
        brewMethod: payload.recipe.brewMethod.methodName,
        doseGrams: payload.doseGrams,
        waterMl: payload.waterMl,
        waterTempC: payload.recipe.brewMethod.waterTempC,
        actualSeconds: payload.actualSeconds,
        targetSeconds: payload.targetSeconds,
        rating: payload.rating,
        notes: payload.notes,
        isFavorite: payload.isFavorite,
        recipe: payload.recipe,
      }),
    });

    const data = await response.json();
    if (response.ok && data.entry) {
      setHistoryEntries((prev) => [data.entry, ...prev]);
      showToast('Brew recorded in your extraction log.');
    }

    if (payload.alsoShareToFeed) {
      await handlePublishExperiment({
        title: payload.recipe.title,
        author: 'Home Barista',
        category: payload.recipe.milkPairing.temperatureC
          ? 'Milk Craft'
          : payload.recipe.brewMethod.category === 'Espresso'
            ? 'Espresso'
            : payload.recipe.brewMethod.category === 'Immersion' ||
                payload.recipe.brewMethod.category === 'Cold Brew'
              ? 'Immersion'
              : 'Pour-Over',
        beanOrigin: payload.recipe.recommendedBean.origin,
        roastLevel: payload.recipe.roastProfile.level,
        milkAlternative: payload.recipe.milkPairing.milkType,
        brewMethod: payload.recipe.brewMethod.methodName,
        doseGrams: payload.doseGrams,
        waterMl: payload.waterMl,
        waterTempC: payload.recipe.brewMethod.waterTempC,
        extractionSeconds: payload.actualSeconds,
        tastingNotes:
          payload.notes.trim() || payload.recipe.recommendedBean.tastingNotes,
        recipeSnapshot: payload.recipe,
      });
    }
  };

  const handleToggleFavoriteHistory = async (id: string, nextValue: boolean) => {
    setHistoryEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: nextValue } : item))
    );
    try {
      await fetch(`/api/history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: nextValue }),
      });
    } catch {
      // Keep UI responsive
    }
  };

  const handleDeleteHistory = async (id: string) => {
    setHistoryEntries((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      showToast('Removed entry from brew log.');
    } catch {
      // Ignore network errors
    }
  };

  const handleShareHistoryEntry = (entry: BrewHistoryEntry) => {
    setDraftExperimentRecipe(entry.recipe);
    setComposerOpen(true);
    scrollToSection('experiments');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#141517]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#F7F7F5]/95 backdrop-blur-sm border-b border-[#141517]/10">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-[#141517] whitespace-nowrap shrink-0"
          >
            RubyCafe
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#575652]">
            <a
              href="#barista"
              className="hover:text-[#141517] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Barista
            </a>
            <a
              href="#timer"
              className="hover:text-[#141517] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Brew Timer
            </a>
            <a
              href="#experiments"
              className="hover:text-[#141517] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Experiments
            </a>
            <a
              href="#history"
              className="hover:text-[#141517] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Brew Log
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('barista')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#141517] hover:bg-[#2A2C30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Craft Cup
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Hero Split */}
      <main id="top">
        <section className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs font-medium tracking-wide text-[#B45309] mb-4">
                Specialty Coffee Workbench · Precision Extraction
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#141517] leading-[1.1] mb-5 text-balance">
                Dial in every pour with intention.
              </h1>
              <p className="text-base text-[#3F3E3A] leading-relaxed max-w-xl mb-8">
                Pair your flavor cravings with single-origin beans, roast profiles, and milk
                alternatives guided by an expert AI barista—then execute every stage on a live
                extraction timer and share your results.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection('barista')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#B45309] hover:bg-[#92400E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Consult the Barista</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('timer')}
                  className="px-4 py-3 text-sm font-medium text-[#141517] hover:text-[#B45309] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Extraction Timer
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-[#141517]/10 bg-[#EAE8E3]">
                <ResilientImage
                  src={COFFEE_IMAGES.hero}
                  alt="Barista pouring hot water from a gooseneck kettle into a glass V60 dripper on a precision digital scale"
                  fallbackTitle="Specialty Pour-Over Bar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-Column Quick-Start Craft Strip below Hero Split */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-[#141517]/10 divide-y sm:divide-y-0 sm:divide-x divide-[#141517]/10">
            {CURATED_RECIPES.map((preset) => {
              const isSelected = activeRecipe.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setActiveRecipe(preset)}
                  className={`text-left p-5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-white' : 'hover:bg-white/60'
                  }`}
                >
                  <div className="text-xs text-[#6B6A65] mb-1">
                    {preset.brewMethod.methodName} ·{' '}
                    <span className="font-mono tabular-nums">
                      {formatSeconds(preset.brewMethod.totalTimeSeconds)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[#141517] mb-1">
                    {preset.recommendedBean.origin}
                  </div>
                  <div className="text-xs text-[#B45309] font-medium">
                    {preset.flavorTags.join(' · ')}
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => scrollToSection('barista')}
              className="text-left p-5 hover:bg-white/60 transition-colors cursor-pointer"
            >
              <div className="text-xs text-[#6B6A65] mb-1">Bespoke Pairing</div>
              <div className="text-sm font-semibold text-[#141517] mb-1">
                Ask Kai for a custom cup
              </div>
              <div className="text-xs text-[#3F3E3A]">
                Tailored bean, milk &amp; pour schedule
              </div>
            </button>
          </div>
        </section>

        {/* Section 1: AI Barista Workbench */}
        <BaristaWorkbench
          activeRecipe={activeRecipe}
          onSelectRecipe={setActiveRecipe}
          onSendToTimer={handleSendToTimer}
          onSaveFavorite={handleSaveFavorite}
          onShareExperiment={handleOpenShareFromRecipe}
        />

        {/* Section 2: Precision Extraction Timer */}
        <ExtractionTimer recipe={activeRecipe} onLogBrew={handleLogBrew} />

        {/* Section 3: Community Brew Experiments */}
        <CommunityFeed
          experiments={experiments}
          draftRecipe={draftExperimentRecipe}
          composerOpen={composerOpen}
          onSetComposerOpen={setComposerOpen}
          onPublishExperiment={handlePublishExperiment}
          onToggleLike={handleToggleLike}
          onLoadExperimentToTimer={handleLoadExperimentToTimer}
        />

        {/* Section 4: Personal Brew History & Favorites */}
        <HistoryLog
          entries={historyEntries}
          onLoadToTimer={(entry) => {
            setActiveRecipe(entry.recipe);
            scrollToSection('timer');
          }}
          onToggleFavorite={handleToggleFavoriteHistory}
          onDeleteEntry={handleDeleteHistory}
          onShareEntry={handleShareHistoryEntry}
        />
      </main>

      <footer className="border-t border-[#141517]/10 py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6B6A65]">
          <span className="font-display text-sm font-semibold text-[#141517]">
            RubyCafe
          </span>
          <div className="flex items-center gap-6">
            <a href="#barista" className="hover:text-[#141517] transition-colors">
              Barista
            </a>
            <a href="#timer" className="hover:text-[#141517] transition-colors">
              Brew Timer
            </a>
            <a href="#experiments" className="hover:text-[#141517] transition-colors">
              Experiments
            </a>
            <a href="#history" className="hover:text-[#141517] transition-colors">
              Brew Log
            </a>
          </div>
        </div>
      </footer>

      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg bg-[#141517] text-white text-xs font-medium shadow-lg border border-white/10"
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
