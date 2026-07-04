import 'package:cloud_firestore/cloud_firestore.dart';

class BreakdownTicket {
  final String id;
  final String companyId;
  final String machineName;
  final String plant;
  final String department;
  final String description;
  final String imageUrl;
  final String status; // Open, In Progress, Closed
  final String createdBy;
  final String createdByName;
  final DateTime createdAt;
  final String? assignedTo;
  final String? assignedToName;
  final DateTime? assignedAt;
  final DateTime? resolvedAt;
  final DateTime? closedAt;
  final String? resolutionRemarks;
  final int slaMinutes;
  final List<Map<String, dynamic>> history;

  BreakdownTicket({
    required this.id,
    required this.companyId,
    required this.machineName,
    required this.plant,
    required this.department,
    required this.description,
    required this.imageUrl,
    required this.status,
    required this.createdBy,
    required this.createdByName,
    required this.createdAt,
    this.assignedTo,
    this.assignedToName,
    this.assignedAt,
    this.resolvedAt,
    this.closedAt,
    this.resolutionRemarks,
    required this.slaMinutes,
    required this.history,
  });

  factory BreakdownTicket.fromMap(String id, Map<String, dynamic> map) {
    return BreakdownTicket(
      id: id,
      companyId: map['companyId'] ?? '',
      machineName: map['machineName'] ?? '',
      plant: map['plant'] ?? '',
      department: map['department'] ?? '',
      description: map['description'] ?? '',
      imageUrl: map['imageUrl'] ?? '',
      status: map['status'] ?? 'Open',
      createdBy: map['createdBy'] ?? '',
      createdByName: map['createdByName'] ?? '',
      createdAt: map['createdAt'] != null 
          ? (map['createdAt'] as Timestamp).toDate() 
          : DateTime.now(),
      assignedTo: map['assignedTo'],
      assignedToName: map['assignedToName'],
      assignedAt: map['assignedAt'] != null 
          ? (map['assignedAt'] as Timestamp).toDate() 
          : null,
      resolvedAt: map['resolvedAt'] != null 
          ? (map['resolvedAt'] as Timestamp).toDate() 
          : null,
      closedAt: map['closedAt'] != null 
          ? (map['closedAt'] as Timestamp).toDate() 
          : null,
      resolutionRemarks: map['resolutionRemarks'],
      slaMinutes: map['slaMinutes'] ?? 120,
      history: List<Map<String, dynamic>>.from(map['history'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyId': companyId,
      'machineName': machineName,
      'plant': plant,
      'department': department,
      'description': description,
      'imageUrl': imageUrl,
      'status': status,
      'createdBy': createdBy,
      'createdByName': createdByName,
      'createdAt': Timestamp.fromDate(createdAt),
      'assignedTo': assignedTo,
      'assignedToName': assignedToName,
      'assignedAt': assignedAt != null ? Timestamp.fromDate(assignedAt!) : null,
      'resolvedAt': resolvedAt != null ? Timestamp.fromDate(resolvedAt!) : null,
      'closedAt': closedAt != null ? Timestamp.fromDate(closedAt!) : null,
      'resolutionRemarks': resolutionRemarks,
      'slaMinutes': slaMinutes,
      'history': history,
    };
  }
}
