import resumeSchema from "@jsonresume/schema";
import fs from "node:fs";

type ResumeConfig = {
  filename: string;
  path: string;
};

const resumes: ResumeConfig[] = [
  {
    filename: "resume.es.json",
    path: "./data/resume.es.json",
  },
  {
    filename: "resume.en.json",
    path: "./data/resume.en.json",
  },
];

let totalValid = 0;
let hasErrors = false;

for (const { filename, path } of resumes) {
  try {
    const resume = JSON.parse(fs.readFileSync(path, "utf8"));

    resumeSchema.validate(
      resume,
      (error) => {
        if (error) {
          hasErrors = true;
          console.error(`❌ ${filename} inválido`);
          console.error(error);
          return;
        }

        totalValid++;
        console.log(`✅ ${filename} válido`);
      },
      (error) => {
        hasErrors = true;
        console.error(`❌ Error validando ${filename}`);
        console.error(error);
      },
    );
  } catch (error) {
    hasErrors = true;
    console.error(`❌ No se pudo leer o parsear ${filename}`);
    console.error(error);
  }
}

if (hasErrors) {
  console.error(
    `\n❌ Validación finalizada con errores (${totalValid}/${resumes.length} válidos)`,
  );

  process.exitCode = 1;
} else {
  console.log(
    `\n✅ Validación completada: ${totalValid}/${resumes.length} resumes válidos`,
  );
}
