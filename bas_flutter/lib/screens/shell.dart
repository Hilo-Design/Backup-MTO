import 'package:flutter/material.dart';

import '../theme.dart';
import 'advisor_screen.dart';
import 'dashboard_screen.dart';
import 'log_screen.dart';
import 'meals_screen.dart';
import 'profile_screen.dart';
import 'trends_screen.dart';

/// Svasth's five-tab bottom bar. Advisor is deliberately absent — it is a real
/// route reached from the dashboard, not a tab.
class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _index = 0;

  static const _tabs = [
    (icon: Icons.dashboard_outlined, active: Icons.dashboard, label: 'Dashboard'),
    (icon: Icons.restaurant_outlined, active: Icons.restaurant, label: 'Meals'),
    (icon: Icons.assignment_outlined, active: Icons.assignment, label: 'Log'),
    (icon: Icons.trending_up_outlined, active: Icons.trending_up, label: 'Trends'),
    (icon: Icons.person_outline, active: Icons.person, label: 'Profile'),
  ];

  void _goTo(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardScreen(onOpenLog: () => _goTo(2), onOpenMeals: () => _goTo(1)),
      const MealsScreen(),
      const LogScreen(),
      const TrendsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: C.background,
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: Container(
        height: 80,
        decoration: const BoxDecoration(
          color: C.background,
          border: Border(top: BorderSide(color: C.border)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: List.generate(_tabs.length, (i) {
            final t = _tabs[i];
            final active = i == _index;
            return Expanded(
              child: InkWell(
                onTap: () => _goTo(i),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      active ? t.active : t.icon,
                      size: 24,
                      color: active ? C.primary : C.mutedFg,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      t.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                        color: active ? C.primary : C.mutedFg,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

/// Pushes the Advisor page, which lives outside the tab bar.
void openAdvisor(BuildContext context) => Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => const AdvisorScreen()),
    );
