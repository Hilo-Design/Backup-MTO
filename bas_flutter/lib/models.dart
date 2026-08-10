/// Plain models over the Svasth schema. Numeric columns are `real` in Postgres
/// and arrive as num, so everything reads through [_d] to avoid int/double
/// surprises when a value round-trips as `7` instead of `7.0`.
double? _d(Object? v) => v == null ? null : (v as num).toDouble();

class DailyLog {
  DailyLog.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String?,
        date = m['date'] as String,
        calories = _d(m['calories']),
        protein = _d(m['protein']),
        carbs = _d(m['carbs']),
        fat = _d(m['fat']),
        fiber = _d(m['fiber']),
        water = _d(m['water']),
        weight = _d(m['weight']),
        steps = _d(m['steps']),
        workoutMinutes = _d(m['workout_minutes']),
        workoutType = m['workout_type'] as String?,
        sleepHours = _d(m['sleep_hours']),
        reflux = _d(m['reflux']),
        postMealSleepiness = _d(m['post_meal_sleepiness']),
        energy = _d(m['energy']),
        headache = _d(m['headache']),
        stress = _d(m['stress']),
        muscleStiffness = _d(m['muscle_stiffness']),
        bowelMovement = m['bowel_movement'] as String?,
        hungerBeforeLunch = _d(m['hunger_before_lunch']),
        hungerBeforeDinner = _d(m['hunger_before_dinner']),
        hungerBeforeBed = _d(m['hunger_before_bed']),
        notes = m['notes'] as String?;

  final String? id;
  final String date;
  final double? calories, protein, carbs, fat, fiber, water;
  final double? weight, steps, workoutMinutes, sleepHours;
  final String? workoutType;
  final double? reflux, postMealSleepiness, energy, headache, stress;
  final double? muscleStiffness;
  final String? bowelMovement;
  final double? hungerBeforeLunch, hungerBeforeDinner, hungerBeforeBed;
  final String? notes;
}

class FoodItem {
  FoodItem.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String?,
        name = m['name'] as String? ?? '',
        portion = _d(m['portion']),
        unit = m['unit'] as String?,
        calories = _d(m['calories']),
        protein = _d(m['protein']),
        carbs = _d(m['carbs']),
        fat = _d(m['fat']),
        fiber = _d(m['fiber']);

  final String? id;
  final String name;
  final double? portion, calories, protein, carbs, fat, fiber;
  final String? unit;
}

class Meal {
  Meal.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        date = m['date'] as String,
        mealType = m['meal_type'] as String? ?? '',
        time = m['time'] as String?,
        totalCalories = _d(m['total_calories']),
        totalProtein = _d(m['total_protein']),
        totalCarbs = _d(m['total_carbs']),
        totalFat = _d(m['total_fat']),
        totalFiber = _d(m['total_fiber']),
        notes = m['notes'] as String?,
        photoUrl = m['photo_url'] as String?,
        foodItems = ((m['food_items'] as List?) ?? const [])
            .map((e) => FoodItem.fromMap(e as Map<String, dynamic>))
            .toList();

  final String id;
  final String date;
  final String mealType;
  final String? time, notes, photoUrl;
  final double? totalCalories, totalProtein, totalCarbs, totalFat, totalFiber;
  final List<FoodItem> foodItems;
}

class Targets {
  Targets.fromMap(Map<String, dynamic> m)
      : calories = _d(m['calories_target']) ?? 1800,
        protein = _d(m['protein_target']) ?? 100,
        carbs = _d(m['carbs_target']) ?? 200,
        fat = _d(m['fat_target']),
        fiber = _d(m['fiber_target']) ?? 25,
        water = _d(m['water_target']) ?? 2500,
        steps = _d(m['steps_target']);

  /// Server-side fallbacks from dashboard.ts, used when no row exists.
  const Targets.defaults()
      : calories = 1800,
        protein = 100,
        carbs = 200,
        fat = 60,
        fiber = 25,
        water = 2500,
        steps = 8000;

  final double calories, protein, carbs, fiber, water;
  final double? fat, steps;
}

class HealthProfile {
  HealthProfile.fromMap(Map<String, dynamic> m)
      : ferritin = _d(m['ferritin']),
        hemoglobin = _d(m['hemoglobin']),
        vitaminB12 = _d(m['vitamin_b12']),
        vitaminD = _d(m['vitamin_d']),
        hba1c = _d(m['hba1c']),
        totalCholesterol = _d(m['total_cholesterol']),
        ldl = _d(m['ldl']),
        hdl = _d(m['hdl']),
        triglycerides = _d(m['triglycerides']),
        labDate = m['lab_date'] as String?,
        notes = m['notes'] as String?;

  const HealthProfile.empty()
      : ferritin = null,
        hemoglobin = null,
        vitaminB12 = null,
        vitaminD = null,
        hba1c = null,
        totalCholesterol = null,
        ldl = null,
        hdl = null,
        triglycerides = null,
        labDate = null,
        notes = null;

  final double? ferritin, hemoglobin, vitaminB12, vitaminD, hba1c;
  final double? totalCholesterol, ldl, hdl, triglycerides;
  final String? labDate, notes;
}

class PlanSettings {
  PlanSettings.fromMap(Map<String, dynamic> m)
      : plan = m['plan'] as String? ?? 'free',
        advisorUsageThisMonth = _d(m['advisor_usage_this_month']) ?? 0,
        advisorMonthlyLimit = _d(m['advisor_monthly_limit']) ?? 5,
        betaProAccess = m['beta_pro_access'] as bool? ?? false,
        renewalDate = m['renewal_date'] as String?,
        advisorModel = m['advisor_model'] as String? ?? 'claude-haiku-4-5',
        visionModel = m['vision_model'] as String? ?? 'claude-sonnet-5';

  const PlanSettings.free()
      : plan = 'free',
        advisorUsageThisMonth = 0,
        advisorMonthlyLimit = 5,
        betaProAccess = false,
        renewalDate = null,
        advisorModel = 'claude-haiku-4-5',
        visionModel = 'claude-sonnet-5';

  final String plan;
  final double advisorUsageThisMonth, advisorMonthlyLimit;
  final bool betaProAccess;
  final String? renewalDate;

  /// Which Claude model each feature uses. Cheap by default for the advisor,
  /// stronger for photo analysis where portion estimation actually suffers.
  final String advisorModel;
  final String visionModel;

  bool get isPro => plan == 'pro' || betaProAccess;
  bool get isLimitReached => !isPro && advisorUsageThisMonth >= advisorMonthlyLimit;
}

/// One macro's progress, mirroring the `{consumed, target, remaining, pct}`
/// objects the Svasth dashboard endpoint returns.
class Progress {
  Progress(this.consumed, this.target);

  final double consumed;
  final double target;

  double get remaining => (target - consumed).clamp(0, double.infinity);
  double get fraction => target <= 0 ? 0 : (consumed / target).clamp(0.0, 1.0);
}

class DashboardToday {
  DashboardToday({
    required this.date,
    required this.dailyLog,
    required this.targets,
    required this.meals,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fiber,
    required this.water,
  });

  final String date;
  final DailyLog? dailyLog;
  final Targets targets;
  final List<Meal> meals;
  final Progress calories, protein, carbs, fiber, water;
}

class StreakInfo {
  StreakInfo(this.current, this.longest, this.totalDays);

  final int current, longest, totalDays;
}

/// One bucketed week for the Trends page.
class WeekPoint {
  WeekPoint(this.weekStart, this.label, this.values);

  final DateTime weekStart;
  final String label; // "MMM d"
  final Map<String, double?> values;
}
