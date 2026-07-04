import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' as fauth;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/firebase_auth_service.dart';
import '../services/firestore_service.dart';
import '../models/app_user.dart';
import '../models/company.dart';

class LoginScreen extends StatefulWidget {
  final Function(AppUser user, Company? company) onLoginSuccess;

  const LoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = FirebaseAuthService();
  final _firestoreService = FirestoreService();

  final _phoneController = TextEditingController(text: '+91 98765 43210');
  final _otpController = TextEditingController();
  final _nameController = TextEditingController();
  final _companyCodeController = TextEditingController();

  bool _showOtpField = false;
  bool _needsRegisterProfile = false;
  bool _isAdminRole = false;
  bool _loading = false;
  String? _verificationId;
  String? _errorMessage;

  String _selectedRole = 'supervisor'; // Default standard user level
  String _selectedDept = 'Production';
  String _selectedPlant = 'Pen Plant';

  final List<String> _departments = [
    'Production', 'Engineering', 'QA', 'QC', 'IPQA', 'HR', 'Admin', 'Security', 'Accounts'
  ];

  final List<String> _plants = ['Pen Plant', 'Non-Pen Plant', 'Both'];

  final Map<String, String> _allowedRoles = {
    'supervisor': 'Supervisor (Report & Confirm Resolved)',
    'user': 'Standard Operator (Raise Breakdowns)',
    'manager': 'Maintenance Engineer (Respond & Assign)',
  };

  void _showError(String msg) {
    setState(() {
      _errorMessage = msg;
    });
  }

  // Step 1: Submit phone number to Firebase Auth to receive OTP
  Future<void> _requestOtp() async {
    final phoneNum = _phoneController.text.trim();
    if (phoneNum.isEmpty || phoneNum.length < 10) {
      _showError('Please enter a valid mobile number with country code.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      await _authService.verifyPhone(
        phoneNumber: phoneNum,
        onCodeSent: (verId) {
          setState(() {
            _loading = false;
            _verificationId = verId;
            _showOtpField = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Verification OTP code sent successfully!'),
              backgroundColor: Color(0xFF1E293B),
            ),
          );
        },
        onFailed: (e) {
          setState(() {
            _loading = false;
          });
          _showError('Phone verification failed: ${e.message ?? e.toString()}');
        },
        onAutoVerify: (credential) {
          debugPrint('Automatic phone OTP verification completed.');
        },
      );
    } catch (e) {
      setState(() {
        _loading = false;
      });
      _showError('Authentication server exception: $e');
    }
  }

  // Step 2: Verify the entered OTP security code
  Future<void> _verifyOtp() async {
    final code = _otpController.text.trim();
    if (code.isEmpty || code.length < 6) {
      _showError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (_verificationId == null) {
      _showError('Session expired. Please request a new OTP.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final credentials = await _authService.signInWithOtp(
        verificationId: _verificationId!,
        smsCode: code,
      );

      final firebaseUser = credentials.user;
      if (firebaseUser != null) {
        // Look up profile inside Firestore
        final appUser = await _firestoreService.getUserProfile(firebaseUser.uid);
        
        if (appUser != null) {
          // Profile exists! Navigate to Dashboard
          final company = appUser.companyId.isNotEmpty 
              ? await _firestoreService.getCompany(appUser.companyId)
              : null;

          // Save session cache
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('session_uid', appUser.uid);

          widget.onLoginSuccess(appUser, company);
        } else {
          // No profile registered yet! Show registration profile form
          setState(() {
            _loading = false;
            _needsRegisterProfile = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Number verified! Please create your profile directory below.'),
              backgroundColor: Colors.indigo,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
      _showError('Incorrect code entered. Please try again.');
    }
  }

  // Step 3: Complete registration of a new user profile
  Future<void> _registerProfile() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _showError('Please enter your full representative name.');
      return;
    }

    final uid = _authService.currentUid;
    final phone = _authService.currentPhone ?? _phoneController.text.trim();

    if (uid == null) {
      _showError('Session expired. Please re-verify your phone number.');
      return;
    }

    String companyCode = '';
    if (!_isAdminRole) {
      companyCode = _companyCodeController.text.trim().toUpperCase();
      if (companyCode.isEmpty) {
        _showError('Please specify the Company Invite Code to join.');
        return;
      }
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      Company? targetCompany;
      if (!_isAdminRole) {
        // Validate company code
        targetCompany = await _firestoreService.getCompany(companyCode);
        if (targetCompany == null) {
          setState(() {
            _loading = false;
          });
          _showError('Company with invite code $companyCode does not exist. Please check with your Admin.');
          return;
        }
      }

      // Create new user profile object
      final newUser = AppUser(
        uid: uid,
        phone: phone,
        name: name,
        role: _isAdminRole ? 'admin' : _selectedRole,
        companyId: companyCode,
        department: _isAdminRole ? 'Admin' : _selectedDept,
        plant: _isAdminRole ? 'Both' : _selectedPlant,
        approved: _isAdminRole ? true : false, // Admin auto-approved; others pending
        createdAt: DateTime.now(),
      );

      await _firestoreService.createUserProfile(newUser);

      // Save local session cache
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_uid', uid);

      setState(() {
        _loading = false;
      });

      widget.onLoginSuccess(newUser, targetCompany);

    } catch (e) {
      setState(() {
        _loading = false;
      });
      _showError('Error creating profile: $e');
    }
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
            const Icon(
              Icons.domain_verification,
              size: 72,
              color: Color(0xFF1E293B),
            ),
            const SizedBox(height: 12),
            const Text(
              'BREAKDOWN CONTROL CENTER',
              style: TextStyle(
                fontFamily: 'Space Grotesk',
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
            const Text(
              'Engineering Breakdown Monitor App',
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
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
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

            if (!_needsRegisterProfile) ...[
              // Phone Input Screen
              const Text(
                'Mobile Phone Number',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                enabled: !_showOtpField,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.phone_iphone),
                  hintText: '+91 98765 43210',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),

              if (_showOtpField) ...[
                const Text(
                  'Enter 6-Digit OTP security pin',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock_clock),
                    hintText: '123456',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              _loading
                  ? const Center(child: Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator()))
                  : ElevatedButton(
                      onPressed: _showOtpField ? _verifyOtp : _requestOtp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(
                        _showOtpField ? 'VERIFY SECURITY PIN' : 'REQUEST SECURE OTP',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                    ),
            ] else ...[
              // Profile Registration fields
              const Center(
                child: Text(
                  'COMPLETE PROFILE DIRECTORY',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.indigo),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: !_isAdminRole ? const Color(0xFF1E293B) : Colors.transparent,
                        foregroundColor: !_isAdminRole ? Colors.white : const Color(0xFF1E293B),
                        side: const BorderSide(color: Color(0xFF1E293B)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: () => setState(() => _isAdminRole = false),
                      child: const Text('Join Company Profile', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _isAdminRole ? const Color(0xFF1E293B) : Colors.transparent,
                        foregroundColor: _isAdminRole ? Colors.white : const Color(0xFF1E293B),
                        side: const BorderSide(color: Color(0xFF1E293B)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: () => setState(() => _isAdminRole = true),
                      child: const Text('New Admin Enterprise', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              const Text(
                'Full Representative Name',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _nameController,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.person),
                  hintText: 'John Doe',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),

              if (!_isAdminRole) ...[
                const Text(
                  'Company Invite Code',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _companyCodeController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.apartment),
                    hintText: 'KOPRAN',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),

                const Text(
                  'System Role Category',
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
                  onChanged: (val) => setState(() => _selectedRole = val!),
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Department', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _selectedDept,
                            items: _departments.map((dept) => DropdownMenuItem(value: dept, child: Text(dept, style: const TextStyle(fontSize: 11)))).toList(),
                            onChanged: (val) => setState(() => _selectedDept = val!),
                            decoration: const InputDecoration(border: OutlineInputBorder()),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Primary Plant', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _selectedPlant,
                            items: _plants.map((plt) => DropdownMenuItem(value: plt, child: Text(plt, style: const TextStyle(fontSize: 11)))).toList(),
                            onChanged: (val) => setState(() => _selectedPlant = val!),
                            decoration: const InputDecoration(border: OutlineInputBorder()),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ] else ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.indigo[50],
                    border: Border.all(color: Colors.indigo.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '🌟 Registering as a Workspace Admin: You will create your secure company console immediately after registering. Other team members can then join using your custom Invite Code.',
                    style: TextStyle(color: Colors.indigo[900], fontSize: 11, height: 1.4),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _registerProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('CREATE USER PROFILE', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
            ],

            if (_showOtpField || _needsRegisterProfile) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  setState(() {
                    _showOtpField = false;
                    _needsRegisterProfile = false;
                    _verificationId = null;
                    _otpController.clear();
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
