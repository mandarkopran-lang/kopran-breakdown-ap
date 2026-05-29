import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_service.dart';

class LoginScreen extends StatefulWidget {
  final Function(Map<String, dynamic> user) onLoginSuccess;

  const LoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobileController = TextEditingController(text: '+91 98765 43210');
  final _otpController = TextEditingController();
  final _nameController = TextEditingController();

  bool _showOtpField = false;
  bool _needsRegister = false;
  bool _loading = false;
  String? _errorMessage;

  String _selectedRole = 'supervisor'; // default restricted standard role
  String _selectedDept = 'Production';
  String _selectedPlant = 'Plant 1';

  final List<String> _departments = [
    'Production', 'Engineering', 'QA', 'QC', 'IPQA', 'HR', 'Admin', 'Security', 'Accounts'
  ];

  final List<String> _plants = ['Plant 1', 'Plant 2', 'Both'];

  // Allowed restricted standard roles to prevent self-registering senior roles
  final Map<String, String> _allowedRoles = {
    'supervisor': 'Supervisor (Raise issues & confirm resolution)',
    'engineering_officer': 'Engineering Officer (Respond & Self-Assign)',
  };

  void _handleRequestOtp() async {
    final mob = _mobileController.text.trim();
    if (mob.isEmpty) {
      _showErr('Please enter a valid mobile number.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.requestOtp(
        mobile: mob,
        name: _needsRegister ? _nameController.text.trim() : null,
        role: _needsRegister ? _selectedRole : null,
        department: _needsRegister ? _selectedDept : null,
        plant: _needsRegister ? _selectedPlant : null,
      );

      if (res['exists'] == false && !_needsRegister) {
        setState(() {
          _needsRegister = true;
          _loading = false;
        });
        _showSuccess('New number detected. Please fill profile details below.');
        return;
      }

      setState(() {
        _showOtpField = true;
        _loading = false;
      });
      _showSuccess('OTP Sent Successfully! Hint: Use code 123456');

    } catch (e) {
      _showErr('Backend error connecting to main console: $e');
      setState(() {
        _loading = false;
      });
    }
  }

  void _handleVerifyOtp() async {
    final mob = _mobileController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.isEmpty) {
      _showErr('Please enter OTP security code.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.verifyOtp(mob, otp);

      if (res['success'] == true) {
        final Map<String, dynamic> user = res['user'];
        
        // Cache session permanently locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('shift_sync_user', jsonEncode(user));

        widget.onLoginSuccess(user);
      } else {
        _showErr(res['error'] ?? 'Incorrect security credentials. Please try again.');
        setState(() {
          _loading = false;
        });
      }
    } catch (e) {
      _showErr('verification connection failed: $e');
      setState(() {
        _loading = false;
      });
    }
  }

  void _showErr(String msg) {
    setState(() {
      _errorMessage = msg;
    });
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Colors.indigo[800],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Company Header Logo Mockup
            const Icon(
              Icons.domain_verification,
              size: 64,
              color: Color(0xFF1E293B),
            ),
            const SizedBox(height: 12),
            const Text(
              'KOPRAN ENGINEERING',
              style: TextStyle(
                fontFamily: 'Space Grotesk',
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
            const Text(
              'Shift-Sync Machine Breakdown System',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  border: Border.all(color: Colors.red.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Phone Field
            const Text(
              'Mobile Phone Number',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _mobileController,
              keyboardType: TextInputType.phone,
              enabled: !_showOtpField && !_needsRegister,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.phone_iphone),
                hintText: '+91 XXXXX XXXXX',
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 16),

            // Profile details form for new user registration
            if (_needsRegister && !_showOtpField) ...[
              const Text(
                'Full Representative Name',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _nameController,
                keyboardType: TextInputType.name,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.person),
                  hintText: 'Enter First & Last Name',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),

              const Text(
                'System Role (Alloted Security Group)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedRole,
                items: _allowedRoles.entries.map((entry) {
                  return DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 12)),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedRole = val!;
                  });
                },
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber[50],
                  border: Border.all(color: Colors.amber.shade200),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '🔒 Role Restrictions Active: High role privileges (Managers/Heads/Admins) are locked to safe delegation by System Admins inside the Team Directory to prevent spoofing.',
                  style: TextStyle(color: Colors.amber[900], fontSize: 9, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Department',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedDept,
                          items: _departments.map((dept) {
                            return DropdownMenuItem(
                              value: dept,
                              child: Text(dept, style: const TextStyle(fontSize: 12)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() {
                              _selectedDept = val!;
                            });
                          },
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Primary Plant',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedPlant,
                          items: _plants.map((plt) {
                            return DropdownMenuItem(
                              value: plt,
                              child: Text(plt, style: const TextStyle(fontSize: 12)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() {
                              _selectedPlant = val!;
                            });
                          },
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            // OTP validation trigger field
            if (_showOtpField) ...[
              const Text(
                'Enter Security Code PIN (OTP)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.lock_clock),
                  hintText: 'Enter 6 digit code',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),
            ],

            _loading
                ? const Center(child: Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator()))
                : ElevatedButton(
                    onPressed: _showOtpField ? _handleVerifyOtp : _handleRequestOtp,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      _showOtpField
                          ? 'VERIFY SECURITY PIN'
                          : _needsRegister
                              ? 'REGISTER ACCOUNT PROFILE'
                              : 'REQUEST SECURE OTP',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                    ),
                  ),

            if (_showOtpField || _needsRegister) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  setState(() {
                    _showOtpField = false;
                    _needsRegister = false;
                  });
                },
                child: const Text('Back / Try another mobile number', style: TextStyle(fontSize: 11, color: Colors.blue)),
              )
            ],
          ],
        ),
      ),
    );
  }
}
