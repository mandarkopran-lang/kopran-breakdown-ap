import 'package:flutter/material.dart';
import '../api_service.dart';

class IssueDetailScreen extends StatefulWidget {
  final Map<String, dynamic> issue;
  final Map<String, dynamic> currentUser;
  final VoidCallback onUpdateSuccess;

  const IssueDetailScreen({
    super.key,
    required this.issue,
    required this.currentUser,
    required this.onUpdateSuccess,
  });

  @override
  State<IssueDetailScreen> createState() => _IssueDetailScreenState();
}

class _IssueDetailScreenState extends State<IssueDetailScreen> {
  bool _loading = false;
  List<dynamic> _engineers = [];
  String? _selectedEngineerMobile;
  String? _selectedEngineerName;
  final _remarksController = TextEditingController();
  final _statusUpdateController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadEngineerRoster();
  }

  Future<void> _loadEngineerRoster() async {
    try {
      final team = await ApiService.fetchUsers();
      final List<dynamic> engs = team.where((u) {
        final role = u['role'];
        return role == 'engineering_officer' || role == 'admin' || role == 'engineering_head' || role == 'engineering_manager';
      }).toList();

      setState(() {
        _engineers = engs;
      });
    } catch (e) {
      debugPrint('Error loading roster: $e');
    }
  }

  Future<void> _assignTicket(String engMob, String engName) async {
    setState(() => _loading = true);
    try {
      await ApiService.assignIssue(
        issueId: widget.issue['id'],
        engineerMobile: engMob,
        engineerName: engName,
        customSla: widget.issue['slaMinutes'],
        assignerMobile: widget.currentUser['mobile'],
        assignerName: widget.currentUser['name'],
      );
      Navigator.pop(context);
      widget.onUpdateSuccess();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ticket assigned successfully!'), backgroundColor: Colors.green));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to assign ticket: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _updateProgress(String targetState) async {
    final notes = _statusUpdateController.text.trim();
    if (notes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter progress remarks.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.updateStatus(
        issueId: widget.issue['id'],
        status: targetState,
        notes: notes,
        updaterMobile: widget.currentUser['mobile'],
        updaterName: widget.currentUser['name'],
      );
      Navigator.pop(context);
      widget.onUpdateSuccess();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Status updated successfully!'), backgroundColor: Colors.indigo));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
      setState(() => _loading = false);
    }
  }

  Future<void> _closeTicket(String finalState) async {
    final rem = _remarksController.text.trim();
    if (rem.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Remarks are required for ticket verification/closure.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.confirmClosure(
        issueId: widget.issue['id'],
        status: finalState,
        remarks: rem,
        resolverMobile: widget.currentUser['mobile'],
        resolverName: widget.currentUser['name'],
        notResolvedFeedback: finalState == 'reopened' ? rem : null,
      );
      Navigator.pop(context);
      widget.onUpdateSuccess();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(finalState == 'closed' ? 'Ticket completely closed!' : 'Ticket reopened for rectification.'),
        backgroundColor: finalState == 'closed' ? Colors.green : Colors.amber[800],
      ));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed completing action: $e')));
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final issue = widget.issue;
    final userRole = widget.currentUser['role'];
    final isAdmin = userRole == 'admin';
    final isEscalated = issue['escalationStatus'] == 'escalated';
    final currentStatus = issue['status'];

    final bool isStaff = userRole == 'engineering_officer' || userRole == 'admin' || userRole == 'engineering_head' || userRole == 'engineering_manager';
    final bool isCreator = issue['createdBy'] == widget.currentUser['mobile'] || isAdmin;

    // AI diagnostic data extract
    final hasAi = issue['aiRecommendations'] != null;
    final List<dynamic>? aiCauses = hasAi ? issue['aiRecommendations']['possibleCauses'] : null;
    final List<dynamic>? aiSteps = hasAi ? issue['aiRecommendations']['stepsToFix'] : null;
    final String? aiSeverity = hasAi ? issue['aiRecommendations']['estimatedSeverity'] : null;

    final historyList = issue['history'] as List<dynamic>? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(issue['id'] ?? 'Breakdown Detail', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Base Metadata Details Card
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(issue['plant'] ?? 'Plant 1', style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.blueGrey, fontSize: 10)),
                              Text('SLA: ${issue['slaMinutes']} mins', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.red)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            issue['machine'] ?? 'Machine',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                          ),
                          const SizedBox(height: 4),
                          Text(issue['area'] ?? '', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                          const Divider(),
                          const Text('Breakdown Symptoms / Problem Statement:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.indigo)),
                          const SizedBox(height: 4),
                          Text(issue['description'] ?? '', style: const TextStyle(fontSize: 12, height: 1.4)),
                          const Divider(),
                          Row(
                            children: [
                              const Icon(Icons.person, size: 14, color: Colors.grey),
                              const SizedBox(width: 4),
                              Text('Reported By: ${issue['createdByName']} (${issue['createdBy']})', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Gemini-AI Recommendations Widget
                  if (hasAi) ...[
                    Card(
                      color: const Color(0xFFEFF6FF), // Soft Blue Indigo
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFBFDBFE))),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.psychology, color: Colors.blueAccent),
                                const SizedBox(width: 8),
                                const Text('GEMINI AI CO-PILOT ANALYSIS', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFF1E3A8A))),
                                const Spacer(),
                                if (aiSeverity != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                                    child: Text(aiSeverity.toUpperCase(), style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white)),
                                  )
                              ],
                            ),
                            const Divider(color: Color(0xFFDBEAFE)),
                            const Text('Possible Root Causes Identified:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF1E3A8A))),
                            const SizedBox(height: 4),
                            ...?aiCauses?.map((c) => Padding(
                              padding: const EdgeInsets.only(bottom: 2),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                                  Expanded(child: Text(c, style: const TextStyle(fontSize: 11))),
                                ],
                              ),
                            )),
                            const SizedBox(height: 8),
                            const Text('Recommended Step-by-Step Fixes:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF1E3A8A))),
                            const SizedBox(height: 4),
                            ...?aiSteps?.map((s) => Padding(
                              padding: const EdgeInsets.only(bottom: 2),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('✓ ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                                  Expanded(child: Text(s, style: const TextStyle(fontSize: 11))),
                                ],
                              ),
                            )),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Action Widget Form Mapping (based on login roles)

                  // 1. Assignment Action Card (For Managers/Heads/Admins)
                  if ((isAdmin || userRole == 'engineering_manager' || userRole == 'engineering_head') && currentStatus == 'open') ...[
                    Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('ASSIGN TICKETS TO MAINTENANCE STAFF', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black)),
                            const SizedBox(height: 8),
                            _engineers.isEmpty
                                ? const Text('Loading maintenance roster...', style: TextStyle(fontSize: 11, color: Colors.grey))
                                : DropdownButtonFormField<String>(
                                    hint: const Text('Select Maintenance Staff'),
                                    onChanged: (val) {
                                      final eng = _engineers.firstWhere((u) => u['mobile'] == val);
                                      setState(() {
                                        _selectedEngineerMobile = val;
                                        _selectedEngineerName = eng['name'];
                                      });
                                    },
                                    items: _engineers.map((e) {
                                      return DropdownMenuItem<String>(
                                        value: e['mobile'],
                                        child: Text('${e['name']} (${e['department']})', style: const TextStyle(fontSize: 12)),
                                      );
                                    }).toList(),
                                  ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _selectedEngineerMobile == null
                                  ? null
                                  : () => _assignTicket(_selectedEngineerMobile!, _selectedEngineerName!),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('DISPATCH STAFF REMOTELY', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 2. Self Assignment trigger for active Field Staff
                  if (currentStatus == 'open' && isStaff && _selectedEngineerMobile == null) ...[
                    ElevatedButton.icon(
                      icon: const Icon(Icons.pan_tool_outlined),
                      label: const Text('SELF-ASSIGN THIS BREAKDOWN'),
                      onPressed: () => _assignTicket(widget.currentUser['mobile'], widget.currentUser['name']),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo[800],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 3. Status Logs Update form (For Assigned Staff / Admin)
                  if ((currentStatus == 'assigned' || currentStatus == 'in_progress') && (widget.currentUser['mobile'] == issue['assignedTo'] || isAdmin)) ...[
                    Card(
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('UPDATE DIAGNOSIS & REPAIR PROGRESS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueAccent)),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _statusUpdateController,
                              style: const TextStyle(fontSize: 12),
                              decoration: const InputDecoration(
                                labelText: 'Enter specific work remarks / activity notes',
                                alignLabelWithHint: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                if (currentStatus == 'assigned')
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, foregroundColor: Colors.white),
                                      onPressed: () => _updateProgress('in_progress'),
                                      child: const Text('MARK "IN PROGRESS"', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                                    onPressed: () => _updateProgress('resolved'),
                                    child: const Text('MARK AS RESOLVED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 4. Verification Check and Closure Control Widget (For Reporter / Supervisor / Admin)
                  if (currentStatus == 'resolved' && (isCreator || isAdmin)) ...[
                    Card(
                      color: const Color(0xFFF0FDF4),
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFBBF7D0))),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('🏁 VERIFICATION AND CLOSURE APPROVAL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFF166534))),
                            const SizedBox(height: 4),
                            const Text(
                              'Please run dry test cycles or inspect machine calibration metrics before approving closure. Reopen the ticket immediately if breakdown faults persist.',
                              style: TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _remarksController,
                              style: const TextStyle(fontSize: 12),
                              decoration: const InputDecoration(
                                labelText: 'Mandatory Verification Remarks / Comments',
                                border: OutlineInputBorder(),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red[800], foregroundColor: Colors.white),
                                    onPressed: () => _closeTicket('reopened'),
                                    child: const Text('REOPEN JOB', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green[800], foregroundColor: Colors.white),
                                    onPressed: () => _closeTicket('closed'),
                                    child: const Text('CONFIRM CLOSURE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Ticket Progress Log Timeline / Activity History visually styled
                  const Text('TICKET ACTIVITY LOG TIMELINE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: historyList.isEmpty
                          ? const Text('No timeline log entries recorded.', style: TextStyle(fontSize: 11, color: Colors.grey))
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: historyList.length,
                              itemBuilder: (ctx, hIdx) {
                                final logItem = historyList[hIdx];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12, left: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Column(
                                        children: [
                                          const Icon(Icons.circle, size: 8, color: Colors.blueAccent),
                                          Container(width: 1, height: 40, color: Colors.grey.shade300),
                                        ],
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(
                                                  logItem['status'].toString().toUpperCase(),
                                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10, color: Colors.blueGrey),
                                                ),
                                                Text(
                                                  logItem['timestamp'] != null
                                                      ? logItem['timestamp'].toString().substring(0, 16).replaceAll('T', ' ')
                                                      : '',
                                                  style: const TextStyle(fontSize: 9, color: Colors.grey),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'By: ${logItem['updatedByName'] ?? 'System worker'}',
                                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700], fontSize: 10),
                                            ),
                                            if (logItem['notes'] != null)
                                              Text(
                                                logItem['notes'],
                                                style: const TextStyle(color: Colors.grey, fontSize: 11),
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
