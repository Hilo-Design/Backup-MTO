import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers/app_providers.dart';
import '../theme.dart';

/// The five metrics Svasth actually charts (its docs claimed eight).
const _charts = [
  (key: 'calories', title: 'Calories (avg/day)', unit: 'kcal', area: true, color: C.primary),
  (key: 'protein', title: 'Protein (avg/day)', unit: 'g', area: true, color: C.secondary),
  (key: 'weight', title: 'Weight Trend', unit: 'kg', area: false, color: C.chartWeight),
  (key: 'energy', title: 'Energy Levels (0-10)', unit: '/10', area: false, color: C.chartEnergy),
  (key: 'steps', title: 'Daily Steps (avg)', unit: 'steps', area: true, color: C.chartSteps),
];

class TrendsScreen extends ConsumerStatefulWidget {
  const TrendsScreen({super.key});

  @override
  ConsumerState<TrendsScreen> createState() => _TrendsScreenState();
}

class _TrendsScreenState extends ConsumerState<TrendsScreen> {
  int _weeks = 4;

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(planProvider).valueOrNull ?? const PlanSettings.free();
    final data = ref.watch(trendsProvider(_weeks));

    return Column(
      children: [
        PageHeader(
          eyebrowText: 'रुझान',
          title: 'Trends',
          trailing: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: C.muted,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                _segment('4 Weeks', _weeks == 4, () => setState(() => _weeks = 4)),
                _segment(
                  '12 Weeks',
                  _weeks == 12,
                  () {
                    if (plan.isPro) {
                      setState(() => _weeks = 12);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content:
                              Text('Upgrade to Pro to see 12-week trends.'),
                        ),
                      );
                    }
                  },
                  showPro: !plan.isPro,
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: data.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Could not load trends: $e')),
            data: (weeks) {
              if (weeks.isEmpty) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: Text(
                      'Not enough data to show trends yet.',
                      style: TextStyle(color: C.mutedFg),
                    ),
                  ),
                );
              }
              final latest = weeks.last;
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _summaryTile(
                          'AVG CALORIES',
                          (latest.values['calories'] ?? 0).round().toString(),
                          'kcal',
                          C.primary,
                          C.primaryFg,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _summaryTile(
                          'AVG PROTEIN',
                          (latest.values['protein'] ?? 0).round().toString(),
                          'g',
                          C.secondary,
                          C.secondaryFg,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  ..._charts.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: _chartCard(c, weeks),
                      )),
                  if (!plan.isPro) _upsell(),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _segment(String label, bool active, VoidCallback onTap,
      {bool showPro = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: active ? C.background : null,
          borderRadius: BorderRadius.circular(8),
          boxShadow: active ? C.shadowXs : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: active ? C.foreground : C.mutedFg,
              ),
            ),
            if (showPro) ...[
              const SizedBox(width: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: C.secondary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text('PRO',
                    style: TextStyle(fontSize: 8, color: C.secondary)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _summaryTile(
          String caption, String value, String unit, Color bg, Color fg) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(C.radius),
          boxShadow: C.shadowSm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(caption,
                style: TextStyle(
                    fontSize: 10,
                    color: fg.withValues(alpha: 0.8),
                    letterSpacing: 0.8)),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(children: [
                TextSpan(
                    text: value,
                    style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: fg)),
                TextSpan(
                    text: ' $unit',
                    style: TextStyle(
                        fontSize: 14, color: fg.withValues(alpha: 0.8))),
              ]),
            ),
          ],
        ),
      );

  Widget _chartCard(
    ({String key, String title, String unit, bool area, Color color}) c,
    List<WeekPoint> weeks,
  ) {
    final spots = <FlSpot>[];
    for (var i = 0; i < weeks.length; i++) {
      final v = weeks[i].values[c.key];
      if (v != null) spots.add(FlSpot(i.toDouble(), v));
    }

    return SvCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(c.title.toUpperCase(), style: sectionHeading()),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: spots.isEmpty
                ? const Center(
                    child: Text('No readings yet',
                        style: TextStyle(fontSize: 12, color: C.mutedFg)),
                  )
                : LineChart(
                    LineChartData(
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (_) =>
                            const FlLine(color: C.border, strokeWidth: 1),
                      ),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(),
                        rightTitles: const AxisTitles(),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 36,
                            getTitlesWidget: (v, _) => Text(
                              v.round().toString(),
                              style: const TextStyle(
                                  fontSize: 10, color: C.mutedFg),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            interval: 1,
                            getTitlesWidget: (v, _) {
                              final i = v.round();
                              if (i < 0 || i >= weeks.length) {
                                return const SizedBox.shrink();
                              }
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  weeks[i].label,
                                  style: const TextStyle(
                                      fontSize: 10, color: C.mutedFg),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      lineTouchData: LineTouchData(
                        touchTooltipData: LineTouchTooltipData(
                          getTooltipItems: (items) => items
                              .map((s) => LineTooltipItem(
                                    '${s.y.round()} ${c.unit}',
                                    const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: C.foreground,
                                    ),
                                  ))
                              .toList(),
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: spots,
                          isCurved: true,
                          barWidth: 2,
                          color: c.color,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (_, __, ___, ____) =>
                                FlDotCirclePainter(
                              radius: 3,
                              color: C.card,
                              strokeWidth: 2,
                              strokeColor: c.color,
                            ),
                          ),
                          belowBarData: BarAreaData(
                            show: c.area,
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                c.color.withValues(alpha: 0.3),
                                c.color.withValues(alpha: 0),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _upsell() => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: C.card,
          border: Border.all(color: C.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(C.radius),
          boxShadow: C.shadowSm,
        ),
        child: Column(
          children: [
            Text('Unlock 12-Week Trends', style: serif(size: 18)),
            const SizedBox(height: 8),
            const Text(
              'Upgrade to Bas Pro for long-term insights and advanced analytics.',
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
                child: const Text('Upgrade to Pro'),
              ),
            ),
          ],
        ),
      );
}
