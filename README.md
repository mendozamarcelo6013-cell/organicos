# Orgánicos del Norte — Demo de tienda

Maqueta de tienda de quesos y miel de abeja inspirada en el norte del Perú.
HTML + CSS + JavaScript sin dependencias externas. Las ilustraciones son SVG propios.

## Ver la demo localmente

Abre `index.html` en el navegador o, preferiblemente, sirve la carpeta:

```bash
python3 -m http.server 8000
```

Luego visita <http://localhost:8000>.

## Publicar en GitHub Pages

> Importante: esta carpeta debe ser la raíz del repositorio. No publiques la carpeta
> personal completa (`/home/herman`), porque ya contiene otros archivos y proyectos.

1. Crea un repositorio público vacío en GitHub, sin README ni licencia.
2. Desde esta carpeta:

```bash
git init
git add .
git commit -m "Demo Orgánicos del Norte"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

3. En GitHub entra a **Settings → Pages**.
4. En **Source** elige **Deploy from a branch**.
5. Selecciona la rama **main** y la carpeta **/ (root)**. Guarda.
6. Espera un par de minutos. La demo quedará en:

```text
https://TU-USUARIO.github.io/TU-REPO/
```

Los enlaces son relativos, así que funcionan tanto en la raíz de un dominio como en
una subcarpeta de proyecto de GitHub Pages.

## Actualizar la demo

```bash
git add .
git commit -m "Actualiza la demo"
git push
```

GitHub Pages volverá a publicar automáticamente.

## Notas

- El carrito usa `localStorage`; el pedido de ejemplo del checkout usa `sessionStorage`.
- No se procesan pagos, pedidos reales ni envíos.
- Precios, presentaciones y testimonios son referenciales.
- Para reiniciar el carrito: botón **Vaciar carrito** o, en la consola:
  `localStorage.removeItem('odn-cart-v1')`
