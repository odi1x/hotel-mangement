const fs = require('fs');
let code = fs.readFileSync('src/components/ui/PhotoManagementModal.jsx', 'utf8');

code = code.replace("import React, { useState, useEffect } from 'react';", "import { useState } from 'react';");
code = code.replace("import { useData } from '../../context/DataContext';", "");

fs.writeFileSync('src/components/ui/PhotoManagementModal.jsx', code);
