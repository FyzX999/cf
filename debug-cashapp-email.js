// Debug CashApp email structure
require('dotenv').config({ path: '.env.local' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');

const config = {
  user: process.env.CASHAPP_EMAIL,
  password: process.env.CASHAPP_EMAIL_PASSWORD,
  host: process.env.CASHAPP_IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.CASHAPP_IMAP_PORT || '993'),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

console.log('🔍 Fetching most recent CashApp email for debugging...\n');

const imap = new Imap(config);

imap.once('ready', function() {
  imap.openBox('INBOX', true, function(err) {
    if (err) throw err;

    const since = new Date();
    since.setHours(since.getHours() - 1);
    
    imap.search([
      ['FROM', 'cash@square.com'],
      ['SUBJECT', 'Payment received'],
      ['SINCE', since]
    ], function(err, results) {
      if (err) throw err;

      if (!results || results.length === 0) {
        console.log('No recent payment emails found');
        imap.end();
        return;
      }

      console.log(`Found ${results.length} payment email(s)`);
      console.log('Analyzing most recent email...\n');

      const fetch = imap.fetch([results[results.length - 1]], { bodies: '' });

      fetch.on('message', function(msg) {
        msg.on('body', function(stream) {
          simpleParser(stream, async function(err, parsed) {
            if (err) {
              console.error('Parse error:', err);
              return;
            }

            console.log('Email Details:');
            console.log(`  Subject: ${parsed.subject}`);
            console.log(`  Date: ${parsed.date}`);
            console.log(`  From: ${parsed.from?.text}`);
            console.log('');

            const html = parsed.html || '';
            
            // Save HTML to file for inspection
            fs.writeFileSync('cashapp-email-debug.html', html);
            console.log('✓ Saved full HTML to: cashapp-email-debug.html');
            console.log('');

            // Try different patterns to find the note
            console.log('Searching for note/message patterns...\n');

            // Pattern 1: Look for "note" or "message"
            const patterns = [
              /<div[^>]*class="[^"]*note[^"]*"[^>]*>\s*([^<]+)/gi,
              /<span[^>]*class="[^"]*note[^"]*"[^>]*>\s*([^<]+)/gi,
              /<td[^>]*>Note:?\s*<\/td>\s*<td[^>]*>\s*([^<]+)/gi,
              /<div[^>]*>([^<]*CFS\d+[^<]*)<\/div>/gi,
              /Note:?\s*([^\n<]+)/gi,
              /Message:?\s*([^\n<]+)/gi,
            ];

            let found = false;
            for (const pattern of patterns) {
              const matches = [...html.matchAll(pattern)];
              if (matches.length > 0) {
                console.log(`Found ${matches.length} match(es) with pattern:`, pattern.toString().substring(0, 50) + '...');
                matches.forEach((match, i) => {
                  console.log(`  Match ${i + 1}: "${match[1].trim()}"`);
                });
                found = true;
              }
            }

            if (!found) {
              console.log('❌ No note found with common patterns');
              console.log('Showing text content preview:');
              const text = parsed.text || '';
              console.log(text.substring(0, 500));
            }

            imap.end();
          });
        });
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('IMAP Error:', err);
  process.exit(1);
});

imap.connect();
