import prisma from '../../prisma.js';
import { verifyToken, cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
        adminId: user.adminId,
        businessName: user.businessName,
        tourismLicense: user.tourismLicense,
        logoUrl: user.logoUrl,
        stampUrl: user.stampUrl,
        customTerms: user.customTerms,
        taxEnabled: user.taxEnabled,
        taxPercentage: user.taxPercentage,
        apartmentTypes: user.apartmentTypes,
        bookingSources: user.bookingSources,
        permissions: {
          canBook: user.canBook,
          canEdit: user.canEdit,
          canDelete: user.canDelete,
          canViewAnalytics: user.canViewAnalytics,
          canViewSettings: user.canViewSettings
        }
      });
    }

    else if (req.method === 'PUT') {
      const { name, profilePicture, businessName, tourismLicense, logoUrl, stampUrl, customTerms, taxEnabled, taxPercentage, apartmentTypes, bookingSources } = req.body;
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          name: name !== undefined ? name : undefined,
          profilePicture: profilePicture !== undefined ? profilePicture : undefined,
          businessName,
          tourismLicense,
          logoUrl,
          stampUrl,
          customTerms,
          taxEnabled,
          taxPercentage: taxPercentage ? parseFloat(taxPercentage) : null,
          apartmentTypes: apartmentTypes !== undefined ? apartmentTypes : null,
          bookingSources: bookingSources !== undefined ? bookingSources : null
        }
      });
      return res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
        adminId: user.adminId,
        businessName: user.businessName,
        tourismLicense: user.tourismLicense,
        logoUrl: user.logoUrl,
        stampUrl: user.stampUrl,
        customTerms: user.customTerms,
        taxEnabled: user.taxEnabled,
        taxPercentage: user.taxPercentage,
        apartmentTypes: user.apartmentTypes,
        bookingSources: user.bookingSources,
        permissions: {
          canBook: user.canBook,
          canEdit: user.canEdit,
          canDelete: user.canDelete,
          canViewAnalytics: user.canViewAnalytics,
          canViewSettings: user.canViewSettings
        }
      });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}