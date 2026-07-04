import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_user.dart';
import '../models/company.dart';
import '../models/breakdown.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // 1. Fetch User Profile from root level
  Future<AppUser?> getUserProfile(String uid) async {
    try {
      final docSnap = await _db.collection('users').doc(uid).get();
      if (docSnap.exists && docSnap.data() != null) {
        return AppUser.fromMap(uid, docSnap.data()!);
      }
    } catch (e) {
      print("Error fetching user profile: $e");
    }
    return null;
  }

  // 2. Create User Profile (Writes to root 'users' AND nested 'companies/companyId/users')
  Future<void> createUserProfile(AppUser user) async {
    final batch = _db.batch();

    // Root reference
    final rootUserRef = _db.collection('users').doc(user.uid);
    batch.set(rootUserRef, user.toMap());

    // Company nested reference if companyId exists
    if (user.companyId.isNotEmpty) {
      final companyUserRef = _db
          .collection('companies')
          .doc(user.companyId)
          .collection('users')
          .doc(user.uid);
      batch.set(companyUserRef, user.toMap());
    }

    await batch.commit();
  }

  // 3. Create a Company (Multi-tenant)
  Future<void> createCompany(Company company) async {
    final docRef = _db.collection('companies').doc(company.id);
    await docRef.set(company.toMap());
  }

  // 4. Fetch a Company
  Future<Company?> getCompany(String companyId) async {
    try {
      final docSnap = await _db.collection('companies').doc(companyId).get();
      if (docSnap.exists && docSnap.data() != null) {
        return Company.fromMap(companyId, docSnap.data()!);
      }
    } catch (e) {
      print("Error fetching company: $e");
    }
    return null;
  }

  // 5. Update Company Profile (Name, Logo)
  Future<void> updateCompanyProfile(String companyId, String name, String logoUrl) async {
    await _db.collection('companies').doc(companyId).update({
      'name': name,
      'logoUrl': logoUrl,
    });
  }

  // 6. Manage Plants
  Future<void> addPlant(String companyId, String plantName) async {
    await _db.collection('companies').doc(companyId).update({
      'plants': FieldValue.arrayUnion([plantName]),
    });
  }

  Future<void> removePlant(String companyId, String plantName) async {
    await _db.collection('companies').doc(companyId).update({
      'plants': FieldValue.arrayRemove([plantName]),
    });
  }

  // 7. Manage Departments
  Future<void> addDepartment(String companyId, String departmentName) async {
    await _db.collection('companies').doc(companyId).update({
      'departments': FieldValue.arrayUnion([departmentName]),
    });
  }

  Future<void> removeDepartment(String companyId, String departmentName) async {
    await _db.collection('companies').doc(companyId).update({
      'departments': FieldValue.arrayRemove([departmentName]),
    });
  }

  // 8. Fetch Company Roster/Users list
  Future<List<AppUser>> getCompanyUsers(String companyId) async {
    try {
      final querySnap = await _db
          .collection('companies')
          .doc(companyId)
          .collection('users')
          .get();
      
      return querySnap.docs
          .map((doc) => AppUser.fromMap(doc.id, doc.data()))
          .toList();
    } catch (e) {
      print("Error fetching company users: $e");
      return [];
    }
  }

  // 9. Update User Approval Status
  Future<void> updateUserApproval(String companyId, String uid, bool approved) async {
    final batch = _db.batch();

    final rootRef = _db.collection('users').doc(uid);
    batch.update(rootRef, {'approved': approved});

    final compRef = _db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(uid);
    batch.update(compRef, {'approved': approved});

    await batch.commit();
  }

  // 10. Update User Role
  Future<void> updateUserRole(String companyId, String uid, String role) async {
    final batch = _db.batch();

    final rootRef = _db.collection('users').doc(uid);
    batch.update(rootRef, {'role': role});

    final compRef = _db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(uid);
    batch.update(compRef, {'role': role});

    await batch.commit();
  }

  // 11. Raise a Breakdown Ticket
  Future<void> raiseBreakdownTicket(BreakdownTicket ticket) async {
    await _db
        .collection('companies')
        .doc(ticket.companyId)
        .collection('breakdowns')
        .doc(ticket.id)
        .set(ticket.toMap());
  }

  // 12. Fetch Company Breakdown Tickets
  Stream<List<BreakdownTicket>> getBreakdownTicketsStream(String companyId) {
    return _db
        .collection('companies')
        .doc(companyId)
        .collection('breakdowns')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((querySnap) {
          return querySnap.docs
              .map((doc) => BreakdownTicket.fromMap(doc.id, doc.data()))
              .toList();
        });
  }

  // 13. Assign Ticket to Engineer
  Future<void> assignTicket({
    required String companyId,
    required String ticketId,
    required String engineerUid,
    required String engineerName,
    required String assignerName,
  }) async {
    final ref = _db
        .collection('companies')
        .doc(companyId)
        .collection('breakdowns')
        .doc(ticketId);

    final historyLog = {
      'status': 'assigned',
      'notes': 'Ticket assigned to engineer $engineerName by $assignerName.',
      'timestamp': Timestamp.now(),
      'updatedByName': assignerName,
    };

    await ref.update({
      'status': 'In Progress',
      'assignedTo': engineerUid,
      'assignedToName': engineerName,
      'assignedAt': Timestamp.now(),
      'history': FieldValue.arrayUnion([historyLog]),
    });
  }

  // 14. Update Ticket Status (Resolve)
  Future<void> resolveTicket({
    required String companyId,
    required String ticketId,
    required String remarks,
    required String updaterName,
  }) async {
    final ref = _db
        .collection('companies')
        .doc(companyId)
        .collection('breakdowns')
        .doc(ticketId);

    final historyLog = {
      'status': 'Resolved',
      'notes': 'Ticket resolved by engineer: $remarks',
      'timestamp': Timestamp.now(),
      'updatedByName': updaterName,
    };

    await ref.update({
      'status': 'Resolved',
      'resolvedAt': Timestamp.now(),
      'resolutionRemarks': remarks,
      'history': FieldValue.arrayUnion([historyLog]),
    });
  }

  // 15. Confirm Closure or Reopen Ticket
  Future<void> closeTicket({
    required String companyId,
    required String ticketId,
    required String remarks,
    required String closerName,
    required bool isApproved, // true to close, false to reopen
  }) async {
    final ref = _db
        .collection('companies')
        .doc(companyId)
        .collection('breakdowns')
        .doc(ticketId);

    final proposedStatus = isApproved ? 'Closed' : 'Open';
    final historyLog = {
      'status': proposedStatus,
      'notes': isApproved 
          ? 'Ticket closure approved and closed by supervisor: $remarks'
          : 'Ticket resolution rejected and reopened: $remarks',
      'timestamp': Timestamp.now(),
      'updatedByName': closerName,
    };

    await ref.update({
      'status': proposedStatus,
      'closedAt': isApproved ? Timestamp.now() : null,
      'history': FieldValue.arrayUnion([historyLog]),
    });
  }
}
