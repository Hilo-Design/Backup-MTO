import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers/app_providers.dart';
import '../theme.dart';
import '../widgets/progress_rings.dart';
import 'shell.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({
    required this.onOpenLog,
    required this.onOpenMeals,
    super.key,
  });

  final VoidCallback onOpenLog;
  final VoidCallback onOpenMeals;

  static const _slots = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(dashboardProvider);
    final streak = ref.watch(streakProvider);

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () async => invalidateData(ref),
          child: dash.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(
              padding: const EdgeInsets.all(24),
              children: [Text('Could not load your day: $e')],
            ),
            data: (d) => ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
              children: [
                _header(streak.valueOrNull),
                const SizedBox(height: 24),
                _rings(d),
                const SizedBox(height: 24),
                SvCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      ProgressBarRow(
                        label: 'Carbs (g)',
                        value: d.carbs.consumed,
                        max: d.carbs.target,
                        color: C.primary.withValues(alpha: 0.8),
                      ),
                      const SizedBox(height: 16),
                      ProgressBarRow(
                        label: 'Fiber (g)',
                        value: d.fiber.consumed,
                        max: d.fiber.target,
                        color: C.secondary,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('Meals', style: serif(size: 18)),
                const SizedBox(height: 12),
                _mealGrid(d),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Today's Log", style: serif(size: 18)),
                    GestureDetector(
                      onTap: onOpenLog,
                      child: const Text(
                        'Edit',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: C.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _statTiles(d.dailyLog),
                const SizedBox(height: 24),
                _advisorCard(context),
              ],
            ),
          ),
        ),
        Positioned(
          right: 20,
          bottom: 16,
          child: FloatingActionButton(
            onPressed: onOpenLog,
            backgroundColor: C.primary,
            foregroundColor: C.primaryFg,
            shape: const CircleBorder(),
            child: const Icon(Icons.add, size: 24),
          ),
        ),
      ],
    );
  }

  Widget _header(StreakInfo? streak) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('आज का सारांश', style: eyebrow()),
                const SizedBox(height: 4),
                Text('नमस्ते', style: serif(size: 24)),
                Text(
                  DateFormat('EEEE, MMMM d').format(DateTime.now()),
                  style: const TextStyle(fontSize: 14, color: C.mutedFg),
                ),
              ],
            ),
          ),
          if (streak != null && streak.current > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: C.card,
                border: Border.all(color: C.cardBorder),
                borderRadius: BorderRadius.circular(999),
                boxShadow: C.shadowXs,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.local_fire_department,
                      size: 16, color: C.flame),
                  const SizedBox(width: 6),
                  Text(
                    '${streak.current} Day',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
        ],
      );

  Widget _rings(DashboardToday d) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          CircularProgress(
            value: d.calories.consumed,
            max: d.calories.target,
            label: 'Calories',
            sublabel: 'kcal',
            color: C.primary,
            size: 140,
          ),
          Column(
            children: [
              CircularProgress(
                value: d.protein.consumed,
                max: d.protein.target,
                label: 'Protein',
                sublabel: 'g',
                color: C.secondary,
                size: 90,
                strokeWidth: 8,
              ),
              const SizedBox(height: 16),
              CircularProgress(
                value: d.water.consumed,
                max: d.water.target,
                label: 'Water',
                sublabel: 'ml',
                color: C.water,
                size: 90,
                strokeWidth: 8,
              ),
            ],
          ),
        ],
      );

  Widget _mealGrid(DashboardToday d) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.9,
        children: _slots.map((slot) {
          final meal = d.meals
              .where((m) => m.mealType.toLowerCase() == slot.toLowerCase())
              .firstOrNull;
          return SvCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  slot.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: C.mutedFg,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 8),
                if (meal != null) ...[
                  Text(
                    '${(meal.totalCalories ?? 0).round()} kcal',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '${(meal.totalProtein ?? 0).round()}g protein',
                    style: const TextStyle(fontSize: 12, color: C.mutedFg),
                  ),
                ] else
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: TextButton.icon(
                      onPressed: onOpenMeals,
                      style: TextButton.styleFrom(
                        foregroundColor: C.primary,
                        backgroundColor: C.primary.withValues(alpha: 0.05),
                        padding: EdgeInsets.zero,
                      ),
                      icon: const Icon(Icons.add, size: 12),
                      label: const Text('Add',
                          style: TextStyle(fontSize: 12)),
                    ),
                  ),
              ],
            ),
          );
        }).toList(),
      );

  Widget _statTiles(DailyLog? log) {
    Widget tile(String label, String value, String unit) => Expanded(
          child: SvCard(
            padding: const EdgeInsets.all(12),
            radius: 12,
            child: Column(
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(fontSize: 10, color: C.mutedFg),
                ),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: value,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      TextSpan(
                        text: unit,
                        style: const TextStyle(fontSize: 12, color: C.mutedFg),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );

    // Svasth used `||` here, so a genuine 0 rendered as "-". Kept: a 0 energy
    // score is almost always "not filled in" rather than a real reading.
    String v(double? x) => (x == null || x == 0) ? '-' : x.round().toString();

    return Row(
      children: [
        tile('Energy', v(log?.energy), '/10'),
        const SizedBox(width: 8),
        tile('Reflux', v(log?.reflux), '/10'),
        const SizedBox(width: 8),
        tile('Sleep', v(log?.sleepHours), 'hrs'),
      ],
    );
  }

  Widget _advisorCard(BuildContext context) => GestureDetector(
        onTap: () => openAdvisor(context),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                C.secondary.withValues(alpha: 0.10),
                C.primary.withValues(alpha: 0.10),
              ],
            ),
            border: Border.all(color: C.primary.withValues(alpha: 0.2)),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome, color: C.secondary, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Your Meal Guide', style: serif(size: 16)),
                    const Text(
                      'Ask about a meal before you eat it',
                      style: TextStyle(fontSize: 12, color: C.mutedFg),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: C.mutedFg),
            ],
          ),
        ),
      );
}
