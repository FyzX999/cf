// Test script to verify CashApp IMAP connection
require('dotenv').config({ path: '.env.local' });
const Imap = require('imap');

console.log('Testing CashApp IMAP Connection...\n');

const config = {
  user: process.env.CASHAPP_EMAIL,
  password: process.env.CASHAPP_EMAIL_PASSWORD,
  host: process.env.CASHAPP_IMAP_HOST,
  port: parseInt(process.env.CASHAPP_IMAP_PORT),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

console.log('Configuration:');
console.log('- Email:', config.user);
console.log('- Password:', config.password ? '***' + config.password.slice(-4) : 'NOT SET');
console.log('- Host:', config.host);
console.log('- Port:', config.port);
console.log('- CashApp Tag:', process.env.CASHAPP_TAG);
console.log();

if (!config.user || !config.password || !process.env.CASHAPP_TAG) {
  console.error('❌ Missing required environment variables!');
  console.log('   CASHAPP_EMAIL:', config.user ? '✓' : '✗');
  console.log('   CASHAPP_EMAIL_PASSWORD:', config.password ? '✓' : '✗');
  console.log('   CASHAPP_TAG:', process.env.CASHAPP_TAG ? '✓' : '✗');
  process.exit(1);
}

const imap = new Imap(config);

imap.once('ready', function() {
  console.log('✅ Successfully connected to IMAP server!');
  
  imap.openBox('INBOX', true, function(err, box) {
    if (err) {
      console.error('❌ Failed to open INBOX:', err.message);
      process.exit(1);
    }
    
    console.log('✅ Successfully opened INBOX');
    console.log('   Total messages:', box.messages.total);
    console.log();
    console.log('🎉 CashApp email monitoring is ready!');
    console.log('   Payments will be verified automatically.');
    
    imap.end();
    process.exit(0);
  });
});

imap.once('error', function(err) {
  console.error('❌ IMAP Connection Error:', err.message);
  console.log();
  
  if (err.message.includes('AUTHENTICATIONFAILED') || err.message.includes('Invalid credentials')) {
    console.log('💡 Solutions:');
    console.log('   1. Enable 2-Step Verification and create an App Password');
    console.log('   2. Enable "Less secure app access" (deprecated)');
    console.log('   3. Use Outlook/Hotmail instead of Gmail');
  }
  
  process.exit(1);
});

imap.once('end', function() {
  console.log('Connection ended.');
});

console.log('Connecting to IMAP server...');
imap.connect();
