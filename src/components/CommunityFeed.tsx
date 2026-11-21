import { useEffect, useState } from 'react';
import { Check, Clock, Heart, Plus, Share2, X } from 'lucide-react';
import { formatSeconds } from '../data/presets';
import type { BaristaRecipe, BrewExperiment, ExperimentCategory } from '../types/coffee';

interface CommunityFeedProps {
  experiments: BrewExperiment[];
  draftRecipe: BaristaRecipe | null;
  composerOpen: boolean;
  onSetComposerOpen: (open: boolean) => void;
  onPublishExperiment: (payload: Omit<BrewExperiment, 'id' | 'createdAt' | 'likes'>) => Promise<void>;
  onToggleLike: (id: string, currentlyLiked: boolean) => Promise<void>;
  onLoadExperimentToTimer: (experiment: BrewExperiment) => void;
}

const FEED_FILTERS: Array<'All' | ExperimentCategory> = [
  'All',
  'Pour-Over',
  'Espresso',
  'Milk Craft',
  'Immersion',
];

export function CommunityFeed({
  experiments,
  draftRecipe,
  composerOpen,
  onSetComposerOpen,
  onPublishExperiment,
  onToggleLike,
  onLoadExperimentToTimer,
}: CommunityFeedProps) {
  const [filter, setFilter] = useState<'All' | ExperimentCategory>('All');
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bloom_roast_liked_experiments');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Composer form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<ExperimentCategory>('Pour-Over');
  const [beanOrigin, setBeanOrigin] = useState('');
  const [roastLevel, setRoastLevel] = useState('');
  const [milkAlternative, setMilkAlternative] = useState('');
  const [brewMethod, setBrewMethod] = useState('');
  const [doseGrams, setDoseGrams] = useState(15);
  const [waterMl, setWaterMl] = useState(250);
  const [waterTempC, setWaterTempC] = useState(93);
  const [extractionSeconds, setExtractionSeconds] = useState(165);
  const [tastingNotes, setTastingNotes] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftRecipe) return;
    setTitle(draftRecipe.title);
    setBeanOrigin(draftRecipe.recommendedBean.origin);
    setRoastLevel(draftRecipe.roastProfile.level);
    setMilkAlternative(draftRecipe.milkPairing.milkType);
    setBrewMethod(draftRecipe.brewMethod.methodName);
    setDoseGrams(draftRecipe.brewMethod.doseGrams);
    setWaterMl(draftRecipe.brewMethod.waterMl);
    setWaterTempC(draftRecipe.brewMethod.waterTempC);
    setExtractionSeconds(draftRecipe.brewMethod.totalTimeSeconds);
    setTastingNotes(
      `${draftRecipe.recommendedBean.tastingNotes}. ${draftRecipe.experimentPrompt}`
    );
    if (draftRecipe.milkPairing.temperatureC) {
      setCategory('Milk Craft');
    } else if (draftRecipe.brewMethod.category === 'Espresso') {
      setCategory('Espresso');
    } else if (draftRecipe.brewMethod.category === 'Immersion' || draftRecipe.brewMethod.category === 'Cold Brew') {
      setCategory('Immersion');
    } else {
      setCategory('Pour-Over');
    }
  }, [draftRecipe]);

  const filtered =
    filter === 'All'
      ? experiments
      : experiments.filter((item) => item.category === filter);

  const handleLikeClick = async (id: string) => {
    const alreadyLiked = likedIds.includes(id);
    const nextLiked = alreadyLiked
      ? likedIds.filter((x) => x !== id)
      : [...likedIds, id];
    setLikedIds(nextLiked);
    try {
      localStorage.setItem('bloom_roast_liked_experiments', JSON.stringify(nextLiked));
    } catch {
      // Ignore storage errors
    }
    await onToggleLike(id, alreadyLiked);
  };

  const handleShareCard = async (exp: BrewExperiment) => {
    const shareText = `${exp.title} by ${exp.author}\n${exp.beanOrigin} (${exp.roastLevel}) · ${exp.brewMethod} · ${exp.milkAlternative}\nSpec: ${exp.doseGrams}g coffee / ${exp.waterMl}ml water at ${exp.waterTempC}°C (${formatSeconds(exp.extractionSeconds)})\nNotes: ${exp.tastingNotes}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${exp.title} — RubyCafe`,
          text: shareText,
          url: window.location.href,
        });
        setCopiedId(exp.id);
        window.setTimeout(() => setCopiedId(null), 2200);
        return;
      } catch {
        // User dismissed or share unavailable, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(exp.id);
      window.setTimeout(() => setCopiedId(null), 2200);
    } catch {
      // Clipboard blocked
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !tastingNotes.trim()) {
      setPostError('Please include a title and tasting notes for your experiment.');
      return;
    }
    setIsPosting(true);
    setPostError(null);
    try {
      await onPublishExperiment({
        title: title.trim(),
        author: author.trim() || 'Guest Brewer',
        category,
        beanOrigin: beanOrigin.trim() || 'House Single Origin',
        roastLevel: roastLevel.trim() || 'Medium-Light',
        milkAlternative: milkAlternative.trim() || 'Black (No Milk)',
        brewMethod: brewMethod.trim() || 'Hario V60',
        doseGrams: Number(doseGrams) || 15,
        waterMl: Number(waterMl) || 250,
        waterTempC: Number(waterTempC) || 93,
        extractionSeconds: Number(extractionSeconds) || 165,
        tastingNotes: tastingNotes.trim(),
        recipeSnapshot: draftRecipe ?? undefined,
      });
      onSetComposerOpen(false);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Unable to post experiment.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section id="experiments" className="py-16 border-b border-[#141517]/10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#B45309] mb-2">
              03. Community Brew Experiments
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#141517] text-balance">
              Shared pours, ratios, and tasting notes
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onSetComposerOpen(!composerOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#141517] hover:bg-[#2A2C30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start md:self-auto"
          >
            {composerOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{composerOpen ? 'Close Composer' : 'Post Experiment'}</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {FEED_FILTERS.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#141517] text-white'
                    : 'bg-white border border-[#141517]/10 text-[#575652] hover:text-[#141517]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Post Experiment Composer */}
        {composerOpen ? (
          <form
            onSubmit={handlePublish}
            className="mb-10 bg-white border border-[#141517]/12 rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#141517]/8 pb-4">
              <h3 className="font-display text-xl font-semibold text-[#141517]">
                Publish Your Brewing Experiment
              </h3>
              <span className="text-xs text-[#6B6A65]">Shared directly to the bar feed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Experiment Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Honey-Processed Costa Rica Iced Cortado"
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Guest Brewer"
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExperimentCategory)}
                  className="w-full px-3 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                >
                  <option value="Pour-Over">Pour-Over</option>
                  <option value="Espresso">Espresso</option>
                  <option value="Milk Craft">Milk Craft</option>
                  <option value="Immersion">Immersion</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Bean Origin
                </label>
                <input
                  type="text"
                  value={beanOrigin}
                  onChange={(e) => setBeanOrigin(e.target.value)}
                  placeholder="Ethiopia Yirgacheffe"
                  className="w-full px-3 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Roast &amp; Method
                </label>
                <input
                  type="text"
                  value={brewMethod}
                  onChange={(e) => setBrewMethod(e.target.value)}
                  placeholder="Light · Hario V60"
                  className="w-full px-3 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Milk Pairing
                </label>
                <input
                  type="text"
                  value={milkAlternative}
                  onChange={(e) => setMilkAlternative(e.target.value)}
                  placeholder="Barista Oat / Black"
                  className="w-full px-3 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Dose (g)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={doseGrams}
                  onChange={(e) => setDoseGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Water (ml)
                </label>
                <input
                  type="number"
                  min={15}
                  max={1500}
                  value={waterMl}
                  onChange={(e) => setWaterMl(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Temp (°C)
                </label>
                <input
                  type="number"
                  min={4}
                  max={100}
                  value={waterTempC}
                  onChange={(e) => setWaterTempC(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                  Time (seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={900}
                  value={extractionSeconds}
                  onChange={(e) => setExtractionSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141517] mb-1.5">
                Tasting Notes &amp; Technique
              </label>
              <textarea
                rows={3}
                required
                value={tastingNotes}
                onChange={(e) => setTastingNotes(e.target.value)}
                placeholder="Describe what worked in the cup, flavor balance, and pour technique..."
                className="w-full px-3.5 py-2 text-sm bg-[#F7F7F5] border border-[#141517]/12 rounded-lg resize-none"
              />
            </div>

            {postError ? (
              <p className="text-xs text-[#991B1B]">{postError}</p>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onSetComposerOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#575652] hover:text-[#141517] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPosting}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#B45309] hover:bg-[#92400E] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPosting ? 'Publishing...' : 'Publish Experiment'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Experiment Cards Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#141517]/10 rounded-xl p-10 text-center">
            <p className="text-sm text-[#575652] mb-4">
              No experiments in {filter} yet. Be the first to share your recipe!
            </p>
            <button
              type="button"
              onClick={() => onSetComposerOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#141517] rounded-lg cursor-pointer"
            >
              Post Experiment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((exp) => {
              const liked = likedIds.includes(exp.id);
              const isCopied = copiedId === exp.id;

              return (
                <article
                  key={exp.id}
                  className="bg-white border border-[#141517]/10 rounded-xl p-6 flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="text-xs text-[#6B6A65] mb-2">
                      {exp.category} · {exp.author}
                    </div>
                    <h3 className="font-display text-xl font-semibold text-[#141517] leading-snug mb-2 text-balance">
                      {exp.title}
                    </h3>
                    <div className="text-xs font-medium text-[#B45309] mb-3">
                      {exp.beanOrigin} · {exp.roastLevel} · {exp.milkAlternative}
                    </div>
                    <p className="text-sm text-[#3F3E3A] leading-relaxed">
                      {exp.tastingNotes}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="pt-4 border-t border-[#141517]/8 grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="block text-[#6B6A65]">Method</span>
                        <span className="font-medium text-[#141517] truncate block">
                          {exp.brewMethod}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[#6B6A65]">Ratio</span>
                        <span className="font-mono font-medium text-[#141517] tabular-nums">
                          {exp.doseGrams}g/{exp.waterMl}ml
                        </span>
                      </div>
                      <div>
                        <span className="block text-[#6B6A65]">Temp</span>
                        <span className="font-mono font-medium text-[#141517] tabular-nums">
                          {exp.waterTempC}°C
                        </span>
                      </div>
                      <div>
                        <span className="block text-[#6B6A65]">Time</span>
                        <span className="font-mono font-medium text-[#141517] tabular-nums">
                          {formatSeconds(exp.extractionSeconds)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLikeClick(exp.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            liked
                              ? 'bg-[#B45309]/10 border-[#B45309]/30 text-[#B45309]'
                              : 'bg-[#F7F7F5] border-[#141517]/10 text-[#3F3E3A] hover:border-[#141517]/30'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${liked ? 'fill-[#B45309]' : ''}`}
                          />
                          <span className="font-mono tabular-nums">{exp.likes}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareCard(exp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F7F7F5] border border-[#141517]/10 text-[#3F3E3A] hover:border-[#141517]/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onLoadExperimentToTimer(exp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#141517] hover:text-[#B45309] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Brew This</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
