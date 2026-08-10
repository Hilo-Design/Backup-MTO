import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shell.dart';
import 'theme.dart';

/// Bas Supabase project: jaynfestjiidkfwbhbhw (ap-southeast-1)
const String supabaseUrl = 'https://jaynfestjiidkfwbhbhw.supabase.co';

/// The anon key is safe in a client build — row-level security is what guards
/// the data. Never put the service-role key here.
const String supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpheW5mZXN0amlpZGtmd2JoYmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTkyMzMsImV4cCI6MjEwMTg3NTIzM30.eRPEXO38En-nKNFR4EFmNs2rUqm0MAkVlMELA27u9vU';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const ProviderScope(child: BasApp()));
}

class BasApp extends ConsumerWidget {
  const BasApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return MaterialApp(
      title: 'Bas',
      debugShowCheckedModeBanner: false,
      theme: basTheme(),
      home: PhoneFrame(
        child: auth.when(
          data: (user) => user == null ? const LoginScreen() : const Shell(),
          loading: () => const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          ),
          error: (e, _) => Scaffold(body: Center(child: Text('Auth error: $e'))),
        ),
      ),
    );
  }
}
