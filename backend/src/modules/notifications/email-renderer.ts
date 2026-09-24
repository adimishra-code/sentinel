import { NotificationType } from './notification.model';

interface RenderEmailOptions {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

export const renderNotificationEmail = (options: RenderEmailOptions): { html: string; text: string } => {
  const { title, message, type, actionUrl, actionText, metadata } = options;

  // Type styling
  const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    case_created: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
    case_assigned: { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
    case_resolved: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    appeal_submitted: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    appeal_resolved: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    system: { bg: '#f3f4f6', text: '#1f2937', border: '#6b7280' },
  };

  const style = typeColors[type] || typeColors['system'];
  const webAppUrl = process.env.WEB_APP_URL || 'https://sentinelops.com';
  const targetUrl = actionUrl || webAppUrl;
  const buttonLabel = actionText || 'Open Sentinel Workspace';

  const metadataRows = metadata
    ? Object.entries(metadata)
        .map(
          ([k, v]) => `
          <tr>
            <td style="padding: 6px 12px; font-size: 13px; color: #6b7280; font-weight: 500; text-transform: capitalize;">${k}</td>
            <td style="padding: 6px 12px; font-size: 13px; color: #111827; font-family: monospace;">${String(v)}</td>
          </tr>`
        )
        .join('')
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 2px solid ${style.border};">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">🛡️ Sentinel</span>
              <span style="float: right; display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background-color: ${style.bg}; color: ${style.text};">
                ${type.replace('_', ' ')}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827; line-height: 1.4;">
                ${title}
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                ${message}
              </p>

              ${
                metadataRows
                  ? `
              <table width="100%" style="margin-bottom: 24px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; border-collapse: collapse;">
                ${metadataRows}
              </table>`
                  : ''
              }

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #4f46e5;">
                    <a href="${targetUrl}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 6px;">
                      ${buttonLabel} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
              Sent by Sentinel Trust &amp; Safety Platform &bull; Real-time AI Operations<br>
              To manage notification settings, log in to your dashboard.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `${title}\n\n${message}\n\nLink: ${targetUrl}\n\nSent by Sentinel Trust & Safety Platform`;

  return { html, text };
};
