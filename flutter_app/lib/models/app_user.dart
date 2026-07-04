import 'package:cloud_firestore/cloud_firestore.dart';

class AppUser {
  final String uid;
  final String phone;
  final String name;
  final String role; // admin, manager, supervisor, user
  final String companyId;
  final String department;
  final String plant;
  final bool approved;
  final DateTime createdAt;

  AppUser({
    required this.uid,
    required this.phone,
    required this.name,
    required this.role,
    required this.companyId,
    required this.department,
    required this.plant,
    required this.approved,
    required this.createdAt,
  });

  factory AppUser.fromMap(String uid, Map<String, dynamic> map) {
    return AppUser(
      uid: uid,
      phone: map['phone'] ?? '',
      name: map['name'] ?? '',
      role: map['role'] ?? 'user',
      companyId: map['companyId'] ?? '',
      department: map['department'] ?? '',
      plant: map['plant'] ?? '',
      approved: map['approved'] ?? false,
      createdAt: map['createdAt'] != null 
          ? (map['createdAt'] as Timestamp).toDate() 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'phone': phone,
      'name': name,
      'role': role,
      'companyId': companyId,
      'department': department,
      'plant': plant,
      'approved': approved,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  AppUser copyWith({
    String? name,
    String? role,
    String? companyId,
    String? department,
    String? plant,
    bool? approved,
  }) {
    return AppUser(
      uid: uid,
      phone: phone,
      name: name ?? this.name,
      role: role ?? this.role,
      companyId: companyId ?? this.companyId,
      department: department ?? this.department,
      plant: plant ?? this.plant,
      approved: approved ?? this.approved,
      createdAt: createdAt,
    );
  }
}
