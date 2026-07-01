const fs = require('fs');

// Fix ApartmentsView syntax error
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');
code = code.replace("        )})}","        )\n      })}\n");
fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);

// Fix PublicBookingView hooks
code = fs.readFileSync('src/components/views/PublicBookingView.jsx', 'utf8');
code = code.replace(/useEffect\(\(\) => \{\n    fetchApartments\(\);\n    \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n  \}, \[adminId, dateRange\.startDate, dateRange\.endDate\]\);/g, "");
code = code.replace("  const handleDateChange", `  useEffect(() => {
    fetchApartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, dateRange.startDate, dateRange.endDate]);

  const handleDateChange`);
fs.writeFileSync('src/components/views/PublicBookingView.jsx', code);
