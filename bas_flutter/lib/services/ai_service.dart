import 'package:supabase_flutter/supabase_flutter.dart';

/// Thrown when an Edge Function returns a non-2xx status. [message] is the
/// human-readable string the function put in its `error` field, so it can be
/// shown to the user directly.
class AiException implements Exception {
  AiException(this.message, {this.status});

  final String message;
  final int? status;

  /// 422 means "not enough data yet" rather than a failure — the UI should
  /// nudge the user to log more instead of showing an error.
  bool get isNotEnoughData => status == 422;

  /// Overloaded or rate-limited upstream; retrying later is reasonable.
  bool get isTransient => status == 429 || status == 529;

  @override
  String toString() => message;
}

/// Calls the Claude-backed Edge Functions. The Anthropic key lives only in
/// Supabase secrets — it is never shipped inside the app binary.
class AiService {
  AiService(this._client);

  final SupabaseClient _client;

  Future<Map<String, dynamic>> _invoke(
    String name, [
    Map<String, dynamic>? body,
  ]) async {
    try {
      final res = await _client.functions.invoke(name, body: body ?? const {});
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      throw AiException('Unexpected response from $name');
    } on FunctionException catch (e) {
      final details = e.details;
      final message = details is Map && details['error'] is String
          ? details['error'] as String
          : 'The $name service failed (${e.status}).';
      throw AiException(message, status: e.status);
    }
  }

  /// Reads the meal's photo, estimates nutrition, writes the results back to
  /// `meals` and `food_items`, and returns the analysis.
  Future<Map<String, dynamic>> analyzeMealPhoto(String mealId) async {
    final res = await _invoke('analyze-meal-photo', {'meal_id': mealId});
    return res['analysis'] as Map<String, dynamic>;
  }

  /// One coaching insight for [date] (defaults to today), also saved to
  /// `ai_insights`. Throws with [AiException.isNotEnoughData] if there are no
  /// check-ins yet.
  Future<Map<String, dynamic>> generateDailyInsight({String? date}) async {
    final res = await _invoke(
      'generate-daily-insight',
      if (date != null) {'date': date} else const {},
    );
    return res['insight'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> interpretLabValues(String labValueId) async {
    final res = await _invoke(
      'interpret-lab-values',
      {'lab_value_id': labValueId},
    );
    return res['interpretation'] as Map<String, dynamic>;
  }

  /// Needs at least five days of logged stress levels.
  Future<Map<String, dynamic>> stressPatternAnalysis({int days = 30}) async {
    final res = await _invoke('stress-pattern-analysis', {'days': days});
    return res['analysis'] as Map<String, dynamic>;
  }

  /// A single focused recommendation across all of the user's data. Pass
  /// [question] to have Claude answer something specific.
  Future<Map<String, dynamic>> wellnessRecommendation({String? question}) async {
    final res = await _invoke(
      'wellness-recommendation',
      if (question != null) {'question': question} else const {},
    );
    return res['recommendation'] as Map<String, dynamic>;
  }
}
