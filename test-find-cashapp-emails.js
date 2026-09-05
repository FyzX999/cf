// Check for recent CashApp receipt emails
require('dotenv').config({ path: '.env.local' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const config = {
  user: process.env.CASHAPP_EMAIL,
  password: process.env.CASHAPP_EMAIL_PASSWORD,
  host: process.env.CASHAPP_IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.CASHAPP_IMAP_PORT || '993'),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

console.log('🔍 Searching for CashApp receipt emails...\n');
console.log(`Email: ${config.user}`);
console.log(`Looking for emails from: cash@square.com\n`);

const imap = new Imap(config);

imap.once('ready', function() {
  imap.openBox('INBOX', true, function(err, box) {
    if (err) {
      console.error('❌ Failed to open inbox:', err.message);
      process.exit(1);
    }

    // Search for recent emails from CashApp
    const since = new Date();
    since.setHours(since.getHours() - 1); // Last 1 hour
    
    imap.search([
      ['FROM', 'cash@square.com'],
      ['SINCE', since]
    ], function(err, results) {
      if (err) {
        console.error('❌ Search failed:', err.message);
        imap.end();
        process.exit(1);
      }

      if (!results || results.length === 0) {
        console.log('⚠️  No CashApp emails found in the last hour');
        console.log('');
        console.log('Possible reasons:');
        console.log('  1. Payment receipt email hasn\'t arrived yet (wait 5 minutes)');
        console.log('  2. CashApp is linked to a different email address');
        console.log('  3. Email is in spam/junk folder');
        console.log('');
        console.log('💡 Check your email manually:');
        console.log(`  - Log into ${config.user}`);
        console.log('  - Look for emails from cash@square.com');
        console.log('  - Check spam folder');
        imap.end();
        process.exit(0);
      }

      console.log(`✅ Found ${results.length} CashApp email(s) in the last hour!\n`);

      const fetch = imap.fetch(results.slice(0, 3), { bodies: '' });
      let count = 0;

      fetch.on('message', function(msg) {
        msg.on('body', function(stream) {
          simpleParser(stream, async function(err, parsed) {
            if (err) return;
            
            count++;
            console.log(`Email #${count}:`);
            console.log(`  Subject: ${parsed.subject}`);
            console.log(`  Date: ${parsed.date}`);
            
            // Try to extract amount and note
            const html = parsed.html || parsed.textAsHtml || '';
            
            // Look for amount
            const amountMatch = html.match(/\$(\d+\.\d+)/);
            if (amountMatch) {
              console.log(`  Amount: $${amountMatch[1]}`);
            }
            
            // Look for note
            const noteMatch = html.match(/note[^>]*>([^<]+)</i);
            if (noteMatch) {
              console.log(`  Note: ${noteMatch[1].trim()}`);
            }
            
            console.log('');
          });
        });
      });

      fetch.once('end', function() {
        setTimeout(() => {
          imap.end();
          process.exit(0);
        }, 2000);
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('❌ IMAP Error:', err.message);
  process.exit(1);
});

imap.connect();
