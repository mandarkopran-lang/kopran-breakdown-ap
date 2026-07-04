import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class FirebaseAuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Stream of user auth changes
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Get current user ID
  String? get currentUid => _auth.currentUser?.uid;

  // Get current user phone number
  String? get currentPhone => _auth.currentUser?.phoneNumber;

  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Request Phone OTP
  Future<void> verifyPhone({
    required String phoneNumber,
    required Function(String verificationId) onCodeSent,
    required Function(FirebaseAuthException e) onFailed,
    required Function(PhoneAuthCredential credential) onAutoVerify,
  }) async {
    // Formatting number correctly if required (e.g., adding +91)
    String formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91$formattedPhone'; // default to India code if prefix missing
    }

    if (kIsWeb) {
      // Direct sign-in configuration for Web testing platform environments
      try {
        final ConfirmationResult result = await _auth.signInWithPhoneNumber(formattedPhone);
        onCodeSent(result.verificationId);
      } catch (e) {
        onFailed(FirebaseAuthException(code: 'web-error', message: e.toString()));
      }
      return;
    }

    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: formattedPhone,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (PhoneAuthCredential credential) async {
          // Automatic SMS verification handler
          await _auth.signInWithCredential(credential);
          onAutoVerify(credential);
        },
        verificationFailed: (FirebaseAuthException e) {
          onFailed(e);
        },
        codeSent: (String verificationId, int? resendToken) {
          onCodeSent(verificationId);
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          debugPrint('Code auto-retrieval timeout');
        },
      );
    } catch (e) {
      onFailed(FirebaseAuthException(code: 'internal-error', message: e.toString()));
    }
  }

  // Verify OTP and complete login
  Future<UserCredential> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {
    PhoneAuthCredential credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    return await _auth.signInWithCredential(credential);
  }
}
