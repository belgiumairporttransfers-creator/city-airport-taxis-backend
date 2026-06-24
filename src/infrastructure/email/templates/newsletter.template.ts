export interface NewsletterEmailContent {
  preheader?: string;
  message: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();

export const getNewsletterEmailTemplate = ({
  preheader,
  message,
  imageUrl,
  ctaText,
  ctaUrl,
}: NewsletterEmailContent) => {
  const preheaderHtml = preheader
    ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>`
    : "";

  const imageHtml = imageUrl
    ? `<p style="margin:0 0 24px;text-align:center;"><img src="${imageUrl}" alt="" style="max-width:100%;border-radius:8px;" /></p>`
    : "";

  const ctaHtml =
    ctaText && ctaUrl
      ? `<p style="text-align:center;margin:28px 0 8px;"><a href="${ctaUrl}" style="display:inline-block;background:#7D3C1F;color:#fff!important;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;">${ctaText}</a></p>`
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#333;">
  ${preheaderHtml}
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#7D3C1F;padding:28px 20px;text-align:center;color:#fff;">
      <h1 style="font-size:22px;margin:0;font-weight:700;">${BRAND}</h1>
    </div>
    <div style="padding:32px 28px;">
      ${imageHtml}
      <div style="font-size:15px;line-height:1.7;color:#444;">${message}</div>
      ${ctaHtml}
    </div>
    <div style="padding:24px;text-align:center;background:#fafafa;border-top:1px solid #eee;">
      <p style="font-size:13px;color:#888;margin:0 0 8px;">${BRAND}</p>
      <p style="font-size:11px;color:#bbb;margin:0;text-transform:uppercase;letter-spacing:1px;">© ${YEAR} ${BRAND}</p>
    </div>
  </div>
</body>
</html>
`;
};
