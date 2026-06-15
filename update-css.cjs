const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// We will remove the @theme aliases that map --color-game-bg-start to var(--bg-start)
// because taking that route seems buggy. Instead, we'll redefine the variables 
// statically in the @theme block for typing/generation, but the dynamic values 
// will be plain CSS custom properties --var.
// Wait, no. Tailwind v4 can use dynamic variables if you use the prefix `theme(...)` or something.
// But the easiest way is JUST NOT USING tailwind utility classes for dynamic theme colors!
// Actually, earlier, the user's issue was that the theme was completely ignored.

css = css.replace(/--bg-start:/g, '--color-game-bg-start:');
css = css.replace(/--bg-end:/g, '--color-game-bg-end:');
css = css.replace(/--text-primary:/g, '--color-game-text-primary:');
css = css.replace(/--text-secondary:/g, '--color-game-text-secondary:');
css = css.replace(/--accent-start:/g, '--color-game-accent-start:');
css = css.replace(/--accent-end:/g, '--color-game-accent-end:');
css = css.replace(/--accent-light:/g, '--color-game-accent-light:');
css = css.replace(/--accent-subtle:/g, '--color-game-accent-subtle:');
css = css.replace(/--surface:/g, '--color-game-surface:');
css = css.replace(/--surface-hover:/g, '--color-game-surface-hover:');
css = css.replace(/--border:/g, '--color-game-border:');
css = css.replace(/--border-strong:/g, '--color-game-border-strong:');
css = css.replace(/--error:/g, '--color-game-error:');
css = css.replace(/--error-bg:/g, '--color-game-error-bg:');

// Now inside @theme, they look like:
// --color-game-bg-start: var(--color-game-bg-start);
// We can actually just remove those lines from @theme, because if we define --color-game-bg-start
// Tailwind native variables don't strictly need to be in @theme if we use them in arbitray values?
// No, if we want bg-game-bg-start, it MUST be in @theme.
// We can set dummy values in @theme, e.g. --color-game-bg-start: #000;
css = css.replace(/var\(--color-game-(.+?)\)/g, '#000');

fs.writeFileSync('src/index.css', css);
