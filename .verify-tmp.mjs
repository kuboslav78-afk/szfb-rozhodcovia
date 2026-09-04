import ExcelJS from "exceljs";
const SCR = "/private/tmp/claude-501/-Users-kuboslav78-szfb-rozhodcovia/0387734d-d794-4075-ba73-c59d318285bc/scratchpad";
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SCR + "/vzor-vykaz-prikazna-092026.xlsx");
console.log("pred orezaním:", wb.worksheets.length, "hárkov");
for (const ws of [...wb.worksheets]) {
  const l = ws.name.toLowerCase();
  if (!(l.includes("formul") || l.includes("hromadn"))) wb.removeWorksheet(ws.id);
}
console.log("po orezaní:  ", wb.worksheets.map(w => `"${w.name}"`).join(", "));
await wb.xlsx.writeFile(SCR + "/vzor-2harky.xlsx");
// kontrola, že sa nič nerozbilo
const check = new ExcelJS.Workbook();
await check.xlsx.readFile(SCR + "/vzor-2harky.xlsx");
const ws = check.getWorksheet("PZ - formuláre");
const t = v => v == null ? "" : (typeof v === "object" ? (v.richText?.map(x=>x.text).join("") ?? (v.formula ? "="+v.formula : String(v.result ?? ""))) : String(v));
console.log("\nkontrola obsahu po orezaní:");
console.log("  " + t(ws.getCell("A4").value));
console.log("  riadok 7: " + ["B","C","E","F","H","J"].map(c => t(ws.getCell(`${c}7`).value)).join(" | "));
console.log("  riadok 8: " + ["B","C","E","F","H","J"].map(c => t(ws.getCell(`${c}8`).value)).join(" | "));
const hp = check.worksheets.find(w => w.name.toLowerCase().includes("hromadn"));
console.log("  hromadný príkaz r5: " + ["B","C","D","G"].map(c => t(hp.getCell(`${c}5`).value)).join(" | "));
console.log("  fonty D7/D8: " + [ws.getCell("D7").font?.size, ws.getCell("D8").font?.size].join(" / "));
