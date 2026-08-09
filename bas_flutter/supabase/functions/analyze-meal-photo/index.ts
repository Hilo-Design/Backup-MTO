import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import { askClaude, SAFETY_PREAMBLE } from '../_shared/claude.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { logConversation, readBody, requireUser, userClient } from '../_shared/supa.ts';

/** Claude's image input tops out around 5MB per image once base64-encoded. */
const MAX_IMAGE_BYTES = 3_500_000;

interface Body {
  meal_id?: string;
}

interface FoodItem {
  food_name: string;
  portion_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface Analysis {
  description: string;
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  confidence: 'low' | 'medium' | 'high';
  feedback: string;
}

const SCHEMA = {
  type: 'object',
  required: [
    'description',
    'items',
    'total_calories',
    'total_protein_g',
    'total_carbs_g',
    'total_fat_g',
    'total_fiber_g',
    'confidence',
    'feedback',
  ],
  properties: {
    description: {
      type: 'string',
      description: 'One sentence describing the plate as a whole.',
    },
    items: {
      type: 'array',
      description: 'Each distinct food visible. Combine trivial garnishes.',
      items: {
        type: 'object',
        required: [
          'food_name',
          'portion_size',
          'calories',
          'protein_g',
          'carbs_g',
          'fat_g',
          'fiber_g',
        ],
        properties: {
          food_name: { type: 'string' },
          portion_size: {
            type: 'string',
            description: 'Estimated portion, e.g. "1 cup", "150g", "2 slices".',
          },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
        },
      },
    },
    total_calories: { type: 'number' },
    total_protein_g: { type: 'number' },
    total_carbs_g: { type: 'number' },
    total_fat_g: { type: 'number' },
    total_fiber_g: { type: 'number' },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description:
        'How confident you are in the portion estimates. Obscured food, unknown oils, or mixed dishes mean low.',
    },
    feedback: {
      type: 'string',
      description:
        'Two or three sentences of coaching for this specific user, referencing their targets and what they have already eaten today. Concrete, not generic.',
    },
  },
} as const;

Deno.serve(serve(async (req) => {
  const supabase = userClient(req);
  const user = await requireUser(supabase);
  const { meal_id: mealId } = await readBody<Body>(req);

  if (!mealId) throw new HttpError(400, 'meal_id is required');

  // RLS means this returns nothing unless the meal belongs to the caller.
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .select('id, meal_date, meal_type, photo_url, notes')
    .eq('id', mealId)
    .maybeSingle();

  if (mealError) throw new HttpError(500, mealError.message);
  if (!meal) throw new HttpError(404, 'Meal not found');
  if (!meal.photo_url) throw new HttpError(400, 'Meal has no photo');

  // Context so the coaching is about this user rather than a generic plate.
  const [{ data: profile }, { data: targets }, { data: sameDayMeals }] =
    await Promise.all([
      supabase
        .from('health_profiles')
        .select(
          'age, gender, height_cm, goal_weight_kg, primary_goal, dietary_restrictions, health_conditions',
        )
        .maybeSingle(),
      supabase
        .from('nutrition_targets')
        .select(
          'target_calories, target_protein_g, target_carbs_g, target_fat_g, target_fiber_g',
        )
        .maybeSingle(),
      supabase
        .from('meals')
        .select('meal_type, total_calories, total_protein_g, total_fiber_g')
        .eq('meal_date', meal.meal_date)
        .neq('id', mealId),
    ]);

  // photo_url holds an object path in a private bucket, so mint a short link.
  const { data: signed, error: signError } = await supabase.storage
    .from('meal_photos')
    .createSignedUrl(meal.photo_url, 120);

  if (signError || !signed) {
    throw new HttpError(500, `Could not read meal photo: ${signError?.message}`);
  }

  const imageRes = await fetch(signed.signedUrl);
  if (!imageRes.ok) throw new HttpError(500, 'Could not download meal photo');

  const blob = await imageRes.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new HttpError(
      413,
      'Photo is too large to analyse. Re-upload at a lower quality.',
    );
  }

  const mediaType = blob.type && blob.type.startsWith('image/')
    ? blob.type
    : 'image/jpeg';

  const context = {
    meal_type: meal.meal_type,
    user_note: meal.notes,
    profile,
    daily_targets: targets,
    already_eaten_today: sameDayMeals ?? [],
  };

  const { data: analysis, tokens } = await askClaude<Analysis>({
    system: `${SAFETY_PREAMBLE}

You are estimating nutrition from a photograph. Portion estimation from a
single image is inherently imprecise — say so via the confidence field rather
than projecting false accuracy. Prefer round numbers. Assume normal home
cooking oils and preparation unless the photo says otherwise.`,
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: encodeBase64(bytes) },
      },
      {
        type: 'text',
        text:
          `Analyse this meal and give coaching for this user.\n\nContext:\n${
            JSON.stringify(context, null, 2)
          }`,
      },
    ],
    toolName: 'record_meal_analysis',
    toolDescription: 'Record the nutritional breakdown and coaching feedback.',
    schema: SCHEMA,
    maxTokens: 2048,
  });

  const { error: updateError } = await supabase
    .from('meals')
    .update({
      ai_analysis: analysis,
      total_calories: analysis.total_calories,
      total_protein_g: analysis.total_protein_g,
      total_carbs_g: analysis.total_carbs_g,
      total_fat_g: analysis.total_fat_g,
      total_fiber_g: analysis.total_fiber_g,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mealId);

  if (updateError) throw new HttpError(500, updateError.message);

  // Replace rather than append, so re-analysing doesn't double-count.
  await supabase.from('food_items').delete().eq('meal_id', mealId);

  if (analysis.items?.length) {
    const { error: itemsError } = await supabase.from('food_items').insert(
      analysis.items.map((item) => ({ meal_id: mealId, ...item })),
    );
    if (itemsError) console.error('food_items insert failed:', itemsError.message);
  }

  await logConversation(supabase, user.id, {
    triggerType: 'meal_analysis',
    triggerContext: { meal_id: mealId, meal_type: meal.meal_type },
    response: analysis.feedback,
    tokens,
  });

  return json({ meal_id: mealId, analysis });
}));
