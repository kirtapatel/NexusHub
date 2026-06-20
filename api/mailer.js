const nodemailer = require('nodemailer');

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendAdminPaymentAlert({ order_id, email, product_name, amount, utr_number }) {
  await getTransport().sendMail({
    from: `"NexusHub" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `💳 New Payment Pending — ${order_id}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#7c3aed;">New Payment Submitted</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;color:#6b7280;">Order ID</td><td style="padding:8px;font-weight:bold;">${order_id}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Buyer</td><td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Product</td><td style="padding:8px;">${product_name}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Amount</td><td style="padding:8px;">₹${amount}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">UTR</td><td style="padding:8px;font-family:monospace;color:#7c3aed;">${utr_number}</td></tr>
      </table>
      <div style="margin-top:20px;"><a href="${process.env.ADMIN_URL || '#'}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Admin Panel →</a></div>
    </div>`,
  });
}

async function sendBuyerApprovalEmail({ email, product_name, order_id, status }) {
  const approved = status === 'verified';
  await getTransport().sendMail({
    from: `"NexusHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: approved ? `✅ Payment Approved — ${product_name}` : `❌ Payment Rejected — ${order_id}`,
    html: approved
      ? `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
          <h2 style="color:#059669;">✅ Your Payment is Approved!</h2>
          <p>Your payment for <strong>${product_name}</strong> has been verified.</p>
          <div style="margin-top:20px;"><a href="${process.env.SITE_URL || '#'}/downloads.html" style="background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Go to My Downloads →</a></div>
          <p style="color:#9ca3af;font-size:.85rem;margin-top:20px;">Order ID: ${order_id}</p>
        </div>`
      : `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
          <h2 style="color:#dc2626;">❌ Payment Could Not Be Verified</h2>
          <p>We could not verify your payment for <strong>${product_name}</strong>. Please contact support with your correct UTR number.</p>
          <p style="color:#9ca3af;font-size:.85rem;">Order ID: ${order_id}</p>
        </div>`,
  });
}

async function sendAdminTicketAlert({ ticket_id, email, subject, category, message }) {
  await getTransport().sendMail({
    from: `"NexusHub" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🎫 New Support Ticket — ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#7c3aed;">New Support Ticket</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;color:#6b7280;">Ticket ID</td><td style="padding:8px;font-weight:bold;">${ticket_id}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">From</td><td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Category</td><td style="padding:8px;">${category}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Subject</td><td style="padding:8px;">${subject}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Message</td><td style="padding:8px;">${message}</td></tr>
      </table>
      <div style="margin-top:20px;"><a href="${process.env.ADMIN_URL || '#'}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Reply in Admin Panel →</a></div>
    </div>`,
  });
}

async function sendUserReplyEmail({ email, subject, ticket_id, reply }) {
  await getTransport().sendMail({
    from: `"NexusHub Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `💬 Reply to your ticket: ${subject}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#7c3aed;">You have a reply!</h2>
      <p>Our support team replied to your ticket <strong>${ticket_id}</strong>:</p>
      <div style="background:#f3f4f6;border-left:4px solid #7c3aed;padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0;color:#111;">${reply}</p>
      </div>
      <div style="margin-top:20px;"><a href="${process.env.SITE_URL || '#'}/support.html" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">View Full Conversation →</a></div>
    </div>`,
  });
}

module.exports = { sendAdminPaymentAlert, sendBuyerApprovalEmail, sendAdminTicketAlert, sendUserReplyEmail };
