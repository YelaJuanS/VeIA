# Video demo

Descarga el video que generaste en Gemini (botón de descarga en
https://share.gemini.google/LikVWy2GP81r) y guárdalo en esta carpeta con el
nombre exacto:

```
assets/veia-demo.mp4
```

Luego:

```bash
git add assets/veia-demo.mp4
git commit -m "Video demo"
git push
```

Vercel redespliega solo y el video aparece en la sección "Míralo en acción".
Mientras el archivo no exista, la página muestra automáticamente un botón
que enlaza al video compartido en Gemini.

> Tip: si el mp4 pesa más de ~10 MB, comprímelo antes (p. ej. en
> https://handbrake.fr o cualquier compresor online) para que cargue rápido
> en celulares con datos móviles.
