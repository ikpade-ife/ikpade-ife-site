// Corrige le SEO du site Ikpadé Ifê (à lancer depuis le dossier "site") :
//  1) ajoute <link rel="canonical"> et og:url aux pages du blog ;
//  2) remplace les liens internes en ".html" (qui passent par une redirection) par les adresses propres.
// Sans danger : on peut le relancer, il ne modifie que ce qui reste à corriger.
import fs from "fs";
import path from "path";

const BASE = "https://www.ikpade-ife.com";
const dossier = process.cwd();
if (!fs.existsSync(path.join(dossier, "index.html")) || !fs.existsSync(path.join(dossier, "blog.html"))) {
  console.error("ERREUR : lancez ce script depuis le dossier du site (celui qui contient index.html et blog.html).");
  process.exit(1);
}

const fichiers = [{ f: "index.html", canon: null, blog: false }, { f: "blog.html", canon: `${BASE}/blog`, blog: false }];
const dossierBlog = path.join(dossier, "blog");
if (fs.existsSync(dossierBlog)) {
  for (const n of fs.readdirSync(dossierBlog).filter(n => n.endsWith(".html")).sort()) {
    fichiers.push({ f: path.join("blog", n), canon: `${BASE}/blog/${n.replace(/\.html$/, "")}`, blog: true });
  }
}

const regles = [
  [/href="(?:\.\.\/)?index\.html(#[^"]*)?"/g, (m, a) => `href="/${a || ""}"`],
  [/href="(?:\.\.\/)?blog\.html(#[^"]*)?"/g, (m, a) => `href="/blog${a || ""}"`],
  [/href="(?:\.\.\/)?blog\/([a-z0-9-]+)\.html"/g, 'href="/blog/$1"'],
  [/href="(?:\.\.\/)?blog\.css"/g, 'href="/blog.css"'],
];
const reglesBlog = [[/href="([a-z0-9-]+)\.html"/g, 'href="/blog/$1"']]; // liens vers un autre article du même dossier

let total = 0;
for (const { f, canon, blog } of fichiers) {
  const p = path.join(dossier, f);
  let s = fs.readFileSync(p, "utf8");
  const avant = s;
  const nl = s.includes("\r\n") ? "\r\n" : "\n";
  let n = 0;
  for (const [re, rep] of [...regles, ...(blog ? reglesBlog : [])]) {
    s = s.replace(re, (...a) => { n++; return typeof rep === "function" ? rep(...a) : rep.replace(/\$(\d)/g, (_, i) => a[+i]); });
  }
  let ajouts = [];
  if (canon && !/rel=["']canonical["']/i.test(s)) ajouts.push(`<link rel="canonical" href="${canon}">`);
  if (canon && !/property=["']og:url["']/i.test(s)) ajouts.push(`<meta property="og:url" content="${canon}">`);
  if (ajouts.length) {
    if (!/<\/head>/i.test(s)) { console.log(`  ! ${f} : pas de </head>, balises non ajoutées`); }
    else s = s.replace(/<\/head>/i, ajouts.join(nl) + nl + "</head>");
  }
  if (s !== avant) {
    fs.writeFileSync(p, s, "utf8");
    console.log(`OK  ${f} : ${n} lien(s) corrigé(s)${ajouts.length ? ", " + ajouts.length + " balise(s) ajoutée(s)" : ""}`);
    total++;
  } else {
    console.log(`--  ${f} : déjà en ordre`);
  }
}
console.log(total ? `\n${total} fichier(s) modifié(s). Il reste à faire git add / commit / push.` : "\nRien à modifier.");
