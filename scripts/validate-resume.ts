import resumeSchema from "@jsonresume/schema";
import { locales } from "../src/i18n/config";
import { getResume } from "../src/lib/resume";

/**
 * data/resume.json no es JSON Resume literal (usa pares { es, en }), así
 * que se valida lo que realmente consumen el portafolio y el CV: el
 * resume ya resuelto para cada idioma.
 */

let totalValid = 0;

for (const locale of locales) {
  resumeSchema.validate(getResume(locale), (errors, valid) => {
    if (valid) {
      totalValid++;
      console.log(`✅ resume (${locale}) válido`);
      return;
    }
    console.error(`❌ resume (${locale}) inválido`);
    console.error(errors);
  });
}

if (totalValid === locales.length) {
  console.log(
    `\n✅ Validación completada: ${totalValid}/${locales.length} idiomas válidos`,
  );
} else {
  console.error(
    `\n❌ Validación finalizada con errores (${totalValid}/${locales.length} válidos)`,
  );
  process.exitCode = 1;
}
