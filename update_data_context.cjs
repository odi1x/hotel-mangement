const fs = require('fs');

let content = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

if (!content.includes('staffExpenses')) {
    content = content.replace(
        'const [licenses, setLicenses] = useState([]);',
        'const [licenses, setLicenses] = useState([]);\n  const [staffExpenses, setStaffExpenses] = useState([]);'
    );

    const staffFetch = `
  const fetchStaffExpenses = async () => {
    try {
      const res = await axios.get(\`\${API_BASE_URL}/staff-expenses\`);
      setStaffExpenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };`;

    content = content.replace('const fetchLicenses = async () => {', staffFetch + '\n\n  const fetchLicenses = async () => {');

    content = content.replace(
        'fetchLicenses();',
        'fetchLicenses();\n      fetchStaffExpenses();'
    );

    const valueExports = `
      staffExpenses,
      fetchStaffExpenses,
      licenses`;

    content = content.replace('licenses,', valueExports + ',');

    fs.writeFileSync('src/context/DataContext.jsx', content, 'utf8');
    console.log('DataContext updated');
}
