import { useState } from 'react';
import {
  Bookmark,
  ChevronRight,
  Clock,
  Coffee,
  Loader2,
  MessageSquare,
  Send,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BREW_METHOD_OPTIONS,
  COFFEE_IMAGES,
  FLAVOR_OPTIONS,
  MILK_OPTIONS,
  formatSeconds,
} from '../data/presets';
import type { BaristaChatMessage, BaristaRecipe } from '../types/coffee';
import { ResilientImage } from './ResilientImage';

interface BaristaWorkbenchProps {
  activeRecipe: BaristaRecipe;
  onSelectRecipe: (recipe: BaristaRecipe) => void;
  onSendToTimer: (recipe: BaristaRecipe) => void;
  onSaveFavorite: (recipe: BaristaRecipe) => void;
  onShareExperiment: (recipe: BaristaRecipe) => void;
}

export function BaristaWorkbench({
  activeRecipe,
  onSelectRecipe,
  onSendToTimer,
  onSaveFavorite,
  onShareExperiment,
}: BaristaWorkbenchProps) {
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(['Sweet', 'Fruity']);
  const [milkPreference, setMilkPreference] = useState<string>('Barista Choice');
  const [brewPreference, setBrewPreference] = useState<string>('Barista Choice');
  const [cravingNote, setCravingNote] = useState<string>('');
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [consultError, setConsultError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<BaristaChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors((prev) => {
      if (prev.includes(flavor)) {
        return prev.length > 1 ? prev.filter((f) => f !== flavor) : prev;
      }
      return [...prev, flavor];
    });
  };

  const handleConsultBarista = async () => {
    setIsConsulting(true);
    setConsultError(null);
    try {
      const response = await fetch('/api/barista/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flavors: selectedFlavors,
          milkPreference,
          brewPreference,
          cravingNote,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.recipe) {
        throw new Error(data.error || 'Could not reach the barista right now.');
      }
      onSelectRecipe(data.recipe);
      setChatHistory([]);
      setChatError(null);
    } catch (err) {
      setConsultError(
        err instanceof Error ? err.message : 'Unable to consult the AI barista.'
      );
    } finally {
      setIsConsulting(false);
    }
  };

  const handleAskFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isChatting) return;

    const nextHistory: BaristaChatMessage[] = [
      ...chatHistory,
      { role: 'user', text: trimmed },
    ];
    setChatHistory(nextHistory);
    setChatInput('');
    setIsChatting(true);
    setChatError(null);

    try {
      const response = await fetch('/api/barista/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: activeRecipe,
          history: nextHistory,
          question: trimmed,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Unable to get a follow-up response.');
      }
      setChatHistory((prev) => [...prev, { role: 'barista', text: data.reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Barista chat failed.');
    } finally {
      setIsChatting(false);
    }
  };

  const moodImage =
    activeRecipe.visualMood === 'cacao'
      ? COFFEE_IMAGES.cacao
      : activeRecipe.visualMood === 'milk'
        ? COFFEE_IMAGES.milk
        : COFFEE_IMAGES.floral;

  const moodAlt =
    activeRecipe.visualMood === 'cacao'
      ? 'Dark cacao nibs and roasted specialty coffee beans on slate'
      : activeRecipe.visualMood === 'milk'
        ? 'Steamed microfoam oat latte art in a stoneware cup'
        : 'Light roast single-origin coffee beans with bergamot and jasmine';

  return (
    <section id="barista" className="py-16 border-b border-[#141517]/10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#B45309] mb-2">
              01. AI Barista Consultation
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#141517] text-balance">
              Craft your bean, roast, and extraction profile
            </h2>
          </div>
          <p className="text-sm text-[#575652] max-w-md leading-relaxed">
            Select your tasting preferences and milk style. Kai, our AI head barista, dials in
            origin, roast curve, milk pairing, and an exact timed brew schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Interactive Preferences */}
          <div className="lg:col-span-5 bg-white border border-[#141517]/10 rounded-xl p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-[#141517]">
                  Flavor Notes
                </label>
                <span className="text-xs text-[#6B6A65] tabular-nums">
                  {selectedFlavors.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_OPTIONS.map((flavor) => {
                  const active = selectedFlavors.includes(flavor);
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => toggleFlavor(flavor)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#141517] text-white border-[#141517]'
                          : 'bg-[#F7F7F5] text-[#3F3E3A] border-[#141517]/10 hover:border-[#141517]/30'
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="milk-select"
                  className="block text-sm font-semibold text-[#141517] mb-2"
                >
                  Milk Alternative
                </label>
                <select
                  id="milk-select"
                  value={milkPreference}
                  onChange={(e) => setMilkPreference(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
                >
                  {MILK_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="brew-select"
                  className="block text-sm font-semibold text-[#141517] mb-2"
                >
                  Brew Method
                </label>
                <select
                  id="brew-select"
                  value={brewPreference}
                  onChange={(e) => setBrewPreference(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
                >
                  {BREW_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="craving-input"
                className="block text-sm font-semibold text-[#141517] mb-2"
              >
                Mood or Brewing Context
              </label>
              <textarea
                id="craving-input"
                rows={3}
                value={cravingNote}
                onChange={(e) => setCravingNote(e.target.value)}
                placeholder="e.g. Rainy morning cup—silky texture, low acidity, iced or steamed oat..."
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg text-[#141517] placeholder:text-[#888680] focus:outline-none focus:ring-2 focus:ring-[#B45309]/40 resize-none"
              />
            </div>

            {consultError ? (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-[#DC2626]/8 border border-[#DC2626]/25 text-xs text-[#991B1B] leading-relaxed"
              >
                {consultError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleConsultBarista}
              disabled={isConsulting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#B45309] hover:bg-[#92400E] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isConsulting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dialing in recipe...</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Consult the Barista</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel: Crafted Recipe Dossier */}
          <div className="lg:col-span-7 bg-white border border-[#141517]/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-[#141517]/10">
              <div className="md:col-span-5 h-56 md:h-auto relative bg-[#EAE8E3]">
                <ResilientImage
                  src={moodImage}
                  alt={moodAlt}
                  fallbackTitle={activeRecipe.recommendedBean.origin}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs text-[#6B6A65] mb-2">
                    {activeRecipe.brewMethod.category} · {activeRecipe.roastProfile.level} ·{' '}
                    {activeRecipe.flavorTags.join(' / ')}
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-[#141517] leading-snug mb-3 text-balance">
                    {activeRecipe.title}
                  </h3>
                  <p className="text-sm text-[#3F3E3A] leading-relaxed">
                    {activeRecipe.baristaGreeting}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-[#141517]/8">
                  <div>
                    <div className="text-xs text-[#6B6A65]">Dose</div>
                    <div className="font-mono text-sm font-semibold text-[#141517] tabular-nums">
                      {activeRecipe.brewMethod.doseGrams}g
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6A65]">Water</div>
                    <div className="font-mono text-sm font-semibold text-[#141517] tabular-nums">
                      {activeRecipe.brewMethod.waterMl}ml
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6A65]">Temp</div>
                    <div className="font-mono text-sm font-semibold text-[#141517] tabular-nums">
                      {activeRecipe.brewMethod.waterTempC}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B6A65]">Target</div>
                    <div className="font-mono text-sm font-semibold text-[#B45309] tabular-nums">
                      {formatSeconds(activeRecipe.brewMethod.totalTimeSeconds)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bean, Roast, Milk & Brew Breakdown */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-[#6B6A65] mb-1">
                    Bean & Origin
                  </h4>
                  <p className="text-sm font-semibold text-[#141517]">
                    {activeRecipe.recommendedBean.origin}
                  </p>
                  <p className="text-xs text-[#575652] mt-0.5">
                    {activeRecipe.recommendedBean.varietal} ·{' '}
                    {activeRecipe.recommendedBean.process} ·{' '}
                    {activeRecipe.recommendedBean.altitude}
                  </p>
                  <p className="text-sm text-[#3F3E3A] mt-1.5 leading-relaxed">
                    {activeRecipe.recommendedBean.whyItFits}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#141517]/8">
                  <h4 className="text-xs font-semibold tracking-wide text-[#6B6A65] mb-1">
                    Roast Profile
                  </h4>
                  <p className="text-sm font-semibold text-[#141517]">
                    {activeRecipe.roastProfile.level}
                  </p>
                  <p className="text-sm text-[#3F3E3A] mt-1 leading-relaxed">
                    {activeRecipe.roastProfile.developmentNotes}{' '}
                    <span className="text-[#6B6A65]">
                      {activeRecipe.roastProfile.restingTip}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-[#6B6A65] mb-1">
                    Milk Pairing
                  </h4>
                  <p className="text-sm font-semibold text-[#141517]">
                    {activeRecipe.milkPairing.milkType}
                    {activeRecipe.milkPairing.temperatureC
                      ? ` · Steam to ${activeRecipe.milkPairing.temperatureC}°C`
                      : ''}
                  </p>
                  <p className="text-sm text-[#3F3E3A] mt-1 leading-relaxed">
                    {activeRecipe.milkPairing.textureTip}{' '}
                    {activeRecipe.milkPairing.pairingNote}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#141517]/8">
                  <h4 className="text-xs font-semibold tracking-wide text-[#6B6A65] mb-1">
                    Recommended Brew Method
                  </h4>
                  <p className="text-sm font-semibold text-[#141517]">
                    {activeRecipe.brewMethod.methodName} · Ratio {activeRecipe.brewMethod.ratio}
                  </p>
                  <p className="text-xs text-[#575652] mt-0.5">
                    Grind: {activeRecipe.brewMethod.grindSize}
                  </p>
                  <p className="text-xs text-[#B45309] mt-2 leading-relaxed">
                    Experiment idea: {activeRecipe.experimentPrompt}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="px-6 py-4 bg-[#F7F7F5] border-t border-[#141517]/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onSendToTimer(activeRecipe)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#141517] hover:bg-[#2A2C30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Load into Timer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSaveFavorite(activeRecipe)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#141517] bg-white border border-[#141517]/15 hover:border-[#141517]/35 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save to Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShareExperiment(activeRecipe)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#141517] bg-white border border-[#141517]/15 hover:border-[#141517]/35 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Post Experiment</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setChatOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B45309] hover:text-[#92400E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{chatOpen ? 'Hide Barista Chat' : 'Ask Kai Follow-Up'}</span>
              </button>
            </div>

            {/* Inline Barista Follow-Up Chat */}
            {chatOpen ? (
              <div className="px-6 py-5 border-t border-[#141517]/10 bg-white space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#141517]">
                  <Coffee className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>Dial-In Q&amp;A with Kai</span>
                </div>

                {chatHistory.length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`text-sm leading-relaxed p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-[#F7F7F5] text-[#141517] ml-8'
                            : 'bg-[#141517] text-[#F7F7F5] mr-8'
                        }`}
                      >
                        <div className="text-[11px] opacity-65 mb-1">
                          {msg.role === 'user' ? 'You' : 'Kai · Head Barista'}
                        </div>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B6A65]">
                    Ask how to adjust grind size if your cup tastes sour or bitter, or how to adapt
                    this recipe iced.
                  </p>
                )}

                {chatError ? (
                  <p className="text-xs text-[#991B1B]">{chatError}</p>
                ) : null}

                <form onSubmit={handleAskFollowUp} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Kai about grind tweaks, iced ratios, or milk steaming..."
                    className="flex-1 px-3.5 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !chatInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#141517] hover:bg-[#2A2C30] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isChatting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
