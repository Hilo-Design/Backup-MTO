import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'constants/colors.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/dashboard_screen.dart';

/// Bas Supabase project: jaynfestjiidkfwbhbhw (ap-southeast-1)
const String supabaseUrl = 'https://jaynfestjiidkfwbhbhw.supabase.co';

/// Paste the anon (public) key from Supabase -> Settings -> API.
const String supabaseAnonKey = 'YOUR_ANON_KEY_HERE';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  runApp(const ProviderScope(child: BasApp()));
}

class BasApp extends ConsumerWidget {
  const BasApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Bas',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: BasColors.primary),
        scaffoldBackgroundColor: BasColors.background,
        textTheme: GoogleFonts.poppinsTextTheme(),
      ),
      home: authState.when(
        data: (user) =>
            user == null ? const LoginScreen() : const DashboardScreen(),
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (err, _) => Scaffold(
          body: Center(child: Text('Auth error: $err')),
        ),
      ),
    );
  }
}
