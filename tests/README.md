# Regressionstest

`tests/regression.js` kör samma användarflöden (formationer, truppen, ritverktyg,
animation, skärmbilder, sessioner, dialoger, mörkt läge, mobil och utskrift) mot
arbetskopian och mot en git-referens, och jämför DOM, beräknade stilar och
skärmbilder vid 23 kontrollpunkter.

```sh
npm install
npx playwright install chromium   # första gången
npm test                          # jämför arbetskopian med HEAD
node tests/regression.js main     # jämför med en annan gren eller commit
```

Testet misslyckas om något skiljer sig eller om sidan ger JavaScript-fel.
Skärmbilderna sparas i `tests/output/base` och `tests/output/current`.
Vid avsiktliga ändringar av utseende eller beteende är skillnader väntade –
granska då skärmbilderna.

Finns Chromium redan installerat någon annanstans kan sökvägen anges med
`CHROMIUM_PATH=/sökväg/till/chromium npm test`.
