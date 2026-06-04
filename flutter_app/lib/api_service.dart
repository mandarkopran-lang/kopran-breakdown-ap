import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Replace with your Cloud Run Deployment App URL:
  static const String baseProductionUrl = "https://ais-pre-wuvc56taaangrxyoqi4wz4-386607728817.asia-east1.run.app";
  static const String fallbackLocalUrl = "http://10.0.2.2:3000"; // emulator localhost fallback

  static Future<String> get baseUrl async {
    final prefs = await SharedPreferences.getInstance();
    final customUrl = prefs.getString('custom_backend_url');
    if (customUrl != null && customUrl.isNotEmpty) {
      return customUrl;
    }

    try {
      final uri = Uri.base;
      if (uri.scheme.startsWith('http')) {
        return uri.origin;
      }
    } catch (_) {}

    return baseProductionUrl;
  }

  static Future<Map<String, String>> getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final envMode = prefs.getString('kopran_env_mode') ?? 'production';
    final userJson = prefs.getString('shift_sync_user');
    String mobile = '';
    if (userJson != null) {
      try {
        final decoded = jsonDecode(userJson);
        mobile = decoded['mobile'] ?? '';
      } catch (_) {}
    }
    return {
      'Content-Type': 'application/json',
      'X-Env-Mode': envMode,
      if (mobile.isNotEmpty) 'x-user-mobile': mobile,
    };
  }

  // Auth: Request OTP / Custom Register
  static Future<Map<String, dynamic>> requestOtp({
    required String mobile,
    String? name,
    String? role,
    String? department,
    String? plant,
    String? companyId,
    String? companyName,
    String? companyLogo,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'mobile': mobile,
      if (name != null) 'name': name,
      if (role != null) 'role': role,
      if (department != null) 'department': department,
      if (plant != null) 'plant': plant,
      if (companyId != null) 'companyId': companyId,
      if (companyName != null) 'companyName': companyName,
      if (companyLogo != null) 'companyLogo': companyLogo,
    };

    final response = await http.post(
      Uri.parse('$url/api/auth/request-otp'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Auth: Verify OTP
  static Future<Map<String, dynamic>> verifyOtp(String mobile, String otp) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'mobile': mobile,
      'otp': otp,
    };

    final response = await http.post(
      Uri.parse('$url/api/auth/verify-otp'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Fetch Issues / Breakdowns
  static Future<List<dynamic>> fetchIssues({
    String? status,
    String? plant,
    String? department,
    String? machine,
    String? search,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    
    final queryParameters = <String, String>{};
    if (status != null && status.isNotEmpty) queryParameters['status'] = status;
    if (plant != null && plant.isNotEmpty) queryParameters['plant'] = plant;
    if (department != null && department.isNotEmpty) queryParameters['department'] = department;
    if (machine != null && machine.isNotEmpty) queryParameters['machine'] = machine;
    if (search != null && search.isNotEmpty) queryParameters['search'] = search;

    final uri = Uri.parse('$url/api/issues').replace(queryParameters: queryParameters);
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load issues');
    }
  }

  // Fetch Statistics for KPI Panels
  static Future<Map<String, dynamic>> fetchStats() async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final response = await http.get(Uri.parse('$url/api/reports/stats'), headers: headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load stats');
    }
  }

  // Fetch Users / Directory
  static Future<List<dynamic>> fetchUsers() async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final response = await http.get(Uri.parse('$url/api/users'), headers: headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load team directory');
    }
  }

  // Raise a new breakdown ticket (with AI recommended diagnostic attachment)
  static Future<Map<String, dynamic>> raiseBreakdown({
    required String plant,
    required String department,
    required String area,
    required String machine,
    required String description,
    String? imageUrl,
    required int slaMinutes,
    required String createdBy,
    required String createdByName,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'plant': plant,
      'department': department,
      'area': area,
      'machine': machine,
      'description': description,
      'imageUrl': imageUrl ?? '',
      'slaMinutes': slaMinutes,
      'createdBy': createdBy,
      'createdByName': createdByName,
    };

    final response = await http.post(
      Uri.parse('$url/api/issues'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Assign Issue to Engineer
  static Future<Map<String, dynamic>> assignIssue({
    required String issueId,
    required String engineerMobile,
    required String engineerName,
    required int customSla,
    required String assignerMobile,
    required String assignerName,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'engineerMobile': engineerMobile,
      'engineerName': engineerName,
      'customSla': customSla,
      'assignerMobile': assignerMobile,
      'assignerName': assignerName,
    };

    final response = await http.post(
      Uri.parse('$url/api/issues/$issueId/assign'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Update Status Log of standard ticket
  static Future<Map<String, dynamic>> updateStatus({
    required String issueId,
    required String status,
    required String notes,
    required String updaterMobile,
    required String updaterName,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'status': status,
      'notes': notes,
      'updaterMobile': updaterMobile,
      'updaterName': updaterName,
    };

    final response = await http.post(
      Uri.parse('$url/api/issues/$issueId/status'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Confirm Closure of resolved ticket
  static Future<Map<String, dynamic>> confirmClosure({
    required String issueId,
    required String status, // 'closed' or 'reopened'
    required String remarks,
    required String resolverMobile,
    required String resolverName,
    String? notResolvedFeedback,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'status': status,
      'remarks': remarks,
      'resolverMobile': resolverMobile,
      'resolverName': resolverName,
      if (notResolvedFeedback != null) 'notResolvedFeedback': notResolvedFeedback,
    };

    final response = await http.post(
      Uri.parse('$url/api/issues/$issueId/close'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Add User to Roster Database (Admin Only)
  static Future<Map<String, dynamic>> registerTeamMember({
    required String mobile,
    required String name,
    required String role,
    required String department,
    required String plant,
  }) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'mobile': mobile,
      'name': name,
      'role': role,
      'department': department,
      'plant': plant,
    };

    final response = await http.post(
      Uri.parse('$url/api/users'),
      headers: headers,
      body: jsonEncode(body),
    );

    return jsonDecode(response.body);
  }

  // Admin: Approve employee registration
  static Future<Map<String, dynamic>> approveUser(String mobile, bool approved) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'mobile': mobile,
      'approved': approved,
    };
    final response = await http.post(
      Uri.parse('$url/api/admin/approve-user'),
      headers: headers,
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  // Admin: Upgrade/Toggle user role privileges
  static Future<Map<String, dynamic>> changeUserRole(String mobile, String role) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'mobile': mobile,
      'role': role,
    };
    final response = await http.post(
      Uri.parse('$url/api/admin/change-role'),
      headers: headers,
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  // Admin: Update company profile name & logo URL
  static Future<Map<String, dynamic>> updateCompany(String name, String logoUrl) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'name': name,
      'logoUrl': logoUrl,
    };
    final response = await http.post(
      Uri.parse('$url/api/admin/update-company'),
      headers: headers,
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  // Reset Environment DB (Wipe all breakdown history records)
  static Future<Map<String, dynamic>> wipeEnvironmentDatabase() async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final response = await http.post(
      Uri.parse('$url/api/admin/reset-database'),
      headers: headers,
    );

    return jsonDecode(response.body);
  }

  // Admin one-time setup: Register new corporate company
  static Future<Map<String, dynamic>> registerNewCompany(String name, String logoUrl) async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final body = {
      'name': name,
      'logoUrl': logoUrl,
    };
    final response = await http.post(
      Uri.parse('$url/api/admin/register-company'),
      headers: headers,
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  // Admin utility: Fetch audit action tracking logs
  static Future<List<dynamic>> fetchAuditLogs() async {
    final url = await baseUrl;
    final headers = await getHeaders();
    final response = await http.get(
      Uri.parse('$url/api/admin/audit-logs'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load audit logs.');
    }
  }
}
