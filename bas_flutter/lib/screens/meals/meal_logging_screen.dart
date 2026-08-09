import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers/auth_provider.dart';
import '../../services/supabase_service.dart';

class MealLoggingScreen extends ConsumerStatefulWidget {
  const MealLoggingScreen({required this.userId, super.key});

  final String userId;

  @override
  ConsumerState<MealLoggingScreen> createState() => _MealLoggingScreenState();
}

class _MealLoggingScreenState extends ConsumerState<MealLoggingScreen> {
  final _notes = TextEditingController();
  File? _photo;
  String _mealType = 'lunch';
  bool _saving = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final picked = await ImagePicker().pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1600,
    );
    if (picked != null) {
      setState(() => _photo = File(picked.path));
    }
  }

  Future<void> _save() async {
    final photo = _photo;
    if (photo == null) return;

    setState(() => _saving = true);
    final service = SupabaseService(ref.read(supabaseProvider));
    final now = DateTime.now();

    try {
      final url = await service.uploadMealPhoto(widget.userId, photo);
      await service.saveMeal(widget.userId, {
        'meal_date': now.toIso8601String().split('T').first,
        'meal_time':
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:00',
        'meal_type': _mealType,
        'photo_url': url,
        'photo_uploaded_at': now.toIso8601String(),
        'notes': _notes.text.isEmpty ? null : _notes.text,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Meal logged.')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save meal: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log meal')),
      body: ListView(
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
                        Icon(Icons.camera_alt,
                            size: 56, color: Colors.grey.shade400),
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
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 48,
            child: FilledButton(
              onPressed: (_photo == null || _saving) ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save & analyse'),
            ),
          ),
        ],
      ),
    );
  }
}
