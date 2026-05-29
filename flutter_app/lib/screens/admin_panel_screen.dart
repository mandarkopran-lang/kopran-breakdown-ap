import 'package:flutter/material.dart';
import '../api_service.dart';

class admin_panel_screen extends StatefulWidget {
  final Map<String, dynamic> currentUser;

  const admin_panel_screen({super.key, required this.currentUser});

  @override
  State<admin_panel_screen> createState() => _admin_panel_screenState();
}

class _admin_panel_screenState extends State<admin_panel_screen> {
  bool _loading = true;
  List<dynamic> _users = [];
  bool _purging = false;
  bool _confirmPurge = false;

  final _mobileController = TextEditingController();
  final _nameController = TextEditingController();
  String _selectedRole = 'engineering_officer';
  String _selectedDept = 'Production';
  String _selectedPlant = 'Plant 1';

  final List<String> _departments = [
    'Production', 'Engineering', 'QA', 'QC', 'IPQA', 'HR', 'Admin', 'Security', 'Accounts'
  ];

  final List<String> _plants = ['Plant 1', 'Plant 2', 'Both'];

  // All roles for Admin-controlled allocations
  final Map<String, String> _allRoles = {
    'supervisor': 'Supervisor',
    'engineering_officer': 'Engineering Officer',
    'engineering_manager': 'Engineering Manager',
    'engineering_head': 'Engineering Head',
    'plant_manager': 'Plant Manager',
    'qa_manager': 'QA Manager',
    'admin': 'Admin',
  };

  @override
  void initState() {
    super.initState();
    _loadDirectory();
  }

  Future<void> _loadDirectory() async {
    setState(() => _loading = true);
    try {
      final team = await ApiService.fetchUsers();
      setState(() {
        _users = team;
        _loading = false;
      });
    } catch (e) {
      debugPrint('Admin directory load failed: $e');
      setState(() => _loading = false);
    }
  }

  Future<void> _addNewMember() async {
    final mob = _mobileController.text.trim();
    final name = _nameController.text.trim();

    if (mob.isEmpty || name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All fields are required.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.registerTeamMember(
        mobile: mob,
        name: name,
        role: _selectedRole,
        department: _selectedDept,
        plant: _selectedPlant,
      );
      _mobileController.clear();
      _nameController.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Member added to roster successfully!'), backgroundColor: Colors.green));
      _loadDirectory();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Registration rejected: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _handleResetDatabase() async {
    if (!_confirmPurge) {
      setState(() {
        _confirmPurge = true;
      });
      return;
    }

    setState(() {
      _purging = true;
    });

    try {
      final res = await ApiService.wipeEnvironmentDatabase();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Database purged successfully!'), backgroundColor: Colors.red[800]));
      setState(() {
        _confirmPurge = false;
        _purging = false;
      });
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Purging rejected: $e')));
      setState(() {
        _purging = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('System Admin Console', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Safe Purging / Reset control widget
                  Card(
                    color: Colors.red[50],
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.red.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.warning, color: Colors.red[800]),
                              const SizedBox(width: 8),
                              const Text('PRISTINE ZERO-TICKET WIPE', style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF7F1D1D))),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Wipe all breakdown history logs, updates and dispatches inside the active environment permanently.',
                            style: TextStyle(fontSize: 10, color: Colors.blueGrey),
                          ),
                          const SizedBox(height: 12),
                          if (_confirmPurge)
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red[900], foregroundColor: Colors.white),
                              onPressed: _purging ? null : _handleResetDatabase,
                              child: _purging
                                  ? const CircularProgressIndicator()
                                  : const Text('⚠️ CONFIRM TO WIPE FOREVER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                            )
                          else
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700], foregroundColor: Colors.white),
                              onPressed: _handleResetDatabase,
                              child: const Text('PURGE ACTIVE DATABASE STATE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                            ),
                          if (_confirmPurge)
                            TextButton(
                              onPressed: () => setState(() => _confirmPurge = false),
                              child: const Text('Secure Abort / Cancel Clean', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Member Register Form
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200 ?? Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('REGISTER SYSTEM MEMBER ROSTER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const Divider(),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _mobileController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(labelText: 'Mobile number (+91...)', border: OutlineInputBorder()),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _nameController,
                            decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            value: _selectedRole,
                            items: _allRoles.entries.map((entry) {
                              return DropdownMenuItem<String>(value: entry.key, child: Text(entry.value));
                            }).toList(),
                            onChanged: (v) => setState(() => _selectedRole = v!),
                            decoration: const InputDecoration(labelText: 'Assigned Role Privilege'),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: _selectedDept,
                                  items: _departments.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 11)))).toList(),
                                  onChanged: (v) => setState(() => _selectedDept = v!),
                                  decoration: const InputDecoration(labelText: 'Dept'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: _selectedPlant,
                                  items: _plants.map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 11)))).toList(),
                                  onChanged: (v) => setState(() => _selectedPlant = v!),
                                  decoration: const InputDecoration(labelText: 'Plant'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), foregroundColor: Colors.white),
                            onPressed: _addNewMember,
                            child: const Text('ADD MEMBER DATA'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Directory listing
                  const Text('ORGANIZATION TEAM DIRECTORY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _users.length,
                    itemBuilder: (ctx, idx) {
                      final u = _users[idx];
                      return Card(
                        color: Colors.white,
                        elevation: 0.1,
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          title: Text(u['name'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          subtitle: Text('${u['role'].toString().toUpperCase()} | ${u['department']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          trailing: Text(u['mobile'] ?? '', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
