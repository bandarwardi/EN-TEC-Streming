const fs = require('fs');
const path = require('path');

const files = ['live.tsx', 'movies.tsx', 'series.tsx'];
const dir = 'C:/streaming/artifacts/streaming/app/(tabs)';

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Add import if missing
  if (!content.includes('import { MarqueeText }')) {
    content = content.replace(
      "import { TVFocusable } from '@/components/TVFocusable';",
      "import { TVFocusable } from '@/components/TVFocusable';\nimport { MarqueeText } from '@/components/MarqueeText';"
    );
  }

  // Replace TVCategoryText block
  content = content.replace(
    /<\/?Text style=\{\[\s*styles\.tvCategoryText,\s*\{\s*color: focused \? '#000' : \(isSelected \? colors\.gold : colors\.text\), fontWeight: isSelected \? 'bold' : '500'\s*\}\s*\]\}\s*numberOfLines=\{1\}>\s*\{item\.name\}\s*<\/?Text>/g,
    '<MarqueeText text={item.name} isFocused={focused || isSelected} style={[styles.tvCategoryText, { color: focused ? \\'#000\\' : (isSelected ? colors.gold : colors.text), fontWeight: isSelected ? \\'bold\\' : \\'500\\' }]} />'
  );

  // Replace golden border for categories button
  content = content.replace(
    /borderColor: focused \? '#000' : colors\.border/g,
    "borderColor: focused ? '#000' : colors.gold"
  );

  fs.writeFileSync(path.join(dir, file), content, 'utf8');
  console.log('Patched ' + file);
});
