import 'package:cloud_firestore/cloud_firestore.dart';

class Company {
  final String id;
  final String name;
  final String logoUrl;
  final List<String> plants;
  final List<String> departments;
  final DateTime createdAt;

  Company({
    required this.id,
    required this.name,
    required this.logoUrl,
    required this.plants,
    required this.departments,
    required this.createdAt,
  });

  factory Company.fromMap(String id, Map<String, dynamic> map) {
    return Company(
      id: id,
      name: map['name'] ?? '',
      logoUrl: map['logoUrl'] ?? '',
      plants: List<String>.from(map['plants'] ?? []),
      departments: List<String>.from(map['departments'] ?? []),
      createdAt: map['createdAt'] != null 
          ? (map['createdAt'] as Timestamp).toDate() 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'logoUrl': logoUrl,
      'plants': plants,
      'departments': departments,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
