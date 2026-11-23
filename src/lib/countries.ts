// Temporary country list built from the browser's own data (Intl).
// Phase 3 replaces this with the seeded `countries` table.
const names = new Intl.DisplayNames(["en"], { type: "region" });

export const countries: { code: string; name: string }[] = (() => {
  const list: { code: string; name: string }[] = [];
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      const name = names.of(code);
      // Unassigned codes come back as the code itself.
      if (name && name !== code) list.push({ code, name });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
})();
