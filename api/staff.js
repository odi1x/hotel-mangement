import bcrypt from 'bcrypt';
import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { notify } from './notify.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins (or staff flagged as master admin) can access staff endpoints
  if (decoded.role !== 'admin' && !decoded.isAdminMaster) {
    return res.status(403).json({ message: 'Forbidden: Only admins can manage staff' });
  }

  // Master admins manage their owner's roster (tenant), never their own id.
  const tenantId = decoded.adminId || decoded.userId;

  try {
    // Handle operations for a specific staff ID (PUT, DELETE)
    const { id } = req.query;

    if (id) {
      const staffMember = await prisma.user.findUnique({
        where: { id: id }
      });

      if (!staffMember || staffMember.adminId !== tenantId) {
        return res.status(404).json({ message: 'Staff member not found' });
      }

      if (req.method === 'PUT') {
        const { username, password, name, profilePicture, canBook, canEdit, canDelete, canViewAnalytics, canViewSettings, canViewBalances, canViewMaintenance, canViewPricing, canViewPrices, canClean, canManageCleaningTemplates, isAdminMaster } = req.body;

        const updateData = {
          name,
          profilePicture,
          canBook,
          canEdit,
          canDelete,
          canViewAnalytics,
          canViewSettings,
          canViewBalances,
          canViewMaintenance,
          canViewPricing,
          canViewPrices,
          canClean: canClean === true,
          canManageCleaningTemplates: canManageCleaningTemplates === true,
          isAdminMaster: isAdminMaster === true,
        };

        if (username && username !== staffMember.username) {
          const existing = await prisma.user.findUnique({ where: { username } });
          if (existing) return res.status(400).json({ message: 'Username already exists' });
          updateData.username = username;
        }

        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        const before = await prisma.user.findUnique({
          where: { id },
          select: {
            canBook: true, canClean: true, canViewMaintenance: true,
            canViewBalances: true, canManageCleaningTemplates: true,
            isAdminMaster: true,
          },
        });

        await prisma.user.update({
          where: { id: id },
          data: updateData
        });

        const changed = before
          ? Object.keys(before).filter((key) => before[key] !== updateData[key])
          : [];

        if (changed.length > 0) {
          await notify({
            userIds: [id],
            title: 'تم تعديل صلاحياتك',
            message: `تم تحديث صلاحياتك (${changed.length} صلاحية). سجّل الخروج والدخول لتطبيق التغييرات.`,
            type: 'warning',
            link: 'settings',
            urgent: true,
            tag: `perm-changed:${id}:${Date.now()}`
          });

          await notify({
            userIds: [decoded.userId],
            title: 'تم تعديل صلاحيات موظف',
            message: `تم تحديث صلاحيات ${staffMember.name || staffMember.username}.`,
            type: 'info',
            link: 'settings',
            tag: `perm-admin:${id}:${Date.now()}`
          });
        }

        return res.status(200).json({ message: 'Staff updated successfully' });
      }

      else if (req.method === 'DELETE') {
        const doomed = await prisma.user.findUnique({
          where: { id },
          select: { name: true, username: true, adminId: true },
        });
        await prisma.user.delete({
          where: { id }
        });

        if (doomed?.adminId) {
          await notify({
            userIds: [doomed.adminId],
            title: 'تم حذف موظف',
            message: `تم حذف ${doomed.name || doomed.username}.`,
            type: 'warning',
            link: 'settings',
            tag: `staff-deleted:${id}`,
          });
        }

        return res.status(200).json({ message: 'Staff deleted successfully' });
      }

      return res.status(405).json({ message: 'Method Not Allowed for specific ID' });
    }

    if (req.method === 'GET') {
      const staff = await prisma.user.findMany({
        where: { adminId: tenantId },
        select: {
          id: true,
          username: true,
          name: true,
          profilePicture: true,
          createdAt: true,
          canBook: true,
          canEdit: true,
          canDelete: true,
          canViewAnalytics: true,
          canViewSettings: true,
          canViewBalances: true,
          canViewMaintenance: true,
          canViewPricing: true,
          canViewPrices: true,
          canClean: true,
          canManageCleaningTemplates: true,
          isAdminMaster: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(staff);
    }

    else if (req.method === 'POST') {
      const { username, password, name, profilePicture, canBook, canEdit, canDelete, canViewAnalytics, canViewSettings, canViewBalances, canViewMaintenance, canViewPricing, canViewPrices, canClean, canManageCleaningTemplates, isAdminMaster } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password, and name are required' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const staffMember = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          profilePicture,
          role: 'staff',
          adminId: tenantId,
          canBook,
          canEdit,
          canDelete,
          canViewAnalytics,
          canViewSettings,
          canViewBalances,
          canViewMaintenance,
          canViewPricing,
          canViewPrices,
          canClean: canClean === true,
          canManageCleaningTemplates: canManageCleaningTemplates === true,
          isAdminMaster: isAdminMaster === true,
        }
      });

      await notify({
        userIds: [decoded.userId],
        title: 'تمت إضافة موظف جديد',
        message: `أضفت الموظف ${name} (${username}).`,
        type: 'info',
        link: 'settings',
        tag: `staff-added:${staffMember.id}`,
      });

      return res.status(201).json({ message: 'Staff created successfully', id: staffMember.id });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}