import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../services/supabase_service.dart';

class DailyCheckInScreen extends ConsumerStatefulWidget {
  const DailyCheckInScreen({required this.userId, super.key});

  final String userId;

  @override
  ConsumerState<DailyCheckInScreen> createState() => _DailyCheckInScreenState();
}

class _DailyCheckInScreenState extends ConsumerState<DailyCheckInScreen> {
  int _energy = 5;
  int _stress = 5;
  int _mood = 5;
  double _sleepHours = 7;
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    final service = SupabaseService(ref.read(supabaseProvider));

    try {
      await service.saveDailyLog(widget.userId, {
        'energy_level': _energy,
        'stress_level': _stress,
        'mood': _mood,
        'sleep_hours': _sleepHours,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in saved.')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save check-in: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Daily check-in')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'How are you feeling today?',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 20),
          _ScaleCard(
            label: 'Energy',
            icon: Icons.bolt,
            value: _energy,
            onChanged: (v) => setState(() => _energy = v),
          ),
          _ScaleCard(
            label: 'Stress',
            icon: Icons.psychology,
            value: _stress,
            onChanged: (v) => setState(() => _stress = v),
          ),
          _ScaleCard(
            label: 'Mood',
            icon: Icons.sentiment_satisfied_alt,
            value: _mood,
            onChanged: (v) => setState(() => _mood = v),
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.bedtime),
                      const SizedBox(width: 12),
                      const Text('Sleep'),
                      const Spacer(),
                      Text(
                        '${_sleepHours.toStringAsFixed(1)} h',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Slider(
                    value: _sleepHours,
                    min: 3,
                    max: 12,
                    divisions: 18,
                    label: _sleepHours.toStringAsFixed(1),
                    onChanged: (v) => setState(() => _sleepHours = v),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 48,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save check-in'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScaleCard extends StatelessWidget {
  const _ScaleCard({
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final IconData icon;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon),
                const SizedBox(width: 12),
                Text(label),
                const Spacer(),
                Text(
                  '$value / 10',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Slider(
              value: value.toDouble(),
              min: 1,
              max: 10,
              divisions: 9,
              label: '$value',
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      ),
    );
  }
}
