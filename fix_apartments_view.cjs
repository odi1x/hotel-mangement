const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/views/ApartmentsView.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add missing imports
if (!content.includes('import axios')) {
    content = content.replace(/import \{ ([^}]+) \} from 'react';/, "import { $1 } from 'react';\nimport axios from 'axios';\nimport toast from 'react-hot-toast';\nimport { useData } from '../../context/DataContext';");
}

// Remove unused 'Share2', 'Copy' if unused
content = content.replace(/Share2,\s*/g, '');
content = content.replace(/Copy,\s*/g, '');

// Fetch apartments if missing from useData
if (!content.includes('fetchApartments')) {
    content = content.replace(/const \{ apartments, addApartment, updateApartment, deleteApartment \} = useData\(\);/, "const { apartments, addApartment, updateApartment, deleteApartment, fetchApartments } = useData();");
}

// Fix missing uses or variable assignments for React hooks
// Replace them or just add the correct variables.

fs.writeFileSync(file, content, 'utf8');
