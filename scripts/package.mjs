// Produit dist/ma-copie-epub.zip à partir du dossier extension/.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../extension/manifest.json", import.meta.url)));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
if (pkg.version !== version) throw new Error(`Versions différentes : package.json ${pkg.version}, manifest.json ${version}`);
const tag = process.env.GITHUB_REF_NAME;
if (tag && tag.startsWith("v") && tag !== `v${version}`) throw new Error(`Le tag ${tag} ne correspond pas à la version ${version}`);

mkdirSync("dist", { recursive: true });
const out = "dist/ma-copie-epub.zip"; // nom stable : lien « latest » du site
rmSync(out, { force: true });
execFileSync("zip", ["-r", "-X", `../${out}`, ".", "-x", ".*"], { cwd: "extension", stdio: "inherit" });
console.log(out);
