import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart' as fauth;
import 'package:shared_preferences/shared_preferences.dart';
import 'services/firestore_service.dart';
import 'models/app_user.dart';
import 'models/company.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/company_setup_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Robust initialization of Firebase Core with safe fallback catches
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase Core Initialization failed: $e. Operating in sandbox/mock simulation.");
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
          secondary: const Color(0xFF0F766E), // Teal Accent
          surface: Colors.white,
          background: const Color(0xFFF8FAFC),
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
  final _firestoreService = FirestoreService();
  bool _loading = true;
  AppUser? _currentUser;
  Company? _currentCompany;

  @override
  void initState() {
    super.initState();
    _checkActiveSession();
  }

  // Verify if a session uid exists locally or within Firebase Auth
  Future<void> _checkActiveSession() async {
    setState(() => _loading = true);
    
    try {
      final fauth.FirebaseAuth auth = fauth.FirebaseAuth.instance;
      final fauth.User? firebaseUser = auth.currentUser;

      if (firebaseUser != null) {
        final appUser = await _firestoreService.getUserProfile(firebaseUser.uid);
        if (appUser != null) {
          Company? comp;
          if (appUser.companyId.isNotEmpty) {
            comp = await _firestoreService.getCompany(appUser.companyId);
          }
          setState(() {
            _currentUser = appUser;
            _currentCompany = comp;
          });
        }
      }
    } catch (e) {
      debugPrint("Session check exception: $e");
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  // Handle successful login
  void _onLoginSuccess(AppUser user, Company? company) {
    setState(() {
      _currentUser = user;
      _currentCompany = company;
    });
  }

  // Handle company setup complete for newly registered admin
  void _onSetupComplete(AppUser updatedUser, Company company) {
    setState(() {
      _currentUser = updatedUser;
      _currentCompany = company;
    });
  }

  Future<void> _signOut() async {
    setState(() => _loading = true);
    try {
      final fauth.FirebaseAuth auth = fauth.FirebaseAuth.instance;
      await auth.signOut();
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('session_uid');

      setState(() {
        _currentUser = null;
        _currentCompany = null;
      });
    } catch (e) {
      debugPrint("Sign out error: $e");
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'INITIALIZING CONSOLE...',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
              )
            ],
          ),
        ),
      );
    }

    // Routing Logic based on User Profile registration and Company Setup
    if (_currentUser == null) {
      return Scaffold(
        body: SafeArea(
          child: LoginScreen(onLoginSuccess: _onLoginSuccess),
        ),
      );
    }

    // Admin without a registered companyId goes to Company Registration Setup Screen
    if (_currentUser!.role == 'admin' && _currentUser!.companyId.isEmpty) {
      return Scaffold(
        body: SafeArea(
          child: CompanySetupScreen(
            currentUser: _currentUser!,
            onSetupComplete: _onSetupComplete,
          ),
        ),
      );
    }

    // All active co-workers proceed directly to real-time interactive Dashboard
    return Scaffold(
      body: SafeArea(
        child: DashboardScreen(
          currentUser: _currentUser!,
          currentCompany: _currentCompany,
          onSignOut: _signOut,
        ),
      ),
    );
  }
}
