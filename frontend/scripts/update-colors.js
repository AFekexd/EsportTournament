const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Define replacements (Regex to Replacement String)
const replacements = [
    // Backgrounds
    { regex: /bg-\[#(1a1b26|13141c|0f1015|161722|2a2b36)\]/g, replacement: 'bg-[#121A22]' },
    { regex: /from-\[#(1a1b26|13141c|0f1015|161722|2a2b36)\]/g, replacement: 'from-card' },
    { regex: /to-\[#(1a1b26|13141c|0f1015|161722|2a2b36)\]/g, replacement: 'to-background' },
    { regex: /bg-black\/[1-9]0/g, replacement: 'bg-secondary' }, // eg. bg-black/20 -> bg-secondary
    { regex: /bg-white\/5(?!0)/g, replacement: 'bg-secondary' },
    { regex: /bg-white\/10(?!0)/g, replacement: 'bg-secondary/80' },

    // Borders
    { regex: /border-white\/[0-9]+/g, replacement: 'border-border' },

    // Text Primary & Accents
    { regex: /text-(purple|indigo|blue|cyan)-[456]00/g, replacement: 'text-primary' },
    { regex: /bg-(purple|indigo|blue|cyan)-[456]00\/10/g, replacement: 'bg-primary/10' },
    { regex: /bg-(purple|indigo|blue|cyan)-[456]00\/20/g, replacement: 'bg-primary/20' },
    { regex: /border-(purple|indigo|blue|cyan)-[456]00\/[123]0/g, replacement: 'border-primary/20' },
    { regex: /fill-(purple|indigo|blue|cyan)-[456]00\/10/g, replacement: 'fill-primary/10' },
    { regex: /shadow-(purple|indigo|blue|cyan)\/20/g, replacement: 'shadow-primary/20' },

    // Muted Text
    { regex: /text-gray-[456]00/g, replacement: 'text-muted-foreground' },
    { regex: /text-white(?![\/\-])/g, replacement: 'text-foreground' }
];

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(srcDir);
let changedFilesCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;

    replacements.forEach(({ regex, replacement }) => {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            hasChanges = true;
        }
    });

    if (hasChanges) {
        fs.writeFileSync(file, content, 'utf8');
        changedFilesCount++;
        console.log(`Updated: ${path.relative(srcDir, file)}`);
    }
});

console.log(`\nSuccessfully updated colors in ${changedFilesCount} files.`);
