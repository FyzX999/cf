// Search for specific order payment
require('dotenv').config({ path: '.env.local' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');

const targetOrderId = 'CFS28599';
const targetAmount = 1.00;

console.log(`🔍 Searching for payment with note: ${targetOrderId}\n`);

const config = {
  user: process.env.CASHAPP_EMAIL,
  password: process.env.CASHAPP_EMAIL_PASSWORD,
  host: process.env.CASHAPP_IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.CASHAPP_IMAP_PORT || '993'),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

function parseCashAppEmail(html) {
  try {
    const $ = cheerio.load(html);
    
    let amount = null;
    const amountSelectors = ['td', 'div', 'span'];
    for (const selector of amountSelectors) {
      $(selector).each((_, elem) => {
        const text = $(elem).text().trim();
        const match = text.match(/\+?\$(\d+\.\d+)/);
        if (match && !amount) {
          amount = parseFloat(match[1]);
          return false;
        }
      });
      if (amount) break;
    }

    let note = null;
    $('.profile-description, .text-subtle').each((_, elem) => {
      const text = $(elem).text().trim();
      const match = text.match(/^For\s+(.+)$/i);
      if (match) {
        note = match[1].trim();
        return false;
      }
    });
    
    if (!note) {
      const allText = $.text();
      const match = allText.match(/For\s+([A-Z0-9]+)/i);
      if (match) {
        note = match[1].trim();
      }
    }

    return { amount, note };
  } catch (error) {
    return null;
  }
}

const imap = new Imap(config);

imap.once('ready', function() {
  imap.openBox('INBOX', true, function(err) {
    if (err) {
      console.error('Failed to open inbox:', err);
      process.exit(1);
    }

    const since = new Date();
    since.setHours(since.getHours() - 2); // Last 2 hours
    
    imap.search([
      ['FROM', 'cash@square.com'],
      ['SINCE', since]
    ], function(err, results) {
      if (err || !results || results.length === 0) {
        console.log('❌ No CashApp emails found in last 2 hours');
        imap.end();
        process.exit(0);
      }

      console.log(`Found ${results.length} CashApp email(s)\n`);
      
      const fetch = imap.fetch(results, { bodies: '' });
      let found = false;
      let count = 0;

      fetch.on('message', function(msg) {
        msg.on('body', function(stream) {
          simpleParser(stream, async function(err, parsed) {
            if (err) return;
            
            count++;
            const html = parsed.html || '';
            const payment = parseCashAppEmail(html);

            if (payment && payment.amount && payment.note) {
              console.log(`Email #${count}:`);
              console.log(`  Date: ${parsed.date}`);
              console.log(`  Amount: $${payment.amount}`);
              console.log(`  Note: ${payment.note}`);
              
              if (payment.note === targetOrderId && 
                  Math.abs(payment.amount - targetAmount) < 0.01) {
                console.log(`  ✅ MATCH FOUND!`);
                found = true;
              } else if (payment.note.includes(targetOrderId.substring(3))) {
                console.log(`  ⚠️ Partial match (note contains part of order ID)`);
              }
              console.log('');
            }
          });
        });
      });

      fetch.once('end', function() {
        setTimeout(() => {
          if (!found) {
            console.log(`\n❌ No payment found with note: ${targetOrderId}`);
            console.log('\nPossible reasons:');
            console.log('  1. Payment note was typed incorrectly');
            console.log('  2. Payment was sent more than 2 hours ago');
            console.log('  3. Email receipt hasn\'t arrived yet (wait 5 min)');
          }
          imap.end();
          process.exit(0);
        }, 3000);
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('IMAP Error:', err);
  process.exit(1);
});

imap.connect();
