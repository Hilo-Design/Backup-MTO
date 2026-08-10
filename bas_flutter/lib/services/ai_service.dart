import 'package:supabase_flutter/supabase_flutter.dart';

class AiException implements Exception {
  AiException(this.message, {this.status});

  final String message;
  final int? status;

  /// The free plan's monthly advisor allowance is spent.
  bool get isLimitReached => status == 429;

  /// Upstream is busy; retrying later is reasonable.
  bool get isTransient => status == 503 || status == 529;

  @override
  String toString() => message;
}

/// Claude-backed advice. The Anthropic key lives only in Supabase secrets and
/// is never shipped in the app binary.
class AiService {
  AiService(this._db);

  final SupabaseClient _db;

  Future<Map<String, dynamic>> _invoke(
    String name,
    Map<String, dynamic> body,
  ) async {
    try {
      final res = await _db.functions.invoke(name, body: body);
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      throw AiException('Unexpected response from $name');
    } on FunctionException catch (e) {
      final d = e.details;
      final message = d is Map && d['error'] is String
          ? d['error'] as String
          : 'The $name service failed (${e.status}).';
      throw AiException(message, status: e.status);
    }
  }

  /// Estimates macros from the meal's photo and writes them to `meals` and
  /// `food_items`.
  Future<Map<String, dynamic>> analyzeMealPhoto(String mealId) async {
    final res = await _invoke('analyze-meal-photo', {'meal_id': mealId});
    return res['analysis'] as Map<String, dynamic>;
  }

  /// Svasth's advisor contract, answered by Claude instead of a rules engine.
  /// Returns `{decision, explanation, tips, remaining*}`.
  Future<Map<String, dynamic>> advisorCheck({
    required String date,
    required String question,
    String? foodName,
    String? portionDescription,
  }) =>
      _invoke('advisor-check', {
        'date': date,
        'question': question,
        if (foodName != null && foodName.isNotEmpty) 'food_name': foodName,
        if (portionDescription != null && portionDescription.isNotEmpty)
          'portion_description': portionDescription,
      });
}
