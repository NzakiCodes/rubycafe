export type BrewCategory = 'Pour-Over' | 'Espresso' | 'Immersion' | 'Cold Brew';

export type ExperimentCategory = 'Pour-Over' | 'Espresso' | 'Milk Craft' | 'Immersion';

export interface BrewStep {
  label: string;
  startSec: number;
  endSec: number;
  waterTargetMl: number;
  instruction: string;
}

export interface BaristaRecipe {
  id: string;
  title: string;
  baristaGreeting: string;
  flavorTags: string[];
  recommendedBean: {
    origin: string;
    varietal: string;
    process: string;
    tastingNotes: string;
    altitude: string;
    whyItFits: string;
  };
  roastProfile: {
    level: string;
    developmentNotes: string;
    restingTip: string;
  };
  milkPairing: {
    milkType: string;
    textureTip: string;
    temperatureC: number | null;
    pairingNote: string;
  };
  brewMethod: {
    category: BrewCategory;
    methodName: string;
    grindSize: string;
    doseGrams: number;
    waterMl: number;
    waterTempC: number;
    ratio: string;
    totalTimeSeconds: number;
    steps: BrewStep[];
  };
  experimentPrompt: string;
  visualMood: 'floral' | 'cacao' | 'milk';
}

export interface BaristaChatMessage {
  role: 'user' | 'barista';
  text: string;
}

export interface BrewExperiment {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  category: ExperimentCategory;
  beanOrigin: string;
  roastLevel: string;
  milkAlternative: string;
  brewMethod: string;
  doseGrams: number;
  waterMl: number;
  waterTempC: number;
  extractionSeconds: number;
  tastingNotes: string;
  likes: number;
  recipeSnapshot?: BaristaRecipe;
}

export interface BrewHistoryEntry {
  id: string;
  createdAt: string;
  title: string;
  beanOrigin: string;
  roastLevel: string;
  milkAlternative: string;
  brewMethod: string;
  doseGrams: number;
  waterMl: number;
  waterTempC: number;
  actualSeconds: number;
  targetSeconds: number;
  rating: number;
  notes: string;
  isFavorite: boolean;
  recipe: BaristaRecipe;
}
