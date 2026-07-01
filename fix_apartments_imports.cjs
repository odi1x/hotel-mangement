const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

if (!code.includes('import axios')) {
    code = code.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport axios from 'axios';\nimport { toast } from 'react-hot-toast';");
}
code = code.replace("const response = await axios.put('/api/apartments'", "await axios.put('/api/apartments'");
code = code.replace("refreshData();", "fetchApartments();");

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
