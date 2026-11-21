import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  BaristaChatMessage,
  BaristaRecipe,
  BrewExperiment,
  BrewHistoryEntry,
} from './src/types/coffee.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const EXPERIMENTS_FILE = path.join(DATA_DIR, 'experiments.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

const STARTER_EXPERIMENTS: BrewExperiment[] = [
  {
    id: 'exp-yirgacheffe-ice-bloom',
    title: 'Flash-Chilled Bergamot V60 with Macadamia Foam',
    author: 'Kenji Sato',
    createdAt: '2026-11-20T09:15:00.000Z',
    category: 'Pour-Over',
    beanOrigin: 'Ethiopia Worka Sakaro',
    roastLevel: 'Nordic Light',
    milkAlternative: 'Cold-Whisked Macadamia Cap',
    brewMethod: 'Hario V60',
    doseGrams: 18,
    waterMl: 270,
    waterTempC: 94,
    extractionSeconds: 165,
    tastingNotes:
      'Cut 40% of the brew water as clear ice in the carafe, then finished with a 15 ml cold macadamia micro-cap. White peach and jasmine jump forward without astringency.',
    likes: 28,
  },
  {
    id: 'exp-huila-cortado',
    title: 'Spiced Dark Cacao Cortado on Barista Oat',
    author: 'Maren Lindqvist',
    createdAt: '2026-11-19T14:40:00.000Z',
    category: 'Milk Craft',
    beanOrigin: 'Colombia Huila Pink Bourbon',
    roastLevel: 'Medium-Light',
    milkAlternative: 'Steamed Barista Oat (58°C)',
    brewMethod: '9-Bar Espresso',
    doseGrams: 19,
    waterMl: 38,
    waterTempC: 93,
    extractionSeconds: 29,
    tastingNotes:
      'Pulled a 1:2 ristretto-leaning double at 29 seconds and kept the oat milk at 58°C so natural maltose sweetness wraps around molten dark chocolate and toasted hazelnut.',
    likes: 41,
  },
  {
    id: 'exp-guatemala-aeropress',
    title: 'High-Clarity Inverted AeroPress · Honey & Red Plum',
    author: 'Nadia Alvarez',
    createdAt: '2026-11-18T11:05:00.000Z',
    category: 'Immersion',
    beanOrigin: 'Guatemala Huehuetenango',
    roastLevel: 'Medium',
    milkAlternative: 'Black (No Milk)',
    brewMethod: 'AeroPress Inverted',
    doseGrams: 16,
    waterMl: 240,
    waterTempC: 91,
    extractionSeconds: 135,
    tastingNotes:
      'Steeped 90 seconds with a gentle crust break at 0:45, then a slow 45-second press through two paper filters for syrupy plum sweetness and zero sediment.',
    likes: 19,
  },
];

const STARTER_HISTORY: BrewHistoryEntry[] = [
  {
    id: 'hist-morning-v60',
    createdAt: '2026-11-21T06:45:00.000Z',
    title: 'Washed Guji Floral Morning Pour',
    beanOrigin: 'Ethiopia Guji Uraga',
    roastLevel: 'Light Roast',
    milkAlternative: 'Black (No Milk)',
    brewMethod: 'Hario V60',
    doseGrams: 15,
    waterMl: 250,
    waterTempC: 95,
    actualSeconds: 168,
    targetSeconds: 165,
    rating: 5,
    notes: 'Sweet honeysuckle finish, dialed grind two clicks finer than yesterday.',
    isFavorite: true,
    recipe: {
      id: 'starter-guji-v60',
      title: 'Washed Guji Floral Morning Pour',
      baristaGreeting:
        'Clean, tea-like, and bright—this washed Guji sings when poured hot in three calm pulses.',
      flavorTags: ['Fruity', 'Floral', 'Sweet'],
      recommendedBean: {
        origin: 'Ethiopia Guji Uraga',
        varietal: '74110 & 74112 Heirloom',
        process: 'Washed, Raised Bed Dried',
        tastingNotes: 'Bergamot, White Peach, Honeysuckle',
        altitude: '2,150 masl',
        whyItFits:
          'High-elevation washed Guji brings crisp citrus sparkle with honeyed stone-fruit sweetness.',
      },
      roastProfile: {
        level: 'Light Roast',
        developmentNotes: 'Short 11% development time preserves delicate aromatics without roast bitterness.',
        restingTip: 'Peak clarity arrives 10–18 days post-roast.',
      },
      milkPairing: {
        milkType: 'Black (No Milk)',
        textureTip: 'Serve pure in a preheated stoneware cup to let floral aromatics open as it cools.',
        temperatureC: null,
        pairingNote: 'Milk would mute the jasmine top-notes; enjoy black at 62°C drinking temp.',
      },
      brewMethod: {
        category: 'Pour-Over',
        methodName: 'Hario V60',
        grindSize: 'Medium-Fine (22 clicks Comandante / 550 µm)',
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
            instruction: 'Pour 45 ml evenly to saturate all grounds, then give two gentle swirls.',
          },
          {
            label: 'First Spiral Pour',
            startSec: 45,
            endSec: 95,
            waterTargetMl: 150,
            instruction: 'Pour steadily in concentric circles up to 150 ml, keeping the slurry level steady.',
          },
          {
            label: 'Final Center Pour & Drawdown',
            startSec: 95,
            endSec: 165,
            waterTargetMl: 250,
            instruction: 'Top to 250 ml with a gentle center pour and let draw down flat by 2:45.',
          },
        ],
      },
      experimentPrompt: 'Try dropping water temp to 92°C on the final pour for deeper peach sweetness.',
      visualMood: 'floral',
    },
  },
];

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(EXPERIMENTS_FILE)) {
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(STARTER_EXPERIMENTS, null, 2), 'utf-8');
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(STARTER_HISTORY, null, 2), 'utf-8');
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  if (err instanceof Error && err.message === 'MISSING_API_KEY') {
    return {
      status: 503,
      message:
        'Gemini API key is missing. Add GEMINI_API_KEY in the Settings > Secrets panel to consult the AI barista.',
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'API key permission issue. Verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit reached on Gemini API. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: msg || 'Failed to consult the AI barista.',
  };
}

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short, appetizing specialty drink or recipe title (4-8 words).',
    },
    baristaGreeting: {
      type: Type.STRING,
      description:
        'A warm, trendy, expert barista recommendation note (2-3 crisp sentences, modern specialty coffee voice without clichés).',
    },
    flavorTags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 4 tasting notes or flavor descriptors.',
    },
    recommendedBean: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING },
        varietal: { type: Type.STRING },
        process: { type: Type.STRING },
        tastingNotes: { type: Type.STRING },
        altitude: { type: Type.STRING },
        whyItFits: { type: Type.STRING },
      },
      required: ['origin', 'varietal', 'process', 'tastingNotes', 'altitude', 'whyItFits'],
    },
    roastProfile: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING },
        developmentNotes: { type: Type.STRING },
        restingTip: { type: Type.STRING },
      },
      required: ['level', 'developmentNotes', 'restingTip'],
    },
    milkPairing: {
      type: Type.OBJECT,
      properties: {
        milkType: { type: Type.STRING },
        textureTip: { type: Type.STRING },
        temperatureC: {
          type: Type.INTEGER,
          nullable: true,
          description: 'Target steamed milk temperature in Celsius, or null if black coffee.',
        },
        pairingNote: { type: Type.STRING },
      },
      required: ['milkType', 'textureTip', 'pairingNote'],
    },
    brewMethod: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "Must be one of: 'Pour-Over', 'Espresso', 'Immersion', 'Cold Brew'",
        },
        methodName: { type: Type.STRING },
        grindSize: { type: Type.STRING },
        doseGrams: { type: Type.NUMBER },
        waterMl: { type: Type.NUMBER },
        waterTempC: { type: Type.INTEGER },
        ratio: { type: Type.STRING },
        totalTimeSeconds: { type: Type.INTEGER },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              startSec: { type: Type.INTEGER },
              endSec: { type: Type.INTEGER },
              waterTargetMl: { type: Type.NUMBER },
              instruction: { type: Type.STRING },
            },
            required: ['label', 'startSec', 'endSec', 'waterTargetMl', 'instruction'],
          },
        },
      },
      required: [
        'category',
        'methodName',
        'grindSize',
        'doseGrams',
        'waterMl',
        'waterTempC',
        'ratio',
        'totalTimeSeconds',
        'steps',
      ],
    },
    experimentPrompt: {
      type: Type.STRING,
      description: 'One creative extraction or ingredient twist to try next.',
    },
    visualMood: {
      type: Type.STRING,
      description: "Must be one of: 'floral', 'cacao', 'milk'",
    },
  },
  required: [
    'title',
    'baristaGreeting',
    'flavorTags',
    'recommendedBean',
    'roastProfile',
    'milkPairing',
    'brewMethod',
    'experimentPrompt',
    'visualMood',
  ],
};

async function startServer() {
  ensureDataFiles();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // AI Barista Recipe Consultation (Gemini Flash / gemini-4-hydrogen)
  app.post('/api/barista/consult', async (req: Request, res: Response) => {
    try {
      const { flavors, milkPreference, brewPreference, cravingNote } = req.body as {
        flavors?: string[];
        milkPreference?: string;
        brewPreference?: string;
        cravingNote?: string;
      };

      const ai = getAiClient();
      const selectedFlavors =
        Array.isArray(flavors) && flavors.length > 0 ? flavors.join(', ') : 'balanced and sweet';
      const milkText = milkPreference || 'Barista Choice';
      const brewText = brewPreference || 'Barista Choice';
      const noteText = cravingNote?.trim() ? cravingNote.trim() : 'No extra notes.';

      const prompt = `Design a precision specialty coffee recipe tailored to this guest:
- Desired flavor notes: ${selectedFlavors}
- Milk / dairy-alternative preference: ${milkText}
- Preferred brew gear / method: ${brewText}
- Guest mood or request: ${noteText}

Requirements:
1. Choose an authentic single-origin or deliberate blend bean (real coffee regions, varietals, processing methods like Washed, Natural, Honey, Anaerobic) and explain why it matches their flavor notes.
2. Specify the exact roast profile and resting tip.
3. Recommend the ideal milk alternative (or crisp black service if they chose Black / No Milk, or if their flavor profile shines brightest without milk—explain honestly) with steaming temperature in Celsius (null if black or iced/unsteamed) and microfoam texture tip.
4. Pick the single best brew method matching their equipment preference (or your expert recommendation if 'Barista Choice'), with exact dose in grams, water in ml, water temp in Celsius, ratio string (e.g., "1:16"), realistic total extraction time in seconds (e.g., 26-32s for Espresso, 150-195s for Pour-Over, 120-240s for Immersion), and 3 to 4 chronological extraction steps whose startSec/endSec cover 0 to totalTimeSeconds cleanly.
5. Set visualMood to 'milk' if a milk drink is central, 'cacao' if chocolaty/bold/nutty/dark-roasted, or 'floral' if fruity/floral/bright/tea-like.
6. Set brewMethod.category strictly to one of: 'Pour-Over', 'Espresso', 'Immersion', 'Cold Brew'.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are Kai, a world-champion specialty coffee barista and sensory roaster at a Tokyo-Nordic coffee bar. Your advice is crisp, tactile, trend-forward, scientifically accurate on extraction ratios, grind size, and milk chemistry, and completely practical for a home or craft bar setup.',
          responseMimeType: 'application/json',
          responseSchema: recipeSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response received from the AI barista.' });
        return;
      }

      const parsed = JSON.parse(rawText) as Omit<BaristaRecipe, 'id'>;
      const validSteps =
        Array.isArray(parsed.brewMethod?.steps) && parsed.brewMethod.steps.length > 0
          ? parsed.brewMethod.steps
          : [
              {
                label: 'Primary Extraction',
                startSec: 0,
                endSec: parsed.brewMethod?.totalTimeSeconds || 160,
                waterTargetMl: parsed.brewMethod?.waterMl || 250,
                instruction: 'Brew steadily to target weight and time.',
              },
            ];

      const recipe: BaristaRecipe = {
        ...parsed,
        id: `recipe-${Date.now()}`,
        brewMethod: {
          ...parsed.brewMethod,
          steps: validSteps,
        },
      };

      res.json({ recipe });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Follow-up Barista Chat
  app.post('/api/barista/chat', async (req: Request, res: Response) => {
    try {
      const { recipe, history, question } = req.body as {
        recipe?: BaristaRecipe;
        history?: BaristaChatMessage[];
        question?: string;
      };

      if (!question?.trim()) {
        res.status(400).json({ error: 'Please enter a question for the barista.' });
        return;
      }

      const ai = getAiClient();
      const contextSummary = recipe
        ? `Current crafted recipe: "${recipe.title}" using ${recipe.recommendedBean.origin} (${recipe.roastProfile.level}), brewed via ${recipe.brewMethod.methodName} (${recipe.brewMethod.doseGrams}g coffee, ${recipe.brewMethod.waterMl}ml water at ${recipe.brewMethod.waterTempC}°C, ${recipe.brewMethod.totalTimeSeconds}s), milk pairing: ${recipe.milkPairing.milkType}.`
        : 'No recipe selected yet.';

      const priorTranscript = (history ?? [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Guest' : 'Kai (Barista)'}: ${m.text}`)
        .join('\n');

      const prompt = `${contextSummary}\n\n${priorTranscript ? `Recent conversation:\n${priorTranscript}\n\n` : ''}Guest asks: ${question.trim()}\n\nRespond concisely in 2-4 practical sentences with actionable barista adjustments (grind clicks, temp tweaks, pour tempo, or milk steaming tips).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are Kai, an approachable, trend-savvy specialty barista. Keep answers under 90 words, concrete, sensory, and directly tied to extraction physics.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ reply: (response.text ?? '').trim() });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Community Experiments API
  app.get('/api/experiments', (_req: Request, res: Response) => {
    const items = readJsonFile<BrewExperiment[]>(EXPERIMENTS_FILE, STARTER_EXPERIMENTS);
    res.json({ experiments: items });
  });

  app.post('/api/experiments', (req: Request, res: Response) => {
    const body = req.body as Partial<BrewExperiment>;
    if (!body.title?.trim() || !body.tastingNotes?.trim()) {
      res.status(400).json({ error: 'Title and tasting notes are required.' });
      return;
    }

    const existing = readJsonFile<BrewExperiment[]>(EXPERIMENTS_FILE, STARTER_EXPERIMENTS);
    const created: BrewExperiment = {
      id: `exp-${Date.now()}`,
      title: body.title.trim(),
      author: body.author?.trim() || 'Guest Brewer',
      createdAt: new Date().toISOString(),
      category: body.category || 'Pour-Over',
      beanOrigin: body.beanOrigin?.trim() || 'House Single Origin',
      roastLevel: body.roastLevel?.trim() || 'Medium-Light',
      milkAlternative: body.milkAlternative?.trim() || 'Black (No Milk)',
      brewMethod: body.brewMethod?.trim() || 'Hario V60',
      doseGrams: Number(body.doseGrams) || 15,
      waterMl: Number(body.waterMl) || 250,
      waterTempC: Number(body.waterTempC) || 93,
      extractionSeconds: Number(body.extractionSeconds) || 165,
      tastingNotes: body.tastingNotes.trim(),
      likes: 1,
      recipeSnapshot: body.recipeSnapshot,
    };

    const updated = [created, ...existing];
    writeJsonFile(EXPERIMENTS_FILE, updated);
    res.status(201).json({ experiment: created });
  });

  app.post('/api/experiments/:id/like', (req: Request, res: Response) => {
    const { id } = req.params;
    const { delta } = req.body as { delta?: number };
    const change = delta === -1 ? -1 : 1;

    const existing = readJsonFile<BrewExperiment[]>(EXPERIMENTS_FILE, STARTER_EXPERIMENTS);
    const idx = existing.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }

    const updatedItem = {
      ...existing[idx],
      likes: Math.max(0, existing[idx].likes + change),
    };
    existing[idx] = updatedItem;
    writeJsonFile(EXPERIMENTS_FILE, existing);
    res.json({ experiment: updatedItem });
  });

  // Brew History & Favorites API
  app.get('/api/history', (_req: Request, res: Response) => {
    const entries = readJsonFile<BrewHistoryEntry[]>(HISTORY_FILE, STARTER_HISTORY);
    res.json({ history: entries });
  });

  app.post('/api/history', (req: Request, res: Response) => {
    const body = req.body as Partial<BrewHistoryEntry>;
    if (!body.title?.trim() || !body.recipe) {
      res.status(400).json({ error: 'Recipe title and details are required.' });
      return;
    }

    const existing = readJsonFile<BrewHistoryEntry[]>(HISTORY_FILE, STARTER_HISTORY);
    const entry: BrewHistoryEntry = {
      id: `hist-${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: body.title.trim(),
      beanOrigin: body.beanOrigin?.trim() || body.recipe.recommendedBean.origin,
      roastLevel: body.roastLevel?.trim() || body.recipe.roastProfile.level,
      milkAlternative: body.milkAlternative?.trim() || body.recipe.milkPairing.milkType,
      brewMethod: body.brewMethod?.trim() || body.recipe.brewMethod.methodName,
      doseGrams: Number(body.doseGrams) || body.recipe.brewMethod.doseGrams,
      waterMl: Number(body.waterMl) || body.recipe.brewMethod.waterMl,
      waterTempC: Number(body.waterTempC) || body.recipe.brewMethod.waterTempC,
      actualSeconds: Number(body.actualSeconds) || body.recipe.brewMethod.totalTimeSeconds,
      targetSeconds: Number(body.targetSeconds) || body.recipe.brewMethod.totalTimeSeconds,
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      notes: body.notes?.trim() || '',
      isFavorite: Boolean(body.isFavorite),
      recipe: body.recipe,
    };

    const updated = [entry, ...existing];
    writeJsonFile(HISTORY_FILE, updated);
    res.status(201).json({ entry });
  });

  app.patch('/api/history/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { isFavorite, rating, notes } = req.body as {
      isFavorite?: boolean;
      rating?: number;
      notes?: string;
    };

    const existing = readJsonFile<BrewHistoryEntry[]>(HISTORY_FILE, STARTER_HISTORY);
    const idx = existing.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'History entry not found.' });
      return;
    }

    const updatedEntry: BrewHistoryEntry = {
      ...existing[idx],
      isFavorite: typeof isFavorite === 'boolean' ? isFavorite : existing[idx].isFavorite,
      rating: typeof rating === 'number' ? Math.min(5, Math.max(1, rating)) : existing[idx].rating,
      notes: typeof notes === 'string' ? notes : existing[idx].notes,
    };
    existing[idx] = updatedEntry;
    writeJsonFile(HISTORY_FILE, existing);
    res.json({ entry: updatedEntry });
  });

  app.delete('/api/history/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = readJsonFile<BrewHistoryEntry[]>(HISTORY_FILE, STARTER_HISTORY);
    const filtered = existing.filter((item) => item.id !== id);
    writeJsonFile(HISTORY_FILE, filtered);
    res.json({ ok: true });
  });

  // Vite / Static Frontend Serving
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RubyCafe server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
