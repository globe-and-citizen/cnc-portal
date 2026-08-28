// Tiny indirection so `index.html`'s `<script src>` (which Vite resolves as
// a plain URL, not through `resolve.alias`) can still reach the widget's
// real entry outside this dev root — the `import` below *is* resolved
// through the alias. See vite.widget.config.ts's `widget-entry` alias.
import 'widget-entry'
