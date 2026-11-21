import { useMemo, useState } from 'react';
import { Clock, Search, Share2, Star, Trash2 } from 'lucide-react';
import { formatSeconds } from '../data/presets';
import type { BrewHistoryEntry } from '../types/coffee';

interface HistoryLogProps {
  entries: BrewHistoryEntry[];
  onLoadToTimer: (entry: BrewHistoryEntry) => void;
  onToggleFavorite: (id: string, nextValue: boolean) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onShareEntry: (entry: BrewHistoryEntry) => void;
}

export function HistoryLog({
  entries,
  onLoadToTimer,
  onToggleFavorite,
  onDeleteEntry,
  onShareEntry,
}: HistoryLogProps) {
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((item) => {
      if (favoritesOnly && !item.isFavorite) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.beanOrigin.toLowerCase().includes(q) ||
        item.brewMethod.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [entries, search, favoritesOnly]);

  const favoriteCount = entries.filter((e) => e.isFavorite).length;

  return (
    <section id="history" className="py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#B45309] mb-2">
              04. Brew History &amp; Saved Favorites
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#141517] text-balance">
              Your personal extraction ledger
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B6A65] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter beans, methods, notes..."
                className="pl-8 pr-3.5 py-2 text-xs bg-white border border-[#141517]/12 rounded-lg text-[#141517] placeholder:text-[#888680] focus:outline-none focus:ring-2 focus:ring-[#B45309]/35 w-56"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border border-[#141517]/10 rounded-lg">
              <button
                type="button"
                onClick={() => setFavoritesOnly(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !favoritesOnly
                    ? 'bg-[#141517] text-white'
                    : 'text-[#575652] hover:text-[#141517]'
                }`}
              >
                All ({entries.length})
              </button>
              <button
                type="button"
                onClick={() => setFavoritesOnly(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  favoritesOnly
                    ? 'bg-[#141517] text-white'
                    : 'text-[#575652] hover:text-[#141517]'
                }`}
              >
                Favorites ({favoriteCount})
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-[#141517]/10 rounded-xl p-10 text-center">
            <p className="text-sm text-[#575652]">
              {entries.length === 0
                ? 'No brews logged yet. Craft a recipe above or complete a run in the Extraction Timer to save it here.'
                : 'No saved brews match your current filter.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#141517]/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#141517]/10 text-xs font-semibold text-[#6B6A65] bg-[#F7F7F5]/60">
                    <th className="py-3.5 px-5">Recipe &amp; Notes</th>
                    <th className="py-3.5 px-4">Bean &amp; Roast</th>
                    <th className="py-3.5 px-4">Method &amp; Milk</th>
                    <th className="py-3.5 px-4 text-right">Spec</th>
                    <th className="py-3.5 px-4 text-right">Time</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141517]/8 text-sm">
                  {filtered.map((entry) => {
                    const dateLabel = new Date(entry.createdAt).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' }
                    );
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-[#F7F7F5]/60 transition-colors align-top"
                      >
                        <td className="py-4 px-5 max-w-xs">
                          <div className="text-xs text-[#6B6A65] mb-0.5 tabular-nums">
                            {dateLabel}
                          </div>
                          <div className="font-semibold text-[#141517]">
                            {entry.title}
                          </div>
                          {entry.notes ? (
                            <p className="text-xs text-[#575652] mt-1 leading-relaxed">
                              {entry.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-xs font-medium text-[#141517]">
                            {entry.beanOrigin}
                          </div>
                          <div className="text-xs text-[#6B6A65] mt-0.5">
                            {entry.roastLevel}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-xs font-medium text-[#141517]">
                            {entry.brewMethod}
                          </div>
                          <div className="text-xs text-[#6B6A65] mt-0.5">
                            {entry.milkAlternative}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-xs text-[#141517] tabular-nums whitespace-nowrap">
                          {entry.doseGrams}g / {entry.waterMl}ml
                          <div className="text-[#6B6A65]">{entry.waterTempC}°C</div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-xs text-[#141517] tabular-nums whitespace-nowrap">
                          {formatSeconds(entry.actualSeconds)}
                          <div className="text-[#6B6A65]">
                            Target {formatSeconds(entry.targetSeconds)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= entry.rating
                                    ? 'fill-[#B45309] text-[#B45309]'
                                    : 'text-[#D6D4CE]'
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label={
                                entry.isFavorite ? 'Remove from favorites' : 'Mark as favorite'
                              }
                              onClick={() => onToggleFavorite(entry.id, !entry.isFavorite)}
                              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                                entry.isFavorite
                                  ? 'bg-[#B45309]/10 border-[#B45309]/30 text-[#B45309]'
                                  : 'bg-white border-[#141517]/12 text-[#6B6A65] hover:text-[#141517]'
                              }`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  entry.isFavorite ? 'fill-[#B45309]' : ''
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              aria-label="Load recipe into timer"
                              onClick={() => onLoadToTimer(entry)}
                              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-white border border-[#141517]/12 hover:border-[#141517]/35 rounded-lg text-[#141517] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Re-brew</span>
                            </button>

                            <button
                              type="button"
                              aria-label="Share to community feed"
                              onClick={() => onShareEntry(entry)}
                              className="p-2 rounded-lg bg-white border border-[#141517]/12 hover:border-[#141517]/35 text-[#3F3E3A] transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              aria-label="Delete brew entry"
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-2 rounded-lg bg-white border border-[#141517]/12 hover:border-[#DC2626]/40 hover:text-[#DC2626] text-[#6B6A65] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
