const fs = require('fs');
const path = require('path');

const files = ['live.tsx', 'movies.tsx', 'series.tsx'];
const dir = 'C:/streaming/artifacts/streaming/app/(tabs)';

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // 1. Fix MarqueeText
  if (!content.includes('import { MarqueeText }')) {
    content = content.replace(
      'import { TVFocusable } from \'@/components/TVFocusable\';',
      'import { TVFocusable } from \'@/components/TVFocusable\';\nimport { MarqueeText } from \'@/components/MarqueeText\';'
    );
  }

  content = content.replace(
    /<\/?Text([^>]*)>\s*\{item\.name\}\s*<\/?Text>/g,
    '<MarqueeText text={item.name} isFocused={focused || isSelected} style />'
  );
  
  content = content.replace(/<MarqueeText text=\{item\.name\} isFocused=\{focused \|\| isSelected\} style=\{?\[([^\]]+)\]\}? numberOfLines=\{1\} \/>/g, 
    '<MarqueeText text={item.name} isFocused={focused || isSelected} style={[]} />');

  // 2. Fix the Categories floating button golden border
  content = content.replace(
    /borderColor: focused \? '#000' : colors\.border/g,
    "borderColor: focused ? '#000' : colors.gold"
  );

  fs.writeFileSync(path.join(dir, file), content, 'utf8');
  console.log('Patched ' + file);
});
