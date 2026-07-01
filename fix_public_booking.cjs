const fs = require('fs');
let code = fs.readFileSync('src/components/views/PublicBookingView.jsx', 'utf8');

code = code.replace("import { Calendar, User, Phone, FileText, CheckCircle, Home, Image as ImageIcon } from 'lucide-react';", "import { User, Phone, CheckCircle, Image as ImageIcon } from 'lucide-react';");

code = code.replace(/useEffect\(\(\) => \{\n    fetchApartments\(\);\n  \}, \[adminId, dateRange.startDate, dateRange.endDate\]\);\n\n  const fetchApartments = async \(\) => \{/g, `  const fetchApartments = async () => {`);

code = code.replace(/const fetchApartments = async \(\) => \{[\s\S]*?\}\n  \};\n\n  const handleDateChange/, `const fetchApartments = async () => {
    setIsLoading(true);
    try {
      const params = { adminId };
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }
      const res = await axios.get('/api/public/apartments', { params });
      setApartments(res.data);
    } catch (error) {
      console.error('Error fetching apartments:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, dateRange.startDate, dateRange.endDate]);

  const handleDateChange`);

fs.writeFileSync('src/components/views/PublicBookingView.jsx', code);
