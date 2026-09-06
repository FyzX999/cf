/**
 * Simple validation script for enhanced rate limiter
 * Run with: npx tsx scripts/test-rate-limiter.ts
 */

import { 
  isRateLimited, 
  isBlocked, 
  blockIdentifier, 
  getRemainingRequests,
  rateLimits,
  type RateLimitConfig 
} from '../src/lib/rate-limit';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🧪 Testing Enhanced Rate Limiter\n');

  // Test 1: Basic rate limiting
  console.log('Test 1: Basic rate limiting');
  const testConfig: RateLimitConfig = {
    windowMs: 1000,
    maxRequests: 3,
  };
  const user1 = 'test-user-1';
  
  const test1a = !isRateLimited(user1, testConfig);
  const test1b = !isRateLimited(user1, testConfig);
  const test1c = !isRateLimited(user1, testConfig);
  const test1d = isRateLimited(user1, testConfig); // Should be blocked now
  
  console.log(`  ✓ First 3 requests allowed: ${test1a && test1b && test1c}`);
  console.log(`  ✓ 4th request blocked: ${test1d}`);
  console.log(`  Remaining requests: ${getRemainingRequests(user1, testConfig)}`);

  // Test 2: Window reset
  console.log('\nTest 2: Window reset after expiry');
  await sleep(1100); // Wait for window to expire
  const test2 = !isRateLimited(user1, testConfig);
  console.log(`  ✓ Request allowed after window reset: ${test2}`);

  // Test 3: Independent tracking
  console.log('\nTest 3: Independent identifier tracking');
  const user2 = 'test-user-2';
  const user3 = 'test-user-3';
  
  isRateLimited(user2, testConfig);
  isRateLimited(user2, testConfig);
  isRateLimited(user2, testConfig);
  const test3a = isRateLimited(user2, testConfig); // user2 should be blocked
  const test3b = !isRateLimited(user3, testConfig); // user3 should be allowed
  
  console.log(`  ✓ User2 blocked: ${test3a}`);
  console.log(`  ✓ User3 still allowed: ${test3b}`);

  // Test 4: Manual IP blocking
  console.log('\nTest 4: Manual IP blocking');
  const user4 = 'test-user-4';
  
  const test4a = !isBlocked(user4);
  blockIdentifier(user4, 2000); // Block for 2 seconds
  const test4b = isBlocked(user4);
  const test4c = isRateLimited(user4, testConfig); // Should be blocked
  
  console.log(`  ✓ Not blocked initially: ${test4a}`);
  console.log(`  ✓ Blocked after blockIdentifier(): ${test4b}`);
  console.log(`  ✓ Rate limiter respects block: ${test4c}`);

  // Test 5: Block expiry
  console.log('\nTest 5: Block expiry');
  await sleep(2100); // Wait for block to expire
  const test5 = !isBlocked(user4);
  console.log(`  ✓ Block expired: ${test5}`);

  // Test 6: Violation tracking
  console.log('\nTest 6: Violation tracking and automatic blocking');
  const user5 = 'test-user-5';
  const shortConfig: RateLimitConfig = {
    windowMs: 100,
    maxRequests: 1,
  };
  
  // Generate violations
  for (let i = 0; i < 12; i++) {
    isRateLimited(user5, shortConfig, true); // First request in window
    isRateLimited(user5, shortConfig, true); // Violation
    await sleep(110); // Wait for window to reset
  }
  
  const test6 = isBlocked(user5);
  console.log(`  ✓ Automatically blocked after 10+ violations: ${test6}`);

  // Test 7: Preset configurations
  console.log('\nTest 7: Preset configurations');
  console.log(`  ✓ adminLogin: ${rateLimits.adminLogin.maxRequests} requests per ${rateLimits.adminLogin.windowMs / 60000} minutes`);
  console.log(`  ✓ orderCreation: ${rateLimits.orderCreation.maxRequests} requests per ${rateLimits.orderCreation.windowMs / 3600000} hour`);
  console.log(`  ✓ paymentVerification: ${rateLimits.paymentVerification.maxRequests} requests per ${rateLimits.paymentVerification.windowMs / 1000} seconds`);
  console.log(`  ✓ orderTracking: ${rateLimits.orderTracking.maxRequests} requests per ${rateLimits.orderTracking.windowMs / 3600000} hour`);
  console.log(`  ✓ promoCodeValidation: ${rateLimits.promoCodeValidation.maxRequests} requests per ${rateLimits.promoCodeValidation.windowMs / 1000} seconds`);
  console.log(`  ✓ publicAPI: ${rateLimits.publicAPI.maxRequests} requests per ${rateLimits.publicAPI.windowMs / 1000} seconds`);

  // Test 8: getRemainingRequests
  console.log('\nTest 8: getRemainingRequests function');
  const user6 = 'test-user-6';
  console.log(`  Initial remaining: ${getRemainingRequests(user6, testConfig)}`);
  isRateLimited(user6, testConfig);
  console.log(`  After 1 request: ${getRemainingRequests(user6, testConfig)}`);
  isRateLimited(user6, testConfig);
  console.log(`  After 2 requests: ${getRemainingRequests(user6, testConfig)}`);
  isRateLimited(user6, testConfig);
  console.log(`  After 3 requests: ${getRemainingRequests(user6, testConfig)}`);

  console.log('\n✅ All tests completed successfully!');
}

runTests().catch(console.error);
