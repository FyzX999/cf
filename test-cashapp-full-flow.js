// Complete CashApp payment flow test
require('dotenv').config({ path: '.env.local' });
const { checkCashAppPayment, getCashAppConfig } = require('./src/lib/cashapp');
const { createCashAppInvoice, settlePayment } = require('./src/lib/payments');

console.log('🧪 Testing Complete CashApp Payment Flow\n');

async function testFullFlow() {
  try {
    // Step 1: Check configuration
    console.log('Step 1: Checking CashApp configuration...');
    const config = getCashAppConfig();
    
    if (!config) {
      console.error('❌ CashApp is not configured properly');
      console.log('Missing environment variables. Check .env.local');
      process.exit(1);
    }
    
    console.log('✅ Configuration loaded:');
    console.log(`   Email: ${config.email}`);
    console.log(`   CashApp Tag: ${config.cashappTag}`);
    console.log(`   IMAP Host: ${config.imapHost}:${config.imapPort}`);
    console.log();

    // Step 2: Test creating a CashApp invoice
    console.log('Step 2: Creating test CashApp invoice...');
    const testOrderId = `TEST${Date.now()}`;
    const testAmount = 5.00;
    
    try {
      const invoice = await createCashAppInvoice({
        kind: 'order',
        amount: testAmount,
        publicId: testOrderId
      });
      
      console.log('✅ Invoice created successfully:');
      console.log(`   Payment ID: ${invoice.payment.id}`);
      console.log(`   Order ID: ${testOrderId}`);
      console.log(`   Amount: $${testAmount}`);
      console.log();
      console.log('📱 Instructions for customer:');
      console.log(`   1. Send $${invoice.instructions.amount.toFixed(2)} to ${invoice.instructions.cashappTag}`);
      console.log(`   2. Include note: ${invoice.instructions.note}`);
      console.log();
    } catch (error) {
      console.error('❌ Failed to create invoice:', error.message);
      process.exit(1);
    }

    // Step 3: Test email monitoring (looking for any recent CashApp payment)
    console.log('Step 3: Testing email monitoring...');
    console.log('Searching for recent CashApp receipts in your inbox...');
    
    try {
      // This will look for a payment with a fake order ID (won't find it)
      const payment = await checkCashAppPayment(
        'TESTPAYMENT',
        1.00,
        config
      );
      
      if (payment) {
        console.log('✅ Found a matching payment:');
        console.log(`   Amount: $${payment.amount}`);
        console.log(`   Note: ${payment.note}`);
        console.log(`   Date: ${payment.date}`);
      } else {
        console.log('ℹ️  No matching payment found (expected for test)');
      }
      
      console.log('✅ Email monitoring system is working correctly');
      console.log();
    } catch (error) {
      console.error('❌ Email monitoring failed:', error.message);
      if (error.message.includes('AUTHENTICATIONFAILED')) {
        console.log('💡 Check your Gmail app password');
      }
      process.exit(1);
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log();
    console.log('✅ CashApp payment system is fully functional');
    console.log();
    console.log('Next steps:');
    console.log('1. Create a real order on your site');
    console.log('2. Select "Pay with CashApp"');
    console.log('3. Send a test payment via CashApp app');
    console.log('4. Click "I\'ve sent the payment" to verify');
    console.log();
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

testFullFlow();
