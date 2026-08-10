import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../theme.dart';

/// Svasth's landing and Clerk sign-in, collapsed into one screen.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _isSignUp = false;
  String? _localError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String? _validate() {
    final email = _email.text.trim();
    if (email.isEmpty) return 'Enter your email address.';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      return "That doesn't look like an email address.";
    }
    if (_password.text.isEmpty) return 'Enter your password.';
    if (_isSignUp && _password.text.length < 6) {
      return 'Password needs to be at least 6 characters.';
    }
    return null;
  }

  Future<void> _submit() async {
    final problem = _validate();
    if (problem != null) {
      setState(() => _localError = problem);
      return;
    }
    setState(() => _localError = null);

    final notifier = ref.read(authNotifierProvider.notifier);
    if (_isSignUp) {
      await notifier.signUp(_email.text, _password.text);
    } else {
      await notifier.signIn(_email.text, _password.text);
    }

    if (!mounted) return;
    // Sign-up with confirmation on returns a user but no session, so the auth
    // gate never moves. Say so rather than looking like nothing happened.
    if (_isSignUp && !ref.read(authNotifierProvider).hasError) {
      if (ref.read(supabaseProvider).auth.currentSession == null) {
        setState(() => _localError =
            'Account created. Check your email for a confirmation link, '
            'then sign in.');
      }
    }
  }

  String _friendly(Object error) {
    final raw = error.toString().toLowerCase();
    if (raw.contains('invalid login credentials')) {
      return 'That email and password combination did not work.';
    }
    if (raw.contains('already registered') || raw.contains('already exists')) {
      return 'That email already has an account. Try signing in.';
    }
    if (raw.contains('email not confirmed')) {
      return 'Confirm your email first — check your inbox for the link.';
    }
    if (raw.contains('over_email_send_rate_limit') ||
        raw.contains('only request this after')) {
      return 'Your account was created, but we cannot send another '
          'confirmation email just yet. Wait a minute, then sign in.';
    }
    if (raw.contains('rate limit') || raw.contains('too many')) {
      return 'Too many attempts. Wait a minute and try again.';
    }
    if (raw.contains('failed host lookup') || raw.contains('socketexception')) {
      return 'No connection. Check your network and try again.';
    }
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authNotifierProvider);
    final busy = state.isLoading;

    return Scaffold(
      backgroundColor: C.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(
                    color: C.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.eco_outlined,
                      color: Color(0xFFF5A623), size: 34),
                ),
                const SizedBox(height: 16),
                Text('Bas',
                    style: serif(
                        size: 36,
                        weight: FontWeight.bold,
                        color: C.primary)),
                const SizedBox(height: 4),
                Text(
                  'सेहत — your health, your way',
                  style: TextStyle(
                      fontSize: 14, color: C.secondary, letterSpacing: 0.4),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Track meals, water, sleep & more — bina jhanjhat.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: C.mutedFg),
                ),
                const SizedBox(height: 36),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(labelText: 'Email'),
                  onChanged: (_) {
                    if (_localError != null) {
                      setState(() => _localError = null);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton.icon(
                    onPressed: busy ? null : _submit,
                    icon: busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child:
                                CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome, size: 18),
                    label: Text(
                      _isSignUp ? 'Shuru karein — it\'s free' : 'Sign in',
                    ),
                  ),
                ),
                TextButton(
                  onPressed:
                      busy ? null : () => setState(() => _isSignUp = !_isSignUp),
                  child: Text(
                    _isSignUp
                        ? 'Already have an account? Sign in'
                        : "Don't have an account? Sign up",
                    style: const TextStyle(color: C.primary),
                  ),
                ),
                if (_localError != null || state.hasError)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _localError ?? _friendly(state.error!),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: C.destructive),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
