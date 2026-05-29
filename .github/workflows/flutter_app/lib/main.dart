import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Clean initialization of saved variables
  final prefs = await SharedPreferences.getInstance();
  if (prefs.getString('kopran_env_mode') == null) {
    prefs.setString('kopran_env_mode', 'production'); // Default to Production (Live)!
  }
  if (prefs.getString('custom_backend_url') == null) {
    prefs.setString('custom_backend_url', ApiService.baseProductionUrl);
  }

  runApp(const KopranBreakdownSystemApp());
}

class KopranBreakdownSystemApp extends StatelessWidget {
  const KopranBreakdownSystemApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kopran Breakdown System',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Inter',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5), // Indigo Accent
          primary: const Color(0xFF1E293B),   // Dark Navy
          secondary: const Color(0xFF0F766E), // Teal
          surface: Colors.white,
          background: const Color(0xFFF8FAFC), // Slate 50
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E293B),
          foregroundColor: Colors.white,
          elevation: 2,
        ),
      ),
      home: const AuthSessionWrapper(),
    );
  }
}

class AuthSessionWrapper extends StatefulWidget {
  const AuthSessionWrapper({super.key});

  @override
  State<AuthSessionWrapper> createState() => _AuthSessionWrapperState();
}

class _AuthSessionWrapperState extends State<AuthSessionWrapper> {
  bool _loading = true;
  Map<String, dynamic>? _userObj;
  String _envMode = 'production';

  @override
  void initState() {
    super.initState();
    _checkUserSession();
  }

  Future<void> _checkUserSession() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('shift_sync_user');
    final savedEnv = prefs.getString('kopran_env_mode') ?? 'production';

    setState(() {
      _envMode = savedEnv;
      if (userJson != null) {
        _userObj = jsonDecode(userJson);
      }
      _loading = false;
    });
  }

  Future<void> _toggleEnvMode() async {
    final prefs = await SharedPreferences.getInstance();
    final nextMode = _envMode == 'production' ? 'testing' : 'production';
    await prefs.setString('kopran_env_mode', nextMode);
    
    // Clear user session to enforce re-auth or fresh configuration on environment migration
    await prefs.remove('shift_sync_user');

    setState(() {
      _envMode = nextMode;
      _userObj = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Switched to ${nextMode.toUpperCase()} environment mode successfully!'),
        backgroundColor: nextMode == 'testing' ? Colors.amber[800] : Colors.green[800],
      ),
    );
  }

  Future<void> _signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('shift_sync_user');
    setState(() {
      _userObj = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final isTestMode = _envMode == 'testing';

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Safe Global Header Notification Banner
            GestureDetector(
              onTap: _toggleEnvMode,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                color: isTestMode ? const Color(0xFFF59E0B) : const Color(0xFF047857),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isTestMode ? Icons.science_outlined : Icons.bolt,
                      color: isTestMode ? const Color(0xFF451A03) : Colors.white,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        isTestMode
                            ? '🧪 SANDBOX TESTING MODE (CLOSED GROUP)'
                            : '⚡ REAL-TIME PRODUCTION MODE (LIVE)',
                        style: TextStyle(
                          color: isTestMode ? const Color(0xFF451A03) : Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'SWITCH',
                        style: TextStyle(
                          color: isTestMode ? const Color(0xFF451A03) : Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: _userObj == null
                  ? LoginScreen(
                      onLoginSuccess: (user) {
                        setState(() {
                          _userObj = user;
                        });
                      },
                    )
                  : DashboardScreen(
                      currentUser: _userObj!,
                      onSignOut: _signOut,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
