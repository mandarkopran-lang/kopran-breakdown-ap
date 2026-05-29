import 'package:flutter/material.dart';
import '../api_service.dart';
import '../types_mock.dart'; // local hierarchy data structures
import 'issue_detail_screen.dart';
import 'admin_panel_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> currentUser;
  final VoidCallback onSignOut;

  const DashboardScreen({super.key, required this.currentUser, required this.onSignOut});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loadingIssues = true;
  List<dynamic> _issues = [];
  Map<String, dynamic> _stats = {
    'openIssues': 0,
    'inProgressIssues': 0,
    'resolvedIssues': 0,
    'closedIssues': 0,
  };

  String _statusFilter = '';
  String _plantFilter = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _refreshDashboard();
  }

  Future<void> _refreshDashboard() async {
    setState(() {
      _loadingIssues = true;
    });

    try {
      final issuesData = await ApiService.fetchIssues(
        status: _statusFilter,
        plant: _plantFilter,
        search: _searchController.text.trim(),
      );

      final statsData = await ApiService.fetchStats();

      setState(() {
        _issues = issuesData;
        _stats = statsData;
        _loadingIssues = false;
      });
    } catch (e) {
      debugPrint('Dashboard reload error: $e');
      setState(() {
        _loadingIssues = false;
      });
    }
  }

  void _openRaiseBreakdownDialog() {
    String selectedPlant = 'Plant 1';
    String selectedDept = 'Production';
    String selectedArea = 'Manufacturing (Plant 1)';
    String selectedMachine = 'PLC Control Station 01';
    final descController = TextEditingController();
    int slaMinutes = 120;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            // Get valid areas for currently active plant & dept choice
            List<String> areas = ['Canteen', 'Security', 'Manufacturing', 'IPQA', 'Packing', 'Engineering', 'Utility'];
            List<String> validAreas = areas.map((a) {
              if (a == 'Security' || a == 'Canteen') return a;
              return '$a ($selectedPlant)';
            }).toList();

            if (!validAreas.contains(selectedArea)) {
              selectedArea = validAreas.first;
            }

            // Get valid machines
            List<String> machines = ['Generic System Unit 01', 'Backup Utility Station 01'];
            if (selectedArea.startsWith('Manufacturing')) {
              machines = ['PLC Control Station 01', 'Primary Air Compressor AC-10', 'Conveyor Induction Belt', 'Overhead Gantry Crane'];
            } else if (selectedArea.startsWith('Packing')) {
              machines = ['Blister Packer BP-300', 'Cartoning Machine CM-20', 'Inkjet Batch Coder IC05'];
            } else if (selectedArea.startsWith('Utility')) {
              machines = ['Steam Boiler SB-50', 'Chilled Water Pump CP-12', 'Air Handling Unit AHU-09'];
            }

            if (!machines.contains(selectedMachine)) {
              selectedMachine = machines.first;
            }

            return Padding(
              padding: EdgeInsets.only(
                top: 16,
                left: 16,
                right: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '🚨 REPORT NEW BREAKDOWN',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),

                    // Plant Selection
                    const Text('Manufacturing Plant Location', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      value: selectedPlant,
                      items: const [
                        DropdownMenuItem(value: 'Plant 1', child: Text('Plant 1 (Main Manufacturing)')),
                        DropdownMenuItem(value: 'Plant 2', child: Text('Plant 2 (Auxiliary Utility)')),
                      ],
                      onChanged: (val) {
                        setModalState(() {
                          selectedPlant = val!;
                        });
                      },
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Dept Selection
                    const Text('Department Affected', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      value: selectedDept,
                      items: const [
                        DropdownMenuItem(value: 'Production', child: Text('Production')),
                        DropdownMenuItem(value: 'Engineering', child: Text('Engineering')),
                        DropdownMenuItem(value: 'QA', child: Text('QA')),
                        DropdownMenuItem(value: 'QC', child: Text('QC Lab')),
                      ],
                      onChanged: (val) {
                        setModalState(() {
                          selectedDept = val!;
                        });
                      },
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Area & Machine Selection with dynamic reactive lists
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Line/Work Area', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                              const SizedBox(height: 4),
                              DropdownButtonFormField<String>(
                                value: selectedArea,
                                items: validAreas.map((a) => DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontSize: 11)))).toList(),
                                onChanged: (val) {
                                  setModalState(() {
                                    selectedArea = val!;
                                  });
                                },
                                decoration: InputDecoration(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Specific Machine Unit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                              const SizedBox(height: 4),
                              DropdownButtonFormField<String>(
                                value: selectedMachine,
                                items: machines.map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 11)))).toList(),
                                onChanged: (val) {
                                  setModalState(() {
                                    selectedMachine = val!;
                                  });
                                },
                                decoration: InputDecoration(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Description text trigger
                    const Text('Describe Machine Fault Symptoms', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      style: const TextStyle(fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Provide details like abnormal sound, noise level, temperature, resetting, oil levels, electrical trips...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // SLA
                    const Text('SLA Target Resolution (Minutes)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<int>(
                      value: slaMinutes,
                      items: const [
                        DropdownMenuItem(value: 60, child: Text('Urgent (1 hour - Critical Production Assembly)')),
                        DropdownMenuItem(value: 120, child: Text('Standard (2 hours - Pack line line blocks)')),
                        DropdownMenuItem(value: 180, child: Text('Extended Boiler / Aux (3 hours)')),
                        DropdownMenuItem(value: 240, child: Text('Low priority Routine Check (4 hours)')),
                      ],
                      onChanged: (val) {
                        setModalState(() {
                          slaMinutes = val!;
                        });
                      },
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        final desc = descController.text.trim();
                        if (desc.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please describe the breakdown details.')));
                          return;
                        }

                        Navigator.pop(ctx);
                        setState(() {
                          _loadingIssues = true;
                        });

                        try {
                          await ApiService.raiseBreakdown(
                            plant: selectedPlant,
                            department: selectedDept,
                            area: selectedArea,
                            machine: selectedMachine,
                            description: desc,
                            slaMinutes: slaMinutes,
                            createdBy: widget.currentUser['mobile'],
                            createdByName: widget.currentUser['name'],
                          );
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Breakdown raised and disptached to Whatsapp channel successfully!'), backgroundColor: Colors.green));
                          _refreshDashboard();
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed raising breakdown: $e')));
                          setState(() {
                            _loadingIssues = false;
                          });
                        }
                      },
                      child: const Text('SUBMIT BREAKDOWN REPORT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    )
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final userRole = widget.currentUser['role'] ?? 'supervisor';
    final isAdmin = userRole == 'admin';
    final isSupervisor = userRole == 'supervisor';
    final isPlantManager = userRole == 'plant_manager' || userRole == 'qa_manager';

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.currentUser['name'] ?? 'Engineer Console', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            Text('${userRole.toString().toUpperCase().replaceAll('_', ' ')} | ${widget.currentUser['department'] ?? 'Operations'}', style: const TextStyle(fontSize: 9, color: Colors.grey)),
          ],
        ),
        actions: [
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.admin_panel_settings, color: Colors.blueAccent),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => admin_panel_screen(currentUser: widget.currentUser)),
                );
              },
            ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: widget.onSignOut,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshDashboard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // KPI Statistics Panel Summary Card Row layout
              Row(
                children: [
                  Expanded(child: _buildKPI('OPEN', _stats['openIssues'].toString(), const Color(0xFFEF4444))),
                  const SizedBox(width: 8),
                  Expanded(child: _buildKPI('ENGAGED', _stats['inProgressIssues'].toString(), const Color(0xFF3B82F6))),
                  const SizedBox(width: 8),
                  Expanded(child: _buildKPI('RESOLVED', _stats['resolvedIssues'].toString(), const Color(0xFF10B981))),
                  const SizedBox(width: 8),
                  Expanded(child: _buildKPI('CLOSED', _stats['closedIssues'].toString(), const Color(0xFF64748B))),
                ],
              ),
              const SizedBox(height: 16),

              // Breakdown Quick Search and Filter bar
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(fontSize: 11),
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.search, size: 16),
                                hintText: 'Search machine, ID, desc',
                                border: InputBorder.none,
                                isDense: true,
                              ),
                              onSubmitted: (s) => _refreshDashboard(),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 18),
                            onPressed: _refreshDashboard,
                          ),
                        ],
                      ),
                      const Divider(),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _plantFilter,
                                style: const TextStyle(fontSize: 11, color: Colors.black, fontWeight: FontWeight.bold),
                                items: const [
                                  DropdownMenuItem(value: '', child: Text('All Plants (1 & 2)')),
                                  DropdownMenuItem(value: 'Plant 1', child: Text('Plant 1')),
                                  DropdownMenuItem(value: 'Plant 2', child: Text('Plant 2')),
                                ],
                                onChanged: (v) {
                                  setState(() {
                                    _plantFilter = v ?? '';
                                  });
                                  _refreshDashboard();
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _statusFilter,
                                style: const TextStyle(fontSize: 11, color: Colors.black, fontWeight: FontWeight.bold),
                                items: const [
                                  DropdownMenuItem(value: '', child: Text('All Ticket States')),
                                  DropdownMenuItem(value: 'open', child: Text('Open Unassigned')),
                                  DropdownMenuItem(value: 'assigned', child: Text('Assigned Staff')),
                                  DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                                  DropdownMenuItem(value: 'resolved', child: Text('Resolved (Awaiting Conf)')),
                                  DropdownMenuItem(value: 'closed', child: Text('Closed Completed')),
                                ],
                                onChanged: (v) {
                                  setState(() {
                                    _statusFilter = v ?? '';
                                  });
                                  _refreshDashboard();
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Breakdown raising trigger button
              if (isSupervisor || isAdmin || isPlantManager) ...[
                ElevatedButton.icon(
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('REPORT & DISPATCH NEW BREAKDOWN', style: TextStyle(fontWeight: FontWeight.w900, fontsize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E), // Teal Accent Design
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _openRaiseBreakdownDialog,
                ),
                const SizedBox(height: 16),
              ],

              // Issues List
              const Text('ACTIVE BREAKDOWN LOGS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 8),

              _loadingIssues
                  ? const Center(child: Padding(padding: EdgeInsets.all(32.0), child: CircularProgressIndicator()))
                  : _issues.isEmpty
                      ? const Card(
                          child: Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Text('No active breakdown records match this search profile.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _issues.length,
                          itemBuilder: (ctx, i) {
                            final issue = _issues[i];
                            return _buildIssueCard(issue);
                          },
                        ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKPI(String label, String value, Color color) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildIssueCard(Map<String, dynamic> issue) {
    final Map<String, dynamic> statusDetailMap = {
      'open': {'txt': 'OPEN', 'col': Colors.red},
      'assigned': {'txt': 'ASSIGNED', 'col': Colors.purple},
      'in_progress': {'txt': 'IN PROGRESS', 'col': Colors.blue},
      'resolved': {'txt': 'RESOLVED', 'col': Colors.green},
      'closed': {'txt': 'CLOSED', 'col': Colors.grey},
    };

    final stat = statusDetailMap[issue['status']] ?? {'txt': 'OPEN', 'col': Colors.red};
    final isEscalated = issue['escalationStatus'] == 'escalated';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isEscalated ? Colors.red.shade200 : Colors.grey.shade200)),
      color: isEscalated ? const Color(0xFFFEF2F2) : Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => IssueDetailScreen(
                issue: issue,
                currentUser: widget.currentUser,
                onUpdateSuccess: () {
                  _refreshDashboard();
                },
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    issue['id'] ?? 'BD-XXXX',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.indigo),
                  ),
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
                '${issue['machine']} (${issue['area']})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 4),
              Text(
                issue['description'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        issue['assignedToName'] ?? 'Unassigned Staff',
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  if (isEscalated)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                      child: const Text('⚠️ SLA OVERRUN', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white)),
                    )
                  else
                    Text(
                      'SLA: ${issue['slaMinutes']}min',
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                    ),
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}
