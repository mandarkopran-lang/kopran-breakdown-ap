import 'package:flutter/material.dart';
import '../models/app_user.dart';
import '../models/breakdown.dart';
import '../services/firestore_service.dart';

class IssueDetailScreen extends StatefulWidget {
  final BreakdownTicket ticket;
  final AppUser currentUser;

  const IssueDetailScreen({
    super.key,
    required this.ticket,
    required this.currentUser,
  });

  @override
  State<IssueDetailScreen> createState() => _IssueDetailScreenState();
}

class _IssueDetailScreenState extends State<IssueDetailScreen> {
  final _firestoreService = FirestoreService();
  bool _loading = false;
  
  // Loaded roster of engineers/managers to dispatch to
  List<AppUser> _coworkers = [];
  String? _selectedEngineerUid;
  String? _selectedEngineerName;

  final _remarksController = TextEditingController();
  final _resolutionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTechniciansRoster();
  }

  Future<void> _loadTechniciansRoster() async {
    try {
      final team = await _firestoreService.getCompanyUsers(widget.currentUser.companyId);
      final List<AppUser> techs = team.where((u) => u.role == 'manager' || u.role == 'admin').toList();
      
      setState(() {
        _coworkers = techs;
      });
    } catch (e) {
      debugPrint("Error fetching coworker roster: $e");
    }
  }

  Future<void> _handleAssign() async {
    if (_selectedEngineerUid == null) return;

    setState(() => _loading = true);
    try {
      await _firestoreService.assignTicket(
        companyId: widget.currentUser.companyId,
        ticketId: widget.ticket.id,
        engineerUid: _selectedEngineerUid!,
        engineerName: _selectedEngineerName!,
        assignerName: widget.currentUser.name,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maintenance technician dispatched to site!'), backgroundColor: Colors.teal),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Dispatch failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleSelfAssign() async {
    setState(() => _loading = true);
    try {
      await _firestoreService.assignTicket(
        companyId: widget.currentUser.companyId,
        ticketId: widget.ticket.id,
        engineerUid: widget.currentUser.uid,
        engineerName: widget.currentUser.name,
        assignerName: widget.currentUser.name,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Self-assigned. Please report to the site immediately.'), backgroundColor: Colors.indigo),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Self-assignment failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleResolve() async {
    final remarks = _resolutionController.text.trim();
    if (remarks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter repair/resolution remarks.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await _firestoreService.resolveTicket(
        companyId: widget.currentUser.companyId,
        ticketId: widget.ticket.id,
        remarks: remarks,
        updaterName: widget.currentUser.name,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ticket marked as resolved. Sent to supervisor for closure validation!'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Update failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleClosureCheck(bool approveClosure) async {
    final comments = _remarksController.text.trim();
    if (comments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification comments are mandatory.')));
      return;
    }

    setState(() => _loading = true);
    try {
      await _firestoreService.closeTicket(
        companyId: widget.currentUser.companyId,
        ticketId: widget.ticket.id,
        remarks: comments,
        closerName: widget.currentUser.name,
        isApproved: approveClosure,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(approveClosure ? 'Breakdown ticket closed successfully!' : 'Ticket rejected & reopened.'),
          backgroundColor: approveClosure ? Colors.green : Colors.amber[800],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    final userRole = widget.currentUser.role;
    final statusLower = ticket.status.toLowerCase();
    
    final bool isManagerOrAdmin = userRole == 'admin' || userRole == 'manager';
    final bool isCreator = ticket.createdBy == widget.currentUser.uid;
    final bool isAssignedToMe = ticket.assignedTo == widget.currentUser.uid;

    final Map<String, dynamic> statusConfig = {
      'open': {'txt': 'OPEN', 'col': Colors.red},
      'in progress': {'txt': 'IN PROGRESS', 'col': Colors.blue},
      'resolved': {'txt': 'RESOLVED', 'col': Colors.green},
      'closed': {'txt': 'CLOSED', 'col': Colors.grey},
    };

    final stat = statusConfig[statusLower] ?? {'txt': 'OPEN', 'col': Colors.red};

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(ticket.id, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
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
                  // 1. Overview Details Card
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
                              Text(ticket.plant.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.blueGrey, fontSize: 10)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: (stat['col'] as Color).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  stat['txt'],
                                  style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: stat['col']),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            ticket.machineName,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                          ),
                          const SizedBox(height: 4),
                          Text('Department: ${ticket.department}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                          const Divider(),
                          const Text('Breakdown Symptoms / Description:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.indigo)),
                          const SizedBox(height: 4),
                          Text(ticket.description, style: const TextStyle(fontSize: 12, height: 1.4)),
                          if (ticket.imageUrl.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                ticket.imageUrl,
                                height: 180,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, err, stack) => Container(
                                  height: 60,
                                  color: Colors.grey[100],
                                  child: const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
                                ),
                              ),
                            ),
                          ],
                          const Divider(),
                          Row(
                            children: [
                              const Icon(Icons.person, size: 14, color: Colors.grey),
                              const SizedBox(width: 4),
                              Text('Reported By: ${ticket.createdByName} (${ticket.createdByPhone})', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            ],
                          ),
                          if (ticket.assignedToName.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.engineering_outlined, size: 14, color: Colors.blueGrey),
                                const SizedBox(width: 4),
                                Text('Assigned Technician: ${ticket.assignedToName}', style: const TextStyle(fontSize: 10, color: Colors.blueGrey, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Action Form - Assignment (Managers & Admins dispatching field staff)
                  if (statusLower == 'open' && isManagerOrAdmin) ...[
                    Card(
                      color: Colors.white,
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('DISPATCH MAINTENANCE FIELD STAFF', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black)),
                            const SizedBox(height: 8),
                            _coworkers.isEmpty
                                ? const Text('Loading technicians from roster...', style: TextStyle(fontSize: 11, color: Colors.grey))
                                : DropdownButtonFormField<String>(
                                    hint: const Text('Select Maintenance Staff'),
                                    onChanged: (val) {
                                      final tech = _coworkers.firstWhere((u) => u.uid == val);
                                      setState(() {
                                        _selectedEngineerUid = val;
                                        _selectedEngineerName = tech.name;
                                      });
                                    },
                                    items: _coworkers.map((e) {
                                      return DropdownMenuItem<String>(
                                        value: e.uid,
                                        child: Text('${e.name} (${e.department})', style: const TextStyle(fontSize: 12)),
                                      );
                                    }).toList(),
                                  ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _selectedEngineerUid == null ? null : _handleAssign,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E293B),
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('DISPATCH STAFF REMOTELY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 3. Action Form - Self Assignment (Field Staff claiming open tickets)
                  if (statusLower == 'open' && userRole == 'manager' && _selectedEngineerUid == null) ...[
                    ElevatedButton.icon(
                      icon: const Icon(Icons.pan_tool_outlined, size: 16),
                      label: const Text('SELF-ASSIGN & COMMENCE REPAIRS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      onPressed: _handleSelfAssign,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo[800],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 4. Action Form - Field Status Resolution (For Assigned Technician / Admin)
                  if ((statusLower == 'open' || statusLower == 'in progress' || statusLower == 'assigned') && (isAssignedToMe || userRole == 'admin')) ...[
                    Card(
                      color: Colors.white,
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('UPDATE DIAGNOSIS & REPAIR WORK', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueAccent)),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _resolutionController,
                              style: const TextStyle(fontSize: 12),
                              decoration: const InputDecoration(
                                labelText: 'Enter repair action details / parts replaced',
                                alignLabelWithHint: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.green[800], foregroundColor: Colors.white),
                              onPressed: _handleResolve,
                              child: const Text('SUBMIT RESOLUTION FOR CLOSURE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 5. Action Form - Verification Check & Closure Approval (For Ticket Creator / Supervisor / Admin)
                  if (statusLower == 'resolved' && (isCreator || userRole == 'supervisor' || userRole == 'admin')) ...[
                    Card(
                      color: const Color(0xFFF0FDF4),
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFBBF7D0))),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('🏁 RESOLUTION VERIFICATION & CLOSURE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFF166534))),
                            const SizedBox(height: 4),
                            const Text(
                              'Ensure test runs and calibrations are successful before closing. If machine failure symptoms persist, reject and reopen.',
                              style: TextStyle(fontSize: 10, color: Colors.blueGrey, height: 1.4),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _remarksController,
                              style: const TextStyle(fontSize: 12),
                              decoration: const InputDecoration(
                                labelText: 'Mandatory closure comments / Dry-run metrics',
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
                                    onPressed: () => _handleClosureCheck(false),
                                    child: const Text('REJECT & REOPEN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green[800], foregroundColor: Colors.white),
                                    onPressed: () => _handleClosureCheck(true),
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

                  // 6. Historical timeline audit log
                  const Text('TICKET ACTIVITY LOG TIMELINE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Card(
                    color: Colors.white,
                    elevation: 0.5,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: ticket.history.isEmpty
                          ? const Text('No timeline logs recorded.', style: TextStyle(fontSize: 11, color: Colors.grey))
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: ticket.history.length,
                              itemBuilder: (ctx, idx) {
                                final log = ticket.history[idx];
                                final timestamp = log['timestamp'] != null
                                    ? log['timestamp'].toString().substring(0, 16).replaceAll('T', ' ')
                                    : '';
                                
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12, left: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Column(
                                        children: [
                                          const Icon(Icons.circle, size: 8, color: Colors.blueAccent),
                                          Container(width: 1, height: 40, color: Colors.grey.shade200),
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
                                                  log['status'].toString().toUpperCase(),
                                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10, color: Colors.blueGrey),
                                                ),
                                                Text(
                                                  timestamp,
                                                  style: const TextStyle(fontSize: 9, color: Colors.grey),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'By: ${log['updatedByName'] ?? 'System'}',
                                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700], fontSize: 10),
                                            ),
                                            if (log['notes'] != null)
                                              Text(
                                                log['notes'],
                                                style: const TextStyle(color: Colors.grey, fontSize: 11),
                                              ),
                                          ],
                                        ),
                                      )
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
