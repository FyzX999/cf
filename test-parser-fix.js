// Test the fixed parser
const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('cashapp-email-debug.html', 'utf8');

console.log('Testing updated CashApp email parser...\n');

function parseCashAppEmail(html) {
  try {
    const $ = cheerio.load(html);
    
    // Find amount
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

    // Find note
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
    console.error('Error:', error);
    return null;
  }
}

const result = parseCashAppEmail(html);

if (result && result.amount && result.note) {
  console.log('✅ Parser working correctly!');
  console.log(`   Amount: $${result.amount}`);
  console.log(`   Note: ${result.note}`);
} else {
  console.log('❌ Parser failed');
  console.log('   Result:', result);
}
