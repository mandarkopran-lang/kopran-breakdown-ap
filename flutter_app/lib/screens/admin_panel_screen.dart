import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  List<dynamic> _auditLogs = [];
  bool _purging = false;
  bool _confirmPurge = false;

  final _mobileController = TextEditingController();
  final _nameController = TextEditingController();
  final _compNameController = TextEditingController();
  final _compLogoController = TextEditingController();

  String _selectedRole = 'engineering_officer';
  String _selectedDept = 'Production';
  String _selectedPlant = 'Pen Plant';

  final List<String> _departments = [
    'Production', 'Engineering', 'QA', 'QC', 'IPQA', 'HR', 'Admin', 'Security', 'Accounts'
  ];

  final List<String> _plants = ['Pen Plant', 'Non-Pen Plant', 'Both'];

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
    _compNameController.text = widget.currentUser['companyName'] ?? 'KOPRAN';
    _compLogoController.text = widget.currentUser['companyLogo'] ?? '';
    _loadDirectory();
  }

  Future<void> _loadDirectory() async {
    setState(() => _loading = true);
    try {
      final team = await ApiService.fetchUsers();
      final logs = await ApiService.fetchAuditLogs();
      setState(() {
        _users = team;
        _auditLogs = logs;
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

  Future<void> _approveUser(String mobile, bool approved) async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.approveUser(mobile, approved);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ?? 'Action successful!'),
        backgroundColor: approved ? Colors.teal[800] : Colors.red[800],
      ));
      _loadDirectory();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update approval: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _changeUserRole(String mobile, String role) async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.changeUserRole(mobile, role);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ?? 'Role updated successfully!'),
        backgroundColor: Colors.teal[800],
      ));
      _loadDirectory();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update role: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _updateCompany() async {
    final name = _compNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Company name cannot be empty.')));
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await ApiService.updateCompany(name, _compLogoController.text.trim());
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ?? 'Company profile updated successfully!'),
        backgroundColor: Colors.teal[800],
      ));
      _loadDirectory();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update company: $e')));
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
    final companyId = widget.currentUser['companyId'] ?? 'KOPRAN';
    final inviteLink = 'https://ais-pre-wuvc56taaangrxyoqi4wz4-386607728817.asia-east1.run.app/join?code=$companyId';

    final pendingUsers = _users.where((u) => u['approved'] == false).toList();
    final approvedUsers = _users.where((u) => u['approved'] != false).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Enterprise Console', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Company Profile Configuration
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.corporate_fare, color: Color(0xFF1E293B)),
                              SizedBox(width: 8),
                              Text('MANAGE ENTERPRISE TENANT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
                            ],
                          ),
                          const Divider(),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _compNameController,
                            decoration: const InputDecoration(labelText: 'Corporate Organization Name', border: OutlineInputBorder()),
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _compLogoController,
                            decoration: const InputDecoration(labelText: 'Organization Logo Banner Icon URL', border: OutlineInputBorder()),
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.check_circle_outline, size: 16),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E293B),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            onPressed: _updateCompany,
                            label: const Text('UPDATE COMPANY PROFILE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Company Invitation Link System
                  Card(
                    color: const Color(0xFFEEF2F6),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFCBD5E1))),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.share, color: Colors.indigo, size: 18),
                              SizedBox(width: 8),
                              Text('DYNAMIC CO-WORKER INVITE LINK', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.indigo, fontSize: 11)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Distribute this company-specific portal address to invite staff members. They will automatically bypass manual key entries and register aligned with your corporate profile.',
                            style: TextStyle(fontSize: 10, color: Colors.blueGrey, height: 1.4),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.indigo.shade200),
                            ),
                            child: SelectableText(
                              inviteLink,
                              style: const TextStyle(fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold, color: Colors.indigo),
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.indigo[50],
                              foregroundColor: Colors.indigo[900],
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.copy, size: 14),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: inviteLink));
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                                content: Text('Invite portal link copied securely!'),
                                backgroundColor: Colors.indigo,
                              ));
                            },
                            label: const Text('COPY SECURE CO-WORKER INVITE LINK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 3. Pending approvals list
                  if (pendingUsers.isNotEmpty) ...[
                    const Text('PENDING ADMINISTRATIVE APPROVALS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber)),
                    const SizedBox(height: 8),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: pendingUsers.length,
                      itemBuilder: (ctx, idx) {
                        final u = pendingUsers[idx];
                        return Card(
                          color: Colors.amber[50],
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: Colors.amber.shade200)),
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(u['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                      const SizedBox(height: 2),
                                      Text('${u['role'].toString().toUpperCase()} | ${u['department']}', style: const TextStyle(fontSize: 10, color: Colors.black54)),
                                      Text(u['mobile'] ?? '', style: const TextStyle(fontSize: 9, fontFamily: 'monospace')),
                                    ],
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.check_circle, color: Colors.teal),
                                      onPressed: () => _approveUser(u['mobile'], true),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.cancel, color: Colors.red),
                                      onPressed: () => _approveUser(u['mobile'], false),
                                    ),
                                  ],
                                )
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 4. Member Register Form
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('MANUALLY REGISTER STAFF REMOTELY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const Divider(),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _mobileController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(labelText: 'Mobile number (+91...)', border: OutlineInputBorder()),
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _nameController,
                            decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            value: _selectedRole,
                            items: _allRoles.entries.map((entry) {
                              return DropdownMenuItem<String>(value: entry.key, child: Text(entry.value, style: const TextStyle(fontSize: 12)));
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

                  // 5. Directory listing
                  const Text('ORGANIZATION TEAM DIRECTORY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: approvedUsers.length,
                    itemBuilder: (ctx, idx) {
                      final u = approvedUsers[idx];
                      return Card(
                        color: Colors.white,
                        elevation: 0.1,
                        margin: const EdgeInsets.only(bottom: 6),
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: ExpansionTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: Colors.indigo[50], shape: BoxShape.circle),
                              child: const Icon(Icons.person, color: Colors.indigo),
                            ),
                            title: Text(u['name'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            subtitle: Text('${u['role'].toString().toUpperCase()} | ${u['department']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            trailing: Text(u['mobile'] ?? '', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text('Adjust Role Assignment Privilege', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                                    const SizedBox(height: 4),
                                    DropdownButtonFormField<String>(
                                      value: _allRoles.containsKey(u['role']) ? u['role'] : 'supervisor',
                                      items: _allRoles.entries.map((entry) {
                                        return DropdownMenuItem<String>(
                                          value: entry.key,
                                          child: Text(entry.value, style: const TextStyle(fontSize: 11)),
                                        );
                                      }).toList(),
                                      onChanged: (newRole) {
                                        if (newRole != null && newRole != u['role']) {
                                          _changeUserRole(u['mobile'], newRole);
                                        }
                                      },
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // 6. Security Audit Trail Logs listing
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.policy_outlined, color: Colors.blueGrey, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'SECURITY & REGISTRATION AUDIT TRAIL',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueGrey),
                                  ),
                                ],
                              ),
                              IconButton(
                                icon: const Icon(Icons.refresh, size: 16, color: Colors.indigo),
                                onPressed: _loadDirectory,
                                tooltip: 'Refresh Trails',
                              ),
                            ],
                          ),
                          const Divider(),
                          const SizedBox(height: 8),
                          _auditLogs.isEmpty
                              ? const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 24.0),
                                  child: Center(
                                    child: Text(
                                      'No registration action trails exist in active corporate sandbox workspace.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
                                    ),
                                  ),
                                )
                              : ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: _auditLogs.length > 20 ? 20 : _auditLogs.length,
                                  separatorBuilder: (ctx, idx) => Divider(color: Colors.grey[100]),
                                  itemBuilder: (ctx, idx) {
                                    final log = _auditLogs[idx];
                                    final timestamp = log['timestamp'] != null
                                        ? log['timestamp'].toString().replaceAll('T', ' ').substring(0, 19)
                                        : 'Unknown Time';
                                    
                                    // Visual color categorization
                                    Color indicatorColor = Colors.indigo;
                                    IconData logIcon = Icons.info_outline;
                                    if (log['type'] == 'role_change') {
                                      indicatorColor = Colors.amber.shade800;
                                      logIcon = Icons.admin_panel_settings_outlined;
                                    } else if (log['type'] == 'registration') {
                                      indicatorColor = Colors.green.shade700;
                                      logIcon = Icons.group_add_outlined;
                                    } else if (log['type'] == 'otp_fallback') {
                                      indicatorColor = Colors.orange.shade800;
                                      logIcon = Icons.refresh;
                                    }

                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 6.0),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            margin: const EdgeInsets.only(top: 2),
                                            padding: const EdgeInsets.all(6),
                                            decoration: BoxDecoration(
                                              color: indicatorColor.withOpacity(0.1),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(logIcon, color: indicatorColor, size: 14),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  log['details'] ?? 'System action performed.',
                                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    Text(
                                                      'Actor: ${log['actor'] ?? 'System'}',
                                                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Text(
                                                        timestamp,
                                                        style: const TextStyle(fontSize: 9, color: Colors.grey),
                                                        textAlign: TextAlign.end,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

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
                ],
              ),
            ),
    );
  }
}
