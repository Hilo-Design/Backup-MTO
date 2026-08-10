import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

/// Svasth's CircularProgress: track + rounded-cap arc starting at 12 o'clock,
/// sweeping clockwise, with a value/label/sublabel stack in the middle.
class CircularProgress extends StatelessWidget {
  const CircularProgress({
    required this.value,
    required this.max,
    required this.label,
    required this.sublabel,
    required this.color,
    this.size = 120,
    this.strokeWidth = 12,
    super.key,
  });

  final double value, max;
  final String label, sublabel;
  final Color color;
  final double size, strokeWidth;

  @override
  Widget build(BuildContext context) {
    final fraction = max <= 0 ? 0.0 : (value / max).clamp(0.0, 1.0);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: fraction),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOut,
            builder: (_, f, __) => CustomPaint(
              size: Size.square(size),
              painter: _RingPainter(f, color, strokeWidth),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value.round().toString(),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: C.foreground,
                  height: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: C.mutedFg,
                  letterSpacing: 0.6,
                ),
              ),
              Text(
                sublabel,
                style: const TextStyle(fontSize: 9, color: C.mutedFg),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction, this.color, this.stroke);

  final double fraction;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final centre = size.center(Offset.zero);
    final radius = (size.width - stroke) / 2;

    final track = Paint()
      ..color = C.muted
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawCircle(centre, radius, track);

    if (fraction <= 0) return;
    final arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: centre, radius: radius),
      -math.pi / 2,
      2 * math.pi * fraction,
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.fraction != fraction || old.color != color;
}

/// Svasth's ProgressBar: label row above an 8px fully-rounded track.
class ProgressBarRow extends StatelessWidget {
  const ProgressBarRow({
    required this.label,
    required this.value,
    required this.max,
    required this.color,
    super.key,
  });

  final String label;
  final double value, max;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final fraction = max <= 0 ? 0.0 : (value / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: C.mutedFg,
              ),
            ),
            Text(
              '${value.round()} / ${max.round()}',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: C.foreground,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: fraction),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOut,
            builder: (_, f, __) => LinearProgressIndicator(
              value: f,
              minHeight: 8,
              backgroundColor: C.muted,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ),
      ],
    );
  }
}
