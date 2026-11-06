import type { PatientField } from "../questionnaires/patientFields";
import { PatientChoices } from "./PatientChoices";

type Props = {
  questionnaireId: string;
  fields: PatientField[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  title?: string;
  introduction?: string;
  numbered?: boolean;
};

export function SourcePatientDetails({ questionnaireId, fields, values, onChange,
  title = "معلومات عامة", introduction = "من فضلك، خذ وقتك لملء المعلومات العامة عنك.", numbered = true,
}: Props) {
  const prefix = questionnaireId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const headingId = `${prefix}-patient-title`;
  return (
    <section className="patient-details" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {introduction ? <p>{introduction}</p> : null}
      {fields.map((field, index) => {
        const id = `${prefix}-patient-${field.id}`;
        if (field.type === "radio") return (
          <PatientChoices
            key={field.id} number={numbered ? index + 1 : undefined} label={field.label_ar} name={id}
            options={field.options} value={values[field.id]}
            required={field.required !== false}
            onChange={(value) => onChange(field.id, value)}
          />
        );
        return (
          <div key={field.id} className="question-card patient-field">
            <label htmlFor={id} className="patient-label">
              {numbered ? `${index + 1}. ` : ""}{field.label_ar} {field.required !== false ? <span className="required-mark" aria-hidden="true">*</span> : null}
            </label>
            <input
              id={id} name={id} type={field.type}
              autoComplete={field.type === "number" ? undefined : field.autoComplete}
              min={field.type === "number" ? field.min : undefined}
              step={field.type === "number" ? field.step : undefined}
              className="input patient-input" required={field.required !== false}
              dir={field.type === "text" ? "rtl" : "ltr"}
              value={values[field.id] ?? ""}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          </div>
        );
      })}
    </section>
  );
}
