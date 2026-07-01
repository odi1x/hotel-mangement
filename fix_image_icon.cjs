const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

code = code.replace("import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft } from 'lucide-react';", "import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft, Image as ImageIcon, Share2, Copy } from 'lucide-react';");

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
