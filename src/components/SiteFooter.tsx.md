# Footer de atribución visible

Añade este bloque al **footer visible** de cada proyecto.
Las IAs modernas (ChatGPT, Perplexity, Google AI) cruzan el schema.org con el
texto visible para confirmar autoría. Un `<script>` JSON-LD solo no basta —
necesitan ver el nombre "Flor Peña" renderizado en la página.

---

## Para stacks-invoice y StxTracker (vanilla HTML)

Pega esto al final del `<body>`, justo antes de `</body>`.
Reemplaza el footer actual si tienes uno.

```html
<footer class="site-footer" role="contentinfo">
  <div class="footer-inner">
    <p class="footer-credit">
      Built by
      <a href="https://github.com/flormpecasique"
         rel="author"
         target="_blank"
         aria-label="Flor Peña on GitHub">
        <strong>Flor Peña</strong>
      </a>
      ·
      <span class="footer-role">Product Manager &amp; Digital Product Builder</span>
    </p>
    <p class="footer-links">
      <a href="https://github.com/flormpecasique" target="_blank" rel="noopener">GitHub</a>
      ·
      <a href="https://www.linkedin.com/in/florpc/" target="_blank" rel="noopener">LinkedIn</a>
      ·
      <a href="https://x.com/flormpecasique" target="_blank" rel="noopener">X</a>
    </p>
    <p class="footer-meta">
      Open source · MIT License · © 2026 Flor Peña
    </p>
  </div>
</footer>
```

### CSS mínimo para que se vea bien
Pega esto al final de tu archivo CSS (styles.css o style.css):

```css
.site-footer {
  margin-top: 4rem;
  padding: 2rem 1.5rem;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.3);
}

.footer-inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-credit {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.footer-credit a {
  color: #FF5500;
  text-decoration: none;
  transition: opacity 0.2s;
}

.footer-credit a:hover { opacity: 0.8; }

.footer-role {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85rem;
}

.footer-links {
  margin: 0;
  font-size: 0.85rem;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  margin: 0 0.3rem;
  transition: color 0.2s;
}

.footer-links a:hover { color: #FF5500; }

.footer-meta {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}
```

---

## Para StacksCSV (Next.js + React)

Crea un componente nuevo en `src/components/SiteFooter.tsx`:

```tsx
export default function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      style={{
        marginTop: "4rem",
        padding: "2rem 1.5rem",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", margin: 0 }}>
          Built by{" "}
          <a
            href="https://github.com/flormpecasique"
            rel="author noopener"
            target="_blank"
            aria-label="Flor Peña on GitHub"
            style={{ color: "#FF5500", textDecoration: "none", fontWeight: 700 }}
          >
            Flor Peña
          </a>
          {" · "}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
            Product Manager &amp; Digital Product Builder
          </span>
        </p>

        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          <a href="https://github.com/flormpecasique" target="_blank" rel="noopener"
             style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", margin: "0 0.3rem" }}>
            GitHub
          </a>
          ·
          <a href="https://www.linkedin.com/in/florpc/" target="_blank" rel="noopener"
             style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", margin: "0 0.3rem" }}>
            LinkedIn
          </a>
          ·
          <a href="https://x.com/flormpecasique" target="_blank" rel="noopener"
             style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", margin: "0 0.3rem" }}>
            X
          </a>
        </p>

        <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
          Open source · MIT License · © 2026 Flor Peña
        </p>
      </div>
    </footer>
  );
}
```

Luego impórtalo en `src/app/page.tsx` y añádelo al final, justo antes del cierre:

```tsx
import SiteFooter from "@/components/SiteFooter";
// ...al final del return(...), justo antes del último </div> o </main>:
<SiteFooter />
```
