const nodemailer = require('nodemailer');

let transporterPromise = (async () => {
  // If we have SMTP environment variables, use them. Otherwise, create a test account on Ethereal on-the-fly.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    console.log('✉️ Generated test SMTP account:', testAccount.user);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
})();

const sendExpiryReminder = async (driver, daysLeft) => {
  const transporter = await transporterPromise;
  const isExpired = daysLeft <= 0;
  
  const subject = isExpired
    ? `🚨 URGENT: Your Driving License has EXPIRED!`
    : `⚠️ ACTION REQUIRED: Your Driving License Expires in ${daysLeft} Days!`;

  const bodyText = isExpired
    ? `Hello ${driver.name},\n\nThis is an automated notification that your driving license (No: ${driver.license_no}) has EXPIRED on ${new Date(driver.license_expiry).toLocaleDateString('en-IN')}.\n\nYou are currently blocked from all trip assignments until you renew your license and update the registry.\n\nBest regards,\nTransitOps Operations Team`
    : `Hello ${driver.name},\n\nThis is an automated reminder that your driving license (No: ${driver.license_no}) is expiring on ${new Date(driver.license_expiry).toLocaleDateString('en-IN')}.\n\nYou have ${daysLeft} days remaining to renew your license before you are blocked from trip assignments.\n\nBest regards,\nTransitOps Operations Team`;

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
      <h2 style="color: ${isExpired ? '#dc2626' : '#e11d48'}; margin-top: 0;">${isExpired ? '🚨 Driving License EXPIRED' : '⚠️ Driving License Expiry Reminder'}</h2>
      <p>Hello <strong>${driver.name}</strong>,</p>
      <p>This is an automated notification from the TransitOps Safety Office.</p>
      <div style="background-color: ${isExpired ? '#fef2f2' : '#fff1f2'}; border-left: 4px solid ${isExpired ? '#dc2626' : '#e11d48'}; padding: 12px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>License Number:</strong> ${driver.license_no}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Expiry Date:</strong> ${new Date(driver.license_expiry).toLocaleDateString('en-IN')}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Status:</strong> <span style="color: ${isExpired ? '#dc2626' : '#e11d48'}; font-weight: bold;">${isExpired ? 'EXPIRED' : `${daysLeft} days remaining`}</span></p>
      </div>
      <p>${isExpired ? 'You have been suspended from all new trip dispatches under TransitOps safety regulations. Please renew your license and contact dispatch to restore your status.' : 'Please renew your license as soon as possible. Under TransitOps policy, drivers with expired licenses cannot be assigned to any dispatch trips.'}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated system email. Please do not reply directly to this message.</p>
    </div>
  `;

  const mailOptions = {
    from: '"TransitOps Safety Alerts" <safety@transitops.com>',
    to: driver.email,
    subject,
    text: bodyText,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✉️ Reminder email sent to ${driver.email}: ${info.messageId}`);
  
  // If using Ethereal, log preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`✉️ Preview URL: ${previewUrl}`);
  }
  return { messageId: info.messageId, previewUrl };
};

module.exports = { sendExpiryReminder };
