import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers/app_providers.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _t = <String, TextEditingController>{};
  final _l = <String, TextEditingController>{};
  bool _seeded = false;

  static const _targetFields = [
    ('calories_target', 'Calories (kcal)'),
    ('protein_target', 'Protein (g)'),
    ('carbs_target', 'Carbs (g)'),
    ('fat_target', 'Fat (g)'),
    ('fiber_target', 'Fiber (g)'),
    ('water_target', 'Water (ml)'),
    ('steps_target', 'Steps'),
  ];

  static const _labFields = [
    ('hba1c', 'HbA1c (%)'),
    ('vitamin_b12', 'Vitamin B12 (pg/mL)'),
    ('vitamin_d', 'Vitamin D (ng/mL)'),
    ('ferritin', 'Ferritin (ng/mL)'),
    ('hemoglobin', 'Hemoglobin (g/dL)'),
  ];

  static const _lipidFields = [
    ('total_cholesterol', 'Total Cholesterol'),
    ('triglycerides', 'Triglycerides'),
    ('ldl', 'LDL'),
    ('hdl', 'HDL'),
  ];

  @override
  void dispose() {
    for (final c in [..._t.values, ..._l.values]) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _ctrl(Map<String, TextEditingController> m, String k) =>
      m.putIfAbsent(k, TextEditingController.new);

  void _seed(Targets t, HealthProfile h) {
    if (_seeded) return;
    String s(double? v) => v == null
        ? ''
        : (v == v.roundToDouble() ? v.toInt().toString() : v.toString());

    _ctrl(_t, 'calories_target').text = s(t.calories);
    _ctrl(_t, 'protein_target').text = s(t.protein);
    _ctrl(_t, 'carbs_target').text = s(t.carbs);
    _ctrl(_t, 'fat_target').text = s(t.fat);
    _ctrl(_t, 'fiber_target').text = s(t.fiber);
    _ctrl(_t, 'water_target').text = s(t.water);
    _ctrl(_t, 'steps_target').text = s(t.steps);

    _ctrl(_l, 'hba1c').text = s(h.hba1c);
    _ctrl(_l, 'vitamin_b12').text = s(h.vitaminB12);
    _ctrl(_l, 'vitamin_d').text = s(h.vitaminD);
    _ctrl(_l, 'ferritin').text = s(h.ferritin);
    _ctrl(_l, 'hemoglobin').text = s(h.hemoglobin);
    _ctrl(_l, 'total_cholesterol').text = s(h.totalCholesterol);
    _ctrl(_l, 'triglycerides').text = s(h.triglycerides);
    _ctrl(_l, 'ldl').text = s(h.ldl);
    _ctrl(_l, 'hdl').text = s(h.hdl);
    _ctrl(_l, 'lab_date').text = h.labDate ?? '';
    _seeded = true;
  }

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(planProvider).valueOrNull ?? const PlanSettings.free();
    final targets = ref.watch(targetsProvider);
    final profile = ref.watch(healthProfileProvider);

    if (targets.hasValue && profile.hasValue) {
      _seed(targets.requireValue, profile.requireValue);
    }

    return Column(
      children: [
        const PageHeader(eyebrowText: 'प्रोफाइल', title: 'Profile'),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            children: [
              _sectionRow('Account', trailing: _planChip(plan)),
              SvCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Advisor Checks Used',
                        style: TextStyle(fontSize: 14)),
                    Text(
                      '${plan.advisorUsageThisMonth.round()} / '
                      '${plan.isPro ? '∞' : plan.advisorMonthlyLimit.round()}',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (plan.isPro) _proActive() else _proUpsell(),
              const SizedBox(height: 32),

              _sectionRow('AI Models'),
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Text(
                  'Haiku is the cheapest and is plenty for advice. Photo '
                  'analysis estimates portions from an image, so a stronger '
                  'model is worth the cost there.',
                  style: TextStyle(fontSize: 11, color: C.mutedFg),
                ),
              ),
              SvCard(
                child: Column(
                  children: [
                    _modelPicker(
                      'Advisor',
                      plan.advisorModel,
                      (v) => _saveModels(advisor: v, vision: plan.visionModel),
                    ),
                    const Divider(height: 24),
                    _modelPicker(
                      'Photo analysis',
                      plan.visionModel,
                      (v) => _saveModels(advisor: plan.advisorModel, vision: v),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              _sectionRow('Daily Targets',
                  trailing: _saveButton(_saveTargets)),
              SvCard(
                child: Column(
                  children: [
                    for (var i = 0; i < _targetFields.length; i += 2)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: _numField(_targetFields[i].$2,
                                  _ctrl(_t, _targetFields[i].$1)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: i + 1 < _targetFields.length
                                  ? _numField(_targetFields[i + 1].$2,
                                      _ctrl(_t, _targetFields[i + 1].$1))
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              _sectionRow('Lab Values', trailing: _saveButton(_saveLabs)),
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Text(
                  'For tracking only — not a medical diagnosis.',
                  style: TextStyle(
                      fontSize: 10,
                      color: C.mutedFg,
                      fontStyle: FontStyle.italic),
                ),
              ),
              SvCard(
                child: Column(
                  children: [
                    TextField(
                      controller: _ctrl(_l, 'lab_date'),
                      decoration: const InputDecoration(
                        labelText: 'Lab Date',
                        hintText: 'YYYY-MM-DD',
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (var i = 0; i < _labFields.length; i += 2)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: _numField(_labFields[i].$2,
                                  _ctrl(_l, _labFields[i].$1)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: i + 1 < _labFields.length
                                  ? _numField(_labFields[i + 1].$2,
                                      _ctrl(_l, _labFields[i + 1].$1))
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      ),
                    const Divider(),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text('LIPID PANEL',
                            style: TextStyle(
                                fontSize: 10,
                                color: C.mutedFg,
                                letterSpacing: 0.8)),
                      ),
                    ),
                    for (var i = 0; i < _lipidFields.length; i += 2)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: _numField(_lipidFields[i].$2,
                                  _ctrl(_l, _lipidFields[i].$1)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _numField(_lipidFields[i + 1].$2,
                                  _ctrl(_l, _lipidFields[i + 1].$1)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              _sectionRow('Export Data'),
              OutlinedButton.icon(
                onPressed: () => _export(logs: true),
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Copy Daily Logs CSV'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _export(logs: false),
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Copy Meals CSV'),
              ),
              const SizedBox(height: 32),

              OutlinedButton.icon(
                onPressed: () =>
                    ref.read(authNotifierProvider.notifier).signOut(),
                icon: const Icon(Icons.logout, size: 18),
                label: const Text('Sign out'),
                style: OutlinedButton.styleFrom(foregroundColor: C.destructive),
              ),
              const SizedBox(height: 24),
              const Center(
                child: Text(
                  'Bas v1.0 — Your personal health companion',
                  style: TextStyle(fontSize: 12, color: C.mutedFg),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _sectionRow(String title, {Widget? trailing}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title.toUpperCase(), style: sectionHeading()),
            if (trailing != null) trailing,
          ],
        ),
      );

  Widget _planChip(PlanSettings p) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: C.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          p.isPro ? 'PRO' : 'FREE',
          style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: C.primary,
              letterSpacing: 0.8),
        ),
      );

  Widget _saveButton(Future<void> Function() onSave) => TextButton.icon(
        onPressed: onSave,
        icon: const Icon(Icons.save_outlined, size: 16),
        label: const Text('Save', style: TextStyle(fontSize: 12)),
        style: TextButton.styleFrom(foregroundColor: C.primary),
      );

  Widget _numField(String label, TextEditingController c) => TextField(
        controller: c,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(fontSize: 12),
        ),
      );

  /// Svasth used `parseInt(x) || fallback`, so typing 0 silently reverted to
  /// the default. Here a blank field means "leave unset" and 0 means 0.
  double? _parse(TextEditingController c) =>
      c.text.trim().isEmpty ? null : double.tryParse(c.text.trim());

  Future<void> _saveTargets() async {
    final fields = <String, dynamic>{};
    for (final f in _targetFields) {
      final v = _parse(_ctrl(_t, f.$1));
      if (v != null) fields[f.$1] = v;
    }
    try {
      await ref.read(svasthProvider).saveTargets(fields);
      invalidateData(ref);
      _toast('Targets updated');
    } catch (_) {
      _toast('Failed to save targets. Please try again.');
    }
  }

  Future<void> _saveLabs() async {
    final fields = <String, dynamic>{
      'lab_date': _ctrl(_l, 'lab_date').text.trim().isEmpty
          ? null
          : _ctrl(_l, 'lab_date').text.trim(),
    };
    for (final f in [..._labFields, ..._lipidFields]) {
      fields[f.$1] = _parse(_ctrl(_l, f.$1));
    }
    try {
      await ref.read(svasthProvider).saveHealthProfile(fields);
      invalidateData(ref);
      _toast('Lab values updated');
    } catch (_) {
      _toast('Failed to save lab values. Please try again.');
    }
  }

  /// Flutter has no browser download. Copying to the clipboard works on every
  /// platform and is honest about what it did.
  Future<void> _export({required bool logs}) async {
    try {
      final svasth = ref.read(svasthProvider);
      final csv = logs
          ? await svasth.exportDailyLogsCsv()
          : await svasth.exportMealsCsv();
      await Clipboard.setData(ClipboardData(text: csv));
      final rows = csv.split('\n').length - 1;
      _toast('$rows rows copied to clipboard');
    } catch (_) {
      _toast('Export failed');
    }
  }

  Widget _proActive() => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.primary.withValues(alpha: 0.05),
          border: Border.all(color: C.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(C.radius),
        ),
        child: const Row(
          children: [
            Icon(Icons.verified_user_outlined, size: 28, color: C.primary),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Bas Pro Active',
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  Text('Unlimited advisor checks & all features unlocked',
                      style: TextStyle(fontSize: 12, color: C.mutedFg)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _proUpsell() => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            C.secondary.withValues(alpha: 0.1),
            C.primary.withValues(alpha: 0.1),
          ]),
          border: Border.all(color: C.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(C.radius),
        ),
        child: Column(
          children: [
            const Icon(Icons.verified_user_outlined, size: 32, color: C.primary),
            const SizedBox(height: 8),
            Text('Bas Pro', style: serif(size: 18)),
            const SizedBox(height: 8),
            const Text(
              'Unlimited AI advisor checks, 12-week trend analysis, and an '
              'ad-free experience.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: C.mutedFg),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton(
                onPressed: () => _toast(
                    'Payments are not wired up yet — Stripe comes next.'),
                child: const Text('Upgrade for ₹299/mo'),
              ),
            ),
          ],
        ),
      );

  static const _models = [
    ('claude-haiku-4-5', 'Haiku', 'Cheapest'),
    ('claude-sonnet-5', 'Sonnet', 'Balanced'),
    ('claude-opus-5', 'Opus', 'Most capable'),
  ];

  Widget _modelPicker(
    String label,
    String selected,
    ValueChanged<String> onChanged,
  ) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Row(
            children: _models.map((m) {
              final active = m.$1 == selected;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => onChanged(m.$1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? C.primary : C.card,
                        border: Border.all(
                            color: active ? C.primary : C.cardBorder),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Text(
                            m.$2,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: active ? C.primaryFg : C.foreground,
                            ),
                          ),
                          Text(
                            m.$3,
                            style: TextStyle(
                              fontSize: 9,
                              color: active
                                  ? C.primaryFg.withValues(alpha: 0.8)
                                  : C.mutedFg,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      );

  Future<void> _saveModels({
    required String advisor,
    required String vision,
  }) async {
    try {
      await ref
          .read(svasthProvider)
          .saveModelPreferences(advisorModel: advisor, visionModel: vision);
      invalidateData(ref);
    } catch (_) {
      _toast('Could not save model preference.');
    }
  }

  void _toast(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(m)));
  }
}
