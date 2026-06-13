const fs = require('fs');

let content = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

// Fix the bad regex replacement done earlier
content = content.replace(
  `const [
      staffExpenses,
      fetchStaffExpenses,
      licenses, setLicenses] = useState([]);
  const [staffExpenses, setStaffExpenses] = useState([]);`,
  `const [licenses, setLicenses] = useState([]);
  const [staffExpenses, setStaffExpenses] = useState([]);`
);

fs.writeFileSync('src/context/DataContext.jsx', content, 'utf8');
console.log('Fixed DataContext');
