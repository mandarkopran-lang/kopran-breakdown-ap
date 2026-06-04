import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../api_service.dart';

class CompanySetupScreen extends StatefulWidget {
  final Map<String, dynamic> currentUser;
  final Function(Map<String, dynamic>) onSetupComplete;

  const CompanySetupScreen({
    super.key,
    required this.currentUser,
    required this.onSetupComplete,
  });

  @override
  State<CompanySetupScreen> createState() => _CompanySetupScreenState();
}

class _CompanySetupScreenState extends State<CompanySetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _logoUrlController = TextEditingController();
  bool _submitting = false;

  // Custom premium logo presets for friendly experience
  final List<Map<String, String>> _logoPresets = [
    {
      'title': 'Industrial Green',
      'url': 'https://images.unsplash.com/photo-1513828742140-ccaa34f32678?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Tech Blue',
      'url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Pharma Accent',
      'url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=60',
    },
    {
      'title': 'Precision Orange',
      'url': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=150&auto=format&fit=crop&q=60',
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

      final res = await ApiService.registerNewCompany(name, logoUrl);

      if (res['success'] == true) {
        final Map<String, dynamic> updatedUser = res['user'];
        final Map<String, dynamic> company = res['company'];

        // Persist to SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('shift_sync_user', jsonEncode(updatedUser));
        await prefs.setString('shift_sync_company', jsonEncode(company));

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Welcome! ${name} registration initialized successfully.', style: const TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.green[800],
          ),
        );

        // Notify parent state to switch screen to Dashboard
        widget.onSetupComplete(updatedUser);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Company registration failed. Please try again.'),
            backgroundColor: Colors.red[800],
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Networking error: $e'),
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
              // Headline Title
              Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade100, width: 1.5),
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
                            size: 48,
                            color: Colors.indigo[800],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            'One-Time Setup',
                            style: TextStyle(
                              fontSize: 12,
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
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Center(
                          child: Text(
                            'Please enter your official enterprise details below. This registers a secure, isolated sandbox tenant workspace and generates dynamic invite credentials.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                              height: 1.45,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Divider(),
                        const SizedBox(height: 16),

                        // Company name entry field
                        const Text(
                          'Company Name',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          keyboardType: TextInputType.text,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                          decoration: InputDecoration(
                            hintText: 'e.g. Kopran Engineering Group',
                            prefixIcon: const Icon(Icons.business, size: 18),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: Colors.indigo.shade400, width: 2),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Enterprise Company Name is required.';
                            }
                            if (v.trim().length < 3) {
                              return 'Name must contain at least 3 characters.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),

                        // Logo configuration option
                        const Text(
                          'Company Logo Icon URL',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _logoUrlController,
                          keyboardType: TextInputType.url,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                          decoration: InputDecoration(
                            hintText: 'e.g. https://domain.com/logo.png',
                            prefixIcon: const Icon(Icons.image_outlined, size: 18),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: Colors.indigo.shade400),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Helpful Preset Logo Options selector
                        const Text(
                          '— OR CHOOSE AN AESTHETIC THEME PRESET Logo',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
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
                            ? const Center(
                                child: Padding(
                                  padding: EdgeInsets.symmetric(vertical: 8),
                                  child: CircularProgressIndicator(),
                                ),
                              )
                            : SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _handleRegisterCompany,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0F172A),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: const Text(
                                    'INITIALIZE WORKSPACE CONSOLE',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.0,
                                    ),
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
