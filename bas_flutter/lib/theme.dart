import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Ported from Svasth's index.css. The source defines a `.dark` block that is
/// byte-identical to light, so there is deliberately only one theme here.
class C {
  static const background = Color(0xFFFAF8F5);
  static const foreground = Color(0xFF1A1D23);
  static const card = Color(0xFFFBFAF9);
  static const cardBorder = Color(0xFFE9E7E2);
  static const border = Color(0xFFE5E2DC);

  static const primary = Color(0xFF195744); // deep green
  static const primaryFg = Color(0xFFFAFAFA);
  static const secondary = Color(0xFFE79455); // terracotta
  static const secondaryFg = Color(0xFF1A1D23);

  static const muted = Color(0xFFF1EEEA);
  static const mutedFg = Color(0xFF676F7E);
  static const accent = Color(0xFFE2F3EE);
  static const destructive = Color(0xFFD92626);

  static const water = Color(0xFF3B82F6);
  static const flame = Color(0xFFF97316);

  static const chartWeight = Color(0xFF337799);
  static const chartEnergy = Color(0xFFE79455);
  static const chartSteps = Color(0xFF8245A1);

  static const radius = 16.0;

  /// Svasth's signature shadow: a hard 2px "ledge" with no blur, plus an
  /// optional soft blur. Flat and printed rather than diffuse.
  static const shadowXs = [
    BoxShadow(color: Color(0x0F1A1D23), offset: Offset(0, 2), blurRadius: 0),
  ];
  static const shadowSm = [
    BoxShadow(color: Color(0x0F1A1D23), offset: Offset(0, 2), blurRadius: 0),
    BoxShadow(
        color: Color(0x141A1D23),
        offset: Offset(0, 1),
        blurRadius: 2,
        spreadRadius: -1),
  ];
  static const shadowLg = [
    BoxShadow(color: Color(0x0F1A1D23), offset: Offset(0, 2), blurRadius: 0),
    BoxShadow(
        color: Color(0x141A1D23),
        offset: Offset(0, 4),
        blurRadius: 6,
        spreadRadius: -1),
  ];
}

/// Svasth uses system Georgia for headings. Gelasio is the closest Google font.
TextStyle serif({
  double size = 20,
  FontWeight weight = FontWeight.w500,
  Color color = C.foreground,
}) =>
    GoogleFonts.gelasio(fontSize: size, fontWeight: weight, color: color);

/// The eyebrow above every page title, where the Hindi lives. No toUpperCase —
/// it does nothing to Devanagari.
TextStyle eyebrow() => GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: C.secondary,
      letterSpacing: 1.2,
    );

TextStyle sectionHeading() => GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: C.mutedFg,
      letterSpacing: 0.6,
    );

ThemeData basTheme() {
  final base = ThemeData(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: C.background,
    colorScheme: const ColorScheme.light(
      primary: C.primary,
      onPrimary: C.primaryFg,
      secondary: C.secondary,
      onSecondary: C.secondaryFg,
      surface: C.card,
      onSurface: C.foreground,
      error: C.destructive,
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme)
        .apply(bodyColor: C.foreground, displayColor: C.foreground),
    dividerColor: C.border,
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.primary,
        foregroundColor: C.primaryFg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: C.foreground,
        backgroundColor: C.card,
        side: const BorderSide(color: C.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: C.card,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: C.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: C.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: C.primary),
      ),
    ),
    sliderTheme: base.sliderTheme.copyWith(
      activeTrackColor: C.primary,
      thumbColor: C.primary,
      inactiveTrackColor: C.muted,
    ),
  );
}

/// The 430px phone frame Svasth renders inside, centred on wider screens.
class PhoneFrame extends StatelessWidget {
  const PhoneFrame({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: C.muted,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: ColoredBox(color: C.background, child: child),
          ),
        ),
      );
}

class SvCard extends StatelessWidget {
  const SvCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = C.radius,
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        padding: padding,
        decoration: BoxDecoration(
          color: C.card,
          border: Border.all(color: C.cardBorder),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: C.shadowXs,
        ),
        child: child,
      );
}

/// Sticky page header: Hindi eyebrow over a serif title.
class PageHeader extends StatelessWidget {
  const PageHeader({
    required this.eyebrowText,
    required this.title,
    this.trailing,
    this.leading,
    super.key,
  });

  final String eyebrowText;
  final String title;
  final Widget? trailing;
  final Widget? leading;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: C.background,
          border: Border(bottom: BorderSide(color: C.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(eyebrowText, style: eyebrow()),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (leading != null) leading!,
                      Flexible(child: Text(title, style: serif())),
                    ],
                  ),
                ],
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      );
}
