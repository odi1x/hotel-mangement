const fs = require('fs');

let content = fs.readFileSync('api/analytics.js', 'utf8');

// Replace userSettings query to fetch generalExpenses only
content = content.replace(
  'select: { cleanerSalary: true, cleanerScope: true, generalExpenses: true }',
  'select: { generalExpenses: true }'
);

// Fetch StaffExpenses right after userSettings
const staffFetchCode = `    // Fetch StaffExpenses
    const staffExpenses = await prisma.staffExpense.findMany({
        where: { userId: targetUserId }
    });`;

content = content.replace(
  '// Default period for occupancy calculation',
  staffFetchCode + '\n    \n    // Default period for occupancy calculation'
);

// Replace the cleanerSalary calculation block with the new StaffExpense calculation
const oldGlobalExpenseBlock = `        if (userSettings.cleanerSalary) {
            // Apply cleaner salary only if the current filter overlaps with the cleanerScope (or scope is all)
            const scopeArr = userSettings.cleanerScope ? userSettings.cleanerScope.split(',') : [];
            let scopedAptCount = totalAptCount;
            let ratioToUse = ratio;

            if (scopeArr.length > 0) {
                // If there's a specific scope, only apportion the salary for units in the scope that are also in the current view filter
                scopedAptCount = scopeArr.length;
                let activeScopedUnits = scopeArr.length;

                if (apartmentIds) {
                    const filteredArr = apartmentIds.split(',');
                    activeScopedUnits = filteredArr.filter(id => scopeArr.includes(id)).length;
                }

                ratioToUse = scopedAptCount > 0 ? (activeScopedUnits / scopedAptCount) : 0;
            }

            apportionedGlobalExpenses += ((Number(userSettings.cleanerSalary) / 30) * periodDays) * ratioToUse;
        }`;

const newStaffExpenseBlock = `        // Dynamic Staff Payroll Apportioning
        if (staffExpenses && staffExpenses.length > 0) {
            staffExpenses.forEach(staff => {
                const scopeArr = staff.scope && staff.scope !== 'all' ? staff.scope.split(',') : [];
                let ratioToUse = ratio; // Default applies to all (meaning we scale it by the general filter ratio)

                if (scopeArr.length > 0) {
                    let scopedAptCount = scopeArr.length;
                    let activeScopedUnits = scopeArr.length;

                    if (apartmentIds) {
                        const filteredArr = apartmentIds.split(',');
                        activeScopedUnits = filteredArr.filter(id => scopeArr.includes(id)).length;
                    }

                    ratioToUse = scopedAptCount > 0 ? (activeScopedUnits / scopedAptCount) : 0;
                }

                apportionedGlobalExpenses += ((Number(staff.monthlySalary) / 30) * periodDays) * ratioToUse;
            });
        }`;

content = content.replace(oldGlobalExpenseBlock, newStaffExpenseBlock);

fs.writeFileSync('api/analytics.js', content, 'utf8');
console.log('updated');
