import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../models.dart';

String ymd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-'
    '${d.month.toString().padLeft(2, '0')}-'
    '${d.day.toString().padLeft(2, '0')}';

/// Data layer over the Svasth schema.
///
/// Svasth's Express server computed the dashboard, streak and weekly buckets
/// server-side. With Supabase there is no such layer, so those computations
/// live here — but the semantics are ported exactly, with two deliberate
/// fixes noted at their call sites.
class SvasthService {
  SvasthService(this.db);

  final SupabaseClient db;

  String get _uid => db.auth.currentUser!.id;

  // ── daily logs ──────────────────────────────────────────────────────────
  Future<DailyLog?> getDailyLog(String date) async {
    final row = await db
        .from('daily_logs')
        .select()
        .eq('user_id', _uid)
        .eq('date', date)
        .maybeSingle();
    return row == null ? null : DailyLog.fromMap(row);
  }

  /// Upsert on (user_id, date) — Svasth's POST and PATCH both upsert so the UI
  /// never distinguishes create from update.
  Future<DailyLog> saveDailyLog(String date, Map<String, dynamic> fields) async {
    final row = await db
        .from('daily_logs')
        .upsert(
          {
            'user_id': _uid,
            'date': date,
            ...fields,
            'updated_at': DateTime.now().toIso8601String(),
          },
          onConflict: 'user_id,date',
        )
        .select()
        .single();
    return DailyLog.fromMap(row);
  }

  Future<List<DailyLog>> getDailyLogsBetween(String start, String end) async {
    final rows = await db
        .from('daily_logs')
        .select()
        .eq('user_id', _uid)
        .gte('date', start)
        .lte('date', end)
        .order('date');
    return (rows as List)
        .map((e) => DailyLog.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  // ── meals ───────────────────────────────────────────────────────────────
  Future<List<Meal>> getMeals(String date) async {
    final rows = await db
        .from('meals')
        .select('*, food_items(*)')
        .eq('user_id', _uid)
        .eq('date', date)
        .order('created_at');
    return (rows as List)
        .map((e) => Meal.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  /// Creates the meal and its items. Mirrors the server behaviour: when totals
  /// were not supplied but items were, the totals are summed from the items.
  Future<String> createMeal({
    required String date,
    required String mealType,
    String? notes,
    String? photoUrl,
    double? totalCalories,
    double? totalProtein,
    double? totalCarbs,
    double? totalFat,
    double? totalFiber,
    List<Map<String, dynamic>> foodItems = const [],
  }) async {
    final now = DateTime.now();
    final meal = await db
        .from('meals')
        .insert({
          'user_id': _uid,
          'date': date,
          'meal_type': mealType,
          'time':
              '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
          'notes': notes,
          'photo_url': photoUrl,
          'total_calories': totalCalories,
          'total_protein': totalProtein,
          'total_carbs': totalCarbs,
          'total_fat': totalFat,
          'total_fiber': totalFiber,
        })
        .select('id')
        .single();

    final mealId = meal['id'] as String;

    if (foodItems.isNotEmpty) {
      await db.from('food_items').insert(
            foodItems.map((f) => {...f, 'meal_id': mealId}).toList(),
          );

      if (totalCalories == null) {
        double sum(String k) => foodItems.fold<double>(
              0,
              (a, f) => a + ((f[k] as num?)?.toDouble() ?? 0),
            );
        await db.from('meals').update({
          'total_calories': sum('calories'),
          'total_protein': sum('protein'),
          'total_carbs': sum('carbs'),
          'total_fat': sum('fat'),
          'total_fiber': sum('fiber'),
        }).eq('id', mealId);
      }
    }
    return mealId;
  }

  Future<void> deleteMeal(String id) async =>
      db.from('meals').delete().eq('id', id);

  Future<void> addFoodItem(String mealId, Map<String, dynamic> item) async {
    await db.from('food_items').insert({...item, 'meal_id': mealId});
    await _recomputeMealTotals(mealId);
  }

  Future<void> deleteFoodItem(String id, String mealId) async {
    await db.from('food_items').delete().eq('id', id);
    await _recomputeMealTotals(mealId);
  }

  /// Svasth only summed totals at meal-creation time, so adding an item later
  /// silently left the totals stale and the dashboard under-counted. Fixed.
  Future<void> _recomputeMealTotals(String mealId) async {
    final rows = await db
        .from('food_items')
        .select('calories, protein, carbs, fat, fiber')
        .eq('meal_id', mealId);

    double sum(String k) => (rows as List).fold<double>(
          0,
          (a, r) => a + (((r as Map)[k] as num?)?.toDouble() ?? 0),
        );

    await db.from('meals').update({
      'total_calories': sum('calories'),
      'total_protein': sum('protein'),
      'total_carbs': sum('carbs'),
      'total_fat': sum('fat'),
      'total_fiber': sum('fiber'),
    }).eq('id', mealId);
  }

  Future<String> uploadMealPhoto(Uint8List bytes, {String contentType = 'image/jpeg'}) async {
    final ext = contentType.split('/').last.replaceAll('jpeg', 'jpg');
    final path = '$_uid/${DateTime.now().millisecondsSinceEpoch}.$ext';
    await db.storage.from('meal_photos').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: contentType),
        );
    return path;
  }

  Future<String> signedPhotoUrl(String path, {int expiresIn = 3600}) =>
      db.storage.from('meal_photos').createSignedUrl(path, expiresIn);

  // ── targets ─────────────────────────────────────────────────────────────
  Future<Targets> getTargets() async {
    final row =
        await db.from('targets').select().eq('user_id', _uid).maybeSingle();
    return row == null ? const Targets.defaults() : Targets.fromMap(row);
  }

  Future<void> saveTargets(Map<String, dynamic> fields) async {
    await db.from('targets').upsert(
      {
        'user_id': _uid,
        ...fields,
        'updated_at': DateTime.now().toIso8601String(),
      },
      onConflict: 'user_id',
    );
  }

  // ── lab values ──────────────────────────────────────────────────────────
  Future<HealthProfile> getHealthProfile() async {
    final row = await db
        .from('health_profile')
        .select()
        .eq('user_id', _uid)
        .maybeSingle();
    return row == null ? const HealthProfile.empty() : HealthProfile.fromMap(row);
  }

  Future<void> saveHealthProfile(Map<String, dynamic> fields) async {
    await db.from('health_profile').upsert(
      {
        'user_id': _uid,
        ...fields,
        'updated_at': DateTime.now().toIso8601String(),
      },
      onConflict: 'user_id',
    );
  }

  // ── plan ────────────────────────────────────────────────────────────────
  Future<PlanSettings> getPlan() async {
    final row = await db
        .from('plan_settings')
        .select()
        .eq('user_id', _uid)
        .maybeSingle();
    return row == null ? const PlanSettings.free() : PlanSettings.fromMap(row);
  }

  /// Only the two model columns are writable by the user; a database trigger
  /// reverts any attempt to change plan, quota or Stripe fields.
  Future<void> saveModelPreferences({
    required String advisorModel,
    required String visionModel,
  }) async {
    await db
        .from('plan_settings')
        .update({
          'advisor_model': advisorModel,
          'vision_model': visionModel,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('user_id', _uid);
  }

  // ── dashboard ───────────────────────────────────────────────────────────
  /// Svasth's server used `new Date().toISOString().slice(0,10)` — UTC — while
  /// its client used local time, so "today" disagreed between 00:00 and 05:30
  /// IST. We use local time throughout, which is what an Indian user means.
  Future<DashboardToday> getDashboardToday([DateTime? when]) async {
    final date = ymd(when ?? DateTime.now());
    final results = await Future.wait([
      getDailyLog(date),
      getTargets(),
      getMeals(date),
    ]);

    final log = results[0] as DailyLog?;
    final t = results[1] as Targets;
    final meals = results[2] as List<Meal>;

    // Macros come from the meals; if those are all zero, fall back to the
    // manually entered daily-log totals. Water always comes from the log.
    double mealSum(double? Function(Meal) f) =>
        meals.fold<double>(0, (a, m) => a + (f(m) ?? 0));

    double pick(double fromMeals, double? fromLog) =>
        fromMeals != 0 ? fromMeals : (fromLog ?? 0);

    return DashboardToday(
      date: date,
      dailyLog: log,
      targets: t,
      meals: meals,
      calories:
          Progress(pick(mealSum((m) => m.totalCalories), log?.calories), t.calories),
      protein:
          Progress(pick(mealSum((m) => m.totalProtein), log?.protein), t.protein),
      carbs: Progress(pick(mealSum((m) => m.totalCarbs), log?.carbs), t.carbs),
      fiber: Progress(pick(mealSum((m) => m.totalFiber), log?.fiber), t.fiber),
      water: Progress(log?.water ?? 0, t.water),
    );
  }

  /// Streak semantics ported from dashboard.ts: walk back day by day from
  /// today and stop at the first missing log.
  ///
  /// One deliberate change — Svasth broke the streak the moment today had no
  /// entry, so every user saw 0 until they logged. Here, if today is missing
  /// we start counting from yesterday, which is how streaks are normally read.
  Future<StreakInfo> getStreak() async {
    final rows = await db
        .from('daily_logs')
        .select('date')
        .eq('user_id', _uid)
        .order('date');

    final dates = (rows as List)
        .map((r) => DateTime.parse((r as Map)['date'] as String))
        .toList();
    if (dates.isEmpty) return StreakInfo(0, 0, 0);

    final set = dates.map(ymd).toSet();

    var cursor = DateTime.now();
    if (!set.contains(ymd(cursor))) {
      cursor = cursor.subtract(const Duration(days: 1));
    }
    var current = 0;
    while (set.contains(ymd(cursor)) && current < 365) {
      current++;
      cursor = cursor.subtract(const Duration(days: 1));
    }

    var longest = 1;
    var run = 1;
    for (var i = 1; i < dates.length; i++) {
      final gap = dates[i].difference(dates[i - 1]).inDays;
      run = gap == 1 ? run + 1 : 1;
      if (run > longest) longest = run;
    }

    return StreakInfo(current, longest, dates.length);
  }

  // ── trends ──────────────────────────────────────────────────────────────
  /// Buckets daily logs into ISO weeks (Monday start) and averages each
  /// metric, ignoring nulls — a week with no readings for a metric yields null
  /// so the chart shows a gap rather than a misleading zero.
  Future<List<WeekPoint>> getWeeklyTrends(int weeks) async {
    final end = DateTime.now();
    final start = end.subtract(Duration(days: weeks * 7));
    final logs = await getDailyLogsBetween(ymd(start), ymd(end));

    final buckets = <String, List<DailyLog>>{};
    for (final l in logs) {
      final d = DateTime.parse(l.date);
      final monday = d.subtract(Duration(days: (d.weekday - 1) % 7));
      buckets.putIfAbsent(ymd(monday), () => []).add(l);
    }

    double? avg(List<DailyLog> ls, double? Function(DailyLog) f) {
      final vals = ls.map(f).whereType<double>().toList();
      if (vals.isEmpty) return null;
      return vals.reduce((a, b) => a + b) / vals.length;
    }

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    final keys = buckets.keys.toList()..sort();
    return keys.map((k) {
      final ls = buckets[k]!;
      final d = DateTime.parse(k);
      return WeekPoint(d, '${months[d.month - 1]} ${d.day}', {
        'calories': avg(ls, (l) => l.calories),
        'protein': avg(ls, (l) => l.protein),
        'weight': avg(ls, (l) => l.weight),
        'energy': avg(ls, (l) => l.energy),
        'steps': avg(ls, (l) => l.steps),
      });
    }).toList();
  }

  // ── CSV export ──────────────────────────────────────────────────────────
  static String _csvCell(Object? v) {
    if (v == null) return '';
    final s = '$v';
    return RegExp(r'[,"\n]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
  }

  /// Same 23 columns, in the same order, as Svasth's /export/daily-logs.
  Future<String> exportDailyLogsCsv({int days = 30}) async {
    final end = DateTime.now();
    final logs = await getDailyLogsBetween(
      ymd(end.subtract(Duration(days: days))),
      ymd(end),
    );

    const header = [
      'date', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'water',
      'weight', 'steps', 'workout_minutes', 'workout_type', 'sleep_hours',
      'reflux', 'post_meal_sleepiness', 'energy', 'headache', 'stress',
      'bowel_movement', 'hunger_before_lunch', 'hunger_before_dinner',
      'hunger_before_bed', 'muscle_stiffness', 'notes',
    ];

    final rows = logs.map((l) => [
          l.date, l.calories, l.protein, l.carbs, l.fat, l.fiber, l.water,
          l.weight, l.steps, l.workoutMinutes, l.workoutType, l.sleepHours,
          l.reflux, l.postMealSleepiness, l.energy, l.headache, l.stress,
          l.bowelMovement, l.hungerBeforeLunch, l.hungerBeforeDinner,
          l.hungerBeforeBed, l.muscleStiffness, l.notes,
        ].map(_csvCell).join(','));

    return [header.join(','), ...rows].join('\n');
  }

  /// Same 11 columns as Svasth's /export/meals, including the joined
  /// `food_items` cell in `Name (portionunit); Name (portionunit)` form.
  Future<String> exportMealsCsv({int days = 30}) async {
    final end = DateTime.now();
    final rows = await db
        .from('meals')
        .select('*, food_items(*)')
        .eq('user_id', _uid)
        .gte('date', ymd(end.subtract(Duration(days: days))))
        .lte('date', ymd(end))
        .order('date')
        .order('created_at');

    final meals = (rows as List)
        .map((e) => Meal.fromMap(e as Map<String, dynamic>))
        .toList();

    const header = [
      'date', 'meal_type', 'time', 'total_calories', 'total_protein',
      'total_carbs', 'total_fat', 'total_fiber', 'notes',
      'post_meal_sleepiness', 'food_items',
    ];

    final lines = meals.map((m) {
      final items = m.foodItems
          .map((f) => f.portion == null
              ? f.name
              : '${f.name} (${_num(f.portion)}${f.unit ?? ''})')
          .join('; ');
      return [
        m.date, m.mealType, m.time, m.totalCalories, m.totalProtein,
        m.totalCarbs, m.totalFat, m.totalFiber, m.notes, null, items,
      ].map(_csvCell).join(',');
    });

    return [header.join(','), ...lines].join('\n');
  }

  static String _num(double? v) {
    if (v == null) return '';
    return v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  }
}
