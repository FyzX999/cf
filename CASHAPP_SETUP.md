# CashApp Payment Integration Setup Guide

This guide explains how to configure CashApp payments for cheapfollower.shop. CashApp payments are verified by monitoring email receipts from Square (cash@square.com).

## Overview

The CashApp integration works by:
1. Customer initiates checkout and selects "Pay with CashApp"
2. System displays payment instructions with amount, your CashApp tag, and order ID
3. Customer sends payment via CashApp app with order ID in the note field
4. System monitors your email inbox for CashApp receipt from cash@square.com
5. Payment is verified and order/wallet deposit is automatically processed

## Prerequisites

- A CashApp account with a CashApp tag (e.g., $yourtag)
- An email account that receives CashApp payment receipts
- IMAP access enabled for that email account

## Step 1: Get Your CashApp Tag

Your CashApp tag is the username people use to send you money (starts with $).

1. Open the CashApp mobile app
2. Tap your profile icon
3. Your CashApp tag is displayed (e.g., $yourtag)

## Step 2: Configure Email for CashApp Receipts

### Option A: Gmail

1. **Enable IMAP in Gmail:**
   - Go to Gmail Settings → Forwarding and POP/IMAP
   - Enable IMAP access
   - Click "Save Changes"

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Generate a 16-character app password
   - Save this password (you'll use it in .env)

3. **Use these settings:**
   ```
   CASHAPP_EMAIL=your-email@gmail.com
   CASHAPP_EMAIL_PASSWORD=your-16-char-app-password
   CASHAPP_IMAP_HOST=imap.gmail.com
   CASHAPP_IMAP_PORT=993
   ```

### Option B: Outlook/Hotmail

1. **Use these settings:**
   ```
   CASHAPP_EMAIL=your-email@outlook.com
   CASHAPP_EMAIL_PASSWORD=your-email-password
   CASHAPP_IMAP_HOST=outlook.office365.com
   CASHAPP_IMAP_PORT=993
   ```

### Option C: Other Email Providers

Check your email provider's IMAP settings documentation. You need:
- IMAP server hostname
- IMAP port (usually 993 for SSL)
- Your email and password

## Step 3: Link CashApp to Your Email

1. Open CashApp mobile app
2. Go to Profile → Settings → Notifications
3. Ensure email notifications are enabled
4. Verify the email address matches what you'll use in .env
5. Test by sending yourself a small payment - you should receive an email from cash@square.com

## Step 4: Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# CashApp Payment Integration
CASHAPP_TAG=$yourtag
CASHAPP_EMAIL=your-email@gmail.com
CASHAPP_EMAIL_PASSWORD=your-app-password-or-email-password
CASHAPP_IMAP_HOST=imap.gmail.com
CASHAPP_IMAP_PORT=993
```

**Important Notes:**
- `CASHAPP_TAG` must include the $ symbol (e.g., $yourtag)
- For Gmail, use an App Password, not your regular password
- Never commit your `.env.local` file to version control

## Step 5: Deploy and Test

### Local Testing

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Create a test order
3. Select "Pay with CashApp" payment method
4. Send a test payment to your CashApp tag with the order ID in the note
5. Click "I've sent the payment" to verify

### Production Deployment

1. Add environment variables to your hosting platform (Vercel, etc.)
2. Deploy the application
3. Test with a real small payment

## Troubleshooting

### "CashApp is not configured" Error

**Cause:** Missing or incomplete environment variables.

**Solution:** Verify all 5 CashApp environment variables are set:
- CASHAPP_TAG
- CASHAPP_EMAIL
- CASHAPP_EMAIL_PASSWORD
- CASHAPP_IMAP_HOST
- CASHAPP_IMAP_PORT

### "Payment not yet received" Message

**Possible causes:**
1. Payment hasn't been sent yet
2. Email hasn't arrived yet (can take 1-2 minutes)
3. Order ID wasn't included in the payment note
4. Email credentials are incorrect
5. IMAP access is not enabled

**Solutions:**
- Wait 2-3 minutes after sending payment, then check again
- Verify the order ID was included exactly as shown in the note field
- Check your email inbox for the CashApp receipt manually
- Verify IMAP credentials by testing with an email client
- Check server logs for connection errors

### Gmail "Less Secure Apps" Error

**Cause:** Gmail blocked the IMAP connection.

**Solution:** Use an App Password instead of your regular password (see Step 2 above).

### IMAP Connection Timeout

**Possible causes:**
1. Firewall blocking IMAP port 993
2. Incorrect IMAP host or port
3. Email provider requires 2FA

**Solutions:**
- Verify IMAP host and port are correct for your provider
- Check firewall settings on your server
- Use an app-specific password if 2FA is enabled

### Email Not Found Despite Payment Sent

**Possible causes:**
1. Wrong email linked to CashApp
2. Email notifications disabled in CashApp
3. Email in spam folder

**Solutions:**
- Verify email in CashApp settings matches CASHAPP_EMAIL
- Enable email notifications in CashApp app
- Check spam/junk folder for emails from cash@square.com

## Security Best Practices

1. **Use App Passwords:** Never use your main email password in production
2. **Dedicated Email:** Consider using a dedicated email account only for CashApp receipts
3. **Restrict Access:** Use email provider's security settings to restrict app access
4. **Monitor Logs:** Regularly check application logs for failed IMAP attempts
5. **Rotate Credentials:** Periodically rotate your email app password

## How It Works Technically

1. **Email Monitoring:** System connects to your email via IMAP
2. **Receipt Parsing:** Searches for emails from cash@square.com in the last 30 days
3. **HTML Extraction:** Parses email HTML to extract amount and note fields
4. **Verification:** Compares amount and note (order ID) with expected values
5. **Order Processing:** If match found, marks payment as completed and starts order fulfillment

## API Endpoints

### POST /api/payments/checkout
Initiates CashApp payment and returns instructions.

**Request:**
```json
{
  "method": "cashapp",
  "kind": "order",
  "publicId": "CF123456"
}
```

**Response:**
```json
{
  "instructions": {
    "cashappTag": "$yourtag",
    "amount": 12.50,
    "note": "CF123456"
  },
  "payment": { /* payment record */ }
}
```

### POST /api/payments/cashapp
Checks if payment has been received via email monitoring.

**Request:**
```json
{
  "orderId": "CF123456"
}
```

**Response (pending):**
```json
{
  "status": "pending",
  "message": "Payment not yet received"
}
```

**Response (completed):**
```json
{
  "status": "completed",
  "payment": { /* payment record */ }
}
```

## Support

If you encounter issues not covered in this guide:
1. Check application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test IMAP connection manually with an email client
4. Contact your email provider for IMAP troubleshooting

## Credits

Based on the Python implementation: https://github.com/LiteEagle262/cashapp-payment-processor
