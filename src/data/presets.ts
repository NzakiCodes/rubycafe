import type { BaristaRecipe } from '../types/coffee';

export const COFFEE_IMAGES = {
  hero: '/src/assets/images/hero_pour_over_bar_1795275565410.jpg',
  floral: '/src/assets/images/bean_ethiopia_floral_1795275564991.jpg',
  cacao: '/src/assets/images/bean_colombia_cacao_1795275564939.jpg',
  milk: '/src/assets/images/milk_steamed_oat_1795275565855.jpg',
} as const;

export const FLAVOR_OPTIONS = [
  'Sweet',
  'Bold',
  'Chocolaty',
  'Fruity',
  'Floral',
  'Nutty',
  'Bright Acid',
  'Caramelized',
] as const;

export const MILK_OPTIONS = [
  'Barista Choice',
  'Black (No Milk)',
  'Barista Oat',
  'Macadamia',
  'Almond',
  'Whole Dairy',
  'Coconut',
] as const;

export const BREW_METHOD_OPTIONS = [
  'Barista Choice',
  'Pour-Over (V60 / Chemex)',
  'Espresso',
  'AeroPress',
  'French Press',
  'Cold Brew',
] as const;

export const CURATED_RECIPES: BaristaRecipe[] = [
  {
    id: 'preset-ethiopia-v60',
    title: 'Bergamot & White Peach V60 Pour-Over',
    baristaGreeting:
      'If you crave lifted aromatics and stone-fruit sweetness, this washed Ethiopian lot shines brightest through a conical paper filter. Keep your pour gentle so the finish stays syrupy and clean.',
    flavorTags: ['Fruity', 'Floral', 'Sweet'],
    recommendedBean: {
      origin: 'Ethiopia Guji Uraga',
      varietal: '74110 & 74112 Heirloom',
      process: 'Washed, Raised Bed Dried',
      tastingNotes: 'Bergamot, White Peach, Honeysuckle',
      altitude: '2,150 masl',
      whyItFits:
        'High-elevation washed Guji naturally balances sparkling citrus aromatics with honeyed stone-fruit sweetness.',
    },
    roastProfile: {
      level: 'Nordic Light Roast',
      developmentNotes: 'Short post-crack development preserves floral terpenes without smoky roast notes.',
      restingTip: 'Rest 10–18 days off-roast for peak aromatic clarity.',
    },
    milkPairing: {
      milkType: 'Black (No Milk)',
      textureTip: 'Serve neat in a pre-warmed ceramic cup; aromatics bloom as it cools to 58°C.',
      temperatureC: null,
      pairingNote: 'Skipping milk keeps the delicate jasmine and bergamot finish completely transparent.',
    },
    brewMethod: {
      category: 'Pour-Over',
      methodName: 'Hario V60',
      grindSize: 'Medium-Fine (550 µm / 22 clicks)',
      doseGrams: 15,
      waterMl: 250,
      waterTempC: 95,
      ratio: '1:16.7',
      totalTimeSeconds: 165,
      steps: [
        {
          label: 'Bloom & Swirl',
          startSec: 0,
          endSec: 45,
          waterTargetMl: 45,
          instruction: 'Pour 45 ml evenly to saturate all grounds, then swirl twice gently.',
        },
        {
          label: 'First Spiral Pour',
          startSec: 45,
          endSec: 95,
          waterTargetMl: 150,
          instruction: 'Spiral steadily from center outward up to 150 ml at 5 ml/sec.',
        },
        {
          label: 'Final Pour & Drawdown',
          startSec: 95,
          endSec: 165,
          waterTargetMl: 250,
          instruction: 'Pour gently in the center to 250 ml and let the bed drain flat by 2:45.',
        },
      ],
    },
    experimentPrompt:
      'Try substituting 30% of the brew water with clear ice cubes in the carafe for a flash-chilled jasmine iced pour-over.',
    visualMood: 'floral',
  },
  {
    id: 'preset-colombia-oat-cortado',
    title: 'Molten Cacao & Hazelnut Oat Cortado',
    baristaGreeting:
      'For bold, chocolaty depth without sharp edges, pull a syrupy double shot from Huila and pair it with lightly steamed oat milk. Keeping the milk below 60°C preserves its natural cereal sweetness.',
    flavorTags: ['Bold', 'Chocolaty', 'Sweet', 'Nutty'],
    recommendedBean: {
      origin: 'Colombia Huila San Agustín',
      varietal: 'Caturra & Castillo',
      process: 'Washed, Sun-Dried',
      tastingNotes: 'Dark Cacao, Toasted Hazelnut, Panela',
      altitude: '1,780 masl',
      whyItFits:
        'Huila Caturra brings dense cocoa butter body and roasted hazelnut sweetness that cuts cleanly through milk.',
    },
    roastProfile: {
      level: 'Medium Roast',
      developmentNotes: 'Balanced Maillard caramelization deepens chocolate notes without carbon bitterness.',
      restingTip: 'Rest 7–14 days off-roast before dialing in for espresso.',
    },
    milkPairing: {
      milkType: 'Barista Oat Milk',
      textureTip: 'Aerate for just 2 seconds, then vortex to glossy wet-paint microfoam.',
      temperatureC: 58,
      pairingNote: 'Barista oat amplifies panela sweetness and builds a velvety, dessert-like texture.',
    },
    brewMethod: {
      category: 'Espresso',
      methodName: '9-Bar Double Espresso',
      grindSize: 'Fine Espresso (240 µm)',
      doseGrams: 19,
      waterMl: 38,
      waterTempC: 93,
      ratio: '1:2',
      totalTimeSeconds: 29,
      steps: [
        {
          label: 'Pre-Infusion',
          startSec: 0,
          endSec: 6,
          waterTargetMl: 4,
          instruction: 'Low-pressure soak until the first dark syrupy drops appear at the bottomless basket.',
        },
        {
          label: 'Peak 9-Bar Extraction',
          startSec: 6,
          endSec: 22,
          waterTargetMl: 28,
          instruction: 'Steady tiger-striped honey stream; maintain even flow without channeling.',
        },
        {
          label: 'Sweet Finish & Milk Fold',
          startSec: 22,
          endSec: 29,
          waterTargetMl: 38,
          instruction: 'Cut the shot at 38 ml, then fold in 75 ml of 58°C steamed oat milk.',
        },
      ],
    },
    experimentPrompt:
      'Add a tiny pinch of flaky sea salt and orange zest over the microfoam before serving.',
    visualMood: 'milk',
  },
  {
    id: 'preset-sumatra-aeropress',
    title: 'Caramelized Spice & Dark Cocoa AeroPress',
    baristaGreeting:
      'When you want rich body, brown-sugar warmth, and forgiving consistency, an inverted AeroPress delivers every time. A gentle stir at 45 seconds unlocks deep cocoa notes with zero silt.',
    flavorTags: ['Bold', 'Chocolaty', 'Caramelized'],
    recommendedBean: {
      origin: 'Guatemala Antigua Bella Vista',
      varietal: 'Bourbon',
      process: 'Washed',
      tastingNotes: 'Bittersweet Chocolate, Roasted Almond, Brown Sugar',
      altitude: '1,650 masl',
      whyItFits:
        'Volcanic Antigua Bourbon offers rounded caramel sweetness and rich body suited to full immersion.',
    },
    roastProfile: {
      level: 'Medium-Dark Roast',
      developmentNotes: 'Extended caramelization just past first crack builds silky mouthfeel.',
      restingTip: 'Best brewed 5–12 days post-roast.',
    },
    milkPairing: {
      milkType: 'Macadamia Milk (Optional Splash)',
      textureTip: 'Warm to 60°C or pour 25 ml cold over the finished concentrate.',
      temperatureC: 60,
      pairingNote: 'Macadamia milk adds buttery richness without masking caramelized sugar notes.',
    },
    brewMethod: {
      category: 'Immersion',
      methodName: 'AeroPress Inverted',
      grindSize: 'Medium (650 µm / 25 clicks)',
      doseGrams: 17,
      waterMl: 240,
      waterTempC: 91,
      ratio: '1:14.1',
      totalTimeSeconds: 135,
      steps: [
        {
          label: 'Pour & Saturate',
          startSec: 0,
          endSec: 45,
          waterTargetMl: 240,
          instruction: 'Add 240 ml of 91°C water within 15 seconds and steep undisturbed.',
        },
        {
          label: 'Crust Break & Stir',
          startSec: 45,
          endSec: 95,
          waterTargetMl: 240,
          instruction: 'Stir gently back-to-front 4 times, cap with rinsed paper filter, and let settle.',
        },
        {
          label: 'Flip & Slow Plunge',
          startSec: 95,
          endSec: 135,
          waterTargetMl: 240,
          instruction: 'Flip onto a sturdy server and press steadily over 40 seconds until the hiss.',
        },
      ],
    },
    experimentPrompt:
      'Swap the paper filter for a stainless mesh disc to retain extra natural coffee oils.',
    visualMood: 'cacao',
  },
];

export function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
