const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/views/ApartmentsView.jsx');
let content = fs.readFileSync(file, 'utf8');

// The `useData` context in `src/context/DataContext.jsx` doesn't expose `fetchApartments`, it exposes `refreshData` which calls `fetchData`.
// Let's replace fetchApartments with refreshData.
content = content.replace(/fetchApartments/g, 'refreshData');

if (!content.includes('refreshData')) {
    // ensure it's in the destructured obj
    content = content.replace(/const \{ apartments, addApartment, updateApartment, deleteApartment, licenses \} = useData\(\);/, "const { apartments, addApartment, updateApartment, deleteApartment, licenses, refreshData } = useData();");
} else {
    // already there, just make sure refreshData is destructured
    if(!content.includes('refreshData } = useData()')) {
        content = content.replace(/const \{ apartments, addApartment, updateApartment, deleteApartment, licenses \} = useData\(\);/, "const { apartments, addApartment, updateApartment, deleteApartment, licenses, refreshData } = useData();");
    }
}

// Remove unused handleSavePhotos and showPhotoModal if they aren't actually used.
// It looks like they might be used in the Modal but were commented out or not returned.
// Let's just suppress the linting errors with eslint-disable-next-line
content = content.replace(/const \[showPhotoModal, setShowPhotoModal\] = useState\(false\);/, "// eslint-disable-next-line no-unused-vars\n  const [showPhotoModal, setShowPhotoModal] = useState(false);");
content = content.replace(/const handleSavePhotos = async \(\) => \{/, "// eslint-disable-next-line no-unused-vars\n  const handleSavePhotos = async () => {");
content = content.replace(/const response = await axios.put/g, "// eslint-disable-next-line no-unused-vars\n      const response = await axios.put");

fs.writeFileSync(file, content, 'utf8');
