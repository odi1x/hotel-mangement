import { verifyToken, cors } from '../../utils.js';

export default function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const adminId = user.adminId || user.userId;
  let lastChecked = new Date();

  const intervalId = setInterval(async () => {
    try {
      const { default: prisma } = await import('../../prisma.js');
      const newNotifications = await prisma.notification.findMany({
        where: {
          userId: adminId,
          isRead: false,
          createdAt: { gt: lastChecked }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (newNotifications.length > 0) {
        lastChecked = new Date();
        newNotifications.forEach(notif => {
          res.write(`data: ${JSON.stringify(notif)}\n\n`);
        });
      } else {
        res.write(`:\n\n`);
      }
    } catch (err) {
      console.error('SSE Error:', err);
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
}
