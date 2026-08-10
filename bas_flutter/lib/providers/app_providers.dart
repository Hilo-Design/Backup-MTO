import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../services/ai_service.dart';
import '../services/svasth_service.dart';
import 'auth_provider.dart';

final svasthProvider =
    Provider<SvasthService>((ref) => SvasthService(ref.watch(supabaseProvider)));

final aiProvider =
    Provider<AiService>((ref) => AiService(ref.watch(supabaseProvider)));

/// Bumped after any write so dependent screens refetch. Cheap stand-in for
/// React Query's invalidation, which Svasth relied on heavily.
final refreshTick = StateProvider<int>((ref) => 0);

void invalidateData(WidgetRef ref) =>
    ref.read(refreshTick.notifier).state++;

final dashboardProvider = FutureProvider<DashboardToday>((ref) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getDashboardToday();
});

final streakProvider = FutureProvider<StreakInfo>((ref) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getStreak();
});

final planProvider = FutureProvider<PlanSettings>((ref) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getPlan();
});

final targetsProvider = FutureProvider<Targets>((ref) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getTargets();
});

final healthProfileProvider = FutureProvider<HealthProfile>((ref) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getHealthProfile();
});

final mealsProvider =
    FutureProvider.family<List<Meal>, String>((ref, date) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getMeals(date);
});

final dailyLogProvider =
    FutureProvider.family<DailyLog?, String>((ref, date) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getDailyLog(date);
});

final trendsProvider =
    FutureProvider.family<List<WeekPoint>, int>((ref, weeks) {
  ref.watch(refreshTick);
  return ref.watch(svasthProvider).getWeeklyTrends(weeks);
});
