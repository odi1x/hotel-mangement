/* global process */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { action } = req.query;

  try {
    // LOGIN
    if (action === 'login' && req.method === 'POST') {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({
        userId: user.id, username: user.username, role: user.role, adminId: user.adminId
      }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        token,
        user: {
          id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture,
          role: user.role, adminId: user.adminId, businessName: user.businessName, tourismLicense: user.tourismLicense,
          permissions: {
            canBook: user.canBook, canEdit: user.canEdit, canDelete: user.canDelete,
            canViewAnalytics: user.canViewAnalytics, canViewSettings: user.canViewSettings, canViewBalances: user.canViewBalances, canViewMaintenance: user.canViewMaintenance, canViewPricing: user.canViewPricing
          }
        }
      });
    }

    // REGISTER
    if (action === 'register' && req.method === 'POST') {
      const { username, password, name, profilePicture } = req.body;
      if (!username || !password || !name) return res.status(400).json({ message: 'Username, password, and name are required' });

      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) return res.status(400).json({ message: 'Username already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, password: hashedPassword, name, profilePicture, role: 'admin' },
      });

      const token = jwt.sign({
        userId: user.id, username: user.username, role: user.role, adminId: user.adminId
      }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        token,
        user: {
          id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture,
          role: user.role, adminId: user.adminId, businessName: user.businessName, tourismLicense: user.tourismLicense,
          permissions: {
            canBook: user.canBook, canEdit: user.canEdit, canDelete: user.canDelete,
            canViewAnalytics: user.canViewAnalytics, canViewSettings: user.canViewSettings, canViewBalances: user.canViewBalances, canViewMaintenance: user.canViewMaintenance, canViewPricing: user.canViewPricing
          }
        }
      });
    }


    // IMAGEKIT AUTH
    if (action === 'imagekit-auth' && req.method === 'GET') {
      const authenticationParameters = imagekit.getAuthenticationParameters();
      return res.status(200).json(authenticationParameters);
    }


    // IMAGEKIT DELETE
    if (action === 'imagekit-delete' && req.method === 'DELETE') {
      const { fileId } = req.body;
      if (!fileId) return res.status(400).json({ message: 'fileId is required' });

      try {
        await new Promise((resolve, reject) => {
          imagekit.deleteFile(fileId, function(error, result) {
            if (error) reject(error);
            else resolve(result);
          });
        });
        return res.status(200).json({ message: 'File deleted successfully' });
      } catch (err) {
        console.error('ImageKit Delete Error:', err);
        return res.status(500).json({ message: 'Failed to delete file from ImageKit' });
      }
    }
  // REQUIRES AUTH
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

    // ME GET
    if (action === 'me' && req.method === 'GET') {
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json({
        id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture,
        role: user.role, adminId: user.adminId, businessName: user.businessName, tourismLicense: user.tourismLicense,
        logoUrl: user.logoUrl, stampUrl: user.stampUrl, customTerms: user.customTerms,
        taxEnabled: user.taxEnabled, taxPercentage: user.taxPercentage,
        apartmentTypes: user.apartmentTypes, bookingSources: user.bookingSources, generalExpenses: user.generalExpenses,
        permissions: {
          canBook: user.canBook, canEdit: user.canEdit, canDelete: user.canDelete,
          canViewAnalytics: user.canViewAnalytics, canViewSettings: user.canViewSettings, canViewBalances: user.canViewBalances, canViewMaintenance: user.canViewMaintenance, canViewPricing: user.canViewPricing
        }
      });
    }

    // ME PUT
    if (action === 'me' && req.method === 'PUT') {
      const { name, profilePicture, businessName, tourismLicense, logoUrl, stampUrl, customTerms, taxEnabled, taxPercentage, apartmentTypes, bookingSources, generalExpenses } = req.body;
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          name: name !== undefined ? name : undefined,
          profilePicture: profilePicture !== undefined ? profilePicture : undefined,
          businessName, tourismLicense, logoUrl, stampUrl, customTerms, taxEnabled,
          taxPercentage: taxPercentage ? parseFloat(taxPercentage) : null,
          apartmentTypes: apartmentTypes !== undefined ? apartmentTypes : null,
          bookingSources: bookingSources !== undefined ? bookingSources : null,
          generalExpenses: generalExpenses ? parseFloat(generalExpenses) : null
        }
      });
      return res.status(200).json({
        id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture,
        role: user.role, adminId: user.adminId, businessName: user.businessName, tourismLicense: user.tourismLicense,
        logoUrl: user.logoUrl, stampUrl: user.stampUrl, customTerms: user.customTerms,
        taxEnabled: user.taxEnabled, taxPercentage: user.taxPercentage,
        apartmentTypes: user.apartmentTypes, bookingSources: user.bookingSources, generalExpenses: user.generalExpenses,
        permissions: {
          canBook: user.canBook, canEdit: user.canEdit, canDelete: user.canDelete,
          canViewAnalytics: user.canViewAnalytics, canViewSettings: user.canViewSettings, canViewBalances: user.canViewBalances, canViewMaintenance: user.canViewMaintenance, canViewPricing: user.canViewPricing
        }
      });
    }

    // PASSWORD
    if (action === 'password' && req.method === 'POST') {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Passwords required' });

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) return res.status(401).json({ message: 'Invalid current password' });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: decoded.userId }, data: { password: hashedNewPassword } });
      return res.status(200).json({ message: 'Password updated successfully' });
    }

    return res.status(405).json({ message: 'Method Not Allowed or Invalid Action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
