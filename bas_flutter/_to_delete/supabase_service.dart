import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin data layer over the Bas Postgres schema (19 tables, RLS enabled).
class SupabaseService {
  SupabaseService(this.client);

  final SupabaseClient client;

  static String _day(DateTime d) => d.toIso8601String().split('T').first;

  // ---------------------------------------------------------------- daily_logs
  Future<List<Map<String, dynamic>>> getDailyLogs(
    String userId, {
    int days = 30,
  }) async {
    final from = DateTime.now().subtract(Duration(days: days));
    final rows = await client
        .from('daily_logs')
        .select()
        .eq('user_id', userId)
        .gte('date', _day(from))
        .order('date', ascending: false);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  /// One row per user per day, so upsert on the (user_id, date) unique key.
  Future<void> saveDailyLog(String userId, Map<String, dynamic> data) async {
    await client.from('daily_logs').upsert(
      {'user_id': userId, 'date': _day(DateTime.now()), ...data},
      onConflict: 'user_id,date',
    );
  }

  // --------------------------------------------------------------------- meals
  Future<List<Map<String, dynamic>>> getMeals(
    String userId, {
    int days = 30,
  }) async {
    final from = DateTime.now().subtract(Duration(days: days));
    final rows = await client
        .from('meals')
        .select()
        .eq('user_id', userId)
        .gte('meal_date', _day(from))
        .order('meal_date', ascending: false);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  /// Uploads into the private `meal_photos` bucket under `<userId>/`, which is
  /// what the storage RLS policies key off. Returns the object path, not a URL
  /// — a private bucket has no public URL. `meals.photo_url` stores this path.
  ///
  /// `meals.photo_url` is NOT NULL, so upload before inserting the row.
  Future<String> uploadMealPhoto(
    String userId,
    Uint8List bytes, {
    String contentType = 'image/jpeg',
  }) async {
    final ext = contentType.split('/').last.replaceAll('jpeg', 'jpg');
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.$ext';

    await client.storage.from('meal_photos').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: contentType),
        );
    return path;
  }

  /// Time-limited URL for displaying a stored meal photo. Defaults to one hour.
  Future<String> signedPhotoUrl(String path, {int expiresIn = 3600}) {
    return client.storage.from('meal_photos').createSignedUrl(path, expiresIn);
  }

  /// Returns the new meal's id, which `AiService.analyzeMealPhoto` needs.
  Future<String> saveMeal(String userId, Map<String, dynamic> data) async {
    final row = await client
        .from('meals')
        .insert({'user_id': userId, ...data})
        .select('id')
        .single();
    return row['id'] as String;
  }

  // ----------------------------------------------------------- health profiles
  Future<Map<String, dynamic>?> getHealthProfile(String userId) async {
    return await client
        .from('health_profiles')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
  }

  Future<void> saveHealthProfile(
    String userId,
    Map<String, dynamic> data,
  ) async {
    await client.from('health_profiles').upsert(
      {'user_id': userId, ...data},
      onConflict: 'user_id',
    );
  }

  // ------------------------------------------------------------- user profiles
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    return await client
        .from('user_profiles')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
  }

  // --------------------------------------------------------------- ai_insights
  Future<List<Map<String, dynamic>>> getAIInsights(
    String userId, {
    int days = 7,
  }) async {
    final from = DateTime.now().subtract(Duration(days: days));
    final rows = await client
        .from('ai_insights')
        .select()
        .eq('user_id', userId)
        .gte('insight_date', _day(from))
        .order('insight_date', ascending: false);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  // ------------------------------------------------------------ wellness_posts
  Future<List<Map<String, dynamic>>> getPublicFeed({int limit = 20}) async {
    final rows = await client
        .from('wellness_posts')
        .select()
        .eq('is_visible_to_public', true)
        .order('created_at', ascending: false)
        .limit(limit);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  Future<void> createPost(String userId, Map<String, dynamic> data) async {
    await client.from('wellness_posts').insert({'user_id': userId, ...data});
  }
}
