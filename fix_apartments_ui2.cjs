const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// I inserted a JSX block without wrapping it in a Fragment inside a ternary operator.
// `apt.coverPhoto ? ( <img ... /> {apt.images ...} ) : ( ... )`
// It should be `<> <img ... /> {apt.images ...} </>`
const badCode = `<img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />

                {apt.images && apt.images.length > 1 && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                    <ImageIcon size={12} />
                    <span>+{apt.images.length - 1}</span>
                  </div>
                )}`;

const goodCode = `<>
                    <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                    {apt.images && apt.images.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={12} />
                        <span dir="ltr">+{apt.images.length - 1}</span>
                      </div>
                    )}
                  </>`;

code = code.replace(badCode, goodCode);
fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
