// Test payment verification for CF712281
require('dotenv').config({ path: '.env.local' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');

const orderId = 'CF712281';
const expectedAmount = 1.00;

console.log(`🧪 Testing payment verification for order: ${orderId}\n`);

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
    if (err) throw err;

    const since = new Date();
    since.setMinutes(since.getMinutes() - 30); // Last 30 minutes
    
    imap.search([
      ['FROM', 'cash@square.com'],
      ['SINCE', since]
    ], function(err, results) {
      if (err || !results || results.length === 0) {
        console.log('❌ No recent emails found');
        imap.end();
        return;
      }

      console.log(`Checking ${results.length} recent email(s)...\n`);
      
      const fetch = imap.fetch(results, { bodies: '' });
      let found = false;

      fetch.on('message', function(msg) {
        msg.on('body', function(stream) {
          simpleParser(stream, async function(err, parsed) {
            if (err || found) return;
            
            const html = parsed.html || '';
            const payment = parseCashAppEmail(html);

            if (payment && payment.note === orderId) {
              console.log('✅ PAYMENT FOUND!');
              console.log(`   Email Date: ${parsed.date}`);
              console.log(`   Amount: $${payment.amount}`);
              console.log(`   Note: ${payment.note}`);
              console.log('');
              
              if (Math.abs(payment.amount - expectedAmount) < 0.01) {
                console.log('✅ Amount matches!');
                console.log('✅ Order ID matches!');
                console.log('');
                console.log('🎉 PAYMENT VERIFICATION SUCCESSFUL!');
                console.log('This payment would be accepted by the system.');
                found = true;
              } else {
                console.log(`❌ Amount mismatch: Expected $${expectedAmount}, got $${payment.amount}`);
              }
            }
          });
        });
      });

      fetch.once('end', function() {
        setTimeout(() => {
          if (!found) {
            console.log(`❌ No matching payment found for ${orderId}`);
            console.log('The email might still be arriving (wait 2-3 minutes)');
          }
          imap.end();
        }, 2000);
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('Error:', err);
  process.exit(1);
});

imap.connect();
