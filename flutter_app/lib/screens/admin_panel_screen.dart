import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/app_user.dart';
import '../models/company.dart';
import '../services/firestore_service.dart';

class AdminPanelScreen extends StatefulWidget {
  final AppUser currentUser;

  const AdminPanelScreen({super.key, required this.currentUser});

  @override
  State<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  final _firestoreService = FirestoreService();
  bool _loading = true;
  Company? _company;
  List<AppUser> _users = [];

  final _compNameController = TextEditingController();
  final _compLogoController = TextEditingController();
  
  final _plantInputController = TextEditingController();
  final _deptInputController = TextEditingController();

  final Map<String, String> _allRoles = {
    'user': 'Standard Operator (Raise Breakdown)',
    'supervisor': 'Supervisor (Report & Verify Closed)',
    'manager': 'Maintenance Engineer (Respond & Assign)',
    'admin': 'System Administrator',
  };

  @override
  void initState() {
    super.initState();
    _loadEnterpriseData();
  }

  Future<void> _loadEnterpriseData() async {
    setState(() => _loading = true);
    try {
      final comp = await _firestoreService.getCompany(widget.currentUser.companyId);
      final roster = await _firestoreService.getCompanyUsers(widget.currentUser.companyId);

      setState(() {
        _company = comp;
        _users = roster;
        if (comp != null) {
          _compNameController.text = comp.name;
          _compLogoController.text = comp.logoUrl;
        }
        _loading = false;
      });
    } catch (e) {
      debugPrint("Admin panel load error: $e");
      setState(() => _loading = false);
    }
  }

  Future<void> _updateCompanyProfile() async {
    final name = _compNameController.text.trim();
    final logo = _compLogoController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Organization name is required.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await _firestoreService.updateCompanyProfile(widget.currentUser.companyId, name, logo);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Company profile updated successfully!'), backgroundColor: Colors.teal));
      _loadEnterpriseData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error updating profile: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _addNewPlant() async {
    final plt = _plantInputController.text.trim();
    if (plt.isEmpty) return;

    setState(() => _loading = true);
    try {
      await _firestoreService.addPlant(widget.currentUser.companyId, plt);
      _plantInputController.clear();
      _loadEnterpriseData();
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _removePlant(String plantName) async {
    setState(() => _loading = true);
    try {
      await _firestoreService.removePlant(widget.currentUser.companyId, plantName);
      _loadEnterpriseData();
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _addNewDept() async {
    final dpt = _deptInputController.text.trim();
    if (dpt.isEmpty) return;

    setState(() => _loading = true);
    try {
      await _firestoreService.addDepartment(widget.currentUser.companyId, dpt);
      _deptInputController.clear();
      _loadEnterpriseData();
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _removeDept(String deptName) async {
    setState(() => _loading = true);
    try {
      await _firestoreService.removeDepartment(widget.currentUser.companyId, deptName);
      _loadEnterpriseData();
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateApproval(String uid, bool approved) async {
    setState(() => _loading = true);
    try {
      await _firestoreService.updateUserApproval(widget.currentUser.companyId, uid, approved);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(approved ? 'User registration approved!' : 'User rejected/disabled.'),
        backgroundColor: approved ? Colors.teal : Colors.red,
      ));
      _loadEnterpriseData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Approval update failed: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _changeRole(String uid, String newRole) async {
    setState(() => _loading = true);
    try {
      await _firestoreService.updateUserRole(widget.currentUser.companyId, uid, newRole);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User role updated!'), backgroundColor: Colors.teal));
      _loadEnterpriseData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Role update failed: $e')));
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final inviteCode = widget.currentUser.companyId;
    final pendingUsers = _users.where((u) => !u.approved && u.uid != widget.currentUser.uid).toList();
    final approvedUsers = _users.where((u) => u.approved && u.uid != widget.currentUser.uid).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Enterprise Console', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Corporate Identity branding
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
                      onPressed: _updateCompanyProfile,
                      label: const Text('UPDATE COMPANY PROFILE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 2. Company Invite Credentials Code Card
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
                        Text('SECURE COMPANY CO-WORKER INVITE CODE', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.indigo, fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Distribute this invitation code to other managers, operators, or supervisors. They must enter this code upon profile registration to securely align with this database workspace.',
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
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          SelectableText(
                            inviteCode,
                            style: const TextStyle(fontSize: 13, fontFamily: 'monospace', fontWeight: FontWeight.bold, color: Colors.indigo),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 16, color: Colors.indigo),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: inviteCode));
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                                content: Text('Invite code copied securely!'),
                                backgroundColor: Colors.indigo,
                              ));
                            },
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 3. Dynamic Factory Plants Management
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
                        Icon(Icons.factory_outlined, color: Colors.blueGrey),
                        SizedBox(width: 8),
                        Text('MANAGE FACTORY PLANTS & SECTIONS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                    const Divider(),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _plantInputController,
                            style: const TextStyle(fontSize: 12),
                            decoration: const InputDecoration(hintText: 'e.g. Packaging Plant or Unit-2'),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle, color: Colors.teal),
                          onPressed: _addNewPlant,
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: (_company?.plants ?? []).map((p) {
                        return Chip(
                          label: Text(p, style: const TextStyle(fontSize: 10)),
                          onDeleted: () => _removePlant(p),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 4. Dynamic Departments Management
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
                        Icon(Icons.view_module_outlined, color: Colors.blueGrey),
                        SizedBox(width: 8),
                        Text('MANAGE COMPANY DEPARTMENTS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                    const Divider(),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _deptInputController,
                            style: const TextStyle(fontSize: 12),
                            decoration: const InputDecoration(hintText: 'e.g. Utility Maintenance or IPQA'),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle, color: Colors.teal),
                          onPressed: _addNewDept,
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: (_company?.departments ?? []).map((d) {
                        return Chip(
                          label: Text(d, style: const TextStyle(fontSize: 10)),
                          onDeleted: () => _removeDept(d),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 5. Pending Team Registrations Approvals
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
                                Text(u.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                const SizedBox(height: 2),
                                Text('${u.role.toUpperCase()} | ${u.department} | ${u.plant}', style: const TextStyle(fontSize: 10, color: Colors.black54)),
                                Text(u.phone, style: const TextStyle(fontSize: 9, fontFamily: 'monospace')),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.check_circle, color: Colors.teal),
                                onPressed: () => _updateApproval(u.uid, true),
                              ),
                              IconButton(
                                icon: const Icon(Icons.cancel, color: Colors.red),
                                onPressed: () => _updateApproval(u.uid, false),
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

            // 6. Organization Approved Team Directory
            const Text('ORGANIZATION CO-WORKERS TEAM DIRECTORY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            approvedUsers.isEmpty
                ? const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24.0),
                      child: Text('No other registered coworkers are in your team directory yet.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                  )
                : ListView.builder(
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
                          padding: const EdgeInsets.all(4.0),
                          child: ExpansionTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: Colors.indigo[50], shape: BoxShape.circle),
                              child: const Icon(Icons.person, color: Colors.indigo),
                            ),
                            title: Text(u.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            subtitle: Text('${u.role.toUpperCase()} | ${u.department}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            trailing: Text(u.phone, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text('Adjust Role Assignment Privilege', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                                    const SizedBox(height: 6),
                                    DropdownButtonFormField<String>(
                                      value: _allRoles.containsKey(u.role) ? u.role : 'user',
                                      items: _allRoles.entries.map((entry) {
                                        return DropdownMenuItem<String>(
                                          value: entry.key,
                                          child: Text(entry.value, style: const TextStyle(fontSize: 11)),
                                        );
                                      }).toList(),
                                      onChanged: (newRole) {
                                        if (newRole != null && newRole != u.role) {
                                          _changeRole(u.uid, newRole);
                                        }
                                      },
                                    ),
                                    const SizedBox(height: 8),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: TextButton.icon(
                                        icon: const Icon(Icons.no_accounts, color: Colors.red, size: 14),
                                        label: const Text('Suspend Access / Revoke Approval', style: TextStyle(color: Colors.red, fontSize: 10)),
                                        onPressed: () => _updateApproval(u.uid, false),
                                      ),
                                    )
                                  ],
                                ),
                              )
                            ],
                          ),
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
