import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/app_user.dart';
import '../models/company.dart';
import '../models/breakdown.dart';
import '../services/firestore_service.dart';
import '../services/firebase_storage_service.dart';
import 'issue_detail_screen.dart';
import 'admin_panel_screen.dart';

class DashboardScreen extends StatefulWidget {
  final AppUser currentUser;
  final Company? currentCompany;
  final VoidCallback onSignOut;

  const DashboardScreen({
    super.key,
    required this.currentUser,
    required this.currentCompany,
    required this.onSignOut,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _firestoreService = FirestoreService();
  final _storageService = FirebaseStorageService();

  String _statusFilter = '';
  String _plantFilter = '';
  final TextEditingController _searchController = TextEditingController();

  // Dialog Image Picker state variables
  File? _selectedImage;
  bool _uploadingImage = false;

  Future<void> _pickImage(ImageSource source, StateSetter setModalState) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 70);
      if (picked != null) {
        setModalState(() {
          _selectedImage = File(picked.path);
        });
      }
    } catch (e) {
      debugPrint("Error picking image: $e");
    }
  }

  void _openRaiseBreakdownDialog() {
    _selectedImage = null;
    _uploadingImage = false;

    // Load available plants/departments from Company document
    final List<String> plantsList = widget.currentCompany?.plants ?? ['Pen Plant', 'Non-Pen Plant'];
    final List<String> departmentsList = widget.currentCompany?.departments ?? ['Production', 'Engineering', 'QA', 'QC'];

    String selectedPlant = plantsList.isNotEmpty ? plantsList.first : 'Pen Plant';
    String selectedDept = departmentsList.isNotEmpty ? departmentsList.first : 'Production';
    
    final machineController = TextEditingController();
    final descController = TextEditingController();
    int slaMinutes = 120;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
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
                        const Row(
                          children: [
                            Icon(Icons.add_alert, color: Color(0xFF0F766E)),
                            SizedBox(width: 8),
                            Text(
                              'REPORT NEW BREAKDOWN',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                            ),
                          ],
                        ),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),

                    // Plant Location Select
                    const Text('Manufacturing Plant / Location', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      value: selectedPlant,
                      items: plantsList.map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12)))).toList(),
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

                    // Affected Department Select
                    const Text('Department Affected', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      value: selectedDept,
                      items: departmentsList.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 12)))).toList(),
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

                    // Specific Machine Name/ID
                    const Text('Machine Name / Asset Identifier', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: machineController,
                      style: const TextStyle(fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'e.g. PLC Control Station-01 or Boiler SB-50',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Fault Description
                    const Text('Describe Machine Fault Symptoms', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      style: const TextStyle(fontSize: 12),
                      decoration: InputDecoration(
                        hintText: 'Provide details like abnormal sound, noise level, temperature, oil leakage, electrical trips...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Photo Attachment Area
                    const Text('Attach Machine Fault Photo (Optional)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 6),
                    if (_selectedImage != null) ...[
                      Stack(
                        children: [
                          Container(
                            height: 120,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              image: DecorationImage(image: FileImage(_selectedImage!), fit: BoxFit.cover),
                            ),
                          ),
                          Positioned(
                            right: 4,
                            top: 4,
                            child: CircleAvatar(
                              backgroundColor: Colors.black54,
                              radius: 14,
                              child: IconButton(
                                icon: const Icon(Icons.close, size: 14, color: Colors.white),
                                onPressed: () {
                                  setModalState(() {
                                    _selectedImage = null;
                                  });
                                },
                              ),
                            ),
                          )
                        ],
                      )
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.camera_alt, size: 16),
                              label: const Text('Take Photo', style: TextStyle(fontSize: 11)),
                              onPressed: () => _pickImage(ImageSource.camera, setModalState),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.photo_library, size: 16),
                              label: const Text('From Gallery', style: TextStyle(fontSize: 11)),
                              onPressed: () => _pickImage(ImageSource.gallery, setModalState),
                            ),
                          ),
                        ],
                      )
                    ],
                    const SizedBox(height: 12),

                    // Target SLA Resolution
                    const Text('SLA Target Resolution (Minutes)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<int>(
                      value: slaMinutes,
                      items: const [
                        DropdownMenuItem(value: 30, child: Text('Critical (30 Min - Assembly Block)')),
                        DropdownMenuItem(value: 60, child: Text('Urgent (1 Hour - Line Down)')),
                        DropdownMenuItem(value: 120, child: Text('Standard (2 Hours - Packaging/Pack blocks)')),
                        DropdownMenuItem(value: 240, child: Text('Routine (4 Hours - Utility backup)')),
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
                    const SizedBox(height: 24),

                    _uploadingImage
                        ? const Center(child: CircularProgressIndicator())
                        : ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F766E),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () async {
                              final machine = machineController.text.trim();
                              final desc = descController.text.trim();
                              if (machine.isEmpty) {
                                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Please enter the Machine Asset Name.')));
                                return;
                              }
                              if (desc.isEmpty) {
                                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Please provide fault description details.')));
                                return;
                              }

                              setModalState(() {
                                _uploadingImage = true;
                              });

                              try {
                                String uploadedUrl = '';
                                if (_selectedImage != null) {
                                  // Upload image to Storage
                                  final path = 'breakdowns/${widget.currentUser.companyId}/${DateTime.now().millisecondsSinceEpoch}.jpg';
                                  uploadedUrl = await _storageService.uploadImage(
                                    imageFile: _selectedImage!,
                                    path: path,
                                  );
                                }

                                final ticketId = 'BD-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';

                                final newTicket = BreakdownTicket(
                                  id: ticketId,
                                  companyId: widget.currentUser.companyId,
                                  machineName: machine,
                                  plant: selectedPlant,
                                  department: selectedDept,
                                  description: desc,
                                  imageUrl: uploadedUrl,
                                  status: 'Open',
                                  createdBy: widget.currentUser.uid,
                                  createdByName: widget.currentUser.name,
                                  createdByPhone: widget.currentUser.phone,
                                  slaMinutes: slaMinutes,
                                  createdAt: DateTime.now(),
                                  history: [
                                    {
                                      'status': 'Open',
                                      'notes': 'Breakdown logged in system by ${widget.currentUser.name}. Dispatched alert details.',
                                      'timestamp': DateTime.now().toIso8601String(),
                                      'updatedByName': widget.currentUser.name,
                                    }
                                  ],
                                );

                                await _firestoreService.raiseBreakdownTicket(newTicket);
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Breakdown registered and logged successfully!'),
                                    backgroundColor: Colors.teal,
                                  ),
                                );
                              } catch (e) {
                                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Submission error: $e')));
                              } finally {
                                setModalState(() {
                                  _uploadingImage = false;
                                });
                              }
                            },
                            child: const Text('SUBMIT BREAKDOWN TICKET', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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

  Widget _buildTopPanel(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    final bool isMobile = screenWidth < 700;

    if (isMobile) {
      return Container(
        padding: const EdgeInsets.all(12),
        color: const Color(0xFF1E293B),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (widget.currentCompany != null && widget.currentCompany!.logoUrl.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(
                      widget.currentCompany!.logoUrl,
                      height: 36,
                      width: 36,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => const Icon(Icons.corporate_fare, color: Colors.white, size: 36),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.currentCompany?.name ?? 'Enterprise Workspace',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontFamily: 'Space Grotesk',
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        '${widget.currentUser.department.isNotEmpty ? widget.currentUser.department : "Engineering"} Breakdown Monitor',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 9,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Exit App
                TextButton.icon(
                  icon: const Icon(Icons.exit_to_app, color: Colors.redAccent, size: 12),
                  label: const Text('EXIT APP', style: TextStyle(color: Colors.redAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    side: const BorderSide(color: Colors.redAccent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  onPressed: widget.onSignOut,
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Divider(color: Colors.slate, height: 1),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blueAccent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.blueAccent.withOpacity(0.3)),
                      ),
                      child: const Text(
                        'CONSOLE',
                        style: TextStyle(color: Colors.blue, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (widget.currentUser.role == 'supervisor' || widget.currentUser.role == 'admin' || widget.currentUser.role == 'manager')
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add_circle, size: 10),
                        label: const Text('RAISE BREAKDOWN', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F766E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                        onPressed: _openRaiseBreakdownDialog,
                      ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.person, color: Colors.grey, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      widget.currentUser.name,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            )
          ],
        ),
      );
    }

    // Wide Layout for Tablet / Desktop
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      color: const Color(0xFF1E293B),
      child: Row(
        children: [
          if (widget.currentCompany != null && widget.currentCompany!.logoUrl.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.network(
                widget.currentCompany!.logoUrl,
                height: 44,
                width: 44,
                fit: BoxFit.cover,
                errorBuilder: (ctx, err, stack) => const Icon(Icons.corporate_fare, color: Colors.white, size: 44),
              ),
            ),
            const SizedBox(width: 14),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.currentCompany?.name ?? 'Enterprise Workspace',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontFamily: 'Space Grotesk',
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  '${widget.currentUser.department.isNotEmpty ? widget.currentUser.department : "Engineering"} Breakdown Monitor',
                  style: const TextStyle(
                    color: Colors.grey,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.blueAccent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.blueAccent.withOpacity(0.3)),
              ),
              child: const Text(
                'CONSOLE',
                style: TextStyle(color: Colors.blue, fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            if (widget.currentUser.role == 'supervisor' || widget.currentUser.role == 'admin' || widget.currentUser.role == 'manager') ...[
              ElevatedButton.icon(
                icon: const Icon(Icons.add_circle, size: 14),
                label: const Text('RAISE BREAKDOWN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F766E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                onPressed: _openRaiseBreakdownDialog,
              ),
              const SizedBox(width: 16),
            ],
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.currentUser.name,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                Text(
                  widget.currentUser.role.toUpperCase(),
                  style: const TextStyle(color: Colors.grey, fontSize: 9),
                ),
              ],
            ),
            const SizedBox(width: 16),
            TextButton.icon(
              icon: const Icon(Icons.exit_to_app, color: Colors.redAccent, size: 16),
              label: const Text('EXIT APP', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                side: const BorderSide(color: Colors.redAccent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
              onPressed: widget.onSignOut,
            ),
          ],
        ),
      ],
    ),
  );
}

  @override
  Widget build(BuildContext context) {
    final isAdmin = widget.currentUser.role == 'admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Column(
        children: [
          // 1. Fully Styled Custom Brand Top Panel
          _buildTopPanel(context),

          // 2. Main content stream
          Expanded(
            child: StreamBuilder<List<BreakdownTicket>>(
              stream: _firestoreService.getBreakdownTicketsStream(widget.currentUser.companyId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final tickets = snapshot.data ?? [];

                // Filter operations
                final filteredTickets = tickets.where((t) {
                  // Search query filter
                  final query = _searchController.text.trim().toLowerCase();
                  if (query.isNotEmpty) {
                    final machineMatch = t.machineName.toLowerCase().contains(query);
                    final descMatch = t.description.toLowerCase().contains(query);
                    final idMatch = t.id.toLowerCase().contains(query);
                    if (!machineMatch && !descMatch && !idMatch) return false;
                  }

                  // Plant filter
                  if (_plantFilter.isNotEmpty && t.plant != _plantFilter) {
                    return false;
                  }

                  // Status filter
                  if (_statusFilter.isNotEmpty && t.status.toLowerCase() != _statusFilter.toLowerCase()) {
                    return false;
                  }

                  return true;
                }).toList();

                // Compute KPI Statistics
                final int openCount = tickets.where((t) => t.status == 'Open').length;
                final int progressCount = tickets.where((t) => t.status == 'In Progress').length;
                final int resolvedCount = tickets.where((t) => t.status == 'Resolved').length;
                final int closedCount = tickets.where((t) => t.status == 'Closed').length;

                return SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // KPI Stat Cards
                      Row(
                        children: [
                          Expanded(child: _buildKPI('OPEN', openCount.toString(), const Color(0xFFEF4444))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildKPI('ENGAGED', progressCount.toString(), const Color(0xFF3B82F6))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildKPI('RESOLVED', resolvedCount.toString(), const Color(0xFF10B981))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildKPI('CLOSED', closedCount.toString(), const Color(0xFF64748B))),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Floating Quick Config Button for Admin Setup Panel
                      if (isAdmin) ...[
                        ElevatedButton.icon(
                          icon: const Icon(Icons.admin_panel_settings, size: 18),
                          label: const Text('OPEN ADMIN ENTERPRISE SETTINGS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (ctx) => AdminPanelScreen(currentUser: widget.currentUser),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Filters & Search Bar Card
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
                                        hintText: 'Search machine name, ticket ID or symptoms...',
                                        border: InputBorder.none,
                                        isDense: true,
                                      ),
                                      onChanged: (s) => setState(() {}),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.refresh, size: 18),
                                    onPressed: () => setState(() {}),
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
                                        items: [
                                          const DropdownMenuItem(value: '', child: Text('All Plants / Buildings')),
                                          ...(widget.currentCompany?.plants.map((p) => DropdownMenuItem(value: p, child: Text(p))) ?? []),
                                        ],
                                        onChanged: (v) {
                                          setState(() {
                                            _plantFilter = v ?? '';
                                          });
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
                                          DropdownMenuItem(value: 'in progress', child: Text('In Progress')),
                                          DropdownMenuItem(value: 'resolved', child: Text('Resolved (Dry Run)')),
                                          DropdownMenuItem(value: 'closed', child: Text('Closed Completed')),
                                        ],
                                        onChanged: (v) {
                                          setState(() {
                                            _statusFilter = v ?? '';
                                          });
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

                      // Tickets list Header
                      const Text(
                        'ACTIVE BREAKDOWN WORKFLOW LOGS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.blueGrey, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 8),

                      filteredTickets.isEmpty
                          ? const Card(
                              child: Padding(
                                padding: EdgeInsets.all(32.0),
                                child: Text(
                                  'No active breakdown tickets matching criteria found in this company namespace.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: filteredTickets.length,
                              itemBuilder: (ctx, i) {
                                final ticket = filteredTickets[i];
                                return _buildTicketCard(ticket);
                              },
                            ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
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

  Widget _buildTicketCard(BreakdownTicket ticket) {
    final Map<String, dynamic> statusMap = {
      'open': {'txt': 'OPEN', 'col': Colors.red},
      'in progress': {'txt': 'IN PROGRESS', 'col': Colors.blue},
      'resolved': {'txt': 'RESOLVED', 'col': Colors.green},
      'closed': {'txt': 'CLOSED', 'col': Colors.grey},
    };

    final stat = statusMap[ticket.status.toLowerCase()] ?? {'txt': 'OPEN', 'col': Colors.red};

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey.shade200)),
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => IssueDetailScreen(
                ticket: ticket,
                currentUser: widget.currentUser,
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
                    ticket.id,
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
                '${ticket.machineName} (${ticket.plant})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 4),
              Text(
                ticket.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              if (ticket.imageUrl.isNotEmpty) ...[
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.network(
                    ticket.imageUrl,
                    height: 80,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => const SizedBox.shrink(),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        ticket.assignedToName.isNotEmpty ? ticket.assignedToName : 'Unassigned Field Staff',
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Text(
                    'SLA Limit: ${ticket.slaMinutes} Min',
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
