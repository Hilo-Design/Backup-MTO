import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers/auth_provider.dart';
import '../../services/ai_service.dart';
import '../../services/supabase_service.dart';

class MealLoggingScreen extends ConsumerStatefulWidget {
  const MealLoggingScreen({required this.userId, super.key});

  final String userId;

  @override
  ConsumerState<MealLoggingScreen> createState() => _MealLoggingScreenState();
}

enum _Stage { idle, uploading, analysing }

class _MealLoggingScreenState extends ConsumerState<MealLoggingScreen> {
  final _notes = TextEditingController();
  File? _photo;
  String _mealType = 'lunch';
  _Stage _stage = _Stage.idle;

  bool get _busy => _stage != _Stage.idle;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final picked = await ImagePicker().pickImage(
      source: source,
      // Keeps uploads well under the bucket cap and Claude's image limit.
      imageQuality: 85,
      maxWidth: 1600,
    );
    if (picked != null) setState(() => _photo = File(picked.path));
  }

  Future<void> _save() async {
    final photo = _photo;
    if (photo == null) return;

    final service = SupabaseService(ref.read(supabaseProvider));
    final ai = AiService(ref.read(supabaseProvider));
    final now = DateTime.now();

    setState(() => _stage = _Stage.uploading);

    String mealId;
    try {
      final path = await service.uploadMealPhoto(widget.userId, photo);
      mealId = await service.saveMeal(widget.userId, {
        'meal_date': now.toIso8601String().split('T').first,
        'meal_time':
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:00',
        'meal_type': _mealType,
        'photo_url': path,
        'photo_uploaded_at': now.toIso8601String(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _stage = _Stage.idle);
      _toast('Could not save meal: $e');
      return;
    }

    // The meal is already saved at this point. If analysis fails the log is
    // still intact, so treat it as a soft failure rather than losing the entry.
    setState(() => _stage = _Stage.analysing);

    try {
      final analysis = await ai.analyzeMealPhoto(mealId);
      if (!mounted) return;
      setState(() => _stage = _Stage.idle);
      await _showAnalysis(analysis);
      if (mounted) Navigator.pop(context, true);
    } on AiException catch (e) {
      if (!mounted) return;
      setState(() => _stage = _Stage.idle);
      _toast(
        e.isTransient
            ? 'Meal saved. Analysis is busy right now — try again from the meal later.'
            : 'Meal saved, but analysis failed: ${e.message}',
      );
      Navigator.pop(context, true);
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _showAnalysis(Map<String, dynamic> a) {
    final items = (a['items'] as List?) ?? const [];

    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        builder: (context, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            Text(
              '${a['description']}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            Text(
              'Confidence: ${a['confidence']}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Macro(label: 'kcal', value: a['total_calories']),
                _Macro(label: 'protein', value: a['total_protein_g'], unit: 'g'),
                _Macro(label: 'carbs', value: a['total_carbs_g'], unit: 'g'),
                _Macro(label: 'fat', value: a['total_fat_g'], unit: 'g'),
                _Macro(label: 'fibre', value: a['total_fiber_g'], unit: 'g'),
              ],
            ),
            const SizedBox(height: 24),
            if (items.isNotEmpty) ...[
              Text('What I saw', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...items.map(
                (raw) {
                  final item = raw as Map<String, dynamic>;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: Text('${item['food_name']}'),
                    subtitle: Text('${item['portion_size']}'),
                    trailing: Text('${item['calories']} kcal'),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('${a['feedback']}'),
            ),
            const SizedBox(height: 12),
            Text(
              'Estimates from a single photo are approximate.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log meal')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                clipBehavior: Clip.antiAlias,
                child: _photo == null
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.camera_alt,
                            size: 56,
                            color: Colors.grey.shade400,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'A photo is required',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      )
                    : Image.file(_photo!, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _pickPhoto(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickPhoto(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Gallery'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Meal type'),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'breakfast', label: Text('Breakfast')),
                ButtonSegment(value: 'lunch', label: Text('Lunch')),
                ButtonSegment(value: 'dinner', label: Text('Dinner')),
                ButtonSegment(value: 'snack', label: Text('Snack')),
              ],
              selected: {_mealType},
              onSelectionChanged: (s) => setState(() => _mealType = s.first),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _notes,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                helperText: 'Anything the photo cannot show — oils, sauces, size.',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: (_photo == null || _busy) ? null : _save,
                child: _busy
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            _stage == _Stage.uploading
                                ? 'Saving…'
                                : 'Analysing…',
                          ),
                        ],
                      )
                    : const Text('Save & analyse'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Macro extends StatelessWidget {
  const _Macro({required this.label, required this.value, this.unit = ''});

  final String label;
  final Object? value;
  final String unit;

  @override
  Widget build(BuildContext context) {
    final n = value is num ? (value! as num).round() : null;
    return Chip(
      label: Text(n == null ? '$label —' : '$n$unit $label'),
    );
  }
}
