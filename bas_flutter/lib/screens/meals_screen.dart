import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers/app_providers.dart';
import '../services/ai_service.dart';
import '../services/svasth_service.dart';
import '../theme.dart';

const mealOrder = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

class MealsScreen extends ConsumerStatefulWidget {
  const MealsScreen({super.key});

  @override
  ConsumerState<MealsScreen> createState() => _MealsScreenState();
}

class _MealsScreenState extends ConsumerState<MealsScreen> {
  DateTime _date = DateTime.now();

  bool get _isToday => ymd(_date) == ymd(DateTime.now());

  @override
  Widget build(BuildContext context) {
    final meals = ref.watch(mealsProvider(ymd(_date)));
    final plan = ref.watch(planProvider).valueOrNull ?? const PlanSettings.free();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: C.background,
            border: Border(bottom: BorderSide(color: C.border)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('खाना', style: eyebrow()),
              const SizedBox(height: 2),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    onPressed: () => setState(
                        () => _date = _date.subtract(const Duration(days: 1))),
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Text(DateFormat('MMMM d, yyyy').format(_date),
                      style: serif(size: 18)),
                  IconButton(
                    // No future logging, exactly as in Svasth.
                    onPressed: _isToday
                        ? null
                        : () => setState(
                            () => _date = _date.add(const Duration(days: 1))),
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: meals.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Could not load meals: $e')),
            data: (list) {
              final sorted = [...list]..sort((a, b) {
                  final ai = mealOrder.indexWhere(
                      (t) => t.toLowerCase() == a.mealType.toLowerCase());
                  final bi = mealOrder.indexWhere(
                      (t) => t.toLowerCase() == b.mealType.toLowerCase());
                  if (ai == -1 && bi == -1) return 0;
                  if (ai == -1) return 1;
                  if (bi == -1) return -1;
                  return ai - bi;
                });

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                children: [
                  if (sorted.isEmpty) _emptyState(),
                  ...sorted.map(_mealCard),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 48,
                    child: FilledButton.icon(
                      onPressed: _openAddMeal,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Meal'),
                    ),
                  ),
                  if (!plan.isPro) ...[
                    const SizedBox(height: 24),
                    _promotedBanner(),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _emptyState() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration:
                  const BoxDecoration(color: C.muted, shape: BoxShape.circle),
              child: const Icon(Icons.photo_camera_outlined,
                  size: 32, color: C.mutedFg),
            ),
            const SizedBox(height: 16),
            Text('No meals logged', style: serif(size: 20)),
            const SizedBox(height: 8),
            const Text(
              'Track your meals to see macro trends and get personalized advice.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: C.mutedFg),
            ),
          ],
        ),
      );

  Widget _mealCard(Meal meal) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: C.card,
            border: Border.all(color: C.cardBorder),
            borderRadius: BorderRadius.circular(C.radius),
            boxShadow: C.shadowXs,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: C.muted.withValues(alpha: 0.4),
                  border:
                      const Border(bottom: BorderSide(color: C.cardBorder)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(meal.mealType,
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              _macro('${(meal.totalCalories ?? 0).round()}',
                                  'kcal'),
                              const SizedBox(width: 12),
                              _macro('${(meal.totalProtein ?? 0).round()}g',
                                  'prot'),
                              const SizedBox(width: 12),
                              _macro('${(meal.totalCarbs ?? 0).round()}g',
                                  'carb'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => _confirmDelete(meal),
                      icon: const Icon(Icons.delete_outline,
                          size: 18, color: C.destructive),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (meal.notes != null && meal.notes!.isNotEmpty) ...[
                      Text(
                        '"${meal.notes}"',
                        style: const TextStyle(
                            fontSize: 14,
                            color: C.mutedFg,
                            fontStyle: FontStyle.italic),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (meal.foodItems.isEmpty)
                      const Text('No specific foods added.',
                          style: TextStyle(fontSize: 12, color: C.mutedFg))
                    else
                      ...meal.foodItems.map(
                        (f) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text.rich(
                                  TextSpan(children: [
                                    TextSpan(text: f.name),
                                    if (f.portion != null)
                                      TextSpan(
                                        text:
                                            ' (${_n(f.portion)}${f.unit ?? ''})',
                                        style: const TextStyle(
                                            fontSize: 12, color: C.mutedFg),
                                      ),
                                  ]),
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ),
                              Text('${(f.calories ?? 0).round()} kcal',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: OutlinedButton.icon(
                        onPressed: () => _openAddFood(meal.id),
                        icon: const Icon(Icons.add, size: 12),
                        label: const Text('Add Food Item',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  static String _n(double? v) => v == null
      ? ''
      : (v == v.roundToDouble() ? v.toInt().toString() : v.toString());

  Widget _macro(String value, String unit) => Text.rich(
        TextSpan(children: [
          TextSpan(
              text: value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, color: C.foreground)),
          TextSpan(text: ' $unit'),
        ]),
        style: const TextStyle(fontSize: 12, color: C.mutedFg),
      );

  Future<void> _confirmDelete(Meal meal) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete this meal?'),
        content: Text('${meal.mealType} and its food items will be removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: C.destructive),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(svasthProvider).deleteMeal(meal.id);
      invalidateData(ref);
    } catch (_) {
      if (mounted) _toast('Could not delete meal.');
    }
  }

  void _toast(String m) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m)));

  Future<void> _openAddMeal() => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        backgroundColor: C.background,
        builder: (_) => _AddMealSheet(date: ymd(_date)),
      );

  Future<void> _openAddFood(String mealId) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        backgroundColor: C.background,
        builder: (_) => _AddFoodSheet(mealId: mealId),
      );

  Widget _promotedBanner() => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            C.secondary.withValues(alpha: 0.1),
            C.primary.withValues(alpha: 0.1),
          ]),
          border: Border.all(color: C.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PROMOTED',
                      style: eyebrow().copyWith(
                          fontSize: 10,
                          color: C.primary,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  const Text('Bas Pro',
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w500)),
                  const Text(
                    'No ads, unlimited AI, deeper trends. ₹299/mo',
                    style: TextStyle(fontSize: 12, color: C.mutedFg),
                  ),
                ],
              ),
            ),
            FilledButton(
              onPressed: () => _toast('Payments are not wired up yet.'),
              style: FilledButton.styleFrom(
                backgroundColor: C.secondary,
                foregroundColor: C.secondaryFg,
                minimumSize: const Size(0, 32),
              ),
              child: const Text('Upgrade', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
}

// ── Add meal sheet ─────────────────────────────────────────────────────────
class _AddMealSheet extends ConsumerStatefulWidget {
  const _AddMealSheet({required this.date});

  final String date;

  @override
  ConsumerState<_AddMealSheet> createState() => _AddMealSheetState();
}

class _AddMealSheetState extends ConsumerState<_AddMealSheet> {
  final _notes = TextEditingController();
  String _mealType = 'Breakfast';
  Uint8List? _photo;
  String _contentType = 'image/jpeg';
  Map<String, dynamic>? _analysis;
  bool _analysing = false;
  bool _saving = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final picked = await ImagePicker()
        .pickImage(source: source, imageQuality: 85, maxWidth: 1600);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _photo = bytes;
      _contentType = picked.mimeType ?? 'image/jpeg';
      _analysis = null;
    });
  }

  Future<void> _create() async {
    setState(() => _saving = true);
    final svasth = ref.read(svasthProvider);
    final ai = ref.read(aiProvider);

    try {
      String? photoPath;
      if (_photo != null) {
        photoPath =
            await svasth.uploadMealPhoto(_photo!, contentType: _contentType);
      }

      final mealId = await svasth.createMeal(
        date: widget.date,
        mealType: _mealType,
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        photoUrl: photoPath,
      );

      if (!mounted) return;
      invalidateData(ref);

      // Analysed after the meal exists, so a failed estimate never costs the
      // user their log entry. A typed description is enough — no photo needed.
      if (photoPath != null || _notes.text.trim().isNotEmpty) {
        setState(() => _analysing = true);
        try {
          await ai.analyzeMealPhoto(mealId);
          invalidateData(ref);
        } on AiException catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Meal saved. ${e.message}')),
            );
          }
        }
      }

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not add meal. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = _saving || _analysing;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Log a Meal', style: serif()),
            const SizedBox(height: 20),
            const Text('Meal Type',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: mealOrder.map((t) {
                final sel = t == _mealType;
                return GestureDetector(
                  onTap: () => setState(() => _mealType = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? C.primary : C.card,
                      border:
                          Border.all(color: sel ? C.primary : C.cardBorder),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      t,
                      style: TextStyle(
                        fontSize: 13,
                        color: sel ? C.primaryFg : C.foreground,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            const Text('Notes (optional)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            TextField(
              controller: _notes,
              decoration: const InputDecoration(
                hintText: 'e.g. 2 eggs with toast',
                helperText: 'Describe it and I will estimate the macros.',
                helperMaxLines: 2,
              ),
            ),
            const SizedBox(height: 20),
            const Text('Photo (optional)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            if (_photo != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(_photo!,
                    height: 160, width: double.infinity, fit: BoxFit.cover),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy ? null : () => _pick(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera, size: 18),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy ? null : () => _pick(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library, size: 18),
                    label: const Text('Gallery'),
                  ),
                ),
              ],
            ),
            if (_photo != null)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'A photo gives a better estimate than text alone, but either '
                  'works. Both are approximate.',
                  style: TextStyle(fontSize: 11, color: C.mutedFg),
                ),
              ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: busy ? null : _create,
                child: Text(
                  _analysing
                      ? 'Estimating macros...'
                      : _saving
                          ? 'Creating...'
                          : 'Create Meal',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Add food item sheet ────────────────────────────────────────────────────
class _AddFoodSheet extends ConsumerStatefulWidget {
  const _AddFoodSheet({required this.mealId});

  final String mealId;

  @override
  ConsumerState<_AddFoodSheet> createState() => _AddFoodSheetState();
}

class _AddFoodSheetState extends ConsumerState<_AddFoodSheet> {
  final _name = TextEditingController();
  final _portion = TextEditingController(text: '1');
  final _unit = TextEditingController(text: 'serving');
  final _calories = TextEditingController();
  final _protein = TextEditingController();
  final _carbs = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_name, _portion, _unit, _calories, _protein, _carbs]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _add() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(svasthProvider).addFoodItem(widget.mealId, {
        'name': _name.text.trim(),
        'portion': double.tryParse(_portion.text) ?? 1,
        'unit': _unit.text.trim(),
        'calories': double.tryParse(_calories.text),
        'protein': double.tryParse(_protein.text),
        'carbs': double.tryParse(_carbs.text),
      });
      if (!mounted) return;
      invalidateData(ref);
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not add item: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add Food Item', style: serif(size: 18)),
              const SizedBox(height: 16),
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                    labelText: 'Food Name', hintText: 'e.g. Apple'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _portion,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Portion'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _unit,
                      decoration: const InputDecoration(labelText: 'Unit'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _num('Calories', _calories)),
                  const SizedBox(width: 8),
                  Expanded(child: _num('Protein (g)', _protein)),
                  const SizedBox(width: 8),
                  Expanded(child: _num('Carbs (g)', _carbs)),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _saving ? null : _add,
                  child: const Text('Add Item'),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _num(String label, TextEditingController c) => TextField(
        controller: c,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(fontSize: 12),
        ),
      );
}
