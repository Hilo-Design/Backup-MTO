import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers/app_providers.dart';
import '../services/ai_service.dart';
import '../services/svasth_service.dart';
import '../theme.dart';

const _quickQuestions = [
  'Is my portion okay?',
  'Can I add more chicken?',
  'Should I skip the rice?',
  'Is this good for iron?',
];

class AdvisorScreen extends ConsumerStatefulWidget {
  const AdvisorScreen({super.key});

  @override
  ConsumerState<AdvisorScreen> createState() => _AdvisorScreenState();
}

class _AdvisorScreenState extends ConsumerState<AdvisorScreen> {
  final _food = TextEditingController();
  final _portion = TextEditingController();
  final _question = TextEditingController();

  bool _asking = false;
  Map<String, dynamic>? _response;
  String? _error;

  @override
  void dispose() {
    _food.dispose();
    _portion.dispose();
    _question.dispose();
    super.dispose();
  }

  Future<void> _ask(PlanSettings plan) async {
    if (_question.text.trim().isEmpty || plan.isLimitReached) return;
    setState(() {
      _asking = true;
      _error = null;
    });

    try {
      final res = await ref.read(aiProvider).advisorCheck(
            date: ymd(DateTime.now()),
            question: _question.text.trim(),
            foodName: _food.text.trim(),
            portionDescription: _portion.text.trim(),
          );
      if (!mounted) return;
      setState(() {
        _response = res;
        _asking = false;
      });
      invalidateData(ref); // usage counter moved
    } on AiException catch (e) {
      if (!mounted) return;
      setState(() {
        _asking = false;
        _error = e.message;
      });
      if (e.isLimitReached) invalidateData(ref);
    }
  }

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(planProvider).valueOrNull ?? const PlanSettings.free();
    final dash = ref.watch(dashboardProvider).valueOrNull;

    return Scaffold(
      backgroundColor: C.background,
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              eyebrowText: 'सलाह',
              title: 'Your Meal Guide',
              leading: const Padding(
                padding: EdgeInsets.only(right: 6),
                child: Icon(Icons.auto_awesome, size: 16, color: C.secondary),
              ),
              trailing: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _remainingCard(dash),
                  const SizedBox(height: 16),
                  if (!plan.isPro) _usageLine(plan),
                  const SizedBox(height: 8),
                  if (plan.isLimitReached)
                    _limitCard()
                  else ...[
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _quickQuestions
                          .map((q) => GestureDetector(
                                onTap: () =>
                                    setState(() => _question.text = q),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: C.card,
                                    border: Border.all(color: C.cardBorder),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(q,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500)),
                                ),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 16),
                    SvCard(
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _food,
                                  decoration: const InputDecoration(
                                    labelText: 'Food (Optional)',
                                    hintText: 'e.g. Paneer Tikka',
                                    labelStyle: TextStyle(fontSize: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextField(
                                  controller: _portion,
                                  decoration: const InputDecoration(
                                    labelText: 'Portion (Optional)',
                                    hintText: 'e.g. 1 bowl',
                                    labelStyle: TextStyle(fontSize: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _question,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: "What's your question?",
                              hintText: 'Ask anything about your meal...',
                              labelStyle: TextStyle(fontSize: 12),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: FilledButton(
                              onPressed:
                                  (_asking || _question.text.trim().isEmpty)
                                      ? null
                                      : () => _ask(plan),
                              child: Text(_asking
                                  ? 'Asking Advisor...'
                                  : 'Ask Advisor'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!,
                        style: const TextStyle(color: C.destructive)),
                  ],
                  if (_response != null) ...[
                    const SizedBox(height: 16),
                    _responseCard(_response!),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _remainingCard(DashboardToday? d) {
    Widget col(String value, String caption) => Expanded(
          child: Column(
            children: [
              Text(value,
                  style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: C.primaryFg)),
              Text(caption.toUpperCase(),
                  style: TextStyle(
                      fontSize: 10,
                      color: C.primaryFg.withValues(alpha: 0.8),
                      letterSpacing: 0.8)),
            ],
          ),
        );

    final divider =
        Container(width: 1, height: 32, color: C.primaryFg.withValues(alpha: 0.2));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: C.primary,
        borderRadius: BorderRadius.circular(C.radius),
        boxShadow: C.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('REMAINING TODAY',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                  color: C.primaryFg.withValues(alpha: 0.9))),
          const SizedBox(height: 12),
          Row(
            children: [
              col('${(d?.calories.remaining ?? 0).round()}', 'Calories'),
              divider,
              col('${(d?.protein.remaining ?? 0).round()}g', 'Protein'),
              divider,
              col('${(d?.water.remaining ?? 0).round()}ml', 'Water'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _usageLine(PlanSettings p) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Free Plan',
              style: TextStyle(fontSize: 12, color: C.mutedFg)),
          Text(
            '${p.advisorUsageThisMonth.round()} of '
            '${p.advisorMonthlyLimit.round()} checks used',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: p.isLimitReached ? C.destructive : C.foreground,
            ),
          ),
        ],
      );

  Widget _limitCard() => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: C.card,
          border: Border.all(color: C.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(C.radius),
          boxShadow: C.shadowSm,
        ),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: C.secondary.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: C.secondary),
            ),
            const SizedBox(height: 12),
            Text('Monthly Limit Reached', style: serif(size: 18)),
            const SizedBox(height: 8),
            const Text(
              'Upgrade to Bas Pro for unlimited AI advisor checks and advanced '
              'personalized insights.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: C.mutedFg),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Payments are not wired up yet.')),
                ),
                child: const Text('Upgrade to Pro (₹299/mo)'),
              ),
            ),
          ],
        ),
      );

  Widget _responseCard(Map<String, dynamic> r) {
    final decision = r['decision'] as String? ?? 'adjust';
    final (bg, fg, icon, label) = switch (decision) {
      'go_ahead' => (
          const Color(0xFFF0FDF4),
          const Color(0xFF166534),
          Icons.check_circle_outline,
          'Go Ahead'
        ),
      'reduce_portion' => (
          const Color(0xFFFFFBEB),
          const Color(0xFF92400E),
          Icons.warning_amber_outlined,
          'Reduce Portion'
        ),
      'skip' => (
          const Color(0xFFFEF2F2),
          const Color(0xFF991B1B),
          Icons.error_outline,
          'Skip'
        ),
      _ => (
          const Color(0xFFEFF6FF),
          const Color(0xFF1E40AF),
          Icons.info_outline,
          'Adjust'
        ),
    };

    final tips = (r['tips'] as List?)?.cast<String>() ?? const <String>[];

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: C.card,
        border: Border.all(color: C.cardBorder),
        borderRadius: BorderRadius.circular(C.radius),
        boxShadow: C.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: bg,
            child: Row(
              children: [
                Icon(icon, size: 18, color: fg),
                const SizedBox(width: 8),
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: fg,
                      letterSpacing: 0.8),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${r['explanation']}',
                    style: const TextStyle(fontSize: 14, height: 1.5)),
                if (tips.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('TIPS', style: sectionHeading().copyWith(fontSize: 12)),
                  const SizedBox(height: 8),
                  ...tips.map((t) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ',
                                style: TextStyle(color: C.secondary)),
                            Expanded(
                                child: Text(t,
                                    style: const TextStyle(fontSize: 14))),
                          ],
                        ),
                      )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
