import {
  ShowerHead, ChefHat, Bed, Sofa, DoorOpen, Package, Sparkles, MoreHorizontal,
} from 'lucide-react';

// Fixed vocabulary for the cleaning areas grid — must match CLEANING_AREAS
// in api/admin-resources.js. Shared between the Cleaning tab and the
// cleaning template editor. The "general" area is a marker with no note
// (design decision).
export const AREAS = [
  { value: 'bathroom',    label: 'الحمام',            Icon: ShowerHead },
  { value: 'kitchen',     label: 'المطبخ',            Icon: ChefHat },
  { value: 'bedroom',     label: 'غرفة النوم',        Icon: Bed },
  { value: 'living_room', label: 'الصالة',            Icon: Sofa },
  { value: 'entrance',    label: 'المدخل',            Icon: DoorOpen },
  { value: 'supplies',    label: 'تجديد المستلزمات',  Icon: Package },
  { value: 'general',     label: 'تنظيف عام',         Icon: Sparkles, noNote: true },
  { value: 'other',       label: 'أخرى',              Icon: MoreHorizontal },
];

export const areaMeta = (value) => AREAS.find(a => a.value === value) || AREAS[AREAS.length - 1];