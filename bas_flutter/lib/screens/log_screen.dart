import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../providers/app_providers.dart';
import '../services/svasth_service.dart';
import '../theme.dart';

enum _SaveState { idle, saving, saved, error }

/// Svasth's Daily Log. Auto-saves on a 1s debounce with no save button.
class LogScreen extends ConsumerStatefulWidget {
  const LogScreen({super.key});

  @override
  ConsumerState<LogScreen> createState() => _LogScreenState();
}

class _LogScreenState extends ConsumerState<LogScreen> {
  final _weight = TextEditingController();
  final _steps = TextEditingController();
  final _workoutType = TextEditingController();
  final _workoutMinutes = TextEditingController();
  final _notes = TextEditingController();

  double _sleepHours = 7;
  double _energy = 5;
  double _reflux = 0;
  double _postMealSleepiness = 0;
  double _headache = 0;
  double _stress = 0;
  double _muscleStiffness = 0; // carried through; Svasth has no control for it
  String _bowelMovement = 'Normal';
  double _hungerLunch = 3;
  double _hungerDinner = 3;
  double _hungerBed = 3;
  double _water = 0;

  Timer? _debounce;
  _SaveState _state = _SaveState.idle;
  bool _hydrated = false;
  String? _lastSaved;

  String get _date => ymd(DateTime.now());

  @override
  void initState() {
    super.initState();
    for (final c in [_weight, _steps, _workoutType, _workoutMinutes, _notes]) {
      c.addListener(_scheduleSave);
    }
    _hydrate();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    for (final c in [_weight, _steps, _workoutType, _workoutMinutes, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _hydrate() async {
    final log = await ref.read(svasthProvider).getDailyLog(_date);
    if (!mounted) return;
    if (log != null) {
      _weight.text = log.weight?.toString() ?? '';
      _steps.text = log.steps?.round().toString() ?? '';
      _workoutType.text = log.workoutType ?? '';
      _workoutMinutes.text = log.workoutMinutes?.round().toString() ?? '';
      _notes.text = log.notes ?? '';
      setState(() {
        _sleepHours = log.sleepHours ?? 7;
        _energy = log.energy ?? 5;
        _reflux = log.reflux ?? 0;
        _postMealSleepiness = log.postMealSleepiness ?? 0;
        _headache = log.headache ?? 0;
        _stress = log.stress ?? 0;
        _muscleStiffness = log.muscleStiffness ?? 0;
        _bowelMovement = log.bowelMovement ?? 'Normal';
        _hungerLunch = log.hungerBeforeLunch ?? 3;
        _hungerDinner = log.hungerBeforeDinner ?? 3;
        _hungerBed = log.hungerBeforeBed ?? 3;
        _water = log.water ?? 0;
      });
    }
    _hydrated = true;
    _lastSaved = _payloadKey();
  }

  Map<String, dynamic> _payload() => {
        'weight': double.tryParse(_weight.text),
        'steps': double.tryParse(_steps.text),
        'sleep_hours': _sleepHours,
        'workout_minutes': double.tryParse(_workoutMinutes.text),
        'workout_type': _workoutType.text.trim().isEmpty
            ? null
            : _workoutType.text.trim(),
        'energy': _energy,
        'reflux': _reflux,
        'post_meal_sleepiness': _postMealSleepiness,
        'headache': _headache,
        'stress': _stress,
        'muscle_stiffness': _muscleStiffness,
        'bowel_movement': _bowelMovement,
        'hunger_before_lunch': _hungerLunch,
        'hunger_before_dinner': _hungerDinner,
        'hunger_before_bed': _hungerBed,
        'water': _water,
        'notes': _notes.text,
      };

  String _payloadKey() => _payload().toString();

  void _scheduleSave() {
    if (!_hydrated) return;
    if (_payloadKey() == _lastSaved) return;

    _debounce?.cancel();
    setState(() => _state = _SaveState.saving);
    _debounce = Timer(const Duration(seconds: 1), _save);
  }

  Future<void> _save() async {
    final key = _payloadKey();
    try {
      await ref.read(svasthProvider).saveDailyLog(_date, _payload());
      _lastSaved = key;
      if (!mounted) return;
      setState(() => _state = _SaveState.saved);
      invalidateData(ref);
      Timer(const Duration(seconds: 2), () {
        if (mounted) setState(() => _state = _SaveState.idle);
      });
    } catch (_) {
      if (!mounted) return;
      // Svasth failed silently here. A lost log is worth telling someone about.
      setState(() => _state = _SaveState.error);
      Timer(const Duration(seconds: 3), () {
        if (mounted) setState(() => _state = _SaveState.idle);
      });
    }
  }

  void _set(VoidCallback f) {
    setState(f);
    _scheduleSave();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        PageHeader(
          eyebrowText: 'सेहत',
          title: DateFormat('MMM d, yyyy').format(DateTime.now()),
          trailing: _saveIndicator(),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
            children: [
              _section('Vitals'),
              Row(
                children: [
                  Expanded(child: _numField('Weight (kg)', _weight, 'e.g. 70')),
                  const SizedBox(width: 16),
                  Expanded(child: _numField('Steps', _steps, 'e.g. 10000')),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Sleep',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  Text(
                    '${_sleepHours.toStringAsFixed(1)} hrs',
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: C.primary),
                  ),
                ],
              ),
              Slider(
                value: _sleepHours,
                min: 4,
                max: 12,
                divisions: 16,
                onChanged: (v) => _set(() => _sleepHours = v),
              ),
              const SizedBox(height: 24),

              _section('Symptoms & Energy'),
              SvCard(
                child: Column(
                  children: [
                    _symptomRow('Energy', _energy,
                        (v) => _set(() => _energy = v), true),
                    _symptomRow('Reflux', _reflux,
                        (v) => _set(() => _reflux = v), true),
                    _symptomRow('Post-meal Sleepiness', _postMealSleepiness,
                        (v) => _set(() => _postMealSleepiness = v), true),
                    _symptomRow('Headache', _headache,
                        (v) => _set(() => _headache = v), true),
                    _symptomRow('Stress', _stress,
                        (v) => _set(() => _stress = v), false),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              _section('Digestion'),
              const Text('Bowel Movement',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ['None', 'Soft', 'Normal', 'Hard', 'Multiple']
                    .map((o) => _pill(
                          o,
                          _bowelMovement == o,
                          () => _set(() => _bowelMovement = o),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _hunger('Hunger (Lunch)', _hungerLunch,
                        (v) => _set(() => _hungerLunch = v)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _hunger('Hunger (Dinner)', _hungerDinner,
                        (v) => _set(() => _hungerDinner = v)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _hunger('Hunger (Bed)', _hungerBed,
                        (v) => _set(() => _hungerBed = v)),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              _waterCard(),
              const SizedBox(height: 24),

              _section('Workout'),
              Row(
                children: [
                  Expanded(
                    child: _textField('Type', _workoutType, 'e.g. Yoga, Walk'),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _numField(
                        'Duration (min)', _workoutMinutes, 'e.g. 45'),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              const Text('Notes',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextField(
                controller: _notes,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'How are you feeling today?',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _saveIndicator() {
    switch (_state) {
      case _SaveState.saving:
        return const Text('Saving...',
            style: TextStyle(fontSize: 12, color: C.mutedFg));
      case _SaveState.saved:
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check, size: 12, color: C.primary),
            SizedBox(width: 4),
            Text('Saved',
                style: TextStyle(
                    fontSize: 12,
                    color: C.primary,
                    fontWeight: FontWeight.w500)),
          ],
        );
      case _SaveState.error:
        return const Text('Not saved',
            style: TextStyle(fontSize: 12, color: C.destructive));
      case _SaveState.idle:
        return const SizedBox(height: 24);
    }
  }

  Widget _section(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(t.toUpperCase(), style: sectionHeading()),
      );

  Widget _textField(String label, TextEditingController c, String hint) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(controller: c, decoration: InputDecoration(hintText: hint)),
        ],
      );

  Widget _numField(String label, TextEditingController c, String hint) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(
            controller: c,
            // Never `keyboardType: number` alone on mobile — decimal + text
            // input mode avoids the cursor-jump and paste bugs.
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(hintText: hint),
          ),
        ],
      );

  /// Five pills labelled 2/4/6/8/10 with a cumulative fill: value 6 fills
  /// 2, 4 and 6. Ported from Svasth's `value >= val - 1` condition.
  Widget _symptomRow(
    String label,
    double value,
    ValueChanged<double> onChanged,
    bool divider,
  ) =>
      Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: divider
            ? BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: C.border.withValues(alpha: 0.5)),
                ),
              )
            : null,
        child: Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500)),
            ),
            ...List.generate(5, (i) {
              final val = (i + 1) * 2.0;
              final filled = value >= val - 1;
              return Padding(
                padding: const EdgeInsets.only(left: 4),
                child: GestureDetector(
                  onTap: () => onChanged(val),
                  child: Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: filled ? C.primary : C.muted,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      val.round().toString(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: filled ? C.primaryFg : C.mutedFg,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      );

  Widget _pill(String label, bool selected, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? C.primary : C.card,
            border: Border.all(color: selected ? C.primary : C.cardBorder),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: selected ? C.primaryFg : C.foreground,
            ),
          ),
        ),
      );

  Widget _hunger(String label, double value, ValueChanged<double> onChanged) =>
      Column(
        children: [
          Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10, color: C.mutedFg),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [1.0, 3.0, 5.0].map((v) {
              final selected = value == v;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: GestureDetector(
                  onTap: () => onChanged(v),
                  child: Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: selected ? C.secondary : null,
                      border: Border.all(
                          color: selected ? C.secondary : C.border),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      v.round().toString(),
                      style: TextStyle(
                        fontSize: 11,
                        color: selected ? C.secondaryFg : C.mutedFg,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      );

  Widget _waterCard() {
    final pct = ((_water / 2500) * 100).clamp(0, 100).round();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        border: Border.all(color: const Color(0xFFDBEAFE)),
        borderRadius: BorderRadius.circular(C.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'WATER',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E40AF),
                      letterSpacing: 0.6,
                    ),
                  ),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: _water.round().toString(),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                        const TextSpan(
                          text: ' ml',
                          style: TextStyle(
                              fontSize: 14, color: Color(0xFF2563EB)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: const Color(0xFFBFDBFE), width: 4),
                ),
                child: Text(
                  '$pct%',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _waterButton('+ 250ml', 250)),
              const SizedBox(width: 8),
              Expanded(child: _waterButton('+ 500ml', 500)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _waterButton(String label, double amount) => OutlinedButton(
        onPressed: () => _set(() => _water += amount),
        // Long-press to undo: Svasth had no way back from a mis-tap.
        onLongPress: () =>
            _set(() => _water = (_water - amount).clamp(0, double.infinity)),
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1D4ED8),
          side: const BorderSide(color: Color(0xFFBFDBFE)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 13)),
      );
}
