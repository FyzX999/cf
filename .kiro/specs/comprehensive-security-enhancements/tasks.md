# Implementation Plan: Comprehensive Security Enhancements

## Overview

This implementation plan transforms the security design into actionable coding tasks for TypeScript/Next.js. The implementation follows a defense-in-depth approach, building security layers incrementally: core security utilities → API middleware → authentication hardening → payment security → data encryption → testing and validation.

The plan includes 45 property-based test sub-tasks corresponding to the 45 correctness properties defined in the design document, ensuring comprehensive security validation.

## Tasks

- [x] 1. Set up security infrastructure and core utilities
  - Create directory structure for security modules
  - Install required dependencies (fast-check for property testing)
  - Set up environment variable validation
  - _Requirements: 7.2, 7.3, 7.7_

- [x] 2. Implement Enhanced Rate Limiter
  - [x] 2.1 Extend existing rate limiter with violation tracking and IP blocking
    - Modify `src/lib/rate-limit.ts` to add `ViolationTracker` and `blockList` storage
    - Implement `blockIdentifier()`, `isBlocked()`, and violation tracking in `isRateLimited()`
    - Add preset configurations for all endpoints (orderCreation, paymentVerification, orderTracking, promoCodeValidation)
    - Implement automatic cleanup of expired entries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 2.2 Write property test for rate limit enforcement
    - **Property 1: Rate Limit Enforcement**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6**
    - Generate random request sequences and verify 429 status when threshold exceeded
    - Test that security logger is called on violations

  - [ ]* 2.3 Write property test for independent rate limit tracking
    - **Property 2: Independent Rate Limit Tracking**
    - **Validates: Requirements 1.4, 1.5**
    - Generate requests from different identifiers and verify independent tracking

  - [ ]* 2.4 Write property test for IP blocking after repeated violations
    - **Property 3: IP Blocking After Repeated Violations**
    - **Validates: Requirements 1.7, 11.6, 20.5**
    - Simulate 10+ violations within 1 hour and verify 24-hour block

- [x] 3. Implement Input Validator
  - [x] 3.1 Create input validation module with sanitization functions
    - Create `src/lib/input-validator.ts` with validation interfaces and types
    - Implement `sanitizeString()`, `escapeHtml()`, `stripSqlKeywords()` utilities
    - Implement field validators: `validateEmail()`, `validateOrderId()`, `validateUrl()`, `sanitizeQuantity()`
    - Implement `validateField()` for single field validation with rules
    - Implement `validateObject()` for schema-based validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 3.2 Write property test for input sanitization universality
    - **Property 4: Input Sanitization Universality**
    - **Validates: Requirements 2.1, 2.3, 2.8, 17.1**
    - Generate random strings with control characters and verify sanitization

  - [ ]* 3.3 Write property test for SQL injection detection
    - **Property 5: SQL Injection Detection**
    - **Validates: Requirements 2.2, 17.4**
    - Generate SQL injection payloads and verify rejection

  - [ ]* 3.4 Write property test for email validation RFC compliance
    - **Property 6: Email Validation RFC Compliance**
    - **Validates: Requirements 2.4**
    - Generate valid/invalid emails and verify RFC 5322 compliance

  - [ ]* 3.5 Write property test for format validation consistency
    - **Property 7: Format Validation Consistency**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.9**
    - Test order ID, URL, and quantity validation with various inputs

  - [ ]* 3.6 Write property test for string truncation
    - **Property 8: String Truncation Property**
    - **Validates: Requirements 2.10**
    - Generate strings exceeding max length and verify truncation preserves UTF-8

- [x] 4. Implement CSRF Protection
  - [x] 4.1 Create CSRF token management module
    - Create `src/lib/csrf.ts` with token storage and interfaces
    - Implement `generateCsrfToken()` with 32-byte cryptographic randomness
    - Implement `verifyCsrfToken()` with session binding and expiration checks
    - Implement `cleanupExpiredTokens()` with periodic cleanup
    - Implement `getCsrfTokenFromRequest()` helper for extracting tokens from headers
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.2 Write property test for CSRF token binding
    - **Property 9: CSRF Token Binding**
    - **Validates: Requirements 3.2, 3.3, 3.6**
    - Verify tokens only validate with correct session

  - [ ]* 4.3 Write property test for CSRF token entropy
    - **Property 10: CSRF Token Entropy**
    - **Validates: Requirements 3.4**
    - Generate multiple tokens and verify uniqueness/randomness

  - [ ]* 4.4 Write property test for CSRF token expiration
    - **Property 11: CSRF Token Expiration**
    - **Validates: Requirements 3.5**
    - Test tokens expire after 1 hour

- [x] 5. Implement Security Logger
  - [x] 5.1 Create security event logging system
    - Create `src/lib/security-logger.ts` with event types and interfaces
    - Implement `logSecurityEvent()` with correlation ID generation
    - Implement PII masking functions: `hashPii()` and `maskIp()`
    - Implement `getRecentEvents()`, `getEventsByType()`, `getEventsByActor()` query functions
    - Integrate with `admin-store.json` for storing security log
    - Add 90-day retention policy with automatic cleanup
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [ ]* 5.2 Write property test for security event logging completeness
    - **Property 22: Security Event Logging Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.10**
    - Verify all security events are logged with required fields

  - [ ]* 5.3 Write property test for PII masking in logs
    - **Property 23: PII Masking in Logs**
    - **Validates: Requirements 9.9, 6.9**
    - Verify emails and IPs are masked/hashed in log entries

- [x] 6. Implement Data Encryption Module
  - [x] 6.1 Create AES-256-GCM encryption utilities
    - Create `src/lib/encryption.ts` with encryption interfaces
    - Implement `getEncryptionKey()` with environment variable validation
    - Implement `encrypt()` using AES-256-GCM with random IV and auth tag
    - Implement `decrypt()` with authentication tag verification
    - Implement `encryptWithHmac()` and `decryptAndVerify()` for integrity checking
    - Implement `hashSensitive()` for one-way hashing in logs
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [ ]* 6.2 Write property test for sensitive data encryption at rest
    - **Property 20: Sensitive Data Encryption At Rest**
    - **Validates: Requirements 6.10, 16.1, 16.2**
    - Verify encrypted data is stored, not plaintext

  - [ ]* 6.3 Write property test for encryption round-trip integrity
    - **Property 21: Encryption Round-Trip Integrity**
    - **Validates: Requirements 16.5**
    - Test decrypt(encrypt(P)) = P and tampering detection

- [ ] 7. Enhance Session Manager with IP Binding
  - [ ] 7.1 Extend admin authentication with session metadata
    - Modify `src/lib/admin-auth.ts` to add session storage with IP/user-agent tracking
    - Update `signAdminSession()` to include IP address in token and store metadata
    - Update `isValidAdminSession()` to verify IP address matches
    - Implement `cleanupExpiredSessions()` with 2-hour admin timeout
    - Add security logging for IP mismatch events
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [ ]* 7.2 Write property test for session token entropy and uniqueness
    - **Property 12: Session Token Entropy and Uniqueness**
    - **Validates: Requirements 5.1**
    - Generate multiple sessions and verify 256-bit entropy and uniqueness

  - [ ]* 7.3 Write property test for session timeout enforcement
    - **Property 13: Session Timeout Enforcement**
    - **Validates: Requirements 5.7, 5.8**
    - Test sessions expire after configured timeout

  - [ ]* 7.4 Write property test for session IP binding
    - **Property 14: Session IP Binding**
    - **Validates: Requirements 5.9, 5.10**
    - Verify sessions from different IPs are rejected

- [ ] 8. Checkpoint - Core Security Infrastructure Complete
  - Ensure all tests pass for rate limiter, input validator, CSRF, encryption, and session manager
  - Verify environment variables are properly configured
  - Ask the user if questions arise about security configurations

- [ ] 9. Implement Payment Security Module
  - [ ] 9.1 Create payment verification and webhook security
    - Create `src/lib/payment-security.ts` with verification interfaces
    - Implement `verifyWebhookSignature()` for NowPayments (HMAC-SHA512)
    - Implement `verifyPaymentAmount()` with tolerance checking
    - Implement `isDuplicatePayment()` with transaction ID tracking
    - Implement `isCashtagBlocked()` and `blockCashtag()` for CashApp blocklist
    - Add payment timeout tracking (15 minutes)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]* 9.2 Write property test for webhook signature verification
    - **Property 15: Webhook Signature Verification**
    - **Validates: Requirements 6.1, 19.1, 19.2**
    - Test HMAC verification with valid/invalid signatures using constant-time comparison

  - [ ]* 9.3 Write property test for payment amount verification
    - **Property 16: Payment Amount Verification**
    - **Validates: Requirements 6.2, 6.8**
    - Generate various payment/order amount pairs and verify tolerance logic

  - [ ]* 9.4 Write property test for duplicate payment prevention
    - **Property 17: Duplicate Payment Prevention**
    - **Validates: Requirements 6.4, 19.5**
    - Test duplicate webhooks are detected and only first is processed

  - [ ]* 9.5 Write property test for cashtag blocklist enforcement
    - **Property 18: Cashtag Blocklist Enforcement**
    - **Validates: Requirements 6.3**
    - Verify blocked cashtags are rejected regardless of amount

  - [ ]* 9.6 Write property test for payment webhook timeout
    - **Property 19: Payment Webhook Timeout**
    - **Validates: Requirements 6.7**
    - Test payments expire after 15 minutes

- [ ] 10. Implement Enhanced Security Middleware
  - [ ] 10.1 Update Next.js middleware with comprehensive security
    - Modify `src/middleware.ts` to add HTTPS enforcement with redirect
    - Add comprehensive security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS)
    - Remove X-Powered-By header
    - Implement Content Security Policy header with Next.js/Tailwind compatibility
    - Integrate rate limiter for all API routes
    - Integrate CSRF verification for state-changing requests
    - Add security logging for violations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 10.2 Write integration tests for security headers
    - Test all security headers are present on responses
    - Test HTTPS redirect in production mode
    - Test CSP header contains required directives
    - _Requirements: 4.1, 8.1, 8.2, 8.3, 8.4, 8.5, 12.2_

- [ ] 11. Implement Admin Authentication Hardening
  - [ ] 11.1 Enhance admin login with password policy and account lockout
    - Update `src/app/api/admin/login/route.ts` to add password complexity validation
    - Implement failed attempt tracking and account lockout after 10 failures
    - Implement exponential backoff after 3 failed attempts
    - Add security alert email notification on IP address change
    - Add security logging for all authentication events
    - Create settings interface for security configuration
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 11.2 Write property test for password complexity enforcement
    - **Property 27: Password Complexity Enforcement**
    - **Validates: Requirements 13.1, 13.2**
    - Test passwords under 16 chars or in common list are rejected

  - [ ]* 11.3 Write property test for authentication attempt lockout
    - **Property 28: Authentication Attempt Lockout**
    - **Validates: Requirements 13.7, 13.8**
    - Verify account locks after 10 failures in 24 hours

  - [ ]* 11.4 Write property test for exponential backoff
    - **Property 29: Exponential Backoff After Failed Logins**
    - **Validates: Requirements 13.3**
    - Test delay increases exponentially after 3+ failures

  - [ ]* 11.5 Write property test for authentication event logging
    - **Property 30: Authentication Event Logging**
    - **Validates: Requirements 13.4, 9.10**
    - Verify all auth attempts are logged with details

- [ ] 12. Implement JWT Authentication for APIs
  - [ ] 12.1 Create JWT token management for API authentication
    - Create `src/lib/jwt-auth.ts` with token generation and verification
    - Implement JWT signing with HMAC-SHA256 and expiration (1 hour)
    - Implement refresh token mechanism with 30-day expiration
    - Add token invalidation on logout
    - Integrate with protected API endpoints
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

  - [ ]* 12.2 Write property test for JWT token validation
    - **Property 31: JWT Token Validation**
    - **Validates: Requirements 15.3, 15.4, 15.5, 15.6**
    - Test signature, expiration, and claims validation

  - [ ]* 12.3 Write property test for protected API authentication
    - **Property 32: Protected API Authentication**
    - **Validates: Requirements 15.1**
    - Verify 401 returned for missing/invalid tokens

  - [ ]* 12.4 Write property test for refresh token invalidation
    - **Property 33: Refresh Token Invalidation**
    - **Validates: Requirements 15.8**
    - Test refresh tokens expire after 30 days or logout

- [ ] 13. Checkpoint - Authentication and API Security Complete
  - Ensure all authentication tests pass
  - Verify JWT tokens work correctly
  - Test CSRF protection on admin endpoints
  - Ask the user if questions arise about authentication flow

- [ ] 14. Implement Order Tracking Security Enhancements
  - [ ] 14.1 Add security controls to order tracking endpoint
    - Update `src/app/api/track/[id]/route.ts` to add order ID format validation
    - Implement rate limiting (20 requests per hour per IP)
    - Implement email masking (show only first 2 and last 2 characters)
    - Implement sequential enumeration detection (track last 10 failed lookups)
    - Add IP blocking for detected enumeration attempts
    - Add security logging for all tracking access
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ]* 14.2 Write property test for order ID format validation
    - **Property 24: Order ID Format Validation**
    - **Validates: Requirements 11.1, 11.4**
    - Test invalid formats return 404 without revealing existence

  - [ ]* 14.3 Write property test for order tracking data masking
    - **Property 25: Order Tracking Data Masking**
    - **Validates: Requirements 11.7, 11.8**
    - Verify email masking and payment redaction

  - [ ]* 14.4 Write property test for sequential enumeration detection
    - **Property 26: Sequential Enumeration Detection**
    - **Validates: Requirements 11.5, 11.6**
    - Test 10 sequential lookups trigger IP block

- [ ] 15. Enhance Payment Webhook Endpoints
  - [ ] 15.1 Add security to NowPayments webhook handler
    - Update `src/app/api/payments/nowpayments/ipn/route.ts` to verify signature before processing
    - Implement constant-time signature comparison
    - Add timestamp validation (within 5 minutes)
    - Implement duplicate payment detection with idempotency keys
    - Add rate limiting (100 requests per minute)
    - Store webhook signatures in audit log
    - Add comprehensive security logging
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ] 15.2 Add security to PayPal webhook handler (if exists)
    - Apply same security controls as NowPayments
    - Use PayPal-specific signature verification
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ] 15.3 Add security to CashApp email parser
    - Update email parsing to handle malformed emails safely
    - Implement cashtag blocklist checking
    - Add payment amount verification
    - _Requirements: 6.3, 21.6, 21.7_

  - [ ]* 15.4 Write property test for webhook timestamp validation
    - **Property 35: Webhook Timestamp Validation**
    - **Validates: Requirements 19.4**
    - Test webhooks outside 5-minute window are rejected

  - [ ]* 15.5 Write property test for webhook malformed payload handling
    - **Property 36: Webhook Malformed Payload Handling**
    - **Validates: Requirements 19.7**
    - Test malformed JSON returns 400 without exposing errors

- [ ] 16. Implement Promo Code Security
  - [ ] 16.1 Add security controls to promo code validation
    - Update promo code API endpoint to add rate limiting (5 per minute per user)
    - Implement usage tracking by user ID and IP
    - Implement max uses limit enforcement
    - Implement multiple promo code prevention per order
    - Implement expiration date validation
    - Implement enumeration detection (20 invalid attempts → 1-hour block)
    - Add security logging for all promo code attempts
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [ ]* 16.2 Write property test for promo code usage limit enforcement
    - **Property 37: Promo Code Usage Limit Enforcement**
    - **Validates: Requirements 20.3**
    - Test code rejected after max uses reached

  - [ ]* 16.3 Write property test for multiple promo code prevention
    - **Property 38: Multiple Promo Code Prevention**
    - **Validates: Requirements 20.7**
    - Test second promo code on same order is rejected

  - [ ]* 16.4 Write property test for promo code expiration validation
    - **Property 39: Promo Code Expiration Validation**
    - **Validates: Requirements 20.8**
    - Test expired codes are rejected

  - [ ]* 16.5 Write property test for promo code enumeration detection
    - **Property 40: Promo Code Enumeration Detection**
    - **Validates: Requirements 20.4, 20.5**
    - Test 20 invalid attempts trigger IP block

- [ ] 17. Implement Secure JSON Parser
  - [ ] 17.1 Create JSON validation utilities with security limits
    - Create `src/lib/json-validator.ts` with parsing interfaces
    - Implement payload size validation (1MB limit)
    - Implement depth validation (10 levels max)
    - Implement duplicate key detection
    - Implement schema validation function
    - Add safe error handling without exposing parser details
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.8, 21.9_

  - [ ]* 17.2 Write property test for JSON payload size limit
    - **Property 41: JSON Payload Size Limit**
    - **Validates: Requirements 21.3**
    - Test payloads over 1MB are rejected

  - [ ]* 17.3 Write property test for JSON depth limit
    - **Property 42: JSON Depth Limit**
    - **Validates: Requirements 21.4**
    - Test deeply nested JSON (>10 levels) is rejected

  - [ ]* 17.4 Write property test for JSON duplicate key detection
    - **Property 43: JSON Duplicate Key Detection**
    - **Validates: Requirements 21.5**
    - Test JSON with duplicate keys is rejected

  - [ ]* 17.5 Write property test for schema validation enforcement
    - **Property 44: Schema Validation Enforcement**
    - **Validates: Requirements 21.9**
    - Test non-conforming data is rejected

  - [ ]* 17.6 Write property test for configuration parse-print round-trip
    - **Property 45: Configuration Parse-Print Round-Trip**
    - **Validates: Requirements 21.11**
    - Test parse(print(C)) produces equivalent C

- [ ] 18. Implement Secure Error Handling
  - [ ] 18.1 Create error handling utilities with environment-aware responses
    - Create `src/lib/error-handler.ts` with error response functions
    - Implement `sanitizeError()` for production (generic messages only)
    - Implement `logError()` with sensitive data removal from context
    - Update all API routes to use secure error handling
    - Add error codes for common security failures
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 18.2 Write property test for error response sanitization
    - **Property 34: Error Response Sanitization**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**
    - Test production errors don't expose sensitive details

- [ ] 19. Checkpoint - All Security Features Implemented
  - Ensure all property tests pass (45 properties)
  - Verify all API endpoints have rate limiting
  - Verify all state-changing requests have CSRF protection
  - Test payment webhooks with signature verification
  - Test order tracking with email masking
  - Ask the user if questions arise about security implementation

- [ ] 20. Integrate Encryption with Data Layer
  - [ ] 20.1 Add email encryption to order creation
    - Update `src/lib/commerce.ts` order creation to encrypt customer emails before storage
    - Update order retrieval to decrypt emails when loaded
    - Add migration script to encrypt existing plaintext emails
    - Use 'enc:' prefix to identify encrypted data for backward compatibility
    - _Requirements: 16.1, 16.2, 6.10_

  - [ ] 20.2 Add payment metadata encryption
    - Update payment record storage to encrypt metadata
    - Update retrieval to decrypt metadata
    - Add migration for existing payment records
    - _Requirements: 16.1, 16.2, 6.10_

  - [ ]* 20.3 Write integration tests for encrypted data storage
    - Test emails are encrypted in database
    - Test decryption works correctly on retrieval
    - Test backward compatibility with unencrypted data
    - _Requirements: 16.1, 16.2_

- [ ] 21. Create Admin Security Dashboard
  - [ ] 21.1 Build security monitoring interface
    - Create `src/app/admin/security/page.tsx` for security dashboard
    - Display recent security events from security logger
    - Show rate limit violations and blocked IPs
    - Show failed authentication attempts
    - Show payment webhook failures
    - Add filters by event type and time range
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 21.2 Create API endpoint for security events
    - Create `src/app/api/admin/security/route.ts` to fetch security logs
    - Implement filtering and pagination
    - Add CSRF protection and authentication
    - _Requirements: 9.1_

  - [ ] 21.3 Add CashApp blocklist management UI
    - Add interface to view blocked cashtags
    - Add ability to block/unblock cashtags with reason
    - Integrate with payment security module
    - _Requirements: 6.3_

- [ ] 22. Set Up Dependency Scanning
  - [ ] 22.1 Configure npm audit and CI/CD security checks
    - Create `.github/workflows/security.yml` for automated scanning
    - Configure npm audit to fail on high/critical vulnerabilities
    - Add Snyk or similar tool integration (optional)
    - Document vulnerability response process in README
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 22.2 Write integration test for dependency scanning
    - Test CI fails on known vulnerable package
    - Test npm audit runs successfully
    - _Requirements: 10.1, 10.2_

- [ ] 23. Create Environment Variable Documentation
  - [ ] 23.1 Update .env.example with all required security variables
    - Add ENCRYPTION_KEY placeholder with generation instructions
    - Add SECURITY_ALERT_EMAIL placeholder
    - Add CSRF_ENABLED configuration
    - Add NOWPAYMENTS_IPN_SECRET documentation
    - Update README with security configuration guide
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 23.2 Create environment variable validation at startup
    - Implement startup check in `src/lib/env-validator.ts`
    - Fail fast with clear errors for missing required variables
    - Validate ENCRYPTION_KEY format (64 hex chars)
    - Add validation to Next.js startup
    - _Requirements: 7.2, 7.3, 7.7_

- [ ] 24. Write Integration Tests for Complete Security Flow
  - [ ]* 24.1 Write end-to-end test for admin authentication flow
    - Test login with rate limiting
    - Test CSRF token generation and validation
    - Test session IP binding
    - Test account lockout after failed attempts
    - _Requirements: 1.1, 3.2, 5.9, 13.7_

  - [ ]* 24.2 Write end-to-end test for order creation with security
    - Test rate limiting on order creation
    - Test input validation and sanitization
    - Test email encryption
    - Test security event logging
    - _Requirements: 1.2, 2.1, 16.1, 9.3_

  - [ ]* 24.3 Write end-to-end test for payment webhook security
    - Test signature verification
    - Test duplicate payment detection
    - Test amount verification
    - Test security logging
    - _Requirements: 6.1, 6.2, 6.4, 9.5_

  - [ ]* 24.4 Write end-to-end test for order tracking security
    - Test rate limiting
    - Test enumeration detection
    - Test email masking
    - Test invalid format handling
    - _Requirements: 11.2, 11.5, 11.7, 11.1_

- [ ] 25. Create Data Migration Scripts
  - [ ] 25.1 Create script to encrypt existing customer emails
    - Create `scripts/migrate-encrypt-emails.ts` to encrypt plaintext emails
    - Add safety checks to prevent double encryption
    - Add rollback capability
    - Test on development data first
    - _Requirements: 16.1_

  - [ ] 25.2 Create script to encrypt existing payment metadata
    - Similar migration for payment records
    - Add validation after migration
    - _Requirements: 16.2_

  - [ ]* 25.3 Write tests for migration scripts
    - Test migration handles plaintext data correctly
    - Test migration skips already-encrypted data
    - Test rollback functionality
    - _Requirements: 16.1, 16.2_

- [ ] 26. Create Security Documentation
  - [ ] 26.1 Write comprehensive security documentation
    - Create `SECURITY.md` with security features overview
    - Document rate limits and their purposes
    - Document encryption approach and key management
    - Document authentication and session management
    - Document CSRF protection implementation
    - Document error handling and logging
    - Add incident response procedures
    - _Requirements: All_

  - [ ] 26.2 Create deployment security checklist
    - Document all environment variables needed
    - List pre-deployment security tests
    - Document key generation procedures
    - Add verification steps for production
    - _Requirements: 7.1, 16.3, 12.4_

- [ ] 27. Performance Testing and Optimization
  - [ ] 27.1 Test rate limiter performance under load
    - Use load testing tool (Artillery or k6) to test rate limiter
    - Verify no memory leaks in rate limit storage
    - Test cleanup of expired entries
    - Optimize if bottlenecks found
    - _Requirements: 1.1_

  - [ ] 27.2 Test encryption performance impact
    - Measure encryption/decryption overhead
    - Test with large datasets
    - Optimize if latency too high
    - _Requirements: 16.1, 16.2_

  - [ ]* 27.3 Write performance benchmarks
    - Benchmark rate limiter operations
    - Benchmark encryption/decryption
    - Benchmark input validation
    - Set baseline performance metrics
    - _Requirements: 1.1, 16.1, 2.1_

- [ ] 28. Final Checkpoint - Complete Security Enhancement
  - Run all 45 property-based tests and verify they pass
  - Run all integration tests
  - Verify security headers are present on all routes
  - Test complete authentication flow with all security features
  - Test complete order creation and tracking flow
  - Test complete payment webhook flow
  - Review security documentation for completeness
  - Ensure all environment variables are documented
  - Ask the user if ready for deployment or if any issues need resolution

## Notes

- **Tasks marked with `*` are optional** property-based tests and integration tests that can be skipped for faster MVP, but are highly recommended for production security
- **45 property-based test sub-tasks** correspond to the 45 correctness properties defined in the design document
- **Property-based testing uses fast-check library** for TypeScript to generate random test cases
- Each implementation task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- **Security is implemented in layers**: core utilities → middleware → endpoint-specific controls → monitoring
- **Encryption keys must be generated** before production deployment (32 random bytes as 64-char hex string)
- **Migration scripts must be run** to encrypt existing data before enforcing encryption
- **All sensitive operations are logged** to the security logger for audit trails
- **Environment variables are validated at startup** to fail fast on misconfiguration
- **Property tests require at least 100 iterations** to ensure comprehensive coverage

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "3.5", "3.6", "4.2", "4.3", "4.4", "5.2", "5.3", "6.2", "6.3"] },
    { "id": 3, "tasks": ["7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1", "12.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "11.4", "11.5", "12.2", "12.3", "12.4"] },
    { "id": 8, "tasks": ["14.1", "15.1"] },
    { "id": 9, "tasks": ["14.2", "14.3", "14.4", "15.2", "15.3", "15.4", "15.5", "16.1", "17.1"] },
    { "id": 10, "tasks": ["16.2", "16.3", "16.4", "16.5", "17.2", "17.3", "17.4", "17.5", "17.6", "18.1"] },
    { "id": 11, "tasks": ["18.2", "20.1", "20.2"] },
    { "id": 12, "tasks": ["20.3", "21.1", "21.2", "21.3", "22.1", "23.1"] },
    { "id": 13, "tasks": ["22.2", "23.2", "24.1", "24.2", "24.3", "24.4"] },
    { "id": 14, "tasks": ["25.1", "25.2"] },
    { "id": 15, "tasks": ["25.3", "26.1", "26.2", "27.1", "27.2"] },
    { "id": 16, "tasks": ["27.3"] }
  ]
}
```
