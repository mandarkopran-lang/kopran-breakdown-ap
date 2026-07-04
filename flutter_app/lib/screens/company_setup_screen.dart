import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/firestore_service.dart';
import '../models/app_user.dart';
import '../models/company.dart';

class CompanySetupScreen extends StatefulWidget {
  final AppUser currentUser;
  final Function(AppUser updatedUser, Company company) onSetupComplete;

  const CompanySetupScreen({
    super.key,
    required this.currentUser,
    required this.onSetupComplete,
  });

  @override
  State<CompanySetupScreen> createState() => _CompanySetupScreenState();
}

class _CompanySetupScreenState extends State<CompanySetupScreen> {
  final _firestoreService = FirestoreService();
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _logoUrlController = TextEditingController();
  bool _submitting = false;

  final List<Map<String, String>> _logoPresets = [
    {
      'title': 'Industrial Teal',
      'url': 'https://images.unsplash.com/photo-1513828742140-ccaa34f32678?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Digital Blue',
      'url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Precision Amber',
      'url': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Pharma Green',
      'url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=60',
    },
  ];

  String _selectedPreset = '';

  Future<void> _handleRegisterCompany() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
    });

    try {
      final name = _nameController.text.trim();
      final logoUrl = _logoUrlController.text.trim();

      // Generate secure unique invite code
      final String cleanPrefix = name.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
      final String shortPrefix = cleanPrefix.length > 5 ? cleanPrefix.substring(0, 5) : cleanPrefix;
      final String suffix = DateTime.now().millisecondsSinceEpoch.toString().substring(10);
      final String companyId = '$shortPrefix-$suffix';

      final List<String> defaultPlants = ['Pen Plant', 'Non-Pen Plant', 'Packaging Plant'];
      final List<String> defaultDepts = ['Production', 'Engineering', 'QA', 'QC', 'Admin'];

      // Create company model
      final company = Company(
        id: companyId,
        name: name,
        logoUrl: logoUrl,
        plants: defaultPlants,
        departments: defaultDepts,
        createdAt: DateTime.now(),
      );

      // Save company inside Firestore
      await _firestoreService.createCompany(company);

      // Link Admin user profile with companyId
      final updatedUser = widget.currentUser.copyWith(
        companyId: companyId,
        approved: true,
      );

      await _firestoreService.createUserProfile(updatedUser);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Welcome! Company $name registered. Invite code is $companyId'),
          backgroundColor: Colors.green[800],
        ),
      );

      widget.onSetupComplete(updatedUser, company);

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registration error: $e'),
          backgroundColor: Colors.red[800],
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.slate.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(28.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Icon(
                            Icons.domain,
                            size: 56,
                            color: Colors.indigo[800],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            'One-Time Setup',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Colors.indigo[600],
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Center(
                          child: Text(
                            'REGISTER YOUR COMPANY',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Center(
                          child: Text(
                            'Please enter your official enterprise details below. This registers a secure, isolated database tenant workspace and generates dynamic invite credentials.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: Colors.slate, height: 1.4),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Divider(),
                        const SizedBox(height: 16),

                        const Text(
                          'Company Name',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.text,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'e.g. Engineering Group',
                            prefixIcon: const Icon(Icons.business, size: 18),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Company Name is required.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        const Text(
                          'Company Logo Icon URL',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _logoUrlController,
                          keyboardType: TextInputType.url,
                          style: const TextStyle(fontSize: 11),
                          decoration: InputDecoration(
                            hintText: 'e.g. https://domain.com/logo.png',
                            prefixIcon: const Icon(Icons.image_outlined, size: 18),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                        const SizedBox(height: 12),

                        const Text(
                          '— OR CHOOSE AN AESTHETIC THEME PRESET Logo',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _logoPresets.map((preset) {
                            final isCur = _selectedPreset == preset['title'];
                            return ChoiceChip(
                              label: Text(
                                preset['title']!,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isCur ? Colors.white : Colors.indigo[800],
                                ),
                              ),
                              selected: isCur,
                              selectedColor: Colors.indigo[700],
                              backgroundColor: Colors.indigo[50],
                              onSelected: (_) {
                                setState(() {
                                  _selectedPreset = preset['title']!;
                                  _logoUrlController.text = preset['url']!;
                                });
                              },
                            );
                          }).toList(),
                        ),

                        const SizedBox(height: 28),
                        _submitting
                            ? const Center(child: CircularProgressIndicator())
                            : SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _handleRegisterCompany,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0F172A),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: const Text(
                                    'INITIALIZE WORKSPACE CONSOLE',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                                  ),
                                ),
                              ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
