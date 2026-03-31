export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  const DC = process.env.MAILCHIMP_DC;

  try {
    const response = await fetch(`https://${DC}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key auth: any string + ":" + api key, base64 encoded
        'Authorization': 'Basic ' + Buffer.from(`anystring:${API_KEY}`).toString('base64'),
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        tags: ['keen-waitlist'],
      }),
    });

    const data = await response.json();

    // 400 with title "Member Exists" means already subscribed — treat as success
    if (response.ok || data.title === 'Member Exists') {
      return res.status(200).json({ success: true });
    }

    console.error('Mailchimp error:', data);
    return res.status(500).json({ error: 'Failed to subscribe' });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
