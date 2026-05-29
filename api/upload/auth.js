import ImageKit from 'imagekit';
import { cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const imagekit = new ImageKit({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY
    });

    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.status(200).json(authenticationParameters);
  } catch (error) {
    console.error('ImageKit Auth Error:', error);
    res.status(500).json({ error: 'Failed to authenticate with ImageKit' });
  }
}